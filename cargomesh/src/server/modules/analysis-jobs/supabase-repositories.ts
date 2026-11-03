import {z} from "zod";
import {DockMindJobConfigSchema, DockMindObservationSchema} from "@/shared/schemas/meta/dockmind";
import type {
  AnalysisJobLedger, AnalysisJobRecord, AnalysisJobRepository, ClipLedger, ClipRecord, ClipRepository, JobActor,
} from "./ports";
import {AnalysisJobError} from "./service";

/**
 * Puentes a las RPC de la migración `meta_dockmind_jobs`:
 * - `meta_dockmind_v1` con el cliente del usuario: la base comprueba organización, membresía y rol en cada llamada.
 * - `meta_dockmind_server_v1` con el cliente de servicio: solo el servidor la puede ejecutar.
 */
export type DockMindRpcClient = {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{data: unknown; error: {code?: string; message: string} | null}>;
};

const STATUS: Record<string, number> = {PT400: 400, PT401: 401, PT403: 403, PT404: 404, PT409: 409, PT422: 422, PT503: 503};

export function dockmindRpcError(error: {code?: string; message: string}): never {
  if (["PGRST202", "42883", "42P01"].includes(error.code ?? "")) {
    throw new AnalysisJobError("DOCKMIND_NOT_INSTALLED", "DockMind is not installed in this environment.", 503);
  }
  const status = STATUS[error.code ?? ""];
  if (status) {
    const code = /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : "DOCKMIND_COMMAND_FAILED";
    throw new AnalysisJobError(code, "Reload the session and review the clip or job state.", status);
  }
  throw new Error("DOCKMIND_DATABASE_ERROR");
}

const Id = z.string().uuid();
const Instant = z.string().datetime({offset: true});
const Problem = z.object({code: z.string(), message: z.string()}).strict();

export const ClipRecordSchema = z.object({
  clipId: Id, organizationId: Id, sessionId: Id, source: z.enum(["OWN_CAPTURE", "SYNTHETIC_RENDER"]),
  mimeType: z.enum(["video/mp4", "video/quicktime"]), sizeBytes: z.number().int().positive(), sha256: z.string().regex(/^[0-9a-f]{64}$/),
  state: z.enum(["PENDING", "READY", "REJECTED"]), container: z.enum(["MP4", "MOV"]).nullable(), rejection: z.string().nullable(),
  storagePath: z.string().min(1), createdBy: Id, createdAt: Instant, updatedAt: Instant, readyAt: Instant.nullable(),
}).strict().transform(({createdBy: _createdBy, ...clip}): ClipRecord => clip);

export const AnalysisJobRecordSchema = z.object({
  jobId: Id, organizationId: Id, sessionId: Id, evidenceId: Id, manifestRevision: z.number().int().positive(), groupId: Id,
  coverage: z.enum(["PARTIAL", "COMPLETE"]), source: z.enum(["OWN_CAPTURE", "SYNTHETIC_RENDER"]), clipSha256: z.string().regex(/^[0-9a-f]{64}$/),
  config: DockMindJobConfigSchema.required(), dedupeKey: z.string().regex(/^[0-9a-f]{64}$/), attempt: z.number().int().positive(),
  status: z.enum(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED"]), workerCallId: z.string().nullable(), error: Problem.nullable(),
  observation: DockMindObservationSchema.nullable(), overlayPath: z.string().min(1),
  overlay: z.object({status: z.enum(["NONE", "VERIFIED", "MISSING", "MISMATCH"]), sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable()}).strict(),
  delivery: z.object({
    status: z.enum(["NOT_REQUIRED", "PENDING", "DELIVERED", "REJECTED", "SUPERSEDED"]), tries: z.number().int().nonnegative(),
    error: Problem.nullable(), observationId: Id.nullable(), deliveredAt: Instant.nullable(),
  }).strict(),
  createdBy: Id, createdAt: Instant, updatedAt: Instant, dispatchedAt: Instant.nullable(), completedAt: Instant.nullable(),
}).strict().transform(({createdBy: _createdBy, ...job}): AnalysisJobRecord => job);

function memberCall(db: DockMindRpcClient, actor: JobActor) {
  return async (action: string, value: Record<string, unknown>, key: string | null = null): Promise<unknown> => {
    const {data, error} = await db.rpc("meta_dockmind_v1", {
      p_organization_id: actor.organizationId, p_member_id: actor.memberId, p_action: action, p_value: value, p_key: key,
    });
    if (error) dockmindRpcError(error);
    return data;
  };
}

function serverCall(db: () => DockMindRpcClient) {
  return async (action: string, value: Record<string, unknown>): Promise<unknown> => {
    const {data, error} = await db().rpc("meta_dockmind_server_v1", {p_action: action, p_value: value});
    if (error) dockmindRpcError(error);
    return data;
  };
}

/** Clips del miembro autenticado; construir por petición con el cliente de su sesión. */
export function createSupabaseClipRepository(db: DockMindRpcClient, actor: JobActor): ClipRepository {
  const call = memberCall(db, actor);
  return {
    async register(clip, key) {
      return z.object({record: ClipRecordSchema, replay: z.boolean()}).strict().parse(await call("register_clip", clip, key));
    },
    async get(clipId) {
      return ClipRecordSchema.nullable().parse(await call("read_clip", {id: clipId}));
    },
    async listForSession(sessionId) {
      return z.array(ClipRecordSchema).max(50).parse(await call("list_clips", {sessionId}));
    },
  };
}

/** Jobs del miembro autenticado; construir por petición con el cliente de su sesión. */
export function createSupabaseAnalysisJobRepository(db: DockMindRpcClient, actor: JobActor): AnalysisJobRepository {
  const call = memberCall(db, actor);
  const saved = z.object({record: AnalysisJobRecordSchema.nullable()}).strict();
  return {
    async create(job) {
      return z.object({record: AnalysisJobRecordSchema, created: z.boolean()}).strict().parse(await call("create_job", {
        sessionId: job.sessionId, clipId: job.evidenceId, groupId: job.groupId, coverage: job.coverage,
        manifestRevision: job.manifestRevision, config: job.config,
      }));
    },
    async get(jobId) {
      return AnalysisJobRecordSchema.nullable().parse(await call("read_job", {id: jobId}));
    },
    async listForSession(sessionId) {
      return z.array(AnalysisJobRecordSchema).max(50).parse(await call("list_jobs", {sessionId}));
    },
    async markDispatched(jobId, attempt, callId) {
      return saved.parse(await call("mark_dispatched", {id: jobId, attempt, callId})).record;
    },
    async markDispatchFailed(jobId, attempt, error) {
      return saved.parse(await call("mark_dispatch_failed", {id: jobId, attempt, error})).record;
    },
    async retry(jobId, expectedAttempt) {
      return z.object({record: AnalysisJobRecordSchema}).strict().parse(await call("retry_job", {id: jobId, expectedAttempt})).record;
    },
  };
}

/** Escrituras del servidor. `db` se pide al usarla para no exigir la clave de servicio en lecturas que no la necesitan. */
export function createSupabaseClipLedger(db: () => DockMindRpcClient): ClipLedger {
  const call = serverCall(db);
  return {
    async markReady(clipId, verified) {
      return ClipRecordSchema.parse(await call("clip_ready", {id: clipId, ...verified}));
    },
    async reject(clipId, reason) {
      return ClipRecordSchema.parse(await call("clip_rejected", {id: clipId, reason}));
    },
  };
}

export function createSupabaseAnalysisJobLedger(db: () => DockMindRpcClient): AnalysisJobLedger {
  const call = serverCall(db);
  return {
    async get(jobId) {
      return AnalysisJobRecordSchema.nullable().parse(await call("read_job", {id: jobId}));
    },
    async complete(input) {
      const {jobId, ...rest} = input;
      return z.object({record: AnalysisJobRecordSchema, outcome: z.enum(["RECORDED", "ALREADY_RECORDED", "STALE_ATTEMPT"])}).strict()
        .parse(await call("complete_job", {id: jobId, ...rest}));
    },
    async recordDelivery(jobId, attempt, delivery) {
      return z.object({record: AnalysisJobRecordSchema, applied: z.boolean()}).strict()
        .parse(await call("record_delivery", {id: jobId, attempt, ...delivery}));
    },
  };
}
