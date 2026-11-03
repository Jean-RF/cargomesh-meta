import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import type { AuthenticatedMemberContext } from '@/server/auth/member';
import { transcribeEvidence, type AudioEvidenceAccess, type AuthorizedAudio, type SpeechProvider } from './transcribe';
import { waveFixture } from './wave.fixture';

const id = (suffix: number) => `ab100000-0000-4000-8000-${String(suffix).padStart(12, '0')}`;
const member: AuthenticatedMemberContext = { userId: id(1), memberId: id(2), organizationId: id(3), userEmail: 'private-actor@example.test', role: 'REQUESTER', status: 'ACTIVE' };
const input = { schemaVersion: '1.0', evidenceId: id(4), inputRevision: 3, language: 'es' };
const reply = () => ({ transcript: 'Son doce pallets de piezas de maquinaria.', audioDurationMs: 1000, sessionId: 'synthetic-test-session', requestId: 'synthetic-test-request' });
function setup() {
  let calls = 0, reads = 0, checks = 0, isConfigured = true;
  let audio: AuthorizedAudio | null = { evidenceId: id(4), organizationId: id(3), inputRevision: 3, state: 'ACTIVE', bytes: waveFixture(), contentSha256: '' };
  audio.contentSha256 = createHash('sha256').update(audio.bytes).digest('hex');
  let current: 'CURRENT' | 'DENIED' | 'STALE' = 'CURRENT';
  let invoke: SpeechProvider['transcribe'] = async () => reply();
  const evidence: AudioEvidenceAccess = {
    readAuthorized: async reference => { reads++; assert.equal('userEmail' in reference.actor, false); return audio; },
    checkCurrent: async () => { checks++; return current; },
  };
  const provider: SpeechProvider = { transport: 'INJECTED',
    configuration: () => isConfigured ? { model: 'muse-voice-transcribe-1.0', timeoutMs: 45_000 } : null,
    transcribe: async request => { calls++; assert.deepEqual(Object.keys(request).sort(), ['audio', 'language', 'signal']); return invoke(request); },
  };
  return { evidence, provider, run: (options = {}) => transcribeEvidence(input, member, { evidence, provider }, options),
    counts: () => ({ calls, reads, checks }), setAudio: (value: AuthorizedAudio | null) => { audio = value; },
    audio: () => audio!, deny: () => { current = 'DENIED'; }, stale: () => { current = 'STALE'; },
    unconfigure: () => { isConfigured = false; }, invoke: (value: SpeechProvider['transcribe']) => { invoke = value; } };
}

test('authorized transcription is reviewable, scoped, has one attempt and unknown cost', async () => {
  const app = setup(), result = await app.run(); assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.transcription.text, reply().transcript); assert.equal(result.transcription.evidenceId, input.evidenceId);
  assert.equal(result.transcription.inputRevision, 3); assert.equal(result.transcription.requiresHumanConfirmation, true);
  assert.equal(result.metadata.transport, 'INJECTED'); assert.equal(result.metadata.estimatedCostUsd, null);
  assert.deepEqual(app.counts(), { calls: 1, reads: 1, checks: 2 });
});
test('missing configuration does not read media or call a provider', async () => {
  const app = setup(); app.unconfigure(); const result = await app.run();
  assert.equal(!result.ok && result.error.code, 'NOT_CONFIGURED'); assert.deepEqual(app.counts(), { calls: 0, reads: 0, checks: 0 });
});
test('injected browser tenant, URLs and malformed input never start a read', async () => {
  for (const extra of [{ organizationId: id(99) }, { url: 'https://untrusted.invalid/private' }, { inputRevision: -1 }]) {
    const app = setup(), result = await transcribeEvidence({ ...input, ...extra }, member, app);
    assert.equal(!result.ok && result.error.code, 'VALIDATION_ERROR'); assert.equal(app.counts().reads, 0);
  }
});
test('inactive member, foreign/revoked evidence or a stale revision cannot reach Meta', async () => {
  const inactive = setup(), denied = await transcribeEvidence(input, { ...member, status: 'INACTIVE' }, inactive);
  assert.equal(!denied.ok && denied.error.code, 'FORBIDDEN_TENANT'); assert.equal(inactive.counts().calls, 0);
  for (const change of [{ organizationId: id(99) }, { evidenceId: id(99) }, { state: 'REVOKED' as const }, { inputRevision: 2 }]) {
    const app = setup(); app.setAudio({ ...app.audio(), ...change }); const result = await app.run();
    assert.equal(result.ok, false); assert.equal(app.counts().calls, 0);
  }
  const absent = setup(); absent.setAudio(null); assert.equal((await absent.run()).ok, false);
});
test('bad WAV, metadata-only trust and changed bytes are rejected before invoking', async () => {
  for (const bytes of [waveFixture({ channels: 2 }), waveFixture({ rate: 44_100 }), waveFixture({ frames: 16_000 * 600 + 1 })]) {
    const app = setup(); app.setAudio({ ...app.audio(), bytes, contentSha256: createHash('sha256').update(bytes).digest('hex') });
    const result = await app.run(); assert.equal(!result.ok && result.error.code, 'MEDIA_INVALID'); assert.equal(app.counts().calls, 0);
  }
  const app = setup(); app.audio().bytes[50] = 1; const changed = await app.run();
  assert.equal(!changed.ok && changed.error.code, 'MEDIA_INVALID'); assert.equal(app.counts().calls, 0);
});
test('access lost immediately before invoking prevents provider work', async () => {
  const app = setup(); app.deny(); const result = await app.run();
  assert.equal(!result.ok && result.error.code, 'FORBIDDEN_TENANT'); assert.equal(app.counts().calls, 0);
});
test('manual correction or revoked access during the provider response discards that response', async () => {
  for (const action of ['stale', 'deny'] as const) {
    const app = setup(); app.invoke(async () => { app[action](); return reply(); });
    const result = await app.run(); assert.equal(result.ok, false);
    assert.equal(!result.ok && result.error.code, action === 'stale' ? 'INPUT_REVISION_MISMATCH' : 'FORBIDDEN_TENANT');
    assert.equal(app.counts().calls, 1); assert.equal('transcription' in result, false);
  }
});
test('silence is an EMPTY reviewable transcript, not zero cargo or guessed text', async () => {
  const app = setup(); app.invoke(async () => ({ ...reply(), transcript: ' \n ' }));
  const result = await app.run(); assert.equal(result.ok, true);
  if (result.ok) { assert.equal(result.transcription.status, 'EMPTY'); assert.equal(result.transcription.text, ''); }
});
test('incomplete/oversized provider text, extra fields and false durations fail without truncating', async () => {
  for (const change of [{ transcript: undefined }, { transcript: 'x'.repeat(6001) }, { audioDurationMs: 50_000 }, { price: 5 }]) {
    const app = setup(); app.invoke(async () => ({ ...reply(), ...change }) as ReturnType<typeof reply>);
    const result = await app.run(); assert.equal(!result.ok && result.error.code, 'MODEL_OUTPUT_INVALID');
    assert.equal(app.counts().calls, 1); assert.equal('transcription' in result, false);
  }
});
test('provider failures are sanitized and never automatically retried', async () => {
  const app = setup(); app.invoke(async () => { throw Error('SECRET_PRIVATE_AUDIO_TRANSCRIPT'); });
  const result = await app.run(); assert.equal(!result.ok && result.error.code, 'PROVIDER_UNAVAILABLE');
  assert.equal(app.counts().calls, 1); assert.equal(result.metadata.processingMayHaveOccurred, true);
  assert.ok(!JSON.stringify(result).includes('SECRET_PRIVATE_AUDIO_TRANSCRIPT'));
});
test('cancel before starting performs no IO and does not echo an abort reason', async () => {
  const app = setup(), controller = new AbortController(); controller.abort('PRIVATE_ABORT_REASON');
  await assert.rejects(app.run({ signal: controller.signal }), error => error instanceof DOMException && error.name === 'AbortError' && !error.message.includes('PRIVATE_ABORT_REASON'));
  assert.deepEqual(app.counts(), { calls: 0, reads: 0, checks: 0 });
});

test('non-finite, fractional or out-of-range deadlines cannot silently become a provider budget', async () => {
  for (const deadlineMs of [Infinity, NaN, 0, -1, 1.5, 45_001]) {
    const app = setup(), result = await app.run({ deadlineMs });
    assert.equal(!result.ok && result.error.code, 'VALIDATION_ERROR'); assert.equal(app.counts().reads, 0);
  }
});

test('a dependency rejecting in the same turn as cancellation does not leak an unhandled rejection', async () => {
  const app = setup(), controller = new AbortController();
  app.invoke(async () => { controller.abort('private'); throw new Error('private dependency'); });
  await assert.rejects(app.run({ signal: controller.signal }), { name: 'AbortError' });
});
test('deadline also bounds a dependency that ignores the cancellation signal', async () => {
  const app = setup(); app.invoke(async () => new Promise(() => {}));
  const result = await app.run({ deadlineMs: 10 });
  assert.equal(!result.ok && result.error.code, 'PROVIDER_UNAVAILABLE'); assert.equal(app.counts().calls, 1);
  assert.equal(result.metadata.processingMayHaveOccurred, true);
});
test('a late response after cancellation never produces a successful transcription', async () => {
  const app = setup(), controller = new AbortController(); let finish!: (result: ReturnType<typeof reply>) => void;
  app.invoke(async () => { controller.abort('PRIVATE'); return new Promise(resolve => { finish = resolve; }); });
  await assert.rejects(app.run({ signal: controller.signal }), { name: 'AbortError' });
  finish(reply()); await new Promise(resolve => setImmediate(resolve)); assert.equal(app.counts().checks, 1);
});
