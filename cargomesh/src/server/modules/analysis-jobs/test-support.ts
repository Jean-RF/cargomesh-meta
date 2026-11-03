import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {V2DraftError} from "@/server/modules/freight-requests/application/draft-service";
import type {DockMindJob} from "@/shared/schemas/meta/dockmind";
import {signDockMindBody} from "./callback-signature";
import {completeClipUpload, registerClip} from "./clip-service";
import {createMemoryDockMindStore} from "./memory-repository";
import type {AnalysisJobDeps, AnalysisJobRecord, ClipStorage, JobActor, ObservationSink, ServerDeps, SessionForAnalysis} from "./ports";

/** Arnés compartido por las pruebas del módulo: memoria con la semántica de las tablas, bucket y Juan simulados. */
export const ORG = "00000000-0000-4000-8000-00000000a001";
export const OTHER_ORG = "00000000-0000-4000-8000-00000000a002";
export const SESSION = "00000000-0000-4000-8000-00000000b001";
export const GROUP = "00000000-0000-4000-8000-00000000e001";
export const SECRET = "s".repeat(40);
export const T0 = Date.parse("2026-10-31T05:00:00Z");
export const ACTOR: JobActor = {userId: "00000000-0000-4000-8000-0000000000f1", memberId: "00000000-0000-4000-8000-0000000000c1", organizationId: ORG, role: "SUPERVISOR"};
export const OUTSIDER: JobActor = {userId: "00000000-0000-4000-8000-0000000000f2", memberId: "00000000-0000-4000-8000-0000000000c2", organizationId: OTHER_ORG, role: "OWNER"};
export const CONFIG = {line: {x1: 0.5, y1: 0, x2: 0.5, y2: 1, inside_x: 0.8, inside_y: 0.5}, unit: "BOX" as const, concept: "cardboard box"};

// Resultado real del worker sobre un clip sintético (FIXTURE): oclusión marcada para revisión.
const RESULT_FIXTURE = JSON.parse(readFileSync(
  new URL("../../../shared/schemas/meta/fixtures/dockmind-result.requires-review.json", import.meta.url), "utf8",
)) as Record<string, any>;

const ascii = (value: string) => [...value].map((char) => char.charCodeAt(0));
/** Un MP4 mínimo para la verificación de formato: caja `ftyp` con marca isom y bytes de relleno. */
export function mp4(body = "synthetic clip"): Uint8Array {
  return new Uint8Array([0, 0, 0, 0x18, ...ascii("ftypisom"), 0, 0, 2, 0, ...ascii("isommp41"), ...ascii(body)]);
}
export const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

export type Juan = {
  /** Observaciones guardadas por organización, job e intento, como su tabla inmutable. */
  rows: Map<string, string>;
  calls: number;
  /** Lo que DockMind le entregó en cada llamada. */
  received: AnalysisJobRecord[];
  /** Cada error se lanza en una llamada, en orden; vacío = Juan responde. */
  failures: unknown[];
};

export function setup(options: {session?: Partial<SessionForAnalysis>; dispatchFails?: boolean; modal?: boolean} = {}) {
  const clock = {now: T0};
  const now = () => new Date(clock.now);
  const store = createMemoryDockMindStore({now});
  const sent: DockMindJob[] = [];
  const objects = new Map<string, Uint8Array>();
  const session: SessionForAnalysis = {
    sessionId: SESSION, organizationId: ORG, manifestRevision: 2, status: "OPEN",
    groups: [{groupId: GROUP, label: "Cajas de cartón", unit: "BOX"}], ...options.session,
  };
  const storage: ClipStorage = {
    signedUploadUrl: async (path) => ({url: `https://storage.example.test/upload/${path}?token=up`, expiresAt: new Date(clock.now + 7_200_000).toISOString()}),
    inspect: async (path) => {
      const bytes = objects.get(path);
      return bytes ? {sizeBytes: bytes.byteLength, sha256: sha256(bytes), head: bytes.slice(0, 256)} : null;
    },
    signedReadUrl: async (path, ttl) => `https://storage.example.test/read/${path}?ttl=${ttl}`,
    signedOverlayUploadUrl: async (path) => `https://storage.example.test/upload/${path}?token=overlay`,
  };
  /**
   * PUT a una URL firmada de subida, como Storage: solo crea. La ruta va en la URL, así que quien tiene la URL
   * de un intento solo alcanza la ruta de ese intento. Devuelve el código HTTP.
   */
  const upload = (url: string, bytes: Uint8Array): number => {
    const path = decodeURIComponent(new URL(url).pathname.replace(/^\/upload\//, ""));
    if (objects.has(path)) return 409;
    objects.set(path, bytes);
    return 200;
  };
  const juan: Juan = {rows: new Map(), calls: 0, received: [], failures: []};
  const observations: ObservationSink = {
    async record(job) {
      juan.calls += 1;
      juan.received.push(structuredClone(job));
      if (juan.failures.length) throw juan.failures.shift();
      const key = `${job.organizationId}:${job.jobId}:${job.attempt}`;
      const existing = juan.rows.get(key);
      if (existing) return {id: existing, recorded: false, reason: "ALREADY_RECORDED"};
      const id = `00000000-0000-4000-8000-${String(juan.rows.size + 1).padStart(12, "0")}`;
      juan.rows.set(key, id);
      return {id, recorded: true, reason: "RECORDED"};
    },
  };
  const deps = (actor: JobActor = ACTOR): AnalysisJobDeps => ({
    sessions: {getForAnalysis: async (who, id) => (id === session.sessionId && who.organizationId === session.organizationId ? session : null)},
    clips: store.clipsFor(actor),
    jobs: store.jobsFor(actor),
    storage,
    worker: () => {
      if (options.modal === false) throw new V2DraftError("NOT_CONFIGURED", "DockMind is not configured.", 503);
      return {
        dispatch: async (job) => {
          if (options.dispatchFails) throw new Error("connect ECONNREFUSED");
          sent.push(job);
          return {callId: `call-${sent.length}`, duplicate: false};
        },
      };
    },
    config: () => ({callbackUrl: "https://app.example.test/api/v2/meta/dockmind/callback", clipUrlTtlSeconds: 3600, workerMode: "MODAL"}),
    now,
  });
  /** Una instancia nueva por llamada, como después de reiniciar el servidor: el estado vive solo en el almacén. */
  const server = (): ServerDeps => ({
    clipLedger: store.clipLedger, overlays: storage, ledger: store.ledger, observations, callbackSecret: () => SECRET, now,
  });
  return {deps, server, store, sent, objects, juan, clock, session, upload};
}

export type Env = ReturnType<typeof setup>;

/** Registra, sube y verifica un clip; devuelve su ID. */
export async function readyClip(env: Env, bytes = mp4(), source: "OWN_CAPTURE" | "SYNTHETIC_RENDER" = "OWN_CAPTURE"): Promise<string> {
  const {clip} = await registerClip(env.deps(), ACTOR, {sessionId: SESSION, source, mimeType: "video/mp4", sizeBytes: bytes.byteLength, sha256: sha256(bytes)}, crypto.randomUUID());
  const path = env.store.allClips().find((row) => row.clipId === clip.clipId)!.storagePath;
  env.objects.set(path, bytes);
  await completeClipUpload(env.deps(), env.server(), ACTOR, clip.clipId);
  return clip.clipId;
}

export function callback(result: Record<string, unknown>, at: number, secret = SECRET) {
  const raw = JSON.stringify(result);
  const timestamp = Math.floor(at / 1000);
  const headers = new Map([["x-dockmind-timestamp", String(timestamp)], ["x-dockmind-signature", signDockMindBody(raw, secret, timestamp)]]);
  return {raw, headers: {get: (name: string) => headers.get(name.toLowerCase()) ?? null}};
}

/**
 * Lo que mandaría el worker para ese job e intento: misma identidad, procedencia y bytes del clip.
 * `overlay` son los bytes del video anotado que dice haber subido; sin ellos, no hay video.
 */
export function resultFor(
  job: Pick<AnalysisJobRecord, "jobId" | "attempt" | "evidenceId" | "clipSha256">, overrides: Record<string, unknown> = {}, overlay?: Uint8Array,
) {
  const result: Record<string, any> = {
    ...structuredClone(RESULT_FIXTURE), job_id: job.jobId, attempt: job.attempt, organization_id: ORG, session_id: SESSION,
    evidence_id: job.evidenceId, group_id: GROUP, manifest_revision: 2, ...overrides,
  };
  if (result.observation) {
    result.observation.clip.source = "OWN_CAPTURE";
    result.observation.clip.sha256 = job.clipSha256;
    result.observation.evidence = {overlay_uploaded: overlay !== undefined, overlay_sha256: overlay ? sha256(overlay) : null};
  }
  return result;
}

export const code = (expected: string) => (error: unknown) => (error as {code?: string}).code === expected;
