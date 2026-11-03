import { z } from "zod";
import { ModelProposalSchema } from "./model-proposal";
export const MediaScopeSchema = z
  .object({
    draftKey: z.string().uuid(),
    requestId: z.string().uuid().nullable(),
    requestVersion: z.number().int().positive().nullable(),
  })
  .strict();
export const MediaInitSchema = MediaScopeSchema.extend({
  idempotencyKey: z.string().uuid(),
  contentSha256: z.string().regex(/^[0-9a-f]{64}$/),
  kind: z.enum(["photo", "label", "audio"]),
  mimeType: z.enum(["image/png", "image/jpeg", "audio/wav"]),
  fileName: z
    .string()
    .trim()
    .min(1)
    .max(180)
    .regex(/^[^\x00-\x1f\x7f]+$/),
  byteSize: z.number().int().positive().max(30000000),
}).strict();
export const MediaAnalyzeSchema = MediaScopeSchema.extend({
  evidenceIds: z.array(z.string().uuid()).min(1).max(4),
  inputRevision: z.number().int().nonnegative(),
  language: z.enum(["es", "en"]),
  text: z.string().trim().max(6000),
}).strict();
export const MediaItemSchema = z
  .object({
    id: z.string().uuid(),
    kind: z.enum(["photo", "label", "audio"]),
    fileName: z.string().min(1).max(180),
    mimeType: z.enum(["image/png", "image/jpeg", "audio/wav"]),
    byteSize: z.number().int().positive().max(30000000),
    state: z.enum(["PENDING", "READY", "REMOVED"]),
  })
  .strict();
export const MediaInitResultSchema = z.object({
  item: MediaItemSchema,
  uploadUrl: z.string().url().nullable(),
  replay: z.boolean(),
}).strict().refine((result) => result.item.state === "READY"
  ? result.uploadUrl === null
  : result.item.state === "PENDING" && result.uploadUrl !== null,
  "Only pending reservations can receive upload permission");
export const MediaAnalysisSchema = z
  .object({
    proposal: ModelProposalSchema,
    transcripts: z
      .array(
        z
          .object({
            evidenceId: z.string().uuid(),
            text: z.string().min(1).max(6000),
          })
          .strict(),
      )
      .max(1),
    inputRevision: z.number().int().nonnegative(),
    requiresHumanConfirmation: z.literal(true),
  })
  .strict();
export type MediaItem = z.infer<typeof MediaItemSchema>;
export type MediaAnalysis = z.infer<typeof MediaAnalysisSchema>;
