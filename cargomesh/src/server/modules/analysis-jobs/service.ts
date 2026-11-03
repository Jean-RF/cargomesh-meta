import {createHash} from "node:crypto";
import {z} from "zod";
import {
  DOCKMIND_CONFIG_DEFAULTS, DOCKMIND_JOB_SCHEMA, DockMindJobConfigSchema, DockMindJobSchema, DockMindLoopbackJobSchema, DockMindResultSchema,
  type DockMindJobConfig, type DockMindObservation,
} from "@/shared/schemas/meta/dockmind";
import {DOCKMIND_SIGNATURE_HEADER, DOCKMIND_TIMESTAMP_HEADER, verifyDockMindSignature} from "./callback-signature";
import {detectContainer} from "./media-format";
import {isRetryable} from "./retry-policy";
import type {
  AnalysisJobConfig, AnalysisJobDeps, AnalysisJobRecord, ClipRecord, DeliveryOutcome, DeliveryStatus, JobActor,
  ManifestGroupForAnalysis, OverlayVerification, ProblemCode, ServerDeps, SessionForAnalysis, WorkerDispatcher,
} from "./ports";
import {toAnalysisJobView, type AnalysisJobView} from "./view";

/** Error de dominio: la ruta lo convierte al sobre V2 por `code` y `httpStatus`. */
export class AnalysisJobError extends Error {
  constructor(public readonly code: string, message: string, public readonly httpStatus: number) {
    super(message);
  }
}

const LINE_KEYS = ["x1", "y1", "x2", "y2", "inside_x", "inside_y"] as const;
const CODE = /^[A-Z][A-Z0-9_]{2,59}$/;
const Id = z.string().uuid();

export const AnalysisRequestSchema = z.object({
  sessionId: Id,
  evidenceId: Id,
  groupId: Id.optional(),
  coverage: z.enum(["PARTIAL", "COMPLETE"]).default("PARTIAL"),
  config: DockMindJobConfigSchema,
}).strict();
export const ExpectedAttemptSchema = z.object({expectedAttempt: z.number().int().min(1).max(50)}).strict();
export const SessionQuerySchema = z.object({sessionId: Id}).strict();

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Con los valores por defecto del worker explícitos: omitirlos o mandarlos iguales es el mismo job. */
export function effectiveConfig(config: DockMindJobConfig): Required<DockMindJobConfig> {
  return {
    ...config,
    margin: config.margin ?? DOCKMIND_CONFIG_DEFAULTS.margin,
    min_track_frames: config.min_track_frames ?? DOCKMIND_CONFIG_DEFAULTS.min_track_frames,
  };
}

/**
 * Payload canónico del job: sesión, clip y sus bytes, revisión, grupo, cobertura declarada y configuración efectiva.
 * El repositorio en memoria usa esta clave; la base calcula la suya con los mismos campos.
 */
export function analysisDedupeKey(input: {
  sessionId: string; evidenceId: string; clipSha256: string; manifestRevision: number; groupId: string; coverage: string; config: unknown;
}): string {
  return createHash("sha256").update(canonical(input)).digest("hex");
}

/** La firma prueba que el resultado viene del worker, no que contó lo que se pidió: eso se compara aquí. */
function ranAsRequested(job: AnalysisJobRecord, observation: DockMindObservation): boolean {
  const used = observation.config;
  return used.unit === job.config.unit
    && used.concept === job.config.concept
    && observation.segmentation.concept === job.config.concept
    && used.margin === job.config.margin
    && used.min_track_frames === job.config.min_track_frames
    && LINE_KEYS.every((key) => used.line[key] === job.config.line[key])
    && observation.clip.source === job.source
    && observation.clip.sha256 === job.clipSha256;
}

/** El grupo del manifiesto que cuenta el clip. Si hay uno solo de esa unidad, se elige solo. */
function resolveGroup(session: SessionForAnalysis, groupId: string | undefined, unit: "PALLET" | "BOX"): ManifestGroupForAnalysis {
  if (groupId) {
    const group = session.groups.find((g) => g.groupId === groupId);
    if (!group) throw new AnalysisJobError("MANIFEST_GROUP_NOT_FOUND", "The manifest revision has no such group.", 404);
    if (group.unit !== unit) throw new AnalysisJobError("INCOMPATIBLE_UNIT", `The group counts ${group.unit}, not ${unit}.`, 409);
    return group;
  }
  const candidates = session.groups.filter((g) => g.unit === unit);
  if (candidates.length === 0) throw new AnalysisJobError("INCOMPATIBLE_UNIT", `The manifest has no ${unit} group.`, 409);
  if (candidates.length > 1) {
    throw new AnalysisJobError("MANIFEST_GROUP_REQUIRED", `The manifest has ${candidates.length} ${unit} groups; choose one.`, 409);
  }
  return candidates[0];
}

export function requireOperator(actor: JobActor): void {
  if (actor.role !== "OWNER" && actor.role !== "SUPERVISOR") {
    throw new AnalysisJobError("FORBIDDEN_WORKFLOW", "Only an owner or supervisor can operate DockMind.", 403);
  }
}

export async function openSession(deps: AnalysisJobDeps, actor: JobActor, sessionId: string): Promise<SessionForAnalysis> {
  const session = await deps.sessions.getForAnalysis(actor, sessionId);
  if (!session || session.organizationId !== actor.organizationId) {
    throw new AnalysisJobError("LOADING_SESSION_NOT_FOUND", "Loading session not found.", 404);
  }
  if (session.status !== "OPEN") throw new AnalysisJobError("SESSION_NOT_OPEN", "Only an open loading session receives clips.", 409);
  return session;
}

async function authorizedJob(deps: AnalysisJobDeps, actor: JobActor, jobId: string): Promise<AnalysisJobRecord> {
  const job = Id.safeParse(jobId).success ? await deps.jobs.get(jobId) : null;
  if (!job || job.organizationId !== actor.organizationId) {
    throw new AnalysisJobError("ANALYSIS_JOB_NOT_FOUND", "Analysis job not found.", 404);
  }
  return job;
}

async function readyClip(deps: AnalysisJobDeps, actor: JobActor, clipId: string): Promise<ClipRecord> {
  const clip = await deps.clips.get(clipId);
  if (!clip || clip.organizationId !== actor.organizationId) throw new AnalysisJobError("EVIDENCE_NOT_FOUND", "Clip evidence not found.", 404);
  if (clip.state !== "READY") throw new AnalysisJobError("EVIDENCE_NOT_READY", "Only a verified upload can be analyzed.", 409);
  return clip;
}

/**
 * Solo lo llama quien ganó la transición del intento: el insert único al crear o el cambio de intento al
 * reintentar. Así cada intento sale una sola vez, y el worker tampoco lanza dos veces el mismo job e intento.
 */
async function dispatch(
  deps: AnalysisJobDeps, worker: WorkerDispatcher, config: AnalysisJobConfig, job: AnalysisJobRecord, clip: ClipRecord,
): Promise<AnalysisJobRecord> {
  let sent: {callId: string | null};
  try {
    const schema = config.workerMode === "LOCAL_LOOPBACK" ? DockMindLoopbackJobSchema : DockMindJobSchema;
    const payload = schema.parse({
      schema: DOCKMIND_JOB_SCHEMA,
      job_id: job.jobId,
      attempt: job.attempt,
      organization_id: job.organizationId,
      session_id: job.sessionId,
      evidence_id: job.evidenceId,
      group_id: job.groupId,
      manifest_revision: job.manifestRevision,
      clip_url: await deps.storage.signedReadUrl(clip.storagePath, config.clipUrlTtlSeconds),
      overlay_upload_url: await deps.storage.signedOverlayUploadUrl(job.overlayPath),
      callback_url: config.callbackUrl,
      source: job.source,
      config: job.config,
    });
    sent = await worker.dispatch(payload);
  } catch (error) {
    // El job queda en cola con el motivo: la UI ofrece reintentar, nada se da por procesado.
    const message = `Worker dispatch failed: ${error instanceof Error ? error.message : "unknown"}`.slice(0, 300);
    const queued = await deps.jobs.markDispatchFailed(job.jobId, job.attempt, {code: "PROVIDER_UNAVAILABLE", message});
    return queued ?? (await deps.jobs.get(job.jobId)) ?? job;
  }
  // Solo pasa a RUNNING si sigue en cola: el callback puede llegar antes de que el despacho responda.
  const running = await deps.jobs.markDispatched(job.jobId, job.attempt, sent.callId);
  return running ?? (await deps.jobs.get(job.jobId)) ?? job;
}

export async function requestAnalysis(
  deps: AnalysisJobDeps, actor: JobActor, body: unknown,
): Promise<{job: AnalysisJobView; created: boolean}> {
  const request = AnalysisRequestSchema.parse(body);
  requireOperator(actor);
  const worker = deps.worker();
  const config = deps.config();
  const session = await openSession(deps, actor, request.sessionId);
  const group = resolveGroup(session, request.groupId, request.config.unit);
  const clip = await readyClip(deps, actor, request.evidenceId);
  if (clip.sessionId !== session.sessionId) {
    throw new AnalysisJobError("EVIDENCE_SESSION_MISMATCH", "The clip belongs to another session.", 409);
  }
  const {record, created} = await deps.jobs.create({
    sessionId: session.sessionId,
    evidenceId: clip.clipId,
    manifestRevision: session.manifestRevision,
    groupId: group.groupId,
    coverage: request.coverage,
    config: effectiveConfig(request.config),
  });
  const job = created ? await dispatch(deps, worker, config, record, clip) : record;
  return {job: toAnalysisJobView(job, deps.now()), created};
}

export async function readAnalysis(deps: AnalysisJobDeps, actor: JobActor, jobId: string): Promise<AnalysisJobView> {
  return toAnalysisJobView(await authorizedJob(deps, actor, jobId), deps.now());
}

export async function listAnalyses(deps: AnalysisJobDeps, actor: JobActor, query: unknown): Promise<AnalysisJobView[]> {
  const {sessionId} = SessionQuerySchema.parse(query);
  const rows = await deps.jobs.listForSession(sessionId);
  return rows.filter((job) => job.organizationId === actor.organizationId).map((job) => toAnalysisJobView(job, deps.now()));
}

/** Reintento explícito desde el intento que vio el miembro: solo si falló, si nunca salió de la cola o si el worker no avisó. */
export async function retryAnalysis(deps: AnalysisJobDeps, actor: JobActor, jobId: string, body: unknown): Promise<AnalysisJobView> {
  const {expectedAttempt} = ExpectedAttemptSchema.parse(body);
  requireOperator(actor);
  const worker = deps.worker();
  const config = deps.config();
  const job = await authorizedJob(deps, actor, jobId);
  if (job.attempt !== expectedAttempt) throw new AnalysisJobError("STALE_ANALYSIS_JOB", "The job changed; reload it before retrying.", 409);
  if (!isRetryable(job, deps.now())) {
    throw new AnalysisJobError("ANALYSIS_NOT_RETRYABLE", `A ${job.status} job cannot be retried yet.`, 409);
  }
  const clip = await readyClip(deps, actor, job.evidenceId);
  const next = await deps.jobs.retry(job.jobId, expectedAttempt);
  return toAnalysisJobView(await dispatch(deps, worker, config, next, clip), deps.now());
}

/** Errores de Juan que repetir no arregla (validación, alcance, revisión): la entrega queda REJECTED con su código. */
function deliveryProblem(error: unknown): {permanent: boolean; problem: ProblemCode} {
  if (error instanceof z.ZodError) {
    return {permanent: true, problem: {code: "OBSERVATION_CONTRACT_MISMATCH", message: error.issues[0]?.message.slice(0, 300) ?? "Invalid observation."}};
  }
  const typed = error as {code?: unknown; httpStatus?: unknown; message?: unknown} | null;
  if (typed && typeof typed.httpStatus === "number" && typeof typed.code === "string") {
    const status = typed.httpStatus;
    // 401/403 indican una credencial de servidor mal configurada: se corrige y se recupera la entrega.
    const permanent = status >= 400 && status < 500 && ![401, 403, 408, 429].includes(status);
    return {permanent, problem: {code: CODE.test(typed.code) ? typed.code : "DELIVERY_FAILED", message: String(typed.message ?? "").slice(0, 300)}};
  }
  return {permanent: false, problem: {code: "DELIVERY_UNAVAILABLE", message: (error instanceof Error ? error.message : "unknown").slice(0, 300)}};
}

/** Juan recibe si el video anotado de este intento quedó verificado, no lo que declaró el worker. */
function forDelivery(job: AnalysisJobRecord): AnalysisJobRecord {
  if (!job.observation) return job;
  const evidence = {...job.observation.evidence, overlay_uploaded: job.overlay.status === "VERIFIED"};
  return {...job, observation: {...job.observation, evidence}};
}

/**
 * Entrega la observación guardada a Juan. Usa siempre lo que quedó en el job, nunca el cuerpo del callback,
 * y no vuelve a llamar al worker ni a SAM. Juan guarda una vez por organización, job e intento, así que
 * repetir una entrega (dos callbacks, un reinicio del servidor, la recuperación manual) devuelve la misma observación.
 */
export async function deliverObservation(server: ServerDeps, job: AnalysisJobRecord): Promise<AnalysisJobRecord> {
  if (job.status !== "SUCCEEDED" || job.delivery.status !== "PENDING") return job;
  let outcome: DeliveryOutcome;
  try {
    const saved = await server.observations.record(forDelivery(job));
    if (saved.reason === "STALE_ATTEMPT") outcome = {outcome: "SUPERSEDED"};
    else if (saved.id) outcome = {outcome: "DELIVERED", observationId: saved.id};
    else outcome = {outcome: "RETRY", error: {code: "DELIVERY_UNCONFIRMED", message: "The loading session did not return the observation."}};
  } catch (error) {
    const {permanent, problem} = deliveryProblem(error);
    outcome = permanent ? {outcome: "REJECTED", error: problem} : {outcome: "RETRY", error: problem};
  }
  return (await server.ledger.recordDelivery(job.jobId, job.attempt, outcome)).record;
}

/**
 * El video anotado vale solo si el objeto de la ruta de este intento, que deriva la base, tiene el SHA-256 que
 * declaró el worker y es un MP4. Lo que dice el callback no alcanza: un intento viejo no tiene URL para esta ruta
 * y la subida solo crea, así que nada reemplaza en silencio un video ya guardado.
 */
async function verifyOverlay(server: ServerDeps, job: AnalysisJobRecord, observation: DockMindObservation | null): Promise<OverlayVerification> {
  const declared = observation?.evidence;
  if (!declared?.overlay_uploaded || !declared.overlay_sha256) return {status: "NONE", sha256: null};
  const stored = await server.overlays.inspect(job.overlayPath);
  if (!stored) return {status: "MISSING", sha256: null};
  if (stored.sha256 !== declared.overlay_sha256 || detectContainer(stored.head) !== "MP4") return {status: "MISMATCH", sha256: null};
  return {status: "VERIFIED", sha256: stored.sha256};
}

export type CallbackOutcome = {
  accepted: boolean;
  reason: "RECORDED" | "ALREADY_RECORDED" | "STALE_ATTEMPT";
  delivery: DeliveryStatus;
};

/**
 * Callback del worker: firma sobre el cuerpo crudo y su timestamp, contrato, identidad exacta del job e intento,
 * resultado guardado una vez y entrega a Juan. Un callback repetido vuelve a intentar una entrega pendiente:
 * ALREADY_RECORDED no se la salta. Si la entrega sigue pendiente responde 503 para que el worker reenvíe.
 */
export async function receiveWorkerCallback(
  server: ServerDeps, rawBody: string, headers: {get(name: string): string | null | undefined},
): Promise<CallbackOutcome> {
  const signed = verifyDockMindSignature({
    rawBody,
    secret: server.callbackSecret(),
    timestamp: headers.get(DOCKMIND_TIMESTAMP_HEADER) ?? null,
    signature: headers.get(DOCKMIND_SIGNATURE_HEADER) ?? null,
    nowSeconds: Math.floor(server.now().getTime() / 1000),
  });
  if (!signed) throw new AnalysisJobError("INVALID_SIGNATURE", "Invalid or expired worker signature.", 401);

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new AnalysisJobError("VALIDATION_ERROR", "The callback body is not JSON.", 400);
  }
  const result = DockMindResultSchema.parse(parsed);
  const job = Id.safeParse(result.job_id).success ? await server.ledger.get(result.job_id) : null;
  if (!job) throw new AnalysisJobError("ANALYSIS_JOB_NOT_FOUND", "Analysis job not found.", 404);
  if (result.organization_id !== job.organizationId || result.session_id !== job.sessionId || result.evidence_id !== job.evidenceId
    || result.group_id !== job.groupId || result.manifest_revision !== job.manifestRevision || result.attempt > job.attempt) {
    throw new AnalysisJobError("INPUT_REVISION_MISMATCH", "The result does not match the job it claims.", 409);
  }
  if (result.observation && !ranAsRequested(job, result.observation)) {
    throw new AnalysisJobError("INPUT_REVISION_MISMATCH", "The result was counted with another configuration, clip or source.", 409);
  }
  if (result.attempt < job.attempt) return {accepted: false, reason: "STALE_ATTEMPT", delivery: job.delivery.status};

  // Solo el resultado que puede cerrar este intento mira su video; uno repetido no vuelve a leerlo.
  const open = job.status === "QUEUED" || job.status === "RUNNING";
  const overlay = open ? await verifyOverlay(server, job, result.observation) : {status: "NONE" as const, sha256: null};
  const {record, outcome} = await server.ledger.complete({
    jobId: job.jobId,
    attempt: result.attempt,
    organizationId: result.organization_id,
    sessionId: result.session_id,
    evidenceId: result.evidence_id,
    groupId: result.group_id,
    manifestRevision: result.manifest_revision,
    status: result.status,
    error: result.error,
    observation: result.observation,
    overlay,
  });
  if (outcome === "STALE_ATTEMPT") return {accepted: false, reason: outcome, delivery: record.delivery.status};
  const saved = await deliverObservation(server, record);
  if (saved.delivery.status === "PENDING") {
    throw new AnalysisJobError("DELIVERY_PENDING", "The result is saved; the observation delivery will be retried.", 503);
  }
  return {accepted: outcome === "RECORDED", reason: outcome, delivery: saved.delivery.status};
}

/** Recuperación manual de una entrega pendiente después de agotar los reenvíos del worker. No vuelve a ejecutar SAM. */
export async function recoverDelivery(
  deps: AnalysisJobDeps, server: ServerDeps, actor: JobActor, jobId: string, body: unknown,
): Promise<AnalysisJobView> {
  const {expectedAttempt} = ExpectedAttemptSchema.parse(body);
  requireOperator(actor);
  const job = await authorizedJob(deps, actor, jobId);
  if (job.attempt !== expectedAttempt) throw new AnalysisJobError("STALE_ANALYSIS_JOB", "The job changed; reload it first.", 409);
  if (job.status !== "SUCCEEDED" || job.delivery.status !== "PENDING") {
    throw new AnalysisJobError("DELIVERY_NOT_PENDING", "This job has no pending observation delivery.", 409);
  }
  const current = (await server.ledger.get(job.jobId)) ?? job;
  return toAnalysisJobView(await deliverObservation(server, current), deps.now());
}

/** URL corta del video anotado, emitida después de autorizar al miembro. */
export async function overlayUrl(deps: AnalysisJobDeps, actor: JobActor, jobId: string): Promise<{url: string; expiresAt: string}> {
  const job = await authorizedJob(deps, actor, jobId);
  if (job.status !== "SUCCEEDED" || job.overlay.status !== "VERIFIED") {
    throw new AnalysisJobError("OVERLAY_NOT_AVAILABLE", "This attempt has no verified annotated video.", 404);
  }
  // `overlayPath` es la ruta del intento actual, el mismo que produjo la observación guardada.
  return {url: await deps.storage.signedReadUrl(job.overlayPath, MEDIA_URL_TTL_SECONDS), expiresAt: new Date(deps.now().getTime() + MEDIA_URL_TTL_SECONDS * 1000).toISOString()};
}

/** Las URLs que ve el navegador duran poco; las del worker, lo que dura su cola (ver config.ts). */
export const MEDIA_URL_TTL_SECONDS = 5 * 60;
