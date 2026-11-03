import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createPassportExplanationRepository } from "./passport-explanation-repository";
import { PassportExplanationAttemptSchema } from "@/shared/schemas/meta/passport-explanation";

const actor = { organizationId: randomUUID(), memberId: randomUUID() }, scope = { sessionId: randomUUID(), passportId: randomUUID() };
const input = { groupId: randomUUID(), expectedVersion: 4, language: "es" as const, retryOf: null };
const attempt = PassportExplanationAttemptSchema.parse({ id: randomUUID(), groupId: input.groupId, state: "RUNNING", language: "es", createdAt: new Date().toISOString(), completedAt: null, errorCode: null, processingMayHaveOccurred: false, metadata: null });
test("authenticated scope/key and privileged persistence use different ports", async () => {
  const read: any[] = [], write: any[] = [], key = randomUUID();
  const repo = createPassportExplanationRepository({ async rpc(name, args) { read.push({ name, args }); return { data: name.includes("claim") ? { attempt, claimed: true, replay: false, value: null } : [attempt], error: null }; } },
    () => ({ async rpc(name, args) { write.push({ name, args }); return { data: { recorded: true }, error: null }; } }));
  await repo.claim(actor, scope, input, key); await repo.list(actor, scope);
  await repo.transition(attempt.id, "stage", { validated: "fixture" }, { fixture: true });
  assert.equal(read[0].args.p_member_id, actor.memberId); assert.equal(read[0].args.p_organization_id, actor.organizationId);
  assert.equal(read[0].args.p_key, key); assert.equal(read[0].args.p_passport_id, scope.passportId); assert.equal(read[0].args.p_expected_version, 4);
  assert.equal(write.length, 1); assert.equal(write[0].name, "meta_complete_passport_explanation_v1");
  assert.equal(write[0].args.p_action, "stage"); assert.equal(write[0].args.p_attempt_id, attempt.id);
});
test("missing capability, scope conflicts and unreachable persistence are explicit safe errors", async () => {
  for (const [code, message, expected] of [["PGRST202", "private database details", "PASSPORT_EXPLANATIONS_NOT_INSTALLED"], ["PT409", "IDEMPOTENCY_CONFLICT", "IDEMPOTENCY_CONFLICT"], ["XX000", "private database details", "PERSISTENCE_UNAVAILABLE"]]) {
    const repo = createPassportExplanationRepository({ async rpc() { return { data: null, error: { code, message } }; } }, () => { throw Error("not used"); });
    await assert.rejects(repo.claim(actor, scope, input, randomUUID()), (e: any) => e.code === expected && !e.message.includes("private database details"));
  }
});
