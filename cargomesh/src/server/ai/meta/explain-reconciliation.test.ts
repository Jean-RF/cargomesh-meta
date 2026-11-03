import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type { AuthenticatedMemberContext } from '@/server/auth/member';
import { ExplanationInputSchema, type ExplanationInput } from '@/shared/schemas/meta/reconciliation-explanation';
import { ExplanationPlanShapeSchema, renderGroundedExplanation } from '@/shared/schemas/meta/explanation-plan';
import {
  explainReconciliation, explanationFactsFingerprint,
  type AuthorizedReconciliation, type ExplanationProvider, type ReconciliationAccess,
} from './explain-reconciliation';

// Contract examples only: no model inference, real cargo or physical video evidence.
const fixture = JSON.parse(readFileSync(new URL('../../../../../docs/meta/contracts/fixtures/luis-v1.json', import.meta.url), 'utf8')).explanation;
const id = (suffix: number) => `ab030000-0000-4000-8000-${String(suffix).padStart(12, '0')}`;
const member: AuthenticatedMemberContext = {
  userId: id(11), memberId: id(12), organizationId: id(13), role: 'REQUESTER', status: 'ACTIVE',
  userEmail: 'private-actor@example.test',
};
const request = { schemaVersion: '1.0', reconciliationId: fixture.input.reconciliationId, reconciliationVersion: 2, language: 'es' };
const plan = () => ({
  schemaVersion: '1.0', reconciliationId: fixture.input.reconciliationId, reconciliationVersion: 2,
  comparisonStatus: 'DIFFERENCE_PROPOSED', summaryFact: 'COMPARATOR_DIFFERENCE',
  reasonFacts: ['SESSION_CLOSED', 'EVIDENCE_SUFFICIENT', 'SAME_UNIT', 'REFERENCED_EVENTS'],
  suggestedActions: ['REVIEW_EVIDENCE', 'REQUEST_HUMAN_REVIEW'],
  evidenceRefs: structuredClone(fixture.input.events), requiresHumanReview: true,
});
const reply = (output: unknown = plan()) => ({
  content: JSON.stringify(output), model: 'muse-spark-1.3', requestId: 'synthetic-explanation-request',
  usage: { inputTokens: 100, outputTokens: 200 },
});
function setup() {
  let calls = 0, reads = 0, checks = 0, isConfigured = true;
  let snapshot: AuthorizedReconciliation | null = { organizationId: member.organizationId, state: 'ACTIVE', facts: structuredClone(fixture.input) };
  let state: 'CURRENT' | 'STALE' | 'DENIED' = 'CURRENT';
  let invoke: ExplanationProvider['requestJson'] = async () => reply();
  const reconciliation: ReconciliationAccess = {
    readAuthorized: async reference => {
      reads++; assert.deepEqual(Object.keys(reference.actor).sort(), ['memberId', 'organizationId', 'userId']);
      assert.equal(reference.actor.organizationId, member.organizationId); return snapshot;
    },
    checkCurrent: async reference => {
      checks++; assert.equal(reference.factsFingerprint, explanationFactsFingerprint(snapshot!.facts)); return state;
    },
  };
  const provider: ExplanationProvider = {
    transport: 'INJECTED', configuration: () => isConfigured ? { model: 'muse-spark-1.3', timeoutMs: 45_000, maxOutputTokens: 2_048 } : null,
    requestJson: async data => { calls++; return invoke(data); },
  };
  return {
    reconciliation, provider, run: (options = {}) => explainReconciliation(request, member, { reconciliation, provider }, options),
    counts: () => ({ calls, reads, checks }), snapshot: () => snapshot!,
    setSnapshot: (value: AuthorizedReconciliation | null) => { snapshot = value; },
    setFacts: (value: ExplanationInput) => { snapshot!.facts = value; }, unconfigure: () => { isConfigured = false; },
    state: (value: typeof state) => { state = value; }, invoke: (value: typeof invoke) => { invoke = value; },
  };
}

test('closed 12/11 comparison renders supplied difference, reasons, validated events and human proposals', async () => {
  const app = setup(), before = JSON.stringify(app.snapshot()), result = await app.run();
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.match(result.explanation!.summary, /esperado 12 PALLET; observado 11 PALLET; diferencia registrada 1 PALLET/);
  assert.equal(result.explanation!.requiresHumanReview, true); assert.equal(result.explanation!.reasons.length, 4);
  assert.deepEqual(result.explanation!.evidenceRefs, fixture.input.events); assert.equal(result.guidance, null);
  assert.equal(result.metadata.transport, 'INJECTED'); assert.equal(result.metadata.estimatedCostUsd, null);
  assert.equal(result.metadata.inputTokens, 100); assert.equal(result.metadata.outputTokens, 200);
  assert.deepEqual(app.counts(), { calls: 1, reads: 1, checks: 2 });
  assert.equal(JSON.stringify(app.snapshot()), before); // No manifest/session/review writes exist in these ports.
});

test('shared client port receives strict JSON Schema, medium reasoning and only authorized facts', async () => {
  const app = setup();
  app.invoke(async data => {
    assert.equal(data.reasoningEffort, 'medium'); assert.equal(data.responseFormat.type, 'json_schema');
    assert.equal(data.responseFormat.json_schema.strict, true);
    assert.equal(data.responseFormat.json_schema.schema?.additionalProperties, false);
    assert.deepEqual(data.payload, fixture.input);
    assert.equal(JSON.stringify(data).includes(member.userEmail), false);
    assert.equal('organizationId' in data.payload, false); assert.equal('tools' in data, false);
    data.payload.expectedQuantity = 999; // A client cannot mutate the retained authorized snapshot.
    return reply();
  });
  const result = await app.run();
  assert.equal(result.ok && result.facts.expectedQuantity, 12);
  assert.equal(result.ok && result.metadata.reasoningEffort, 'medium');
});

test('match, BOX, unknown usage and English copy retain the supplied values', async () => {
  const app = setup(); app.setFacts({ ...fixture.input, comparisonStatus: 'MATCH', expectedUnit: 'BOX', observedUnit: 'BOX',
    expectedQuantity: 0, observedQuantity: 0, differenceQuantity: 0 });
  app.invoke(async () => ({ ...reply({ ...plan(), comparisonStatus: 'MATCH', summaryFact: 'COMPARATOR_MATCH' }), usage: null }));
  const result = await explainReconciliation({ ...request, language: 'en' }, member, app);
  assert.equal(result.ok, true); if (!result.ok) return;
  assert.match(result.explanation!.summary, /expected 0 BOX; observed 0 BOX; recorded difference 0 BOX/);
  assert.match(result.explanation!.summary, /Counts match/); assert.equal(result.metadata.inputTokens, null);
});

test('renderer copies the signed difference from Juan, without calculating or correcting it', async () => {
  const app = setup(); app.setFacts({ ...fixture.input, expectedQuantity: 11, observedQuantity: 12, differenceQuantity: -1 });
  const result = await app.run(); assert.equal(result.ok, true);
  if (result.ok) assert.match(result.explanation!.summary, /diferencia registrada -1 PALLET/);
  const authoritative = { ...fixture.input, differenceQuantity: 7 };
  assert.match(renderGroundedExplanation(authoritative, plan(), 'es').summary, /diferencia registrada 7 PALLET/);
});

test('open and uncertain sessions show domain guidance without calling or requiring Meta', async () => {
  for (const comparisonStatus of ['NOT_READY', 'INSUFFICIENT_EVIDENCE', 'INCOMPATIBLE_SCOPE', 'OUTDATED'] as const) {
    const app = setup(); app.unconfigure();
    app.setFacts({ ...fixture.incomplete, comparisonStatus,
      observedQuantity: comparisonStatus === 'INCOMPATIBLE_SCOPE' ? 11 : null,
      observedUnit: comparisonStatus === 'INCOMPATIBLE_SCOPE' ? 'BOX' : null });
    const result = await app.run(); assert.equal(result.ok, true);
    if (!result.ok) continue;
    assert.equal(result.explanation, null); assert.equal(result.guidance!.source, 'DOMAIN_STATUS');
    assert.equal(result.facts.differenceQuantity, null); assert.equal(result.metadata.attempts, 0);
    assert.equal(result.metadata.processingMayHaveOccurred, false); assert.equal(result.metadata.model, null);
    if (comparisonStatus === 'NOT_READY') {
      assert.match(result.guidance!.summary, /progreso/);
      assert.equal(result.guidance!.suggestedActions.includes('WAIT_FOR_SESSION_CLOSE'), true);
    }
    assert.equal(app.counts().calls, 0);
  }
});

test('closed insufficient evidence suggests more evidence rather than waiting for an already closed session', async () => {
  const app = setup(); app.setFacts({ ...fixture.incomplete, sessionClosed: true, comparisonStatus: 'INSUFFICIENT_EVIDENCE' });
  const result = await app.run(); assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.guidance!.suggestedActions, ['RECORD_MORE_EVIDENCE', 'REQUEST_HUMAN_REVIEW']);
  assert.equal(app.counts().calls, 0);
});

test('missing or invalid shared model configuration does not invoke Meta', async () => {
  for (const configuration of [null, { model: 'muse-spark-1.3-contributor', timeoutMs: 1000, maxOutputTokens: 2048 },
    { model: 'arbitrary-model', timeoutMs: 1000, maxOutputTokens: 2048 },
    { model: 'muse-spark-1.3', timeoutMs: 60_000, maxOutputTokens: 2048 },
    { model: 'muse-spark-1.3', timeoutMs: 1000, maxOutputTokens: 99999 }]) {
    const app = setup(); app.provider.configuration = () => configuration;
    const result = await app.run(); assert.equal(!result.ok && result.error.code, 'NOT_CONFIGURED');
    assert.equal(app.counts().calls, 0);
  }
  const app = setup(); app.provider.configuration = () => { throw new Error('private config'); };
  assert.equal((await app.run()).ok, false);
});

test('browser facts, tenant, URLs, commands and bad revisions cannot authorize a read', async () => {
  for (const extra of [{ organizationId: id(99) }, { facts: fixture.input }, { observedQuantity: 11 },
    { url: 'https://untrusted.invalid/private' }, { confirm: true }, { reconciliationVersion: -1 }, { language: 'arbitrary' }]) {
    const app = setup(), result = await explainReconciliation({ ...request, ...extra }, member, app);
    assert.equal(!result.ok && result.error.code, 'VALIDATION_ERROR'); assert.equal(app.counts().reads, 0);
  }
});

test('inactive actor, absent/foreign/revoked snapshots and other identities are denied', async () => {
  for (const change of [{ status: 'INACTIVE' }, { organizationId: 'not-uuid' }, { role: 'ADMIN' }]) {
    const app = setup(), result = await explainReconciliation(request, { ...member, ...change } as AuthenticatedMemberContext, app);
    assert.equal(!result.ok && result.error.code, 'FORBIDDEN_TENANT'); assert.equal(app.counts().reads, 0);
  }
  for (const snapshot of [null, { ...setup().snapshot(), organizationId: id(99) },
    { ...setup().snapshot(), state: 'REVOKED' as const },
    { ...setup().snapshot(), facts: { ...fixture.input, reconciliationId: id(99) } }]) {
    const app = setup(); app.setSnapshot(snapshot); const result = await app.run();
    assert.equal(!result.ok && result.error.code, 'FORBIDDEN_TENANT'); assert.equal(app.counts().calls, 0);
  }
});

test('stale or invalid authoritative comparisons never reach the provider', async () => {
  const stale = setup(); stale.setFacts({ ...fixture.input, reconciliationVersion: 1 });
  const result = await stale.run(); assert.equal(!result.ok && result.error.code, 'INPUT_REVISION_MISMATCH');
  for (const change of [{ sessionClosed: false }, { evidenceSufficient: false }, { observedUnit: 'BOX' },
    { observationRevision: null }, { observedQuantity: null }, { comparisonStatus: 'MATCH', differenceQuantity: 1 }]) {
    const app = setup(); app.setFacts({ ...fixture.input, ...change });
    const attempt = await app.run(); assert.equal(!attempt.ok && attempt.error.code, 'VALIDATION_ERROR');
    assert.equal(app.counts().calls, 0);
  }
});

test('access/revision is rechecked before the request and after the response', async () => {
  for (const state of ['DENIED', 'STALE'] as const) for (const late of [false, true]) {
    const app = setup();
    if (late) app.invoke(async () => { app.state(state); return reply(); }); else app.state(state);
    const result = await app.run(); assert.equal(result.ok, false);
    assert.equal(!result.ok && result.error.code, state === 'STALE' ? 'INPUT_REVISION_MISMATCH' : 'FORBIDDEN_TENANT');
    assert.equal(app.counts().calls, late ? 1 : 0);
    assert.equal('explanation' in result, false); assert.equal('facts' in result, false);
  }
});

test('currency fingerprint covers counts, quality, close, event references and all revisions', () => {
  const original = explanationFactsFingerprint(fixture.input);
  for (const change of [{ expectedQuantity: 13 }, { manifestRevision: 4 }, { observationRevision: 2 },
    { reconciliationVersion: 3 }, { sessionId: id(99) }, { events: [{ ...fixture.input.events[0], timecodeMs: 8200 }] },
    { comparisonStatus: 'INSUFFICIENT_EVIDENCE', evidenceSufficient: false, differenceQuantity: null },
    { comparisonStatus: 'NOT_READY', sessionClosed: false, differenceQuantity: null }]) {
    assert.notEqual(explanationFactsFingerprint({ ...fixture.input, ...change }), original);
  }
  assert.equal(explanationFactsFingerprint(ExplanationInputSchema.parse(fixture.input)), original);
});

test('an updated manifest, observation or event invalidates the response even without a reconciliation version bump', async () => {
  for (const change of [{ manifestRevision: 4 }, { observationRevision: 2 },
    { events: [{ ...fixture.input.events[0], timecodeMs: 8200 }] },
    { comparisonStatus: 'INSUFFICIENT_EVIDENCE', evidenceSufficient: false, differenceQuantity: null }]) {
    const app = setup();
    app.reconciliation.checkCurrent = async reference => explanationFactsFingerprint(app.snapshot().facts) === reference.factsFingerprint ? 'CURRENT' : 'STALE';
    app.invoke(async () => { app.setFacts({ ...fixture.input, ...change }); return reply(); });
    const result = await app.run(); assert.equal(!result.ok && result.error.code, 'INPUT_REVISION_MISMATCH');
    assert.equal('explanation' in result, false); assert.equal(app.counts().calls, 1);
  }
});

test('invented identities, event IDs, evidence and timecodes reject the whole explanation', async () => {
  for (const change of [{ reconciliationId: id(99) }, { reconciliationVersion: 1 },
    ...[{ eventId: id(99) }, { evidenceId: id(99) }, { timecodeMs: 99999 }]
      .map(value => ({ evidenceRefs: [{ ...fixture.input.events[0], ...value }] }))]) {
    const app = setup(); app.invoke(async () => reply({ ...plan(), ...change }));
    const result = await app.run(); assert.equal(!result.ok && result.error.code, 'MODEL_OUTPUT_INVALID');
  }
});

test('prose with invented causes/counts and commands cannot pass the structured plan', async () => {
  for (const change of [{ summary: 'Se perdieron 5 pallets por robo.' }, { differenceQuantity: 5 },
    { cause: 'THEFT' }, { confirmBooking: true }, { requiresHumanReview: false },
    { suggestedActions: ['CREATE_INCIDENT'] }, { suggestedActions: ['WAIT_FOR_SESSION_CLOSE'] },
    { summaryFact: 'COMPARATOR_MATCH' }, { reasonFacts: ['THEFT'] },
    { reasonFacts: ['SESSION_CLOSED', 'SESSION_CLOSED'] },
    { suggestedActions: ['REQUEST_HUMAN_REVIEW', 'REQUEST_HUMAN_REVIEW'] },
    { evidenceRefs: [fixture.input.events[0], fixture.input.events[0]] }]) {
    const app = setup(); app.invoke(async () => reply({ ...plan(), ...change }));
    const result = await app.run(); assert.equal(!result.ok && result.error.code, 'MODEL_OUTPUT_INVALID');
  }
  assert.equal(ExplanationPlanShapeSchema.safeParse(fixture.output).success, false); // Not the provider plan schema.
});

test('no events means no reference reason or review-evidence suggestion', async () => {
  const app = setup(); app.setFacts({ ...fixture.input, events: [] });
  app.invoke(async () => reply({ ...plan(), evidenceRefs: [] }));
  assert.equal((await app.run()).ok, false);
  app.invoke(async () => reply({ ...plan(), reasonFacts: ['SESSION_CLOSED'], evidenceRefs: [], suggestedActions: ['CHECK_MANIFEST'] }));
  const valid = await app.run(); assert.equal(valid.ok, true);
  if (valid.ok) assert.deepEqual(valid.explanation!.evidenceRefs, []);
});

test('invalid JSON, truncated content, wrong model and malformed usage are rejected', async () => {
  for (const value of [{ ...reply(), content: '' }, { ...reply(), content: '{' }, { ...reply(), content: 'x'.repeat(32_769) },
    { ...reply(), model: 'muse-spark-unknown' }, { ...reply(), usage: { inputTokens: -1, outputTokens: 2 } },
    { ...reply(), rawPrivateResponse: 'private' }, null]) {
    const app = setup(); app.invoke(async () => value);
    const result = await app.run(); assert.equal(!result.ok && result.error.code, 'MODEL_OUTPUT_INVALID');
    assert.equal(app.counts().calls, 1);
  }
});

test('provider failures (401/429/500) are sanitized, never retried and never change Juan facts', async () => {
  for (const status of [401, 429, 500]) {
    const app = setup(), before = JSON.stringify(app.snapshot());
    app.invoke(async () => { throw Object.assign(new Error('private token, evidence URL and prompt'), { status }); });
    const result = await app.run(); assert.equal(!result.ok && result.error.code, 'PROVIDER_UNAVAILABLE');
    assert.equal(!result.ok && result.error.retryable, false); assert.equal(app.counts().calls, 1);
    assert.equal(result.metadata.processingMayHaveOccurred, true); assert.equal(result.metadata.estimatedCostUsd, null);
    assert.equal(JSON.stringify(result).includes('private'), false); assert.equal(JSON.stringify(app.snapshot()), before);
  }
});

test('caller cancellation does no work and never leaks a private cancellation reason', async () => {
  const app = setup(), controller = new AbortController(); controller.abort(new Error('private cancellation'));
  await assert.rejects(app.run({ signal: controller.signal }), error => error instanceof DOMException &&
    error.name === 'AbortError' && !error.message.includes('private'));
  assert.equal(app.counts().reads, 0);
});

test('a dependency rejecting in the same turn as cancellation does not leak an unhandled rejection', async () => {
  const app = setup(), controller = new AbortController();
  app.invoke(async () => { controller.abort('private'); throw new Error('private dependency'); });
  await assert.rejects(app.run({ signal: controller.signal }), { name: 'AbortError' });
});

test('deadline also bounds an authorized lookup that ignores cancellation', async () => {
  const app = setup(); app.reconciliation.readAuthorized = async () => new Promise(() => {});
  const result = await app.run({ deadlineMs: 20 });
  assert.equal(!result.ok && result.error.code, 'PROVIDER_UNAVAILABLE'); assert.equal(app.counts().calls, 0);
  assert.equal(result.metadata.processingMayHaveOccurred, false);
});

test('provider ignoring cancellation cannot keep the request open or return a late explanation', async () => {
  const app = setup(); app.invoke(async () => new Promise(() => {}));
  const result = await app.run({ deadlineMs: 20 });
  assert.equal(!result.ok && result.error.code, 'PROVIDER_UNAVAILABLE'); assert.equal(app.counts().calls, 1);
  assert.equal(result.metadata.processingMayHaveOccurred, true); assert.equal('explanation' in result, false);
  const cancelledApp = setup(), controller = new AbortController();
  cancelledApp.invoke(async () => { controller.abort('private'); return reply(); });
  await assert.rejects(cancelledApp.run({ signal: controller.signal }), { name: 'AbortError' });
});

test('invalid deadlines do no IO', async () => {
  for (const deadlineMs of [0, -1, 45_001, NaN]) {
    const app = setup(), result = await app.run({ deadlineMs });
    assert.equal(!result.ok && result.error.code, 'VALIDATION_ERROR'); assert.equal(app.counts().reads, 0);
  }
});

test('configured timeout still applies while rechecking access after a fast provider response', async context => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  const app = setup(); let checks = 0, entered!: () => void;
  const rechecking = new Promise<void>(resolve => { entered = resolve; });
  app.provider.configuration = () => ({ model: 'muse-spark-1.3', timeoutMs: 1000, maxOutputTokens: 2048 });
  app.reconciliation.checkCurrent = async () => {
    if (++checks === 1) return 'CURRENT';
    entered(); return new Promise(() => {});
  };
  const pending = app.run({ deadlineMs: 45_000 });
  await rechecking; context.mock.timers.tick(1000);
  const result = await pending;
  assert.equal(!result.ok && result.error.code, 'PROVIDER_UNAVAILABLE'); assert.equal(app.counts().calls, 1);
  assert.equal(result.metadata.latencyMs, 1000); // The configured budget, not the 45-second outer ceiling.
});
