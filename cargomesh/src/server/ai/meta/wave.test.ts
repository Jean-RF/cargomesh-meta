import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectWave, MAX_WAVE_BYTES } from './wave';
import { waveFixture } from './wave.fixture';

test('valid mono PCM WAV at both supported rates is inspected from bytes', () => {
  for (const rate of [16_000, 24_000]) assert.deepEqual(inspectWave(waveFixture({ rate })), { sampleRate: rate, channels: 1, bitsPerSample: 16, dataBytes: rate * 2, durationMs: 1000 });
});
test('stereo, unsupported rate, float and bit depth are rejected', () => {
  for (const settings of [{ channels: 2 }, { rate: 44_100 }, { format: 3 }, { bits: 8 }, { bits: 32 }])
    assert.equal(inspectWave(waveFixture(settings)), null);
});
test('empty audio, truncated and mislabeled containers are rejected', () => {
  assert.equal(inspectWave(waveFixture({ frames: 0 })), null);
  const bytes = waveFixture(); assert.equal(inspectWave(bytes.subarray(0, -1)), null);
  const fake = bytes.slice(); fake[0] = 0; assert.equal(inspectWave(fake), null);
  assert.equal(inspectWave(new Uint8Array(12)), null);
});
test('ten minutes is a ceiling computed from sample bytes, not metadata', () => {
  assert.equal(inspectWave(waveFixture({ frames: 16_000 * 600 }))?.durationMs, 600_000);
  assert.equal(inspectWave(waveFixture({ frames: 16_000 * 600 + 1 })), null);
  assert.equal(inspectWave(new Uint8Array(MAX_WAVE_BYTES + 1)), null);
});
test('forged chunk lengths, rate/alignment and RIFF size cannot bypass validation', () => {
  for (const [offset, value, width] of [[40, 0xffffffff, 4], [28, 1, 4], [32, 1, 2], [4, 1, 4], [40, 31999, 4]]) {
    const bytes = waveFixture(), view = new DataView(bytes.buffer);
    if (width === 4) view.setUint32(offset, value, true); else view.setUint16(offset, value, true);
    assert.equal(inspectWave(bytes), null);
  }
});
test('views with a nonzero byte offset are validated without reading unrelated bytes', () => {
  const bytes = waveFixture(), container = new Uint8Array(bytes.length + 10); container.set(bytes, 5);
  assert.equal(inspectWave(container.subarray(5, bytes.length + 5))?.durationMs, 1000);
});
test('padded metadata chunks are skipped correctly and duplicate format chunks are rejected', () => {
  const original = waveFixture(), bytes = new Uint8Array(original.length + 10), view = new DataView(bytes.buffer);
  bytes.set(original.subarray(0, 12)); bytes.set(new TextEncoder().encode('JUNK'), 12); view.setUint32(16, 1, true);
  bytes[20] = 9; bytes.set(original.subarray(12), 22); view.setUint32(4, bytes.length - 8, true);
  assert.equal(inspectWave(bytes)?.durationMs, 1000);
  const duplicate = new Uint8Array(original.length + 24); duplicate.set(original.subarray(0, 36));
  duplicate.set(original.subarray(12, 36), 36); duplicate.set(original.subarray(36), 60);
  new DataView(duplicate.buffer).setUint32(4, duplicate.length - 8, true); assert.equal(inspectWave(duplicate), null);
});
test('large numbers of tiny chunks cannot create unbounded parsing work', () => {
  const original = waveFixture(), bytes = new Uint8Array(original.length + 130 * 8), view = new DataView(bytes.buffer);
  bytes.set(original.subarray(0, 12));
  for (let i = 0; i < 130; i++) bytes.set(new TextEncoder().encode('JUNK'), 12 + i * 8);
  bytes.set(original.subarray(12), 12 + 130 * 8); view.setUint32(4, bytes.length - 8, true);
  assert.equal(inspectWave(bytes), null);
});
