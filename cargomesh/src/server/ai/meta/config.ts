import "server-only";
import { z } from "zod";

const TransportConfigSchema = z.object({
  apiKey: z.string().trim().min(1),
  baseURL: z.literal("https://api.meta.ai/v1"),
  timeoutMs: z.number().int().min(1_000).max(45_000),
}).strict();
const ConfigSchema = TransportConfigSchema.extend({
  model: z.string().regex(/^muse-spark-[a-zA-Z0-9.-]{1,70}$/)
    .refine(value => !value.toLowerCase().includes("contributor")),
  maxOutputTokens: z.number().int().min(256).max(4_096),
}).strict();
const SpeechConfigSchema = TransportConfigSchema.extend({
  model: z.string().regex(/^muse-voice-transcribe-[a-zA-Z0-9.-]{1,70}$/)
    .refine(value => !value.toLowerCase().includes('contributor')),
}).strict();

export type MetaProposalConfig = z.infer<typeof ConfigSchema>;
export type MetaSpeechConfig = z.infer<typeof SpeechConfigSchema>;
export type MetaEnvironment = Readonly<Record<string, string | undefined>>;

// Explicit opt-in. This helper never constructs an SDK client or reads AWS config.
export function readMetaProposalConfig(env: MetaEnvironment = process.env): MetaProposalConfig | null {
  if (env.CARGOMESH_AI_PROVIDER !== "META") return null;
  const parsed = ConfigSchema.safeParse({
    apiKey: env.META_MODEL_API_KEY,
    baseURL: (env.META_MODEL_BASE_URL ?? "https://api.meta.ai/v1").replace(/\/$/, ""),
    model: env.META_MUSE_MODEL,
    timeoutMs: Number(env.META_PROPOSAL_TIMEOUT_MS ?? 45_000),
    maxOutputTokens: Number(env.META_PROPOSAL_MAX_OUTPUT_TOKENS ?? 2_048),
  });
  return parsed.success ? parsed.data : null;
}

/** ASR uses the same key/origin/timeout, independently of the text model configuration. */
export function readMetaSpeechConfig(env: MetaEnvironment = process.env): MetaSpeechConfig | null {
  if (env.CARGOMESH_AI_PROVIDER !== 'META') return null;
  const parsed = SpeechConfigSchema.safeParse({
    apiKey: env.META_MODEL_API_KEY,
    baseURL: (env.META_MODEL_BASE_URL ?? 'https://api.meta.ai/v1').replace(/\/$/, ''),
    model: env.META_TRANSCRIBE_MODEL,
    timeoutMs: Number(env.META_PROPOSAL_TIMEOUT_MS ?? 45_000),
  });
  return parsed.success ? parsed.data : null;
}
