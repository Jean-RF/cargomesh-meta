import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, unlink, rmdir, open } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readOwnWave, runVoiceSmoke } from './meta-voice-smoke';
import { waveFixture } from '../src/server/ai/meta/wave.fixture';
import { MAX_WAVE_BYTES } from '../src/server/ai/meta/wave';
import type { SpeechProvider } from '../src/server/ai/meta/transcribe';

function provider(text = 'Doce pallets de piezas.') {
  let calls = 0;
  const port: SpeechProvider = { transport: 'INJECTED', configuration: () => ({ model: 'muse-voice-transcribe-1.0', timeoutMs: 45_000 }),
    transcribe: async () => { calls++; return { transcript: text, audioDurationMs: 1000, sessionId: 'synthetic-session', requestId: null }; } };
  return { port, calls: () => calls };
}
test('voice smoke does not print audio/transcript, fake real inference, verification of accuracy or tenant integration', async () => {
  const adapter = provider(), result = await runVoiceSmoke(waveFixture(), {}, adapter.port);
  assert.equal(result.status, 'PASS_SIMULATED'); assert.equal(result.liveRequestMade, false); assert.equal(result.accuracyVerified, false);
  assert.equal(result.scope, 'OPERATOR_LOCAL_FILE_NOT_TENANT_INTEGRATION'); assert.equal(result.persistedWrites, 0);
  assert.equal(result.transcription!.requiresHumanConfirmation, true); assert.equal(adapter.calls(), 1);
  assert.doesNotMatch(JSON.stringify(result), /Doce pallets|RIFF|apiKey/);
});
test('empty and invalid voice are never smoke success and invalid bytes never invoke', async () => {
  const empty = await runVoiceSmoke(waveFixture(), {}, provider('').port); assert.equal(empty.status, 'EMPTY_TRANSCRIPT');
  const adapter = provider(), invalid = await runVoiceSmoke(waveFixture({ channels: 2 }), {}, adapter.port);
  assert.equal(invalid.status, 'FAILED_VOICE_CHECK'); assert.equal(adapter.calls(), 0);
});
test('own-file loader validates real bytes, rejects truncated/oversized files and never requires a database', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cm-meta-voice-audit-')), path = join(directory, 'synthetic.wav');
  try {
    await writeFile(path, waveFixture()); assert.deepEqual(await readOwnWave(path), waveFixture());
    await writeFile(path, new Uint8Array(20)); assert.equal(await readOwnWave(path), null);
    await writeFile(path, waveFixture({ rate: 44_100 })); assert.equal(await readOwnWave(path), null);
    const handle = await open(path, 'w');
    try { await handle.truncate(MAX_WAVE_BYTES + 1); } finally { await handle.close(); }
    assert.equal(await readOwnWave(path), null);
  } finally { await unlink(path); await rmdir(directory); }
});
