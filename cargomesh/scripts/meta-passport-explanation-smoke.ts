/** Real local Auth/HTTP/PostgreSQL. Default provider is INJECTED; --live is explicit. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { LoadingOperationService } from "../src/server/modules/loading-sessions/operation-service";
import { createLoadingOperationRepository, type LoadingRpcClient } from "../src/server/modules/loading-sessions/supabase-operation-repository";
import { createPassportExplanationRepository } from "../src/server/modules/loading-sessions/passport-explanation-repository";
import { PassportExplanationService } from "../src/server/modules/loading-sessions/passport-explanation-service";
import { loadingExplanationFacts } from "../src/shared/meta/loading-operation";
import { renderGroundedExplanation } from "../src/shared/schemas/meta/explanation-plan";
import type { ExplanationProvider } from "../src/server/ai/meta/explain-reconciliation";
import { PassportExplanationListSchema, PassportExplanationReplySchema } from "../src/shared/schemas/meta/passport-explanation";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!, origin = process.env.HAC40_APP_URL ?? "http://127.0.0.1:8080";
  assert.ok(["http://127.0.0.1:65321", "http://127.0.0.1:58321"].includes(url), "Dedicated local database only");
  assert.ok(["http://127.0.0.1:8080", "http://127.0.0.1:3172"].includes(origin), "Dedicated local app only");
  assert.ok(!process.env.CI || !process.argv.includes("--live"), "Paid inference is forbidden in CI");
  const reader = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  async function login(email: string) {
    const r = await reader.auth.signInWithPassword({ email, password: process.env.HAC12_LOCAL_QA_PASSWORD ?? "LOCAL_ONLY_CARGOMESH_QA_V2_2026!" });
    assert.ifError(r.error); return r.data.session!.access_token;
  }
  const foreign = await login("qa-v2-b@cargomesh.test"), token = await login("qa-v2-a@cargomesh.test");
  const actor = { userId: "c2310000-0000-4000-8000-000000000001", memberId: "c2320000-0000-4000-8000-000000000001", organizationId: "c2300000-0000-4000-8000-000000000001", role: "OWNER" as const, status: "ACTIVE", userEmail: "synthetic@test.invalid" };
  let passed = 0, inferenceCalls = 0;
  const check = (name: string) => { passed++; console.log(JSON.stringify({ case: name, status: "PASS" })); };
  async function http(path: string, body?: unknown, key = randomUUID(), expected = 200, identity: string = token) {
    const r = await fetch(origin + "/api/v2" + path, { method: body === undefined ? "GET" : "POST",
      headers: { ...(identity ? { Authorization: `Bearer ${identity}` } : {}), "Content-Type": "application/json", "Idempotency-Key": key },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(58000) });
    const result = await r.json();
    assert.equal(r.status, expected, `${path}: ${result.error?.code ?? "unexpected response"}`);
    if (path.startsWith("/meta/loading-sessions")) assert.match(r.headers.get("cache-control") ?? "", /no-store/);
    return result;
  }
  const date = (days: number, hour: string) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10) + "T" + hour + ":00Z";
  const payload = { schemaVersion: "2.0", origin: { facilityId: "c2330000-0000-4000-8000-000000000001" }, destination: { facilityId: "c2330000-0000-4000-8000-000000000002" },
    pickupWindow: { startsAt: date(2, "08:00"), endsAt: date(2, "18:00") }, deliveryWindow: { startsAt: date(3, "08:00"), endsAt: date(3, "20:00") }, acceptedModes: ["ROAD"], requiredEquipment: null,
    cargoSpecification: { categoryCode: "GENERAL", description: "[SYNTHETIC] Passport explanation acceptance", packaging: "BOX", totalWeightKg: 100, totalVolumeM3: 1, divisible: true, requirements: [],
      units: [{ packageType: "Cajas sintéticas de aceptación", quantity: 10, weightPerUnitKg: 10, volumePerUnitM3: 0.1, dimensionsCm: { length: 50, width: 50, height: 40 }, indivisible: true, stackable: false }] },
    contacts: { pickup: { name: "Synthetic sender", phoneE164: "+12025550123" }, recipient: { name: "Synthetic receiver", phoneE164: "+12025550124" } } };
  const request = (await http("/freight/requests", payload, undefined, 201)).data;
  const preparation = (await http(`/freight/requests/${request.id}/declaration-preparations`, { expectedDraftVersion: 1, expectedManifestRevision: 0 }, undefined, 201)).data;
  const manifest = (await http(`/freight/requests/${request.id}/declared-manifests`, { preparationId: preparation.id, expectedDraftVersion: 1, expectedManifestRevision: 0, contentHash: preparation.contentHash, confirmed: true }, undefined, 201)).data;
  let bundle = (await http("/meta/loading-sessions", { requestId: request.id, facilityId: payload.origin.facilityId, manifestId: manifest.id, manifestRevision: manifest.revision, mode: "DEMO",
    groups: manifest.declaration.groupBindings.map((g: { groupId: string }) => ({ groupId: g.groupId, unit: "BOX" })) }, undefined, 201)).data;
  const sessionId = bundle.session.id, groupId = bundle.session.groups[0].id, base = `/meta/loading-sessions/${sessionId}`;
  const observation = await (admin as unknown as LoadingRpcClient).rpc("meta_record_loading_observation_v1", {
    p_organization_id: actor.organizationId, p_session_id: sessionId, p_job_id: `synthetic-explanation-${randomUUID()}`, p_attempt: 1, p_manifest_revision: manifest.revision, p_evidence_id: "synthetic-no-physical-clip",
    p_value: { groupId, reportedCoverage: "COMPLETE", unit: "BOX", status: "OK", entries: 8, exits: 0, net: 8, source: "SYNTHETIC_RENDER", clipSha256: "a".repeat(64), realInference: false,
      overlayUploaded: false, analysisVersion: "synthetic-explanation-acceptance", timeMapping: "identity; synthetic test events, no physical video", flags: [],
      events: Array.from({ length: 8 }, (_, i) => ({ objectId: i, seconds: 2 + i * 1.2, direction: "IN" })) },
  }); assert.ifError(observation.error);
  const observationId = (observation.data as { id: string }).id;
  bundle = (await http(base)).data;
  async function coverage(value: "PARTIAL" | "COMPLETE", reason: string) {
    bundle = (await http(base + "/observation-selections", { expectedVersion: bundle.session.version, groupId, observationId, coverage: value, reason })).data;
  }
  async function passport() { return (await http(base + "/passports", { expectedVersion: bundle.session.version }, undefined, 201)).data; }
  await coverage("PARTIAL", "[SYNTHETIC] Deliberately partial coverage");
  bundle = (await http(base + "/close", { expectedVersion: bundle.session.version })).data;
  const uncertain = await passport(), uncertainPath = base + `/passports/${uncertain.id}/explanations`;
  const guide = PassportExplanationReplySchema.parse(await http(uncertainPath, { groupId, expectedVersion: uncertain.sessionVersion, language: "es", retryOf: null }));
  assert.equal(guide.data.status, "GUIDANCE"); assert.equal(guide.data.explanation, null); assert.equal(guide.data.attempt, null);
  check("uncertain-coverage-domain-guidance-no-inference");
  await coverage("COMPLETE", "[SYNTHETIC] Complete fixture; not a physical acceptance");
  const p = await passport(), path = base + `/passports/${p.id}/explanations`, scope = { sessionId, passportId: p.id };
  const command = { groupId, expectedVersion: p.sessionVersion, language: "es" as const, retryOf: null as string | null };
  const repo = createPassportExplanationRepository(reader as unknown as LoadingRpcClient, () => admin as unknown as LoadingRpcClient);
  const key = randomUUID();
  const concurrent = await Promise.all(Array.from({ length: 6 }, () => repo.claim(actor, scope, command, key)));
  assert.equal(concurrent.filter(r => r.claimed).length, 1); assert.equal(new Set(concurrent.map(r => r.attempt.id)).size, 1);
  check("six-real-concurrent-claims-one-attempt");
  await assert.rejects(repo.claim(actor, scope, { ...command, language: "en" }, key), { code: "IDEMPOTENCY_CONFLICT" });
  check("canonical-payload-conflict-no-second-claim");
  const emptyMetadata = { provider: "META", transport: "INJECTED", model: null, reasoningEffort: "medium", attempts: 0, latencyMs: 0, processingMayHaveOccurred: false, requestId: null, inputTokens: null, outputTokens: null, estimatedCostUsd: null };
  await repo.transition(concurrent[0].attempt.id, "fail", null, emptyMetadata, "NOT_CONFIGURED");
  assert.equal((await repo.claim(actor, scope, command, key)).attempt.state, "FAILED");
  await assert.rejects(repo.claim(actor, scope, command, randomUUID()), { code: "EXPLANATION_RETRY_REQUIRED" });
  command.retryOf = concurrent[0].attempt.id;
  const crossKeys = await Promise.all(Array.from({ length: 6 }, () => repo.claim(actor, scope, command, randomUUID())));
  assert.equal(crossKeys.filter(r => r.claimed).length, 1); assert.equal(new Set(crossKeys.map(r => r.attempt.id)).size, 1);
  check("different-keys-share-active-group-explicit-retry-only");
  await repo.transition(crossKeys[0].attempt.id, "fail", null, emptyMetadata, "NOT_CONFIGURED"); command.retryOf = crossKeys[0].attempt.id;
  const facts = loadingExplanationFacts(p, groupId);
  const plan = { schemaVersion: "1.0", reconciliationId: facts.reconciliationId, reconciliationVersion: facts.reconciliationVersion, comparisonStatus: "DIFFERENCE_PROPOSED", summaryFact: "COMPARATOR_DIFFERENCE",
    reasonFacts: ["SESSION_CLOSED", "EVIDENCE_SUFFICIENT", "SAME_UNIT", "REFERENCED_EVENTS"], suggestedActions: ["REVIEW_EVIDENCE", "CHECK_MANIFEST"], evidenceRefs: facts.events.slice(0, 1), requiresHumanReview: true };
  const provider: ExplanationProvider = { transport: "INJECTED", configuration: () => ({ model: "muse-spark-1.3", timeoutMs: 2000, maxOutputTokens: 2048 }),
    requestJson: async () => { inferenceCalls++; return { content: JSON.stringify(plan), model: "muse-spark-1.3", requestId: "injected-local-acceptance", usage: { inputTokens: 1, outputTokens: 1 } }; } };
  const service = new PassportExplanationService({ operations: new LoadingOperationService(createLoadingOperationRepository(reader as unknown as LoadingRpcClient)), repository: repo, provider });
  const generateKey = randomUUID(), generated = await service.generate(actor, scope, command, generateKey);
  assert.equal(generated.data.status, "SAVED"); assert.equal(inferenceCalls, 1);
  assert.match(generated.data.explanation!.summary, /esperado 10 BOX; observado 8 BOX; diferencia registrada 2 BOX/);
  check("real-database-grounded-injected-generation-and-atomic-save");
  const recovered = PassportExplanationReplySchema.parse(await http(path, command, generateKey));
  assert.equal(recovered.data.attempt!.id, generated.data.attempt!.id); assert.deepEqual(recovered.data.explanation, generated.data.explanation);
  assert.equal(inferenceCalls, 1); check("lost-response-http-replay-recovers-exact-saved-explanation");
  const reopened = await http(base + `/passports/${p.id}`);
  assert.deepEqual(reopened.data.explanations[0].value, generated.data.explanation);
  const statuses = PassportExplanationListSchema.parse(await http(path));
  assert.equal(statuses.data.attempts[0].metadata!.transport, "INJECTED"); check("reopen-preserves-explanation-and-recorded-origin");
  await http(path, undefined, undefined, 401, "");
  await http(path, undefined, undefined, 404, foreign);
  await http(path, command, randomUUID(), 404, foreign); check("unauthenticated-and-other-organization-denied");
  const direct = await fetch(url + "/rest/v1/rpc/meta_complete_passport_explanation_v1", { method: "POST", headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_attempt_id: generated.data.attempt!.id, p_action: "fail", p_error_code: "NOT_CONFIGURED" }) });
  assert.equal(direct.status, 403); check("browser-cannot-call-privileged-writer");
  await coverage("COMPLETE", "[SYNTHETIC] New revision to test stale response guards");
  await http(path, command, randomUUID(), 409); check("historical-passport-still-readable-but-cannot-generate");
  const stagedPassport = await passport(), stagedScope = { sessionId, passportId: stagedPassport.id };
  const stagedCommand = { ...command, expectedVersion: stagedPassport.sessionVersion, retryOf: null };
  const stageClaim = await repo.claim(actor, stagedScope, stagedCommand, randomUUID());
  const stagedFacts = loadingExplanationFacts(stagedPassport, groupId);
  const stagedValue = renderGroundedExplanation(stagedFacts, { ...plan, reconciliationVersion: stagedFacts.reconciliationVersion, reconciliationId: stagedFacts.reconciliationId }, "es");
  await repo.transition(stageClaim.attempt.id, "stage", stagedValue, { ...emptyMetadata, model: "muse-spark-1.3", attempts: 1, processingMayHaveOccurred: true });
  const changed = structuredClone(payload); changed.cargoSpecification.units[0].quantity = 12; changed.cargoSpecification.totalWeightKg = 120; changed.cargoSpecification.totalVolumeM3 = 1.2;
  const revision = (await http(`/freight/requests/${request.id}/revisions`, { expectedDraftVersion: 1, value: changed })).data;
  await assert.rejects(repo.transition(stageClaim.attempt.id, "complete", stagedValue, null), { code: "STALE_PASSPORT" });
  assert.equal((await http(base + `/passports/${stagedPassport.id}`)).data.explanations.length, 0);
  check("material-change-between-generation-and-write-rejects-stale-result");
  await http(`/freight/requests/${request.id}/revisions`, { expectedDraftVersion: revision.draftVersion, value: payload });
  await coverage("COMPLETE", "[SYNTHETIC] Fresh UI acceptance Passport");
  let ui = await passport();
  if (!process.argv.includes("--live")) {
    const expiryScope = { sessionId, passportId: ui.id }, expiryCommand = { ...command, expectedVersion: ui.sessionVersion, retryOf: null };
    const expiryKey = randomUUID(), expiring = await repo.claim(actor, expiryScope, expiryCommand, expiryKey);
    const container = url.endsWith(":65321") ? "supabase_db_meta-luis-media-local" : "supabase_db_cargomesh-v2-local";
    // Test-only clock fixture. Never add a runtime endpoint for changing deadlines.
    const updated = spawnSync("docker", ["exec", "-i", container, "psql", "-X", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], {
      input: `update private.meta_passport_explanation_attempts set deadline_at=now()-interval '1 second' where id='${expiring.attempt.id}';`, encoding: "utf8",
    });
    assert.equal(updated.status, 0, "Local test clock fixture failed");
    const expired = (await repo.list(actor, expiryScope)).find(a => a.id === expiring.attempt.id)!;
    assert.equal(expired.state, "FAILED"); assert.equal(expired.errorCode, "GENERATION_INTERRUPTED"); assert.equal(expired.processingMayHaveOccurred, true);
    assert.equal((await repo.claim(actor, expiryScope, expiryCommand, expiryKey)).attempt.state, "FAILED");
    check("expired-attempt-is-uncertain-and-never-automatically-reprocessed");
    const replacement = await repo.claim(actor, expiryScope, { ...expiryCommand, retryOf: expiring.attempt.id }, randomUUID());
    assert.equal(replacement.claimed, true);
    const late = await repo.transition(expiring.attempt.id, "stage", stagedValue, emptyMetadata);
    assert.equal(late.recorded, false);
    assert.equal((await repo.list(actor, expiryScope)).find(a => a.id === replacement.attempt.id)!.state, "RUNNING");
    await repo.transition(replacement.attempt.id, "fail", null, emptyMetadata, "NOT_CONFIGURED");
    check("explicit-new-attempt-fences-late-expired-result");
    await coverage("COMPLETE", "[SYNTHETIC] Final fresh Passport for optional UI acceptance");
    ui = await passport();
  }
  const uiHref = `${origin}/tetris?session=${sessionId}&passport=${ui.id}`;
  if (process.argv.includes("--live")) {
    const result = PassportExplanationReplySchema.parse(await http(base + `/passports/${ui.id}/explanations`, { ...command, expectedVersion: ui.sessionVersion, retryOf: null }));
    assert.equal(result.data.status, "SAVED"); assert.equal(result.data.attempt!.metadata!.transport, "META_MODEL_API");
    check("real-meta-through-authenticated-http-and-persistent-passport");
  }
  const result = { passed, injectedProviderCalls: inferenceCalls, liveInference: process.argv.includes("--live"), synthetic: true, commercialWrites: 0,
    requestId: request.id, sessionId, passportId: ui.id, groupId, sessionVersion: ui.sessionVersion, uiHref };
  if (process.env.PASSPORT_EXPLANATION_RESULT) await writeFile(process.env.PASSPORT_EXPLANATION_RESULT, JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Passport integration failed"); process.exitCode = 1; });
