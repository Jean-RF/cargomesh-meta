import 'server-only';

// Leave room for the multipart envelope inside Meta's documented 32 MB request.
export const MAX_WAVE_BYTES = 30_000_000;
export const MAX_WAVE_DURATION_MS = 600_000;
export type WaveFacts = { sampleRate: 16_000 | 24_000; channels: 1; bitsPerSample: 16; dataBytes: number; durationMs: number };

/** Inspect actual RIFF bytes, not browser-supplied MIME, extension or duration. */
export function inspectWave(bytes: Uint8Array): WaveFacts | null {
  if (bytes.byteLength < 44 || bytes.byteLength > MAX_WAVE_BYTES) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE' || view.getUint32(4, true) + 8 !== bytes.byteLength) return null;
  let offset = 12, chunks = 0, sampleRate: WaveFacts['sampleRate'] | null = null, dataBytes: number | null = null;
  while (offset < bytes.byteLength) {
    if (++chunks > 128 || offset + 8 > bytes.byteLength) return null;
    const name = tag(offset), size = view.getUint32(offset + 4, true), start = offset + 8, end = start + size;
    if (end + (size % 2) > bytes.byteLength) return null;
    if (name === 'fmt ') {
      if (sampleRate !== null || dataBytes !== null || (size !== 16 && size !== 18)) return null;
      const rate = view.getUint32(start + 4, true);
      if (view.getUint16(start, true) !== 1 || view.getUint16(start + 2, true) !== 1 ||
        (rate !== 16_000 && rate !== 24_000) || view.getUint32(start + 8, true) !== rate * 2 ||
        view.getUint16(start + 12, true) !== 2 || view.getUint16(start + 14, true) !== 16 ||
        (size === 18 && view.getUint16(start + 16, true) !== 0)) return null;
      sampleRate = rate;
    } else if (name === 'data') {
      if (sampleRate === null || dataBytes !== null || size === 0 || size % 2 !== 0) return null;
      dataBytes = size;
    }
    offset = end + (size % 2);
  }
  if (sampleRate === null || dataBytes === null || dataBytes > sampleRate * 2 * 600) return null;
  return { sampleRate, channels: 1, bitsPerSample: 16, dataBytes, durationMs: Math.ceil(dataBytes / (sampleRate * 2) * 1000) };
}
