import "server-only";
import { z } from "zod";
import type { AuthenticatedMemberContext } from "@/server/auth/member";
import { explainReconciliation, explanationFactsFingerprint, type ExplanationProvider } from "@/server/ai/meta/explain-reconciliation";
import { explanationGuidance } from "@/shared/schemas/meta/explanation-plan";
import { ExplanationInputSchema, validateExplanation } from "@/shared/schemas/meta/reconciliation-explanation";
import { loadingExplanationFacts, validateLoadingExplanation } from "@/shared/meta/loading-operation";
import {
  PassportExplanationScopeSchema, PassportExplanationCommandSchema, PassportExplanationReplySchema, PassportExplanationMetadataSchema,
  type PassportExplanationCommand, type PassportExplanationReply,
} from "@/shared/schemas/meta/passport-explanation";
import { V2DraftError } from "../freight-requests/application/draft-service";
import { createLoadingReconciliationAccess, recordLoadingExplanation } from "./producer-ports";
import type { LoadingOperationService } from "./operation-service";
import type { PassportExplanationRepository, ExplanationClaim, ExplanationScope } from "./passport-explanation-repository";

export class PassportExplanationService {
  constructor(private readonly deps: { operations: LoadingOperationService; repository: PassportExplanationRepository; provider?: ExplanationProvider }) {}
  private member(actor: AuthenticatedMemberContext, write = false) {
    if (actor.status !== "ACTIVE" || (write && !["OWNER", "SUPERVISOR"].includes(actor.role)))
      throw new V2DraftError("FORBIDDEN_WORKFLOW", "An authorized operator is required.", 403);
  }
  async list(actor: AuthenticatedMemberContext, rawScope: unknown) {
    this.member(actor);
    const scope = PassportExplanationScopeSchema.parse(rawScope);
    const passport = await this.deps.operations.readPassport(actor, scope.sessionId, scope.passportId);
    const attempts = await this.deps.repository.list(actor, scope);
    if (attempts.some(a => !passport.data.source.session.groups.some(g => g.id === a.groupId)))
      throw new V2DraftError("INVALID_EXPLANATION_SCOPE", "Explanation response scope mismatch.", 502);
    return { schemaVersion: "1.0" as const, data: { ...scope, attempts } };
  }
  async generate(actor: AuthenticatedMemberContext, rawScope: unknown, body: unknown, rawKey: unknown): Promise<PassportExplanationReply> {
    this.member(actor, true);
    const scope = PassportExplanationScopeSchema.parse(rawScope), input = PassportExplanationCommandSchema.parse(body), key = z.string().uuid().parse(rawKey);
    const { operations, repository } = this.deps;
    const passport = await operations.readPassport(actor, scope.sessionId, scope.passportId);
    if (!passport.meta.isCurrent || passport.data.sessionVersion !== input.expectedVersion)
      throw new V2DraftError("STALE_PASSPORT", "Reload the current Passport before generating an explanation.", 409);
    if (!passport.data.source.session.groups.some(g => g.id === input.groupId))
      throw new V2DraftError("PASSPORT_GROUP_NOT_FOUND", "Group not found in this Passport.", 404);
    const facts = ExplanationInputSchema.parse(loadingExplanationFacts(passport.data, input.groupId));
    const guidance = explanationGuidance(facts, input.language);
    // Uncertain scopes are domain guidance, with no claim, provider call or invented explanation.
    if (guidance) return this.reply(scope, input, "GUIDANCE", null, null, guidance, false);
    let claim = await repository.claim(actor, scope, input, key);
    this.checkClaim(input, claim);
    const replay = claim.replay;
    if (claim.attempt.state === "SAVED")
      return this.reply(scope, input, "SAVED", claim, this.checkedValue(passport.data, input, claim.value), null, replay);
    if (claim.attempt.state === "FAILED") return this.reply(scope, input, "FAILED", claim, null, null, replay);
    if (!claim.claimed && claim.attempt.state === "RUNNING") return this.reply(scope, input, "IN_PROGRESS", claim, null, null, true);
    if (claim.claimed) {
      const reconciliation = createLoadingReconciliationAccess(operations, actor, { ...scope, groupId: input.groupId }, explanationFactsFingerprint);
      const result = await explainReconciliation({ schemaVersion: "1.0", reconciliationId: facts.reconciliationId,
        reconciliationVersion: facts.reconciliationVersion, language: input.language }, actor,
        { reconciliation, provider: this.deps.provider }, { deadlineMs: 43000 });
      const metadata = PassportExplanationMetadataSchema.parse(result.metadata);
      if (!result.ok || !result.explanation) {
        const code = !result.ok ? result.error.code : "MODEL_OUTPUT_INVALID";
        await repository.transition(claim.attempt.id, "fail", null, metadata, code);
        claim = await repository.claim(actor, scope, input, key);
        return this.reply(scope, input, "FAILED", claim, null, null, replay);
      }
      const value = this.checkedValue(passport.data, input, result.explanation);
      try { await repository.transition(claim.attempt.id, "stage", value, metadata); }
      catch (error) {
        if (error instanceof V2DraftError && error.httpStatus < 500) {
          await repository.transition(claim.attempt.id, "fail", null, metadata,
            error.httpStatus === 403 ? "FORBIDDEN_TENANT" : "INPUT_REVISION_MISMATCH").catch(() => {});
          throw error;
        }
        // The stage may already have committed. Read it before any other action.
        claim = await repository.claim(actor, scope, input, key);
        if (claim.attempt.state === "RUNNING") {
          await repository.transition(claim.attempt.id, "stage", value, metadata);
        }
      }
      claim = await repository.claim(actor, scope, input, key);
      this.checkClaim(input, claim);
    }
    if (claim.attempt.state === "GENERATED") {
      const current = await operations.readPassport(actor, scope.sessionId, scope.passportId);
      if (!current.meta.isCurrent || current.data.sessionVersion !== input.expectedVersion)
        throw new V2DraftError("STALE_PASSPORT", "The source changed. The old explanation was not saved.", 409);
      const value = this.checkedValue(current.data, input, claim.value);
      // Retain Juan's TS validation and immutable writer. The repository wraps the
      // final write plus receipt completion in the same checked SQL transaction.
      try {
        await recordLoadingExplanation({ rpc: async () => ({ data: await repository.transition(claim.attempt.id, "complete", value, null), error: null }) },
          current.data, input.groupId, value);
      } catch (error) {
        if (error instanceof V2DraftError && error.httpStatus < 500)
          await repository.transition(claim.attempt.id, "fail", null, claim.attempt.metadata,
            error.httpStatus === 403 ? "FORBIDDEN_TENANT" : error.code === "EXPLANATION_CONFLICT" ? "MODEL_OUTPUT_INVALID" : "INPUT_REVISION_MISMATCH").catch(() => {});
        throw error;
      }
      claim = await repository.claim(actor, scope, input, key);
    }
    this.checkClaim(input, claim);
    if (claim.attempt.state === "SAVED")
      return this.reply(scope, input, "SAVED", claim, this.checkedValue(passport.data, input, claim.value), null, replay);
    if (claim.attempt.state === "FAILED") return this.reply(scope, input, "FAILED", claim, null, null, replay);
    return this.reply(scope, input, "IN_PROGRESS", claim, null, null, true);
  }
  private checkedValue(passport: Parameters<typeof validateLoadingExplanation>[0], input: PassportExplanationCommand, raw: unknown) {
    return validateExplanation(loadingExplanationFacts(passport, input.groupId), validateLoadingExplanation(passport, input.groupId, raw));
  }
  private checkClaim(input: PassportExplanationCommand, claim: ExplanationClaim) {
    if (claim.attempt.groupId !== input.groupId)
      throw new V2DraftError("INVALID_EXPLANATION_SCOPE", "Explanation receipt scope mismatch.", 502);
  }
  private reply(scope: ExplanationScope, input: PassportExplanationCommand, status: PassportExplanationReply["data"]["status"],
    claim: ExplanationClaim | null, explanation: PassportExplanationReply["data"]["explanation"],
    guidance: PassportExplanationReply["data"]["guidance"], replay: boolean) {
    return PassportExplanationReplySchema.parse({ schemaVersion: "1.0", data: { ...scope, groupId: input.groupId,
      status, attempt: claim?.attempt ?? null, explanation, guidance }, meta: { idempotentReplay: replay } });
  }
}
