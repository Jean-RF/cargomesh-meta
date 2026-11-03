import {randomUUID} from "node:crypto";
import type {
  AnalysisJobLedger, AnalysisJobRecord, AnalysisJobRepository, ClipLedger, ClipRecord, ClipRepository, JobActor, NewClip,
} from "./ports";
import {isRetryable} from "./retry-policy";
import {AnalysisJobError, analysisDedupeKey} from "./service";

/**
 * Almacén en memoria con la misma semántica que las tablas de la migración `meta_dockmind_jobs`:
 * clave única (organización, payload canónico), transiciones condicionadas al intento y al estado,
 * un video anotado por intento,
 * resultado separado de la entrega y entrega que solo cambia mientras está PENDING. Cada método corre
 * sin `await` intermedios, como una fila bloqueada en Postgres. La sesión, el modo y el rol los comprueba
 * la base (pruebas pgTAP); aquí solo se separan organizaciones. Sirve para pruebas y no persiste nada.
 */
export function createMemoryDockMindStore(options: {now?: () => Date; newId?: () => string} = {}) {
  const now = options.now ?? (() => new Date());
  const newId = options.newId ?? randomUUID;
  const clips = new Map<string, ClipRecord & {createdBy: string; key: string}>();
  const jobs = new Map<string, AnalysisJobRecord>();
  const at = () => now().toISOString();
  const copy = <T>(value: T): T => structuredClone(value);
  const publicClip = ({createdBy: _createdBy, key: _key, ...clip}: ClipRecord & {createdBy: string; key: string}): ClipRecord => copy(clip);
  /** Como la columna generada de la base: un objeto de video anotado por intento. */
  const overlayPath = (row: Pick<AnalysisJobRecord, "organizationId" | "sessionId" | "evidenceId" | "jobId" | "attempt">) =>
    `org/${row.organizationId}/${row.sessionId}/${row.evidenceId}-${row.jobId}-a${row.attempt}-overlay.mp4`;

  function clipsFor(actor: JobActor): ClipRepository {
    return {
      async register(clip: NewClip, key: string) {
        const existing = [...clips.values()].find((row) => row.organizationId === actor.organizationId && row.createdBy === actor.memberId && row.key === key);
        if (existing) {
          const same = (["sessionId", "source", "mimeType", "sizeBytes", "sha256"] as const).every((field) => existing[field] === clip[field]);
          if (!same) throw new AnalysisJobError("IDEMPOTENCY_CONFLICT", "The same key cannot register another clip.", 409);
          return {record: publicClip(existing), replay: true};
        }
        const clipId = newId();
        const extension = clip.mimeType === "video/quicktime" ? "mov" : "mp4";
        const row = {
          ...clip, clipId, organizationId: actor.organizationId, state: "PENDING" as const, container: null, rejection: null,
          storagePath: `org/${actor.organizationId}/${clip.sessionId}/${clipId}.${extension}`,
          createdAt: at(), updatedAt: at(), readyAt: null, createdBy: actor.memberId, key,
        };
        clips.set(clipId, row);
        return {record: publicClip(row), replay: false};
      },
      async get(clipId) {
        const row = clips.get(clipId);
        return row && row.organizationId === actor.organizationId ? publicClip(row) : null;
      },
      async listForSession(sessionId) {
        return [...clips.values()].filter((row) => row.organizationId === actor.organizationId && row.sessionId === sessionId).map(publicClip);
      },
    };
  }

  const clipLedger: ClipLedger = {
    async markReady(clipId, verified) {
      const row = clips.get(clipId);
      if (!row) throw new AnalysisJobError("EVIDENCE_NOT_FOUND", "Clip evidence not found.", 404);
      if (verified.sizeBytes !== row.sizeBytes || verified.sha256 !== row.sha256) throw new AnalysisJobError("UPLOAD_MISMATCH", "Upload mismatch.", 409);
      if (row.state === "REJECTED") throw new AnalysisJobError("EVIDENCE_REJECTED", "Clip rejected.", 409);
      if (row.state === "PENDING") Object.assign(row, {state: "READY", container: verified.container, readyAt: at(), updatedAt: at()});
      return publicClip(row);
    },
    async reject(clipId, reason) {
      const row = clips.get(clipId);
      if (!row) throw new AnalysisJobError("EVIDENCE_NOT_FOUND", "Clip evidence not found.", 404);
      if (row.state === "READY") throw new AnalysisJobError("EVIDENCE_ALREADY_READY", "Clip already verified.", 409);
      if (row.state === "PENDING") Object.assign(row, {state: "REJECTED", rejection: reason, updatedAt: at()});
      return publicClip(row);
    },
  };

  function jobsFor(actor: JobActor): AnalysisJobRepository {
    const own = (jobId: string) => {
      const row = jobs.get(jobId);
      return row && row.organizationId === actor.organizationId ? row : undefined;
    };
    return {
      async create(job) {
        const clip = clips.get(job.evidenceId);
        if (!clip || clip.organizationId !== actor.organizationId) throw new AnalysisJobError("EVIDENCE_NOT_FOUND", "Clip evidence not found.", 404);
        if (clip.state !== "READY") throw new AnalysisJobError("EVIDENCE_NOT_READY", "Only a verified upload can be analyzed.", 409);
        const dedupeKey = analysisDedupeKey({...job, clipSha256: clip.sha256});
        const existing = [...jobs.values()].find((row) => row.organizationId === actor.organizationId && row.dedupeKey === dedupeKey);
        if (existing) return {record: copy(existing), created: false};
        const jobId = newId();
        const record: AnalysisJobRecord = {
          ...copy(job), jobId, organizationId: actor.organizationId, source: clip.source, clipSha256: clip.sha256, dedupeKey,
          attempt: 1, status: "QUEUED", workerCallId: null, error: null, observation: null,
          overlayPath: overlayPath({organizationId: actor.organizationId, sessionId: job.sessionId, evidenceId: job.evidenceId, jobId, attempt: 1}),
          overlay: {status: "NONE", sha256: null},
          delivery: {status: "NOT_REQUIRED", tries: 0, error: null, observationId: null, deliveredAt: null},
          createdAt: at(), updatedAt: at(), dispatchedAt: null, completedAt: null,
        };
        jobs.set(jobId, record);
        return {record: copy(record), created: true};
      },
      async get(jobId) {
        const row = own(jobId);
        return row ? copy(row) : null;
      },
      async listForSession(sessionId) {
        return [...jobs.values()].filter((row) => row.organizationId === actor.organizationId && row.sessionId === sessionId).map(copy);
      },
      async markDispatched(jobId, attempt, callId) {
        const row = own(jobId);
        if (!row || row.attempt !== attempt || row.status !== "QUEUED") return null;
        Object.assign(row, {status: "RUNNING", dispatchedAt: at(), updatedAt: at(), workerCallId: callId, error: null});
        return copy(row);
      },
      async markDispatchFailed(jobId, attempt, error) {
        const row = own(jobId);
        if (!row || row.attempt !== attempt || row.status !== "QUEUED") return null;
        Object.assign(row, {error: copy(error), updatedAt: at()});
        return copy(row);
      },
      async retry(jobId, expectedAttempt) {
        const row = own(jobId);
        if (!row) throw new AnalysisJobError("ANALYSIS_JOB_NOT_FOUND", "Analysis job not found.", 404);
        if (row.attempt !== expectedAttempt) throw new AnalysisJobError("STALE_ANALYSIS_JOB", "The job changed while retrying.", 409);
        if (!isRetryable(row, now())) throw new AnalysisJobError("ANALYSIS_NOT_RETRYABLE", `A ${row.status} job cannot be retried yet.`, 409);
        Object.assign(row, {
          attempt: row.attempt + 1, status: "QUEUED", error: null, observation: null, workerCallId: null,
          dispatchedAt: null, completedAt: null, updatedAt: at(),
        });
        row.overlayPath = overlayPath(row);
        return copy(row);
      },
    };
  }

  const ledger: AnalysisJobLedger = {
    async get(jobId) {
      const row = jobs.get(jobId);
      return row ? copy(row) : null;
    },
    async complete(input) {
      const row = jobs.get(input.jobId);
      if (!row) throw new AnalysisJobError("ANALYSIS_JOB_NOT_FOUND", "Analysis job not found.", 404);
      if (input.organizationId !== row.organizationId || input.sessionId !== row.sessionId || input.evidenceId !== row.evidenceId
        || input.groupId !== row.groupId || input.manifestRevision !== row.manifestRevision || input.attempt > row.attempt) {
        throw new AnalysisJobError("INPUT_REVISION_MISMATCH", "The result does not match the job it claims.", 409);
      }
      if (input.attempt < row.attempt) return {record: copy(row), outcome: "STALE_ATTEMPT"};
      if (row.status !== "QUEUED" && row.status !== "RUNNING") return {record: copy(row), outcome: "ALREADY_RECORDED"};
      if ((input.overlay.status === "VERIFIED") !== (input.overlay.sha256 !== null)) {
        throw new AnalysisJobError("VALIDATION_ERROR", "A verified overlay needs its SHA-256.", 400);
      }
      if (input.status === "SUCCEEDED") {
        if (input.overlay.status === "VERIFIED" && input.overlay.sha256 !== input.observation?.evidence.overlay_sha256) {
          throw new AnalysisJobError("INPUT_REVISION_MISMATCH", "The verified overlay is not the one the worker declared.", 409);
        }
        Object.assign(row, {
          status: "SUCCEEDED", observation: copy(input.observation), error: null, completedAt: at(), updatedAt: at(), overlay: copy(input.overlay),
          delivery: {status: "PENDING", tries: 0, error: null, observationId: null, deliveredAt: null},
        });
      } else {
        if (input.overlay.status !== "NONE") throw new AnalysisJobError("VALIDATION_ERROR", "A failed attempt has no overlay.", 400);
        Object.assign(row, {status: "FAILED", observation: null, error: copy(input.error), completedAt: at(), updatedAt: at()});
      }
      return {record: copy(row), outcome: "RECORDED"};
    },
    async recordDelivery(jobId, attempt, delivery) {
      const row = jobs.get(jobId);
      if (!row) throw new AnalysisJobError("ANALYSIS_JOB_NOT_FOUND", "Analysis job not found.", 404);
      if (row.attempt !== attempt || row.status !== "SUCCEEDED" || row.delivery.status !== "PENDING") return {record: copy(row), applied: false};
      const delivered = delivery.outcome === "DELIVERED";
      row.delivery = {
        status: delivery.outcome === "RETRY" ? "PENDING" : delivery.outcome,
        tries: row.delivery.tries + 1,
        error: delivery.outcome === "REJECTED" || delivery.outcome === "RETRY" ? copy(delivery.error) : null,
        observationId: delivered ? delivery.observationId : null,
        deliveredAt: delivered ? at() : null,
      };
      row.updatedAt = at();
      return {record: copy(row), applied: true};
    },
  };

  return {
    clipsFor,
    jobsFor,
    clipLedger,
    ledger,
    allJobs: () => [...jobs.values()].map(copy),
    allClips: () => [...clips.values()].map(publicClip),
  };
}
