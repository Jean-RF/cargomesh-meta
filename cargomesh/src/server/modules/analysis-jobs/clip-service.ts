import {z} from "zod";
import {detectContainer} from "./media-format";
import type {AnalysisJobDeps, ClipRecord, JobActor, ServerDeps} from "./ports";
import {AnalysisJobError, MEDIA_URL_TTL_SECONDS, SessionQuerySchema, openSession, requireOperator} from "./service";
import {toClipView, type ClipView} from "./view";

/** Límite por archivo del bucket (plan gratis de Supabase) y del worker. */
export const MAX_CLIP_BYTES = 50 * 1024 * 1024;

export const RegisterClipSchema = z.object({
  sessionId: z.string().uuid(),
  source: z.enum(["OWN_CAPTURE", "SYNTHETIC_RENDER"]),
  mimeType: z.enum(["video/mp4", "video/quicktime"]),
  sizeBytes: z.number().int().min(1).max(MAX_CLIP_BYTES),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();

const IdempotencyKey = z.string().uuid();

async function authorizedClip(deps: AnalysisJobDeps, actor: JobActor, clipId: string): Promise<ClipRecord> {
  const clip = z.string().uuid().safeParse(clipId).success ? await deps.clips.get(clipId) : null;
  if (!clip || clip.organizationId !== actor.organizationId) throw new AnalysisJobError("EVIDENCE_NOT_FOUND", "Clip evidence not found.", 404);
  return clip;
}

/**
 * Registra el clip en PENDING y devuelve una URL firmada de subida directa al bucket privado.
 * El navegador declara tamaño, tipo y SHA-256; el servidor lo comprueba al terminar la subida.
 */
export async function registerClip(
  deps: AnalysisJobDeps, actor: JobActor, body: unknown, key: string | undefined,
): Promise<{clip: ClipView; upload: {url: string; expiresAt: string} | null; replay: boolean}> {
  const value = RegisterClipSchema.parse(body);
  const idempotencyKey = IdempotencyKey.safeParse(key);
  if (!idempotencyKey.success) throw new AnalysisJobError("VALIDATION_ERROR", "Idempotency-Key must be a UUID.", 400);
  requireOperator(actor);
  await openSession(deps, actor, value.sessionId);
  const {record, replay} = await deps.clips.register(value, idempotencyKey.data);
  const upload = record.state === "PENDING" ? await deps.storage.signedUploadUrl(record.storagePath) : null;
  return {clip: toClipView(record), upload, replay};
}

export async function listClips(deps: AnalysisJobDeps, actor: JobActor, query: unknown): Promise<ClipView[]> {
  const {sessionId} = SessionQuerySchema.parse(query);
  return (await deps.clips.listForSession(sessionId)).filter((clip) => clip.organizationId === actor.organizationId).map(toClipView);
}

/**
 * Cierra la subida: el objeto debe existir, pesar y tener el hash declarados y ser realmente MP4 o MOV.
 * Si no cumple, el clip queda REJECTED con el motivo y hay que registrarlo de nuevo; nunca se analiza.
 */
export async function completeClipUpload(deps: AnalysisJobDeps, server: ServerDeps, actor: JobActor, clipId: string): Promise<ClipView> {
  requireOperator(actor);
  const clip = await authorizedClip(deps, actor, clipId);
  if (clip.state === "READY") return toClipView(clip);
  if (clip.state === "REJECTED") throw new AnalysisJobError("EVIDENCE_REJECTED", `The upload was rejected: ${clip.rejection}.`, 409);
  const stored = await deps.storage.inspect(clip.storagePath);
  if (!stored) throw new AnalysisJobError("UPLOAD_INCOMPLETE", "The clip has not been uploaded yet.", 409);
  const container = detectContainer(stored.head);
  const reason = stored.sizeBytes !== clip.sizeBytes ? "SIZE_MISMATCH"
    : stored.sha256 !== clip.sha256 ? "HASH_MISMATCH"
      : container === null ? "UNSUPPORTED_FORMAT" : null;
  if (reason || !container) {
    await server.clipLedger.reject(clip.clipId, reason ?? "UNSUPPORTED_FORMAT");
    throw new AnalysisJobError("MEDIA_INVALID", `The uploaded file failed verification: ${reason}.`, 422);
  }
  return toClipView(await server.clipLedger.markReady(clip.clipId, {container, sizeBytes: stored.sizeBytes, sha256: stored.sha256}));
}

/** URL corta del original, para marcar la línea sobre el clip ya verificado. */
export async function clipMediaUrl(deps: AnalysisJobDeps, actor: JobActor, clipId: string): Promise<{url: string; expiresAt: string}> {
  const clip = await authorizedClip(deps, actor, clipId);
  if (clip.state !== "READY") throw new AnalysisJobError("EVIDENCE_NOT_READY", "Only a verified upload can be played.", 409);
  return {
    url: await deps.storage.signedReadUrl(clip.storagePath, MEDIA_URL_TTL_SECONDS),
    expiresAt: new Date(deps.now().getTime() + MEDIA_URL_TTL_SECONDS * 1000).toISOString(),
  };
}
