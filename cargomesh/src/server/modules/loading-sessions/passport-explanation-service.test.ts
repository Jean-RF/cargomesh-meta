import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PassportExplanationService } from "./passport-explanation-service";
import { LoadingOperationService } from "./operation-service";
import { loadingPassportFixture, loadingId } from "@/shared/schemas/meta/loading-operation.fixtures";
import { loadingExplanationFacts } from "@/shared/meta/loading-operation";
import { V2DraftError } from "../freight-requests/application/draft-service";
import type { ExplanationClaim, PassportExplanationRepository } from "./passport-explanation-repository";
import type { ExplanationProvider } from "@/server/ai/meta/explain-reconciliation";

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function setup() {
  const passport = loadingPassportFixture(), facts = () => loadingExplanationFacts(passport, passport.source.session.groups[0].id);
  const actor = { organizationId: passport.organizationId, memberId: passport.createdBy, userId: loadingId(80), role: "OWNER" as const, status: "ACTIVE", userEmail: "synthetic@test.invalid" };
  const scope = { sessionId: passport.sessionId, passportId: passport.id };
  const input = { groupId: passport.source.session.groups[0].id, expectedVersion: passport.sessionVersion, language: "es" as const, retryOf: null as string | null };
  const records = new Map<string, ExplanationClaim>(), signatures = new Map<string, string>();
  let currentVersion = passport.sessionVersion, manifestCurrent = true, providerCalls = 0, claims = 0, writes = 0, stageLost = false, completeLost = false;
  const explanations = new Map<string, any>(), events: string[] = [];
  let onProvider: (() => Promise<void>) | undefined, onStage: (() => void) | undefined, configured = true, malformed = false;
  const operations = new LoadingOperationService({ async call(a, action, sessionId, value: any) {
    if (a.organizationId !== passport.organizationId || sessionId !== passport.sessionId || value.passportId !== passport.id) throw new V2DraftError("PASSPORT_NOT_FOUND", "Not available", 404);
    assert.equal(action, "read_passport");
    return { record: passport, currentVersion, manifestCurrent, explanations: [...explanations].map(([groupId, value]) => ({ groupId, value })) };
  } });
  const repository: PassportExplanationRepository = {
    async claim(_actor, s, body, key) {
      claims++;
      if (currentVersion !== passport.sessionVersion || !manifestCurrent) throw new V2DraftError("STALE_PASSPORT", "Stale", 409);
      const signature = JSON.stringify([s, body]);
      if (records.has(key)) {
        if (signatures.get(key) !== signature) throw new V2DraftError("IDEMPOTENCY_CONFLICT", "Conflict", 409);
        return structuredClone({ ...records.get(key)!, claimed: false, replay: true });
      }
      const active = [...records.values()].find(r => r.attempt.groupId === body.groupId && ["RUNNING", "GENERATED"].includes(r.attempt.state));
      if (active) return structuredClone({ ...active, claimed: false, replay: true });
      const record: ExplanationClaim = { claimed: true, replay: false, value: null, attempt: {
        id: randomUUID(), groupId: body.groupId, state: "RUNNING", language: body.language,
        createdAt: new Date().toISOString(), completedAt: null, metadata: null, errorCode: null, processingMayHaveOccurred: false,
      } };
      records.set(key, record); signatures.set(key, signature); return structuredClone(record);
    },
    async list() { return [...records.values()].map(r => structuredClone(r.attempt)); },
    async transition(id, action, value: any, metadata: any, code: any) {
      const record = [...records.values()].find(r => r.attempt.id === id)!;
      events.push(action);
      if (action === "stage") {
        record.attempt.state = "GENERATED"; record.value = value; record.attempt.metadata = metadata;
        onStage?.();
        if (stageLost) { stageLost = false; throw new V2DraftError("PERSISTENCE_UNAVAILABLE", "lost stage response", 503); }
      } else if (action === "complete") {
        if (currentVersion !== passport.sessionVersion || !manifestCurrent) throw new V2DraftError("STALE_PASSPORT", "Stale", 409);
        writes++; explanations.set(record.attempt.groupId, value); record.attempt.state = "SAVED";
        if (completeLost) { completeLost = false; throw new V2DraftError("PERSISTENCE_UNAVAILABLE", "lost save response", 503); }
      } else { record.attempt.state = "FAILED"; record.attempt.errorCode = code; record.attempt.metadata = metadata; record.attempt.processingMayHaveOccurred = metadata?.processingMayHaveOccurred ?? true; }
      return { recorded: action === "complete" };
    },
  };
  const provider: ExplanationProvider = {
    transport: "INJECTED", configuration: () => configured ? { model: "muse-spark-1.3", timeoutMs: 1000, maxOutputTokens: 2048 } : null,
    async requestJson(request) {
      providerCalls++; assert.equal(request.reasoningEffort, "medium"); await onProvider?.();
      const f = facts();
      return { content: JSON.stringify(malformed ? { invented: "loss" } : {
        schemaVersion: "1.0", reconciliationId: f.reconciliationId, reconciliationVersion: f.reconciliationVersion,
        comparisonStatus: f.comparisonStatus, summaryFact: f.comparisonStatus === "MATCH" ? "COMPARATOR_MATCH" : "COMPARATOR_DIFFERENCE",
        reasonFacts: ["SESSION_CLOSED", "SAME_UNIT"], suggestedActions: ["REVIEW_EVIDENCE"], evidenceRefs: f.events.slice(0, 1), requiresHumanReview: true,
      }), model: "muse-spark-1.3", requestId: "synthetic-request", usage: { inputTokens: 10, outputTokens: 20 } };
    },
  };
  const service = new PassportExplanationService({ operations, repository, provider });
  return { service, passport, actor, input, scope, records, explanations, events,
    calls: () => ({ providerCalls, claims, writes }), stale: () => { currentVersion++; }, changeManifest: () => { manifestCurrent = false; },
    delay: (work: () => Promise<void>) => { onProvider = work; }, afterStage: (work: () => void) => { onStage = work; },
    unconfigured: () => { configured = false; }, malformed: () => { malformed = true; },
    loseStage: () => { stageLost = true; }, loseSave: () => { completeLost = true; },
  };
}
test("generation uses Juan's facts, saves once and reopens the exact explanation", async () => {
  const app = setup(), key = randomUUID();
  const result = await app.service.generate(app.actor, app.scope, app.input, key);
  assert.equal(result.data.status, "SAVED"); assert.equal(result.meta.idempotentReplay, false);
  assert.match(result.data.explanation!.summary, /esperado 10 PALLET; observado 8 PALLET; diferencia registrada 2 PALLET/);
  assert.equal(result.data.explanation!.requiresHumanReview, true);
  const replay = await app.service.generate(app.actor, app.scope, app.input, key);
  assert.deepEqual(replay.data.explanation, result.data.explanation); assert.equal(replay.meta.idempotentReplay, true);
  assert.deepEqual(app.calls(), { providerCalls: 1, claims: 4, writes: 1 });
  assert.deepEqual(app.events, ["stage", "complete"]);
});
test("simultaneous same-key or different-key calls for a group invoke the provider once", async () => {
  for (const sameKey of [true, false]) {
    const app = setup(), wait = deferred<void>(), entered = deferred<void>(), key = randomUUID();
    app.delay(async () => { entered.resolve(); await wait.promise; });
    const first = app.service.generate(app.actor, app.scope, app.input, key); await entered.promise;
    const second = await app.service.generate(app.actor, app.scope, app.input, sameKey ? key : randomUUID());
    assert.equal(second.data.status, "IN_PROGRESS"); assert.equal(app.calls().providerCalls, 1);
    wait.resolve(); assert.equal((await first).data.status, "SAVED");
  }
});
test("same key with different valid payload is a stable conflict, with no second inference", async () => {
  const app = setup(), key = randomUUID(); await app.service.generate(app.actor, app.scope, app.input, key);
  await assert.rejects(app.service.generate(app.actor, app.scope, { ...app.input, language: "en" }, key), { code: "IDEMPOTENCY_CONFLICT", httpStatus: 409 });
  assert.equal(app.calls().providerCalls, 1);
});
test("a lost stage response is recovered without another inference", async () => {
  const app = setup(); app.loseStage();
  assert.equal((await app.service.generate(app.actor, app.scope, app.input, randomUUID())).data.status, "SAVED");
  assert.equal(app.calls().providerCalls, 1); assert.equal(app.calls().writes, 1);
});
test("a lost final response replays the stored result, without another inference", async () => {
  const app = setup(), key = randomUUID(); app.loseSave();
  await assert.rejects(app.service.generate(app.actor, app.scope, app.input, key), { code: "PERSISTENCE_UNAVAILABLE" });
  assert.equal((await app.service.generate(app.actor, app.scope, app.input, key)).data.status, "SAVED");
  assert.equal(app.calls().providerCalls, 1); assert.equal(app.calls().writes, 1);
});
test("unconfigured or invalid provider output preserves the numeric comparison and failed receipt", async () => {
  for (const code of ["NOT_CONFIGURED", "MODEL_OUTPUT_INVALID"] as const) {
    const app = setup(); if (code === "NOT_CONFIGURED") app.unconfigured(); else app.malformed();
    const key = randomUUID(), result = await app.service.generate(app.actor, app.scope, app.input, key);
    assert.equal(result.data.status, "FAILED"); assert.equal(result.data.attempt!.errorCode, code);
    assert.equal(result.data.explanation, null); assert.equal(app.calls().writes, 0);
    const count = app.calls().providerCalls; await app.service.generate(app.actor, app.scope, app.input, key);
    assert.equal(app.calls().providerCalls, count);
  }
});
test("insufficient evidence produces domain guidance, with no claim or provider", async () => {
  const app = setup(); app.passport.source.selections[0].coverage = "PARTIAL";
  const result = await app.service.generate(app.actor, app.scope, app.input, randomUUID());
  assert.equal(result.data.status, "GUIDANCE"); assert.equal(result.data.guidance!.source, "DOMAIN_STATUS");
  assert.deepEqual(app.calls(), { providerCalls: 0, claims: 0, writes: 0 });
});
test("historical scope, missing group, requester and foreign actor cannot generate", async () => {
  const app = setup();
  await assert.rejects(app.service.generate({ ...app.actor, role: "REQUESTER" }, app.scope, app.input, randomUUID()), { httpStatus: 403 });
  await assert.rejects(app.service.generate({ ...app.actor, organizationId: loadingId(99) }, app.scope, app.input, randomUUID()), { httpStatus: 404 });
  await assert.rejects(app.service.generate(app.actor, app.scope, { ...app.input, groupId: loadingId(98) }, randomUUID()), { httpStatus: 404 });
  app.stale(); await assert.rejects(app.service.generate(app.actor, app.scope, app.input, randomUUID()), { code: "STALE_PASSPORT" });
  assert.equal(app.calls().providerCalls, 0);
});
test("browser-supplied quantities or missing idempotency keys cannot reach the provider", async () => {
  const app = setup();
  await assert.rejects(app.service.generate(app.actor, app.scope, { ...app.input, expectedQuantity: 999 }, randomUUID()));
  await assert.rejects(app.service.generate(app.actor, app.scope, app.input, undefined));
  await assert.rejects(app.service.generate(app.actor, app.scope, { ...app.input, retryOf: "bad" }, randomUUID()));
  assert.deepEqual(app.calls(), { providerCalls: 0, claims: 0, writes: 0 });
});
test("revision changing during inference or after staging never saves the old explanation", async () => {
  for (const afterStage of [false, true]) {
    const app = setup();
    if (afterStage) app.afterStage(app.changeManifest); else app.delay(async () => { app.stale(); });
    await assert.rejects(app.service.generate(app.actor, app.scope, app.input, randomUUID()), { code: "STALE_PASSPORT" });
    assert.equal(app.calls().writes, 0); assert.equal(app.explanations.size, 0);
  }
});
