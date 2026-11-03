import type {AnalysisJobRecord, AnalysisJobStatus, ClipRecord, ObservationDelivery, OverlayVerification} from "./ports";
import {isRetryable} from "./retry-policy";

/** Lo que la UI necesita para mostrar el job. Sin URLs firmadas, rutas del bucket ni datos de otra organización. */
export type AnalysisJobView = {
  jobId: string;
  sessionId: string;
  evidenceId: string;
  manifestRevision: number;
  groupId: string;
  coverage: "PARTIAL" | "COMPLETE";
  attempt: number;
  status: AnalysisJobStatus;
  retryable: boolean;
  createdAt: string;
  updatedAt: string;
  error: {code: string; message: string} | null;
  /** Si la observación ya llegó a la sesión de Juan; PENDING se puede recuperar sin volver a analizar. */
  delivery: ObservationDelivery;
  /** Video anotado de este intento según lo que verificó el servidor. */
  overlayStatus: OverlayVerification["status"];
  result: null | {
    unit: "PALLET" | "BOX";
    observationStatus: "OK" | "REQUIRES_REVIEW" | "INSUFFICIENT_EVIDENCE";
    entries: number;
    exits: number;
    net: number;
    events: {objectId: number; seconds: number; direction: "IN" | "OUT"}[];
    flags: {kind: string; seconds: number; detail: string}[];
    clipSource: "OWN_CAPTURE" | "SYNTHETIC_RENDER";
    realInference: boolean;
    overlayUploaded: boolean;
    analysisVersion: string;
  };
};

export type ClipView = Omit<ClipRecord, "organizationId" | "storagePath" | "updatedAt">;

export function toAnalysisJobView(job: AnalysisJobRecord, now: Date): AnalysisJobView {
  const observation = job.observation;
  return {
    jobId: job.jobId,
    sessionId: job.sessionId,
    evidenceId: job.evidenceId,
    manifestRevision: job.manifestRevision,
    groupId: job.groupId,
    coverage: job.coverage,
    attempt: job.attempt,
    status: job.status,
    retryable: isRetryable(job, now),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    error: job.error,
    delivery: job.delivery,
    overlayStatus: job.overlay.status,
    result: observation && {
      unit: observation.config.unit,
      observationStatus: observation.result.status,
      entries: observation.result.entries,
      exits: observation.result.exits,
      net: observation.result.net,
      events: observation.result.events.map((e) => ({objectId: e.object_id, seconds: e.seconds, direction: e.direction})),
      flags: observation.result.flags.map((f) => ({kind: f.kind, seconds: f.seconds, detail: f.detail})),
      clipSource: observation.clip.source,
      realInference: observation.segmentation.real_inference,
      overlayUploaded: job.overlay.status === "VERIFIED",
      analysisVersion: observation.analysis_version,
    },
  };
}

export function toClipView(clip: ClipRecord): ClipView {
  return {
    clipId: clip.clipId,
    sessionId: clip.sessionId,
    source: clip.source,
    mimeType: clip.mimeType,
    sizeBytes: clip.sizeBytes,
    sha256: clip.sha256,
    state: clip.state,
    container: clip.container,
    rejection: clip.rejection,
    createdAt: clip.createdAt,
    readyAt: clip.readyAt,
  };
}
