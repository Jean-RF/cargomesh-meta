import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectMetaEnvironment, META_REPOSITORY, type MetaEnvironment, type MetaTarget } from '../src/server/ai/meta/environment-readiness';
import { runMetaSmoke } from './meta-smoke';

const target: MetaTarget = { repository: META_REPOSITORY, branch: 'codex/meta-luis', rootDirectory: 'cargomesh', stage: 'local' };
const configured = (): MetaEnvironment => ({
  CARGOMESH_AI_PROVIDER: 'META', META_MODEL_API_KEY: 'private-test-key-not-a-credential',
  META_MODEL_BASE_URL: 'https://api.meta.ai/v1', META_MUSE_MODEL: 'muse-spark-1.3', META_TRANSCRIBE_MODEL: 'muse-voice-transcribe-1.0',
  META_APPROVED_SUPABASE_URL: 'https://meta-test-project.supabase.co', NEXT_PUBLIC_SUPABASE_URL: 'https://meta-test-project.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-test-value', SUPABASE_SERVICE_ROLE_KEY: 'private-test-role-not-a-credential',
});
// Injected child-process result, not an HTTP response or real provider evidence.
const acceptance = () => ({ check: 'meta-text', status: 'PASS', liveRequestMade: true, mode: 'META',
  metadata: { provider: 'META', transport: 'META_MODEL_API', model: 'muse-spark-1.3', requestId: 'injected-test-only',
    latencyMs: 5, attempts: 1, inputTokens: null, outputTokens: null, estimatedCostUsd: null, outcome: 'PROPOSED' },
  error: null, expectedOwnSyntheticValuesMatched: true, commercialWrites: 0 });
function ports(present = true, value = acceptance()) {
  let calls = 0;
  return { hasFile: () => present, textProbe: async () => { calls++; return { exitCode: 0, stdout: JSON.stringify(value) }; }, calls: () => calls };
}

test('readiness is configuration only, never evidence of a connection or deployment', () => {
  const result = inspectMetaEnvironment(configured(), target);
  assert.equal(result.status, 'READY_FOR_LIVE_CHECK'); assert.equal(result.providerReady, true);
  assert.equal(result.providerVerified, false); assert.equal(result.deploymentVerified, false); assert.equal(result.liveRequestMade, false);
});
test('missing variables are bounded diagnostics without leaking secret values', () => {
  const env = { ...configured(), META_MODEL_API_KEY: '' };
  const result = inspectMetaEnvironment(env, target);
  assert.equal(result.status, 'NOT_CONFIGURED'); assert.equal(result.providerReady, false);
  assert.ok(result.checks.some(item => item.name === 'META_MODEL_API_KEY' && item.status === 'MISSING'));
  assert.ok(!JSON.stringify(result).includes('private-test-role'));
});
test('Amazon checkout, wrong root and production from a feature branch fail closed', () => {
  for (const change of [{ repository: 'Chujutak2024/cargomesh' }, { rootDirectory: '.' }, { stage: 'production' as const }, { branch: 'other-work' }])
    assert.equal(inspectMetaEnvironment(configured(), { ...target, ...change }).status, 'UNSAFE_CONFIGURATION');
  assert.equal(inspectMetaEnvironment(configured(), { ...target, stage: 'production', branch: 'main' }).status, 'READY_FOR_LIVE_CHECK');
});
test('public secrets, arbitrary endpoints, contributor models and legacy voice are rejected', () => {
  for (const change of [
    { NEXT_PUBLIC_META_MODEL_API_KEY: 'private-test-key' }, { NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: 'private-test-role' },
    { NEXT_PUBLIC_CARGOMESH_VOICE_BRIDGE_SECRET: 'private-test-key' }, { NEXT_PUBLIC_DEMO_CLIENT_PASSWORD: 'private-test-key' },
    { META_MODEL_BASE_URL: 'https://untrusted.invalid/v1' }, { META_MUSE_MODEL: 'muse-spark-1.3-contributor' },
    { META_TRANSCRIBE_MODEL: 'muse-voice-transcribe-1.0-contributor' }, { NEXT_PUBLIC_CARGOMESH_NOVA_VOICE_PREVIEW: 'true' },
  ]) assert.equal(inspectMetaEnvironment({ ...configured(), ...change }, target).status, 'UNSAFE_CONFIGURATION');
});
test('Supabase origin must match the explicitly approved Meta target; remote loopback is invalid', () => {
  for (const url of ['https://another-project.supabase.co', 'https://user:password@meta-test-project.supabase.co', 'https://meta-test-project.supabase.co/private'])
    assert.equal(inspectMetaEnvironment({ ...configured(), NEXT_PUBLIC_SUPABASE_URL: url }, target).status, 'UNSAFE_CONFIGURATION');
  const local = { ...configured(), META_APPROVED_SUPABASE_URL: 'http://127.0.0.1:54321', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321' };
  assert.equal(inspectMetaEnvironment(local, target).status, 'READY_FOR_LIVE_CHECK');
  assert.equal(inspectMetaEnvironment(local, { ...target, stage: 'preview' }).status, 'UNSAFE_CONFIGURATION');
});
test('preflight respects the timeout/output bounds of the reviewed Axel client', () => {
  for (const change of [{ META_PROPOSAL_TIMEOUT_MS: '45001' }, { META_PROPOSAL_TIMEOUT_MS: 'NaN' },
    { META_PROPOSAL_MAX_OUTPUT_TOKENS: '0' }, { META_PROPOSAL_MAX_OUTPUT_TOKENS: '4097' }])
    assert.equal(inspectMetaEnvironment({ ...configured(), ...change }, target).status, 'UNSAFE_CONFIGURATION');
});
test('default/preflight checks never invoke the child even with complete credentials', async () => {
  const adapter = ports(), result = await runMetaSmoke([], configured(), target, adapter);
  assert.equal(result.exitCode, 0); assert.equal(adapter.calls(), 0); assert.equal(result.report.liveRequestMade, false);
});

test('isolated AI requires only the Meta key, not Supabase, and never invokes a provider', async () => {
  // Models and transport match .env.local; this key exists only in memory for this test.
  const env = { ...configured(), META_APPROVED_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_URL: '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '' };
  const adapter = ports(), result = await runMetaSmoke(['--provider-only'], env, target, adapter);
  assert.equal(result.exitCode, 0);
  assert.equal(result.report.status, 'READY_FOR_LIVE_CHECK');
  assert.equal(result.report.readiness.applicationReady, false);
  assert.equal(result.report.liveRequestMade, false);
  assert.equal(adapter.calls(), 0);
  const absent = await runMetaSmoke(['--provider-only'], { ...env, META_MODEL_API_KEY: '' }, target, adapter);
  assert.equal(absent.exitCode, 2);
  assert.equal(absent.report.status, 'NOT_CONFIGURED');
  assert.deepEqual(absent.report.readiness.checks.filter(item => item.scope === 'provider' && item.status !== 'PASS')
    .map(item => item.name), ['META_MODEL_API_KEY']);
});

test('isolated AI still rejects unsafe configuration, missing media dependencies and combined flags', async () => {
  const adapter = ports();
  assert.equal((await runMetaSmoke(['--provider-only'], { ...configured(), NEXT_PUBLIC_META_MODEL_API_KEY: 'unsafe' },
    target, adapter)).report.status, 'UNSAFE_CONFIGURATION');
  assert.equal((await runMetaSmoke(['--provider-only'], configured(), target, {
    ...adapter, hasFile: path => !path.endsWith('media-input.ts'),
  })).report.status, 'DEPENDENCY_PENDING');
  assert.equal((await runMetaSmoke(['--provider-only', '--live-text'], configured(), target, adapter)).report.status,
    'INVALID_ARGUMENTS');
  assert.equal(adapter.calls(), 0);
});
test('explicit opt-in still requires a safe configuration and Axel dependencies', async () => {
  const absent = ports(false), dependency = await runMetaSmoke(['--live-text'], configured(), target, absent);
  assert.equal(dependency.report.status, 'DEPENDENCY_PENDING'); assert.equal(absent.calls(), 0);
  assert.equal((await runMetaSmoke([], configured(), target, absent)).report.status, 'DEPENDENCY_PENDING');
  const adapter = ports();
  for (const env of [{}, { ...configured(), META_MODEL_API_KEY: '' }, { ...configured(), NEXT_PUBLIC_META_MODEL_API_KEY: 'unsafe' }]) {
    const result = await runMetaSmoke(['--live-text'], env, target, adapter);
    assert.equal(result.exitCode, 2); assert.equal(result.report.liveRequestMade, false);
  }
  assert.equal(adapter.calls(), 0);
});
test('a text acceptance remains TEXT_ONLY, with voice/image and deployment explicitly unverified', async () => {
  const adapter = ports(), result = await runMetaSmoke(['--live-text'], configured(), target, adapter);
  assert.equal(result.exitCode, 0); assert.equal(result.report.status, 'PASS_TEXT_ONLY'); assert.equal(adapter.calls(), 1);
  assert.equal(result.report.voiceCheck, 'NOT_RUN'); assert.equal(result.report.imageCheck, 'NOT_RUN');
  assert.equal(result.report.readiness.deploymentVerified, false);
});

test('image adapter presence is distinct from image acceptance and does not block independent text', async () => {
  const absent = await runMetaSmoke([], configured(), target, {
    ...ports(), hasFile: path => !path.endsWith('media-input.ts'),
  });
  assert.equal(absent.report.imageCheck, 'PENDING_AX_02');
  assert.deepEqual(absent.report.missingImageDependencies, ['src/server/ai/meta/media-input.ts']);
  assert.equal(absent.report.liveRequestMade, false);
  const text = await runMetaSmoke(['--live-text'], configured(), target, {
    ...ports(), hasFile: path => !path.endsWith('media-input.ts'),
  });
  assert.equal(text.report.status, 'PASS_TEXT_ONLY');
  assert.equal(text.report.imageCheck, 'PENDING_AX_02');
});
test('simulated transport, wrong model and a failed acceptance cannot count as a real pass', async () => {
  for (const change of [{ transport: 'INJECTED' }, { model: 'muse-spark-different' }, { outcome: 'REFUSED' }]) {
    const value = { ...acceptance(), metadata: { ...acceptance().metadata, ...change } };
    const result = await runMetaSmoke(['--live-text'], configured(), target, ports(true, value));
    assert.equal(result.report.status, 'FAILED_LIVE_CHECK'); assert.equal(result.exitCode, 1);
  }
});
test('provider/child failures never disclose raw output or claim no request was made', async () => {
  const result = await runMetaSmoke(['--live-text'], configured(), target, {
    hasFile: () => true, textProbe: async () => { throw Error('private-test-key-not-a-credential'); },
  });
  assert.equal(result.report.liveRequestMade, null); assert.ok(!JSON.stringify(result).includes('private-test-key-not-a-credential'));
  const echoed = { ...acceptance(), metadata: { ...acceptance().metadata, requestId: 'private-test-key-not-a-credential' } };
  const sanitized = await runMetaSmoke(['--live-text'], configured(), target, ports(true, echoed));
  assert.equal(sanitized.report.status, 'FAILED_LIVE_CHECK'); assert.ok(!JSON.stringify(sanitized).includes('private-test-key-not-a-credential'));
});
test('unsupported or repeated flags cannot cause a provider request', async () => {
  const adapter = ports();
  for (const args of [['--live'], ['--live-text', '--check'], ['--audio'], ['--unsafe']])
    assert.equal((await runMetaSmoke(args, configured(), target, adapter)).report.status, 'INVALID_ARGUMENTS');
  assert.equal(adapter.calls(), 0);
});
test('malformed or unsuccessful child output is bounded and never echoed', async () => {
  for (const response of [{ exitCode: 1, stdout: JSON.stringify(acceptance()) },
    { exitCode: 0, stdout: 'private-test-key-not-a-credential' },
    { exitCode: 0, stdout: JSON.stringify({ ...acceptance(), commercialWrites: 1 }) }]) {
    const result = await runMetaSmoke(['--live-text'], configured(), target, { hasFile: () => true, textProbe: async () => response });
    assert.equal(result.exitCode, 1); assert.equal(result.report.liveRequestMade, null);
    assert.ok(!JSON.stringify(result).includes('private-test-key-not-a-credential'));
  }
});

test('public aliases cannot disguise a server credential or privileged Supabase key', () => {
  const serviceJwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url'), 'synthetic-signature'].join('.');
  for (const change of [{ NEXT_PUBLIC_SUPABASE_ANON_KEY: configured().META_MODEL_API_KEY },
    { NEXT_PUBLIC_GOOGLE_MAPS_JS_API_KEY: configured().SUPABASE_SERVICE_ROLE_KEY },
    { NEXT_PUBLIC_SUPABASE_ANON_KEY: serviceJwt }, { NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_secret_synthetic' },
    { NEXT_PUBLIC_DISPLAY_VALUE: configured().META_MODEL_API_KEY }]) {
    const result = inspectMetaEnvironment({ ...configured(), ...change }, target);
    assert.equal(result.status, 'UNSAFE_CONFIGURATION'); assert.equal(result.providerReady, false); assert.equal(result.voiceReady, false);
    assert.doesNotMatch(JSON.stringify(result), /synthetic-signature|sb_secret_synthetic|private-test-key/);
  }
});

// Injected child report; it is not evidence of a real provider request.
const voiceAcceptance = () => ({ check: 'meta-voice', status: 'PASS_VOICE_TRANSPORT', liveRequestMade: true,
  scope: 'OPERATOR_LOCAL_FILE_NOT_TENANT_INTEGRATION', accuracyVerified: false, persistedWrites: 0, commercialWrites: 0,
  error: null, metadata: { provider: 'META', transport: 'META_MODEL_API', model: 'muse-voice-transcribe-1.0',
    attempts: 1, latencyMs: 12, processingMayHaveOccurred: true, requestId: 'synthetic-voice-request',
    providerSessionId: 'synthetic-voice-session', audioProcessedMs: 1000, estimatedCostUsd: null },
  transcription: { evidenceId: 'ab100000-0000-4000-8000-000000000001', inputRevision: 0, status: 'TRANSCRIBED',
    transcriptCharacters: 40, audioDurationMs: 1000, requiresHumanConfirmation: true } });

test('voice smoke is opt-in, independent of Muse text, and does not claim accuracy or tenant integration', async () => {
  let voiceCalls = 0, textCalls = 0;
  const adapter = { hasFile: () => true, textProbe: async () => { textCalls++; throw new Error('not text'); },
    voiceProbe: async (path: string) => { voiceCalls++; assert.equal(path, 'own.wav'); return { exitCode: 0, stdout: JSON.stringify(voiceAcceptance()) }; } };
  const env = { ...configured(), META_MUSE_MODEL: undefined };
  assert.equal(inspectMetaEnvironment(env, target).providerReady, false);
  assert.equal(inspectMetaEnvironment(env, target).voiceReady, true);
  await runMetaSmoke([], env, target, adapter); assert.equal(voiceCalls, 0);
  const result = await runMetaSmoke(['--live-voice', 'own.wav'], env, target, adapter);
  assert.equal(result.report.status, 'PASS_VOICE_TRANSPORT'); assert.equal(voiceCalls, 1); assert.equal(textCalls, 0);
  assert.equal('accuracyVerified' in result.report && result.report.accuracyVerified, false);
  assert.equal('scope' in result.report && result.report.scope, 'OPERATOR_LOCAL_FILE_NOT_TENANT_INTEGRATION');
});

test('parent voice acceptance preserves bounded opaque provider session IDs', async () => {
  const accepted = voiceAcceptance();
  accepted.metadata.providerSessionId = 'asr:synthetic/session.2026+opaque=value';
  const result = await runMetaSmoke(['--live-voice', 'own.wav'], configured(), target, {
    ...ports(), voiceProbe: async () => ({ exitCode: 0, stdout: JSON.stringify(accepted) }),
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.report.status, 'PASS_VOICE_TRANSPORT');
});

test('voice smoke rejects missing configuration/dependencies and ambiguous flags before any file/provider work', async () => {
  let calls = 0;
  const adapter = { hasFile: () => true, textProbe: async () => { calls++; throw new Error('unexpected'); },
    voiceProbe: async () => { calls++; throw new Error('unexpected'); } };
  for (const args of [['--live-voice'], ['--live-voice', '--check'], ['--live-voice', 'own.wav', '--check']])
    assert.equal((await runMetaSmoke(args, configured(), target, adapter)).report.status, 'INVALID_ARGUMENTS');
  assert.equal((await runMetaSmoke(['--live-voice', 'own.wav'], {}, target, adapter)).report.status, 'NOT_CONFIGURED');
  assert.equal((await runMetaSmoke(['--live-voice', 'own.wav'], configured(), target,
    { ...adapter, hasFile: path => !path.includes('meta-voice-smoke') })).report.status, 'DEPENDENCY_PENDING');
  assert.equal((await runMetaSmoke(['--live-voice', 'own.wav'], configured(), { ...target, repository: 'Chujutak2024/cargomesh' }, adapter)).report.status, 'UNSAFE_CONFIGURATION');
  assert.equal(calls, 0);
});

test('simulated/wrong-model voice, leaked transcript/secret or false confirmation cannot count as acceptance', async () => {
  for (const changes of [
    { status: 'PASS_SIMULATED' }, { metadata: { ...voiceAcceptance().metadata, transport: 'INJECTED' } },
    { metadata: { ...voiceAcceptance().metadata, model: 'muse-voice-transcribe-other' } },
    { metadata: { ...voiceAcceptance().metadata, providerSessionId: configured().META_MODEL_API_KEY } },
    { transcription: { ...voiceAcceptance().transcription, text: 'private transcript' } },
    { transcription: { ...voiceAcceptance().transcription, requiresHumanConfirmation: false } },
    { accuracyVerified: true }, { persistedWrites: 1 },
  ]) {
    const result = await runMetaSmoke(['--live-voice', 'own.wav'], configured(), target, {
      ...ports(), voiceProbe: async () => ({ exitCode: 0, stdout: JSON.stringify({ ...voiceAcceptance(), ...changes }) }),
    });
    assert.equal(result.exitCode, 1); assert.equal(result.report.status, 'FAILED_LIVE_CHECK');
    assert.doesNotMatch(JSON.stringify(result), /private transcript|private-test-key/);
  }
});
