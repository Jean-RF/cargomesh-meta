import { z } from "zod";
import { ExplanationActionSchema, ExplanationShapeSchema } from "./reconciliation-explanation";

export const PassportExplanationScopeSchema = z.object({
  sessionId: z.string().uuid(), passportId: z.string().uuid(),
}).strict();
export const PassportExplanationCommandSchema = z.object({
  groupId: z.string().uuid(), expectedVersion: z.number().int().positive(),
  language: z.enum(["es", "en"]), retryOf: z.string().uuid().nullable(),
}).strict();
export const PassportExplanationErrorSchema = z.enum([
  "VALIDATION_ERROR", "NOT_CONFIGURED", "PROVIDER_UNAVAILABLE", "MODEL_OUTPUT_INVALID", "INPUT_REVISION_MISMATCH",
  "FORBIDDEN_TENANT", "GENERATION_INTERRUPTED", "PERSISTENCE_UNAVAILABLE",
]);
export const PassportExplanationMetadataSchema = z.object({
  provider: z.literal("META"), transport: z.enum(["INJECTED", "META_MODEL_API"]),
  model: z.string().max(100).nullable(), reasoningEffort: z.literal("medium"),
  attempts: z.number().int().min(0).max(1), latencyMs: z.number().int().nonnegative(),
  processingMayHaveOccurred: z.boolean(), requestId: z.string().max(256).nullable(),
  inputTokens: z.number().int().nonnegative().nullable(), outputTokens: z.number().int().nonnegative().nullable(),
  estimatedCostUsd: z.null(),
}).strict();
export const PassportExplanationAttemptSchema = z.object({
  id: z.string().uuid(), groupId: z.string().uuid(), state: z.enum(["RUNNING", "GENERATED", "SAVED", "FAILED"]),
  language: z.enum(["es", "en"]), createdAt: z.string().datetime({ offset: true }),
  completedAt: z.string().datetime({ offset: true }).nullable(),
  errorCode: PassportExplanationErrorSchema.nullable(), processingMayHaveOccurred: z.boolean(),
  metadata: PassportExplanationMetadataSchema.nullable(),
}).strict();
export const PassportExplanationGuidanceSchema = z.object({
  source: z.literal("DOMAIN_STATUS"), summary: z.string().min(1).max(600),
  suggestedActions: z.array(ExplanationActionSchema).max(3), requiresHumanReview: z.literal(true),
}).strict();
export const PassportExplanationReplySchema = z.object({
  schemaVersion: z.literal("1.0"), data: PassportExplanationScopeSchema.extend({
    groupId: z.string().uuid(), status: z.enum(["SAVED", "IN_PROGRESS", "FAILED", "GUIDANCE"]),
    attempt: PassportExplanationAttemptSchema.nullable(), explanation: ExplanationShapeSchema.nullable(),
    guidance: PassportExplanationGuidanceSchema.nullable(),
  }).strict(),
  meta: z.object({ idempotentReplay: z.boolean() }).strict(),
}).strict();
export const PassportExplanationListSchema = z.object({
  schemaVersion: z.literal("1.0"), data: PassportExplanationScopeSchema.extend({
    attempts: z.array(PassportExplanationAttemptSchema).max(100),
  }).strict(),
}).strict();
export type PassportExplanationAttempt = z.infer<typeof PassportExplanationAttemptSchema>;
export type PassportExplanationCommand = z.infer<typeof PassportExplanationCommandSchema>;
export type PassportExplanationReply = z.infer<typeof PassportExplanationReplySchema>;
