import "server-only";
import { z } from "zod";
import type { DeclarationInput } from "@/shared/schemas/meta/model-proposal";

export const IMAGE_LIMITS = { perImageBytes: 5 * 1024 * 1024, totalBytes: 12 * 1024 * 1024,
  maxDimension: 8192, maxPixels: 20_000_000, maxImages: 4 } as const;

// Internal server input: resolve authorization/storage first. Never a browser DTO or URL fetcher.
export type ResolvedDeclarationImage = {
  evidenceId: string;
  mimeType: "image/png" | "image/jpeg";
  bytes: Uint8Array;
};
const ImagesSchema = z.array(z.object({
  evidenceId: z.string().uuid(), mimeType: z.enum(["image/png", "image/jpeg"]),
  bytes: z.instanceof(Uint8Array),
}).strict()).max(IMAGE_LIMITS.maxImages);

function dimensions(bytes: Uint8Array, mimeType: string): [number, number] | null {
  const b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (mimeType === "image/png") {
    if (b.length < 45 || b.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
        b.readUInt32BE(8) !== 13 || b.toString("ascii", 12, 16) !== "IHDR" ||
        b.subarray(-12).toString("hex") !== "0000000049454e44ae426082") return null;
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  }
  if (b.length < 12 || b[0] !== 0xff || b[1] !== 0xd8 || b[b.length - 2] !== 0xff || b[b.length - 1] !== 0xd9)
    return null;
  for (let offset = 2; offset + 3 < b.length;) {
    if (b[offset++] !== 0xff) return null;
    while (b[offset] === 0xff) offset++;
    const marker = b[offset++];
    if (marker === 0xda || marker === 0xd9) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > b.length) return null;
    const length = b.readUInt16BE(offset);
    if (length < 2 || offset + length > b.length) return null;
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (length < 8) return null;
      return [b.readUInt16BE(offset + 5), b.readUInt16BE(offset + 3)];
    }
    offset += length;
  }
  return null;
}

/** Bounded header checks, not a full image decoder or upload malware scanner. */
export function prepareDeclarationImages(input: DeclarationInput, rawImages: unknown) {
  const parsed = ImagesSchema.safeParse(rawImages);
  if (!parsed.success) return null;
  const images = parsed.data;
  if (new Set(images.map(image => image.evidenceId)).size !== images.length ||
      images.reduce((total, image) => total + image.bytes.byteLength, 0) > IMAGE_LIMITS.totalBytes) return null;
  const visual = input.evidence.filter(item => item.kind !== "audio");
  if (images.length !== visual.length || visual.some(item => !images.some(image => image.evidenceId === item.evidenceId)))
    return null;
  // Audio enters only as a server-resolved transcript, never raw audio sent to Muse Spark.
  if (input.evidence.some(item => item.kind === "audio" && !item.text)) return null;
  for (const image of images) {
    if (image.bytes.byteLength > IMAGE_LIMITS.perImageBytes) return null;
    const size = dimensions(image.bytes, image.mimeType);
    if (!size || size.some(value => value <= 0 || value > IMAGE_LIMITS.maxDimension) ||
        size[0] * size[1] > IMAGE_LIMITS.maxPixels) return null;
  }
  // Copy into immutable strings only after all limits have passed. Never log data URLs.
  return images.map(image => ({ evidenceId: image.evidenceId,
    dataUrl: `data:${image.mimeType};base64,${Buffer.from(image.bytes).toString("base64")}` }));
}
