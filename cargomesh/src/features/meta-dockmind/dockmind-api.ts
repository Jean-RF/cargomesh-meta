import {z} from "zod";
import {workspaceFetch} from "@/features/workspace-mode/workspace-fetch";
import type {DockMindJobConfig} from "@/shared/schemas/meta/dockmind";
import type {AnalysisJobView, ClipView} from "@/server/modules/analysis-jobs/view";

const base = "/api/v2/meta/dockmind";
const Id = z.string().uuid();

export class DockMindApiError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
  }
}

const messages: Record<string, string> = {
  UNAUTHORIZED: "Inicia sesión para operar DockMind.",
  FORBIDDEN_WORKFLOW: "Tu usuario puede consultar, pero no operar DockMind.",
  FORBIDDEN_ORIGIN: "Abre Tetris desde el mismo sitio e inténtalo de nuevo.",
  NOT_CONFIGURED: "El worker de análisis aún no está configurado en este entorno.",
  DOCKMIND_NOT_INSTALLED: "DockMind aún no está instalado en esta base.",
  SESSION_NOT_OPEN: "La sesión está cerrada: ya no recibe clips.",
  REAL_EVIDENCE_REQUIRED: "Una sesión de verificación solo acepta captura propia.",
  UPLOAD_INCOMPLETE: "El clip todavía no terminó de subir.",
  MEDIA_INVALID: "El archivo subido no coincide con el clip declarado o no es MP4/MOV.",
  EVIDENCE_REJECTED: "Ese clip fue rechazado al verificarlo. Sube el archivo otra vez.",
  EVIDENCE_NOT_READY: "Espera a que el clip quede verificado.",
  INCOMPATIBLE_UNIT: "El grupo elegido cuenta otra unidad.",
  MANIFEST_GROUP_REQUIRED: "Elige el grupo del manifiesto que muestra el clip.",
  STALE_MANIFEST: "El manifiesto cambió. Recarga la sesión.",
  STALE_ANALYSIS_JOB: "El análisis cambió mientras tanto. Recarga su estado.",
  ANALYSIS_NOT_RETRYABLE: "Este análisis todavía no se puede reintentar.",
  DELIVERY_NOT_PENDING: "La observación ya no está pendiente de entrega.",
  STORAGE_UNAVAILABLE: "No se pudo usar el almacenamiento privado. Reintenta en un momento.",
  NETWORK_ERROR: "No se pudo conectar. Reintenta la misma acción.",
};
export const dockmindErrorMessage = (error: unknown) =>
  error instanceof DockMindApiError ? messages[error.code] ?? `No se pudo completar la acción (${error.code}).` : "La respuesta no es válida. Recarga la sesión.";

const ClipSchema = z.object({
  clipId: Id, sessionId: Id, source: z.enum(["OWN_CAPTURE", "SYNTHETIC_RENDER"]), state: z.enum(["PENDING", "READY", "REJECTED"]),
  sizeBytes: z.number().int().positive(), createdAt: z.string(),
}).passthrough();
const JobSchema = z.object({
  jobId: Id, sessionId: Id, evidenceId: Id, groupId: Id, attempt: z.number().int().positive(),
  status: z.enum(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED"]), retryable: z.boolean(),
  delivery: z.object({status: z.enum(["NOT_REQUIRED", "PENDING", "DELIVERED", "REJECTED", "SUPERSEDED"])}).passthrough(),
}).passthrough();
const Url = z.object({url: z.string().url(), expiresAt: z.string()}).strict();

export function createDockMindApi(fetcher: typeof fetch = workspaceFetch) {
  async function json(path: string, init: {body?: unknown; key?: string; method?: string} = {}): Promise<unknown> {
    const method = init.method ?? (init.body === undefined ? "GET" : "POST");
    let response: Response;
    try {
      response = await fetcher(path, {
        method, credentials: "same-origin", cache: "no-store",
        headers: {Accept: "application/json", ...(method === "POST" ? {"Content-Type": "application/json"} : {}), ...(init.key ? {"Idempotency-Key": init.key} : {})},
        ...(method === "POST" ? {body: JSON.stringify(init.body ?? {})} : {}),
      });
    } catch {
      throw new DockMindApiError("NETWORK_ERROR", 0);
    }
    const raw: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = z.object({error: z.object({code: z.string()})}).safeParse(raw);
      throw new DockMindApiError(error.success ? error.data.error.code : `HTTP_${response.status}`, response.status);
    }
    return z.object({data: z.unknown()}).parse(raw).data;
  }
  const job = (raw: unknown) => JobSchema.parse(raw) as unknown as AnalysisJobView;
  return {
    async clips(sessionId: string) {
      return z.array(ClipSchema).parse(await json(`${base}/clips?sessionId=${Id.parse(sessionId)}`)) as unknown as ClipView[];
    },
    async jobs(sessionId: string) {
      return z.array(JobSchema).parse(await json(`${base}/jobs?sessionId=${Id.parse(sessionId)}`)) as unknown as AnalysisJobView[];
    },
    /** Registra el clip y lo sube directo al bucket privado con la URL firmada; el servidor lo verifica al final. */
    async upload(sessionId: string, file: File, source: "OWN_CAPTURE" | "SYNTHETIC_RENDER", key: string): Promise<ClipView> {
      const bytes = await file.arrayBuffer();
      const sha256 = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
      const mimeType = file.type === "video/quicktime" ? "video/quicktime" : "video/mp4";
      const registered = z.object({clip: ClipSchema, upload: Url.nullable()}).passthrough()
        .parse(await json(`${base}/clips`, {body: {sessionId, source, mimeType, sizeBytes: file.size, sha256}, key}));
      if (registered.upload) {
        let sent: Response;
        try {
          sent = await fetch(registered.upload.url, {method: "PUT", body: bytes, headers: {"content-type": mimeType, "x-upsert": "false"}});
        } catch {
          throw new DockMindApiError("NETWORK_ERROR", 0);
        }
        // 409 = el objeto ya estaba subido (reintento de la misma subida): la verificación decide.
        if (!sent.ok && sent.status !== 409) throw new DockMindApiError("UPLOAD_INCOMPLETE", sent.status);
      }
      return ClipSchema.parse(await json(`${base}/clips/${registered.clip.clipId}/complete`, {body: {}})) as unknown as ClipView;
    },
    async clipUrl(clipId: string) {
      return Url.parse(await json(`${base}/clips/${Id.parse(clipId)}/media`));
    },
    async start(value: {sessionId: string; evidenceId: string; groupId: string; coverage: "PARTIAL" | "COMPLETE"; config: DockMindJobConfig}) {
      return job(await json(`${base}/jobs`, {body: value}));
    },
    async read(jobId: string) {
      return job(await json(`${base}/jobs/${Id.parse(jobId)}`));
    },
    async retry(jobId: string, expectedAttempt: number) {
      return job(await json(`${base}/jobs/${Id.parse(jobId)}/retry`, {body: {expectedAttempt}}));
    },
    async recoverDelivery(jobId: string, expectedAttempt: number) {
      return job(await json(`${base}/jobs/${Id.parse(jobId)}/delivery`, {body: {expectedAttempt}}));
    },
    async overlayUrl(jobId: string) {
      return Url.parse(await json(`${base}/jobs/${Id.parse(jobId)}/overlay`));
    },
  };
}
export const dockmindApi = createDockMindApi();
export type DockMindApi = ReturnType<typeof createDockMindApi>;
