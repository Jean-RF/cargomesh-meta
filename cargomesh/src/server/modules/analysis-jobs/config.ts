import type {AnalysisJobConfig} from "./ports";
import {RUNNING_RETRY_AFTER_MS} from "./retry-policy";
import {AnalysisJobError} from "./service";

type Env = Record<string, string | undefined>;

/**
 * Duración de la URL firmada con la que el worker descarga el clip. El worker la usa al empezar; Modal corta
 * a los 15 minutos y un job sin aviso se puede reintentar a los 20 (cada reintento firma otra URL). Una hora
 * cubre esa cola con margen. El video anotado se sube con una URL de subida firmada, que en Supabase dura 2 horas.
 */
export const CLIP_URL_TTL_SECONDS = 60 * 60;
const WORKER_TIMEOUT_SECONDS = 15 * 60;
if (CLIP_URL_TTL_SECONDS * 1000 < RUNNING_RETRY_AFTER_MS + WORKER_TIMEOUT_SECONDS * 1000) {
  throw new Error("CLIP_URL_TTL_SECONDS no cubre la cola del worker");
}

function missing(env: Env, names: string[]): string[] {
  return names.filter((name) => !env[name]?.trim() || env[name]!.startsWith("replace-with"));
}

const LOOPBACK_URL = /^http:\/\/127\.0\.0\.1:\d{1,5}(\/|$)/;

function notConfigured(message: string): never {
  throw new AnalysisJobError("NOT_CONFIGURED", message, 503);
}

/**
 * Para despachar al worker. Sin estas variables el job no se crea y la API responde NOT_CONFIGURED.
 * DOCKMIND_WORKER_MODE=MODAL (por defecto): worker en Modal, URLs https. DOCKMIND_WORKER_MODE=LOCAL_LOOPBACK:
 * lanzador local de dockmind-worker (`dockmind serve-local`), solo fuera de producción y con la Supabase, la app
 * y el worker en http://127.0.0.1. No hay paso automático de un modo al otro.
 */
export function dockmindWorkerSettingsFromEnv(env: Env = process.env): AnalysisJobConfig & {
  workerUrl: string; tokenId: string; tokenSecret: string;
} {
  const absent = missing(env, ["DOCKMIND_CALLBACK_URL", "DOCKMIND_WORKER_URL", "MODAL_PROXY_TOKEN_ID", "MODAL_PROXY_TOKEN_SECRET"]);
  if (absent.length) notConfigured(`DockMind is not configured: missing ${absent.join(", ")}.`);
  const mode = env.DOCKMIND_WORKER_MODE?.trim() || "MODAL";
  if (mode === "MODAL") {
    if (!env.DOCKMIND_CALLBACK_URL!.startsWith("https://") || !env.DOCKMIND_WORKER_URL!.startsWith("https://")) {
      notConfigured("DockMind URLs must use https.");
    }
  } else if (mode === "LOCAL_LOOPBACK") {
    if (env.NODE_ENV === "production" || env.VERCEL) notConfigured("DOCKMIND_WORKER_MODE=LOCAL_LOOPBACK is only for local development.");
    const urls = ["DOCKMIND_CALLBACK_URL", "DOCKMIND_WORKER_URL", "NEXT_PUBLIC_SUPABASE_URL"];
    const remote = urls.filter((name) => !LOOPBACK_URL.test(env[name] ?? ""));
    if (remote.length) notConfigured(`DOCKMIND_WORKER_MODE=LOCAL_LOOPBACK needs http://127.0.0.1 URLs: ${remote.join(", ")}.`);
  } else {
    notConfigured("DOCKMIND_WORKER_MODE must be MODAL or LOCAL_LOOPBACK.");
  }
  return {
    callbackUrl: env.DOCKMIND_CALLBACK_URL!,
    clipUrlTtlSeconds: CLIP_URL_TTL_SECONDS,
    workerMode: mode,
    workerUrl: env.DOCKMIND_WORKER_URL!,
    tokenId: env.MODAL_PROXY_TOKEN_ID!,
    tokenSecret: env.MODAL_PROXY_TOKEN_SECRET!,
  };
}

/** Mismo valor que DOCKMIND_CALLBACK_SECRET en el secret de Modal `cargomesh-meta-worker`. */
export function dockmindCallbackSecretFromEnv(env: Env = process.env): string {
  if (missing(env, ["DOCKMIND_CALLBACK_SECRET"]).length) {
    throw new AnalysisJobError("NOT_CONFIGURED", "DockMind is not configured: missing DOCKMIND_CALLBACK_SECRET.", 503);
  }
  if (env.DOCKMIND_CALLBACK_SECRET!.length < 32) {
    throw new AnalysisJobError("NOT_CONFIGURED", "DOCKMIND_CALLBACK_SECRET must have at least 32 characters.", 503);
  }
  return env.DOCKMIND_CALLBACK_SECRET!;
}
