import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import type { AuthenticatedMemberContext } from '@/server/auth/member';
import { metaSpeechProvider, transcribeEvidence, type AudioEvidenceAccess } from './transcribe';
import { waveFixture } from './wave.fixture';

const id = (n: number) => `ab100000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const member: AuthenticatedMemberContext = { userId: id(1), memberId: id(2), organizationId: id(3), userEmail: '', status: 'ACTIVE', role: 'REQUESTER' };
const input = { schemaVersion: '1.0', evidenceId: id(4), inputRevision: 3, language: 'es' };
const env = { CARGOMESH_AI_PROVIDER: 'META', META_MODEL_API_KEY: 'unit-test-key-not-real', META_TRANSCRIBE_MODEL: 'muse-voice-transcribe-1.0' };
const rawReply = () => ({ sessionId: 'synthetic-voice-session', transcript: 'Doce pallets de piezas.', audioDurationMs: 1000, turns: [] });
const response = (data: unknown = rawReply()) => new Response(JSON.stringify(data), {
  headers: { 'content-type': 'application/json', 'x-request-id': 'synthetic-asr-request' },
});
function setup(audio = waveFixture()) {
  const evidence: AudioEvidenceAccess = {
    readAuthorized: async () => ({ ...input, organizationId: member.organizationId, state: 'ACTIVE', bytes: audio,
      contentSha256: createHash('sha256').update(audio).digest('hex') }), checkCurrent: async () => 'CURRENT',
  };
  return { evidence, run: (fetch: typeof globalThis.fetch, configuration = env, language = 'es') =>
    transcribeEvidence({ ...input, language }, member, { evidence, provider: metaSpeechProvider({ env: configuration, fetch }) }) };
}

test('shared SDK sends the documented ASR JSON field/audio file, authorization and Spanish/English bias', async () => {
  for (const language of ['es', 'en']) {
    let calls = 0;
    const fetch: typeof globalThis.fetch = async (url, init) => {
      calls++; assert.equal(String(url), 'https://api.meta.ai/v1/asr/transcribe');
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('authorization'), 'Bearer unit-test-key-not-real');
      assert.equal(headers.get('accept'), 'application/json');
      assert.match(headers.get('content-type')!, /^multipart\/form-data; boundary=/);
      const serialized = new Request(String(url), { ...init, method: 'POST' });
      const raw = await serialized.clone().text();
      assert.match(raw, /name="request"\r\nContent-Type: application\/json/); // No filename on the JSON field.
      const form = await serialized.formData();
      assert.deepEqual([...form.keys()].sort(), ['audio', 'request']);
      assert.deepEqual(JSON.parse(String(form.get('request'))), { model: env.META_TRANSCRIBE_MODEL,
        audioEncoding: 'WAV', mode: 'PUSH_TO_TALK', languageBias: [language === 'es' ? 'Spanish' : 'English'] });
      const audio = form.get('audio') as File;
      assert.equal(audio.type, 'audio/wav'); assert.equal(audio.name, 'audio.wav');
      assert.deepEqual(new Uint8Array(await audio.arrayBuffer()), waveFixture());
      return response();
    };
    const result = await setup().run(fetch, env, language);
    assert.equal(result.ok, true); assert.equal(calls, 1);
    if (!result.ok) continue;
    assert.equal(result.transcription.text, rawReply().transcript); assert.equal(result.transcription.evidenceId, input.evidenceId);
    assert.equal(result.transcription.requiresHumanConfirmation, true); assert.equal(result.metadata.transport, 'INJECTED');
    assert.equal(result.metadata.estimatedCostUsd, null); assert.equal(result.metadata.providerSessionId, rawReply().sessionId);
    assert.doesNotMatch(JSON.stringify(result), /unit-test-key|Bearer/);
  }
});

test('ASR configuration is independent of Muse text, fails closed and never sends unsupported WAVs', async () => {
  let calls = 0;
  const fetch: typeof globalThis.fetch = async () => { calls++; return response(); };
  assert.equal((await setup().run(fetch)).ok, true); // No META_MUSE_MODEL provided.
  for (const change of [{ META_MODEL_API_KEY: '' }, { CARGOMESH_AI_PROVIDER: 'AWS' },
    { META_TRANSCRIBE_MODEL: 'muse-voice-transcribe-1.0-contributor' }, { META_MODEL_BASE_URL: 'https://untrusted.invalid' }]) {
    const result = await setup().run(fetch, { ...env, ...change });
    assert.equal(!result.ok && result.error.code, 'NOT_CONFIGURED');
  }
  for (const audio of [waveFixture({ channels: 2 }), waveFixture({ rate: 44_100 }), waveFixture({ frames: 16_000 * 600 + 1 })]) {
    const result = await setup(audio).run(fetch); assert.equal(!result.ok && result.error.code, 'MEDIA_INVALID');
  }
  assert.equal(calls, 1);
});

test('documented opaque ASR session IDs allow punctuation but reject control or oversized diagnostics', async () => {
  const sessionId = 'asr:synthetic/session.2026+opaque=value';
  const accepted = await setup().run(async () => response({ ...rawReply(), sessionId }));
  assert.equal(accepted.ok, true);
  assert.equal(accepted.metadata.providerSessionId, sessionId);
  for (const invalid of ['', 'asr\nforged-entry', 'asr\u0000entry', 'x'.repeat(257)]) {
    const rejected = await setup().run(async () => response({ ...rawReply(), sessionId: invalid }));
    assert.equal(!rejected.ok && rejected.error.code, 'MODEL_OUTPUT_INVALID');
  }
});

test('ASR empty transcript is explicitly EMPTY; missing text, turns and malformed payloads are invalid', async () => {
  const empty = await setup().run(async () => response({ ...rawReply(), transcript: '   ' }));
  assert.equal(empty.ok && empty.transcription.status, 'EMPTY');
  assert.equal(empty.ok && empty.transcription.text, '');
  for (const data of [{ sessionId: 'synthetic', audioDurationMs: 1000, turns: [] },
    { ...rawReply(), turns: [{}] }, { ...rawReply(), transcript: 'x'.repeat(6001) },
    { ...rawReply(), audioDurationMs: 9000 }, { ...rawReply(), secret: 'private' }, null]) {
    const result = await setup().run(async () => response(data));
    assert.equal(!result.ok && result.error.code, 'MODEL_OUTPUT_INVALID');
  }
});

test('ASR non-JSON, oversized buffered or streamed JSON fails within bounded memory', async () => {
  for (const value of [new Response('private', { headers: { 'content-type': 'text/plain' } }),
    new Response('{', { headers: { 'content-type': 'application/json' } }),
    new Response('{}', { headers: { 'content-type': 'application/json', 'content-length': '1000000' } }),
    new Response(' '.repeat(65_537), { headers: { 'content-type': 'application/json' } }),
    new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(65_537)); controller.close(); } }),
      { headers: { 'content-type': 'application/json' } })]) {
    const result = await setup().run(async () => value);
    assert.equal(!result.ok && result.error.code, 'MODEL_OUTPUT_INVALID'); assert.doesNotMatch(JSON.stringify(result), /private/);
  }
});

test('ASR 401/413/429/500 have one SDK attempt, no fallback and sanitized errors', async () => {
  for (const status of [401, 413, 429, 500]) {
    let calls = 0;
    const result = await setup().run(async () => { calls++; return new Response('private error unit-test-key-not-real', { status }); });
    assert.equal(!result.ok && result.error.code, 'PROVIDER_UNAVAILABLE'); assert.equal(calls, 1);
    assert.equal(result.metadata.processingMayHaveOccurred, true); assert.doesNotMatch(JSON.stringify(result), /private|unit-test-key/);
  }
});

test('ASR SDK ignores debug environment and never logs audio, transcript, key or raw failures', async () => {
  const previous = process.env.OPENAI_LOG, names = ['debug', 'info', 'warn', 'error', 'log'] as const;
  const saved = names.map(name => console[name]), captured: unknown[] = [];
  try {
    process.env.OPENAI_LOG = 'debug';
    names.forEach(name => { console[name] = (...args: unknown[]) => { captured.push(args); }; });
    assert.equal((await setup().run(async () => response())).ok, true);
    await setup().run(async () => new Response('private', { status: 500 }));
  } finally {
    names.forEach((name, index) => { console[name] = saved[index]; });
    if (previous === undefined) delete process.env.OPENAI_LOG; else process.env.OPENAI_LOG = previous;
  }
  assert.deepEqual(captured, []);
});

test('a stalled ASR response body is cancelled by the service deadline without a late transcript', async () => {
  let cancelled = false;
  const app = setup();
  const fetch: typeof globalThis.fetch = async () => new Response(new ReadableStream({ cancel() { cancelled = true; } }),
    { headers: { 'content-type': 'application/json' } });
  const result = await transcribeEvidence(input, member, { evidence: app.evidence, provider: metaSpeechProvider({ env, fetch }) }, { deadlineMs: 20 });
  assert.equal(!result.ok && result.error.code, 'PROVIDER_UNAVAILABLE'); assert.equal(cancelled, true);
  assert.equal('transcription' in result, false);
});
