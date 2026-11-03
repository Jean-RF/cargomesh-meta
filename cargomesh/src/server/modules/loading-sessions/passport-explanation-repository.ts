import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createV2ServerSupabaseClient } from "@/server/db/supabase/v2";
import { PassportExplanationAttemptSchema, type PassportExplanationCommand } from "@/shared/schemas/meta/passport-explanation";
import { V2DraftError, type V2Actor } from "../freight-requests/application/draft-service";
import { createLoadingOperationRepository, loadingRpcError, type LoadingRpcClient } from "./supabase-operation-repository";
import { LoadingOperationService } from "./operation-service";

export const ExplanationClaimSchema = z.object({
  attempt: PassportExplanationAttemptSchema, claimed: z.boolean(), replay: z.boolean(), value: z.unknown(),
}).strict();
export type ExplanationClaim = z.infer<typeof ExplanationClaimSchema>;
export type ExplanationScope = { sessionId: string; passportId: string };
export interface PassportExplanationRepository {
  claim(actor: V2Actor, scope: ExplanationScope, command: PassportExplanationCommand, key: string): Promise<ExplanationClaim>;
  list(actor: V2Actor, scope: ExplanationScope): Promise<ExplanationClaim["attempt"][]>;
  transition(attemptId: string, action: "stage" | "complete" | "fail", value: unknown, metadata: unknown, errorCode?: string): Promise<{ recorded: boolean }>;
}
function rpcError(error: { code?: string; message: string }): never {
  if (["PGRST202", "42883", "42P01"].includes(error.code ?? ""))
    throw new V2DraftError("PASSPORT_EXPLANATIONS_NOT_INSTALLED", "Passport explanation storage is not installed.", 503);
  try { loadingRpcError(error); }
  catch (e) {
    if (e instanceof V2DraftError) throw e;
    throw new V2DraftError("PERSISTENCE_UNAVAILABLE", "The explanation could not be saved. Recover this attempt before starting another.", 503);
  }
}
export function createPassportExplanationRepository(reader: LoadingRpcClient, writer: () => LoadingRpcClient): PassportExplanationRepository {
  async function call(client: LoadingRpcClient, name: string, args: Record<string, unknown>) {
    try {
      const { data, error } = await client.rpc(name, args);
      if (error) rpcError(error);
      return data;
    } catch (error) {
      if (error instanceof V2DraftError) throw error;
      throw new V2DraftError("PERSISTENCE_UNAVAILABLE", "Storage is unavailable. Recover the same attempt.", 503);
    }
  }
  return {
    async claim(actor, scope, input, key) {
      return ExplanationClaimSchema.parse(await call(reader, "meta_claim_passport_explanation_v1", {
        p_organization_id: actor.organizationId, p_member_id: actor.memberId,
        p_session_id: scope.sessionId, p_passport_id: scope.passportId, p_group_id: input.groupId,
        p_expected_version: input.expectedVersion, p_language: input.language, p_key: key, p_retry_of: input.retryOf,
      }));
    },
    async list(actor, scope) {
      return PassportExplanationAttemptSchema.array().max(100).parse(await call(reader, "meta_read_passport_explanation_attempts_v1", {
        p_organization_id: actor.organizationId, p_member_id: actor.memberId, p_session_id: scope.sessionId, p_passport_id: scope.passportId,
      }));
    },
    async transition(id, action, value, metadata, code) {
      return z.object({ recorded: z.boolean() }).strict().parse(await call(writer(), "meta_complete_passport_explanation_v1", {
        p_attempt_id: id, p_action: action, p_value: value, p_metadata: metadata, p_error_code: code ?? null,
      }));
    },
  };
}
export async function passportExplanationDependencies() {
  const client = await createV2ServerSupabaseClient();
  const reader = client as unknown as LoadingRpcClient;
  let writer: LoadingRpcClient | undefined;
  const administrativeWriter = () => {
    if (writer) return writer;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new V2DraftError("NOT_CONFIGURED", "Explanation storage is not configured.", 503);
    writer = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(6000) }) },
    }) as unknown as LoadingRpcClient;
    return writer;
  };
  return { operations: new LoadingOperationService(createLoadingOperationRepository(reader)), repository: createPassportExplanationRepository(reader, administrativeWriter) };
}
