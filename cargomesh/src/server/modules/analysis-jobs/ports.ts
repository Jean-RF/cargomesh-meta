import type {DockMindClipSource, DockMindJob, DockMindJobConfig, DockMindObservation} from "@/shared/schemas/meta/dockmind";

/**
 * Puertos del módulo DockMind. El servicio no conoce Supabase ni Modal.
 * - Lo que hace el miembro (registrar clips, pedir y reintentar jobs) pasa por puertos que la base autoriza
 *   en cada llamada con su organización y su membresía.
 * - Lo que hace el servidor (verificar la subida, guardar el resultado firmado del worker y entregar la
 *   observación a Juan) pasa por los puertos `*Ledger`, que se implementan con la clave de servicio.
 * Las pruebas usan implementaciones en memoria con la misma semántica.
 */

export type JobActor = {userId: string; memberId: string; organizationId: string; role: "OWNER" | "SUPERVISOR" | "REQUESTER"};
export type DockMindUnit = "PALLET" | "BOX";

/** Grupo del manifiesto en la revisión vigente: es lo que el dashboard compara con lo observado. */
export type ManifestGroupForAnalysis = {groupId: string; label: string; unit: DockMindUnit};

export type SessionForAnalysis = {
  sessionId: string;
  organizationId: string;
  manifestRevision: number;
  groups: ManifestGroupForAnalysis[];
  status: "OPEN" | "CLOSED";
};

/** Lo implementa `createLoadingAnalysisSessionReader` de Juan, construido por petición autenticada. */
export interface SessionReader {
  getForAnalysis(actor: {userId: string; organizationId: string}, sessionId: string): Promise<SessionForAnalysis | null>;
}

/** Lo declara el operador: si el clip muestra toda la carga del grupo o solo una parte. */
export type ClipCoverage = "PARTIAL" | "COMPLETE";

export type ClipState = "PENDING" | "READY" | "REJECTED";
export type ClipRecord = {
  clipId: string;
  organizationId: string;
  sessionId: string;
  source: DockMindClipSource;
  mimeType: "video/mp4" | "video/quicktime";
  sizeBytes: number;
  sha256: string;
  state: ClipState;
  container: "MP4" | "MOV" | null;
  rejection: string | null;
  /** Ruta en el bucket privado, derivada de IDs estables; nunca sale al navegador. */
  storagePath: string;
  createdAt: string;
  updatedAt: string;
  readyAt: string | null;
};
export type NewClip = Pick<ClipRecord, "sessionId" | "source" | "mimeType" | "sizeBytes" | "sha256">;

/** Clips del miembro: la base exige su membresía y que la sesión sea de su organización. */
export interface ClipRepository {
  /** Mismo `key` y mismo cuerpo devuelven el mismo clip; mismo `key` con otro cuerpo es IDEMPOTENCY_CONFLICT. */
  register(clip: NewClip, key: string): Promise<{record: ClipRecord; replay: boolean}>;
  get(clipId: string): Promise<ClipRecord | null>;
  listForSession(sessionId: string): Promise<ClipRecord[]>;
}

/** Solo el servidor marca una subida como verificada o rechazada. */
export interface ClipLedger {
  markReady(clipId: string, verified: {container: "MP4" | "MOV"; sizeBytes: number; sha256: string}): Promise<ClipRecord>;
  reject(clipId: string, reason: string): Promise<ClipRecord>;
}

/** Bucket privado. Lo implementa el servidor con la clave de servicio, después de autorizar al miembro. */
export interface ClipStorage {
  signedUploadUrl(path: string): Promise<{url: string; expiresAt: string}>;
  /** Lee el objeto subido para verificarlo; null si todavía no existe. */
  inspect(path: string): Promise<{sizeBytes: number; sha256: string; head: Uint8Array} | null>;
  signedReadUrl(path: string, ttlSeconds: number): Promise<string>;
  /** Subida del video anotado de un intento: solo crea, nunca reemplaza un objeto guardado. */
  signedOverlayUploadUrl(path: string): Promise<string>;
}

export interface WorkerDispatcher {
  dispatch(job: DockMindJob): Promise<{callId: string | null; duplicate: boolean}>;
}

export type AnalysisJobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
export type ProblemCode = {code: string; message: string};

/** Entrega de la observación a Juan: un hecho distinto de que el análisis haya terminado. */
export type DeliveryStatus = "NOT_REQUIRED" | "PENDING" | "DELIVERED" | "REJECTED" | "SUPERSEDED";
export type ObservationDelivery = {
  status: DeliveryStatus;
  tries: number;
  error: ProblemCode | null;
  observationId: string | null;
  deliveredAt: string | null;
};

export type AnalysisJobRecord = {
  jobId: string;
  organizationId: string;
  sessionId: string;
  /** El clip analizado (`ClipRecord.clipId`). */
  evidenceId: string;
  manifestRevision: number;
  groupId: string;
  coverage: ClipCoverage;
  /** Configuración efectiva, con los valores por defecto del worker explícitos. */
  config: Required<DockMindJobConfig>;
  /** Procedencia y bytes del clip que se mandó al worker; el resultado tiene que traer los mismos. */
  source: DockMindClipSource;
  clipSha256: string;
  dedupeKey: string;
  attempt: number;
  status: AnalysisJobStatus;
  workerCallId: string | null;
  error: ProblemCode | null;
  observation: DockMindObservation | null;
  /** Ruta del video anotado de este intento, derivada en la base del job y del intento. */
  overlayPath: string;
  /** Lo que el servidor comprobó en `overlayPath` al guardar el resultado de este intento. */
  overlay: OverlayVerification;
  delivery: ObservationDelivery;
  createdAt: string;
  updatedAt: string;
  dispatchedAt: string | null;
  completedAt: string | null;
};

export type NewAnalysisJob = {
  sessionId: string;
  evidenceId: string;
  manifestRevision: number;
  groupId: string;
  coverage: ClipCoverage;
  config: Required<DockMindJobConfig>;
};

/**
 * Jobs del miembro. Cada cambio de estado es atómico en la base: aplica solo si el job sigue en el intento
 * y en el estado esperados (en Postgres, un `update ... where attempt = $2 and status = ...` o `select ... for update`).
 */
export interface AnalysisJobRepository {
  /** Inserta si no hay otro job con el mismo payload canónico en la organización; si lo hay, devuelve ese. */
  create(job: NewAnalysisJob): Promise<{record: AnalysisJobRecord; created: boolean}>;
  get(jobId: string): Promise<AnalysisJobRecord | null>;
  listForSession(sessionId: string): Promise<AnalysisJobRecord[]>;
  /** QUEUED -> RUNNING del intento indicado; null si el job ya cambió (por ejemplo, llegó antes el callback). */
  markDispatched(jobId: string, attempt: number, callId: string | null): Promise<AnalysisJobRecord | null>;
  /** El job sigue en cola con el motivo; null si ya cambió. */
  markDispatchFailed(jobId: string, attempt: number, error: ProblemCode): Promise<AnalysisJobRecord | null>;
  /** Nuevo intento desde el que vio el miembro, solo si la política de reintento lo permite. */
  retry(jobId: string, expectedAttempt: number): Promise<AnalysisJobRecord>;
}

/**
 * NONE: el intento no tiene video anotado. VERIFIED: el objeto de `overlayPath` tiene `sha256`.
 * MISSING / MISMATCH: el worker dijo haberlo subido pero el objeto no está o no coincide; nunca se reproduce.
 */
export type OverlayVerification = {status: "NONE" | "VERIFIED" | "MISSING" | "MISMATCH"; sha256: string | null};

export type CompleteJobInput = {
  jobId: string;
  attempt: number;
  organizationId: string;
  sessionId: string;
  evidenceId: string;
  groupId: string;
  manifestRevision: number;
  status: "SUCCEEDED" | "FAILED";
  error: ProblemCode | null;
  observation: DockMindObservation | null;
  overlay: OverlayVerification;
};

export type DeliveryOutcome =
  | {outcome: "DELIVERED"; observationId: string}
  | {outcome: "SUPERSEDED"}
  | {outcome: "REJECTED"; error: ProblemCode}
  | {outcome: "RETRY"; error: ProblemCode};

/** Lo usa solo el servidor, después de verificar la firma del worker o de autorizar al miembro. */
export interface AnalysisJobLedger {
  get(jobId: string): Promise<AnalysisJobRecord | null>;
  /** Guarda el resultado de un intento abierto; un resultado repetido o de un intento viejo no cambia nada. */
  complete(input: CompleteJobInput): Promise<{record: AnalysisJobRecord; outcome: "RECORDED" | "ALREADY_RECORDED" | "STALE_ATTEMPT"}>;
  /** Anota el resultado de una entrega; solo cambia una entrega PENDING de ese intento. */
  recordDelivery(jobId: string, attempt: number, delivery: DeliveryOutcome): Promise<{record: AnalysisJobRecord; applied: boolean}>;
}

/** `recordLoadingObservation` de Juan: idempotente por organización, job e intento. */
export interface ObservationSink {
  record(job: AnalysisJobRecord): Promise<{id: string | null; recorded: boolean; reason: "RECORDED" | "ALREADY_RECORDED" | "STALE_ATTEMPT"}>;
}

export type AnalysisJobConfig = {
  callbackUrl: string;
  clipUrlTtlSeconds: number;
  /** MODAL: todo por https. LOCAL_LOOPBACK: lanzador local en 127.0.0.1, solo en desarrollo (ver config.ts). */
  workerMode: "MODAL" | "LOCAL_LOOPBACK";
};

/** Dependencias de una petición autenticada. */
export type AnalysisJobDeps = {
  sessions: SessionReader;
  clips: ClipRepository;
  jobs: AnalysisJobRepository;
  storage: ClipStorage;
  /** Se pide al despachar: sin las variables de Modal responde NOT_CONFIGURED sin crear el job. */
  worker: () => WorkerDispatcher;
  config: () => AnalysisJobConfig;
  now: () => Date;
};

/** Dependencias del servidor: verificar subidas, recibir el callback y entregar a Juan. */
export type ServerDeps = {
  clipLedger: ClipLedger;
  /** Para verificar el video anotado del intento antes de guardar su resultado. */
  overlays: Pick<ClipStorage, "inspect">;
  ledger: AnalysisJobLedger;
  observations: ObservationSink;
  callbackSecret: () => string;
  now: () => Date;
};
