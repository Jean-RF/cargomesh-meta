import {Hono, type Context, type MiddlewareHandler} from "hono";
import {bodyLimit} from "hono/body-limit";
import {hasSessionOrigin} from "@/server/auth/session-origin";
import {V2DraftError} from "@/server/modules/freight-requests/application/draft-service";
import {clipMediaUrl, completeClipUpload, listClips, registerClip} from "@/server/modules/analysis-jobs/clip-service";
import type {AnalysisJobDeps, JobActor, ServerDeps} from "@/server/modules/analysis-jobs/ports";
import {
  AnalysisJobError, listAnalyses, overlayUrl, readAnalysis, receiveWorkerCallback, recoverDelivery, requestAnalysis, retryAnalysis,
} from "@/server/modules/analysis-jobs/service";
import type {AuthenticatedMemberContext} from "@/server/auth/member";
import type {AuthVariables} from "../../middleware/auth";
import {v2AuthMiddleware} from "../../middleware/v2-auth";
import {v2Error} from "../../middleware/v2-error";

type Dependencies = {
  /** Se construye por petición autenticada, con el lector de sesión de Juan y los repositorios del miembro. */
  request: (member: AuthenticatedMemberContext) => Promise<AnalysisJobDeps>;
  /** Capacidades del servidor (clave de servicio): verificar subidas, recibir el callback y entregar a Juan. */
  server: () => ServerDeps | Promise<ServerDeps>;
  authenticate?: MiddlewareHandler<{Variables: AuthVariables}>;
};

const COMMAND_LIMIT = 32 * 1024;
/** Un resultado con 5000 eventos y 5000 marcas cabe con holgura. */
const CALLBACK_LIMIT = 2 * 1024 * 1024;

const fail = (c: Context, error: unknown) =>
  v2Error(c, error instanceof AnalysisJobError ? new V2DraftError(error.code, error.message, error.httpStatus) : error);
const actorOf = (member: AuthenticatedMemberContext): JobActor =>
  ({userId: member.userId, memberId: member.memberId, organizationId: member.organizationId, role: member.role});

/**
 * Rutas DockMind sobre `/api/v2`:
 *   POST /meta/dockmind/clips                       registra un clip (Idempotency-Key) y devuelve su URL de subida
 *   GET  /meta/dockmind/clips?sessionId=            clips de la sesión
 *   POST /meta/dockmind/clips/:clipId/complete      verifica la subida: tamaño, hash y formato real -> READY
 *   GET  /meta/dockmind/clips/:clipId/media         URL corta del original verificado
 *   POST /meta/dockmind/jobs                        crea (o devuelve) el job del payload canónico y lo envía al worker
 *   GET  /meta/dockmind/jobs?sessionId=             jobs de la sesión
 *   GET  /meta/dockmind/jobs/:jobId                 estado (la UI consulta cada 3 s)
 *   POST /meta/dockmind/jobs/:jobId/retry           nuevo intento desde `expectedAttempt`
 *   POST /meta/dockmind/jobs/:jobId/delivery        recupera una entrega pendiente a Juan, sin volver a analizar
 *   GET  /meta/dockmind/jobs/:jobId/overlay         URL corta del video anotado
 *   POST /meta/dockmind/callback                    resultado del worker: sin sesión de usuario, lo protege la firma HMAC
 */
export function createDockMindRouter(deps: Dependencies) {
  const router = new Hono<{Variables: AuthVariables}>();
  // En Hono `/jobs/*` también cubre `/jobs`: registrar ambos correría la autenticación y el límite dos veces.
  for (const path of ["/meta/dockmind/clips/*", "/meta/dockmind/jobs/*"]) {
    router.use(path, deps.authenticate ?? v2AuthMiddleware);
    router.use(path, async (c, next) => {
      c.header("Cache-Control", "private, no-store");
      c.header("Vary", "Cookie, Authorization");
      if (c.req.method === "POST" && !c.req.header("Authorization") && !hasSessionOrigin(c.req.raw)) {
        return v2Error(c, new V2DraftError("FORBIDDEN_ORIGIN", "Same-origin session command required.", 403));
      }
      await next();
    });
    router.use(path, bodyLimit({maxSize: COMMAND_LIMIT, onError: (c) => v2Error(c, new V2DraftError("PAYLOAD_TOO_LARGE", "DockMind command exceeds 32 KiB.", 413))}));
  }
  router.use("/meta/dockmind/callback", bodyLimit({maxSize: CALLBACK_LIMIT, onError: (c) => v2Error(c, new V2DraftError("PAYLOAD_TOO_LARGE", "Worker result exceeds 2 MiB.", 413))}));

  const body = async (c: Context) => c.req.json().catch((error: unknown) => {
    if (error instanceof Error && error.name === "BodyLimitError") throw new V2DraftError("PAYLOAD_TOO_LARGE", "DockMind command exceeds 32 KiB.", 413);
    throw new V2DraftError("VALIDATION_ERROR", "JSON body required.", 400);
  });
  const ok = (c: Context, data: unknown, status: 200 | 201 | 202 = 200) => c.json({schemaVersion: "2.0", data}, status);
  type Handler = (c: Context<{Variables: AuthVariables}>, member: AuthenticatedMemberContext, request: AnalysisJobDeps) => Promise<Response>;
  const member = (handler: Handler) => async (c: Context<{Variables: AuthVariables}>) => {
    try {
      const current = c.get("member");
      return await handler(c, current, await deps.request(current));
    } catch (error) {
      return fail(c, error);
    }
  };

  router.post("/meta/dockmind/clips", member(async (c, m, request) => {
    const result = await registerClip(request, actorOf(m), await body(c), c.req.header("Idempotency-Key"));
    return ok(c, result, result.replay ? 200 : 201);
  }));
  router.get("/meta/dockmind/clips", member(async (c, m, request) => ok(c, await listClips(request, actorOf(m), c.req.query()))));
  router.post("/meta/dockmind/clips/:clipId/complete", member(async (c, m, request) =>
    ok(c, await completeClipUpload(request, await deps.server(), actorOf(m), c.req.param("clipId")))));
  router.get("/meta/dockmind/clips/:clipId/media", member(async (c, m, request) => ok(c, await clipMediaUrl(request, actorOf(m), c.req.param("clipId")))));

  router.post("/meta/dockmind/jobs", member(async (c, m, request) => {
    const {job, created} = await requestAnalysis(request, actorOf(m), await body(c));
    return ok(c, job, created ? 201 : 200);
  }));
  router.get("/meta/dockmind/jobs", member(async (c, m, request) => ok(c, await listAnalyses(request, actorOf(m), c.req.query()))));
  router.get("/meta/dockmind/jobs/:jobId", member(async (c, m, request) => ok(c, await readAnalysis(request, actorOf(m), c.req.param("jobId")))));
  router.post("/meta/dockmind/jobs/:jobId/retry", member(async (c, m, request) =>
    ok(c, await retryAnalysis(request, actorOf(m), c.req.param("jobId"), await body(c)))));
  router.post("/meta/dockmind/jobs/:jobId/delivery", member(async (c, m, request) =>
    ok(c, await recoverDelivery(request, await deps.server(), actorOf(m), c.req.param("jobId"), await body(c)))));
  router.get("/meta/dockmind/jobs/:jobId/overlay", member(async (c, m, request) => ok(c, await overlayUrl(request, actorOf(m), c.req.param("jobId")))));

  router.post("/meta/dockmind/callback", async (c) => {
    try {
      // La firma se verifica sobre el texto recibido, nunca sobre un JSON re-serializado.
      const outcome = await receiveWorkerCallback(await deps.server(), await c.req.text(), {get: (name) => c.req.header(name)});
      c.header("Cache-Control", "no-store");
      return ok(c, outcome, outcome.accepted ? 200 : 202);
    } catch (error) {
      return fail(c, error);
    }
  });
  return router;
}

export const dockmindRouter = createDockMindRouter({
  async request(member) {
    const {dockmindRequestDeps} = await import("@/server/modules/analysis-jobs/wiring");
    return dockmindRequestDeps(member);
  },
  async server() {
    const {dockmindServerDeps} = await import("@/server/modules/analysis-jobs/wiring");
    return dockmindServerDeps();
  },
});
