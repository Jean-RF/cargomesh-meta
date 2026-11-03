import {z} from "zod";

/**
 * Contrato entre la API web y el worker DockMind (cargomesh/dockmind-worker).
 * Job `dockmind.job.v2`: API -> worker. Resultado `dockmind.result.v2`: worker -> API por callback firmado.
 * v2 agrega `group_id` al job y `organization_id` y `group_id` al resultado: el callback se compara
 * con la identidad exacta del job (organización, sesión, evidencia, grupo, revisión e intento).
 * El worker en Python produce exactamente esta forma; los fixtures en ./fixtures salen de ese código.
 */
export const DOCKMIND_JOB_SCHEMA = "dockmind.job.v2" as const;
export const DOCKMIND_RESULT_SCHEMA = "dockmind.result.v2" as const;

const Fraction = z.number().min(0).max(1);
const Count = z.number().int().min(0);
const Id = z.string().trim().min(1).max(200);
const HttpsUrl = z.string().url().refine((value) => value.startsWith("https://"), "Debe ser https");
/** Solo el lanzador local (`dockmind serve-local`, DOCKMIND_WORKER_MODE=LOCAL_LOOPBACK). El worker de Modal exige https. */
const LoopbackUrl = z.string().url().refine((value) => /^http:\/\/127\.0\.0\.1:\d{1,5}\//.test(value), "Debe ser http://127.0.0.1:<puerto>/");

export const DockMindUnitSchema = z.enum(["PALLET", "BOX"]);
export const DockMindClipSourceSchema = z.enum(["OWN_CAPTURE", "SYNTHETIC_RENDER"]);
export const DockMindErrorCodeSchema = z.enum(["MEDIA_INVALID", "NOT_CONFIGURED", "PROVIDER_UNAVAILABLE", "MODEL_OUTPUT_INVALID", "INTERNAL"]);

export const DockMindLineSchema = z.object({
  x1: Fraction, y1: Fraction, x2: Fraction, y2: Fraction, inside_x: Fraction, inside_y: Fraction,
}).strict().refine((line) => line.x1 !== line.x2 || line.y1 !== line.y2, "La línea necesita dos puntos distintos");

export const DockMindJobConfigSchema = z.object({
  line: DockMindLineSchema, unit: DockMindUnitSchema, concept: z.string().trim().min(1).max(60),
  margin: z.number().min(0).max(0.1).optional(), min_track_frames: z.number().int().min(1).max(30).optional(),
}).strict();

/** Lo que usa el worker si el job no trae `margin` o `min_track_frames` (CountConfig en dockmind-worker/src/dockmind/models.py). */
export const DOCKMIND_CONFIG_DEFAULTS = {margin: 0.01, min_track_frames: 3} as const;

export const DockMindJobSchema = z.object({
  schema: z.literal(DOCKMIND_JOB_SCHEMA), job_id: Id, attempt: z.number().int().min(1),
  organization_id: Id, session_id: Id, evidence_id: Id, group_id: Id, manifest_revision: z.number().int().min(1),
  clip_url: HttpsUrl, overlay_upload_url: HttpsUrl.nullable().optional(), callback_url: HttpsUrl,
  source: DockMindClipSourceSchema, config: DockMindJobConfigSchema,
}).strict();

/** El mismo job para el lanzador local: Supabase, app y worker en 127.0.0.1. Nunca sale de la máquina. */
export const DockMindLoopbackJobSchema = DockMindJobSchema.extend({
  clip_url: LoopbackUrl, overlay_upload_url: LoopbackUrl.nullable().optional(), callback_url: LoopbackUrl,
});

const VideoInfoSchema = z.object({
  width: Count, height: Count, fps: z.number().min(0), frames: Count, duration: z.number().min(0), codec: z.string(),
}).strict();

export const DockMindCrossingSchema = z.object({
  object_id: z.number().int(), frame: Count, seconds: z.number().min(0), direction: z.enum(["IN", "OUT"]),
}).strict();

export const DockMindReviewFlagSchema = z.object({
  kind: z.enum(["ID_SWITCH_SUSPECTED", "TRACK_LOST_NEAR_LINE", "ENDS_ON_LINE", "OBJECT_LIMIT_REACHED", "SHORT_TRACK_CROSSED"]),
  frame: Count, seconds: z.number().min(0), detail: z.string().max(300),
}).strict();

export const DockMindCountSchema = z.object({
  status: z.enum(["OK", "REQUIRES_REVIEW", "INSUFFICIENT_EVIDENCE"]),
  entries: Count, exits: Count, net: z.number().int(),
  events: z.array(DockMindCrossingSchema), flags: z.array(DockMindReviewFlagSchema),
  tracks_seen: Count, tracks_counted: Count, max_objects_in_frame: Count,
}).strict()
  .refine((count) => count.net === count.entries - count.exits, "net debe ser entradas menos salidas")
  .refine((count) => count.status !== "OK" || count.flags.length === 0, "OK no puede traer marcas de revisión")
  .refine((count) => count.status === "REQUIRES_REVIEW" || count.flags.length === 0, "Las marcas exigen REQUIRES_REVIEW");

export const DockMindObservationSchema = z.object({
  analysis_version: z.string().min(1),
  created_at: z.string().datetime({offset: true}),
  clip: z.object({
    file: z.string().min(1), sha256: z.string().regex(/^[0-9a-f]{64}$/), source: DockMindClipSourceSchema,
    original: VideoInfoSchema, normalized: VideoInfoSchema,
    // Corredor alrededor de la línea que se manda a SAM, en fracciones del original; null = cuadro completo.
    roi: z.object({x: Fraction, y: Fraction, width: Fraction, height: Fraction}).strict().nullable(),
    time_mapping: z.string(),
  }).strict(),
  segmentation: z.object({
    segmenter: z.enum(["META_SAM_API", "FIXTURE"]), real_inference: z.boolean(), model: z.string(), concept: z.string(),
    seconds: z.number().min(0), request_id: z.string().nullable(), boxes: Count, estimated_cost_usd: z.number().min(0),
  }).strict().refine((s) => s.segmenter === "META_SAM_API" || !s.real_inference, "Un FIXTURE nunca es inferencia real"),
  config: z.object({
    line: DockMindLineSchema, unit: DockMindUnitSchema, concept: z.string(), margin: z.number(), near_zone: z.number(),
    min_track_frames: Count, confirm_frames: Count, switch_window_frames: Count, object_limit: Count,
  }).strict(),
  result: DockMindCountSchema,
  // El video anotado va a la ruta del intento; la API compara este SHA-256 con el objeto guardado antes de aceptarlo.
  evidence: z.object({overlay_uploaded: z.boolean(), overlay_sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable()}).strict()
    .refine((e) => e.overlay_uploaded === (e.overlay_sha256 !== null), "overlay_sha256 acompaña a un video subido"),
}).strict();

export const DockMindResultSchema = z.object({
  schema: z.literal(DOCKMIND_RESULT_SCHEMA), job_id: Id, attempt: z.number().int().min(1),
  organization_id: Id, session_id: Id, evidence_id: Id, group_id: Id, manifest_revision: z.number().int().min(1),
  status: z.enum(["SUCCEEDED", "FAILED"]),
  error: z.object({code: DockMindErrorCodeSchema, message: z.string().max(300)}).strict().nullable(),
  observation: DockMindObservationSchema.nullable(),
}).strict().refine(
  (r) => (r.status === "SUCCEEDED" ? r.observation !== null && r.error === null : r.observation === null && r.error !== null),
  "SUCCEEDED trae observación sin error; FAILED trae error sin observación",
);

export type DockMindJob = z.infer<typeof DockMindJobSchema>;
export type DockMindJobConfig = z.infer<typeof DockMindJobConfigSchema>;
export type DockMindClipSource = z.infer<typeof DockMindClipSourceSchema>;
export type DockMindResult = z.infer<typeof DockMindResultSchema>;
export type DockMindObservation = z.infer<typeof DockMindObservationSchema>;
