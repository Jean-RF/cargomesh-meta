/** Synthetic PCM silence for tests only, never evidence of live transcription. */
export function waveFixture({ rate = 16_000, frames = rate, channels = 1, bits = 16, format = 1 }:
  { rate?: number; frames?: number; channels?: number; bits?: number; format?: number } = {}) {
  const block = channels * bits / 8, size = frames * block, bytes = new Uint8Array(44 + size), view = new DataView(bytes.buffer);
  const tag = (offset: number, value: string) => [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  tag(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); tag(8, 'WAVE'); tag(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, format, true); view.setUint16(22, channels, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * block, true); view.setUint16(32, block, true); view.setUint16(34, bits, true);
  tag(36, 'data'); view.setUint32(40, size, true); return bytes;
}
