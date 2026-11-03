import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { hasSessionOrigin } from "@/server/auth/session-origin";
import { ManifestService } from "@/server/modules/declared-manifests/application/manifest-service";
import { V2DraftError } from "@/server/modules/freight-requests/application/draft-service";
import type { AuthVariables } from "../../middleware/auth";
import { v2AuthMiddleware } from "../../middleware/v2-auth";
import { v2Error } from "../../middleware/v2-error";

type Dependencies = { service: () => Promise<ManifestService> };

export function createDeclaredManifestsRouter(deps: Dependencies) {
  const router = new Hono<{ Variables: AuthVariables }>();
  const base = "/freight/requests/:requestId";
  const paths = [`${base}/declaration-preparations`, `${base}/declared-manifests`, `${base}/declared-manifests/*`];
  for (const path of paths) {
    router.use(path, v2AuthMiddleware);
    router.use(path, async (c, next) => {
      c.header("Cache-Control", "private, no-store");
      if (c.req.method === "POST" && !c.req.header("Authorization") && !hasSessionOrigin(c.req.raw)) {
        return v2Error(c, new V2DraftError("FORBIDDEN_ORIGIN", "Same-origin session request required.", 403));
      }
      await next();
    });
    router.use(path, bodyLimit({ maxSize: 32768, onError: c =>
      v2Error(c, new V2DraftError("PAYLOAD_TOO_LARGE", "Declaration command exceeds 32 KiB.", 413)) }));
  }
  router.post(`${base}/declaration-preparations`, async c => {
    try {
      const body: unknown = await c.req.json().catch(() => {
        throw new V2DraftError("VALIDATION_ERROR", "JSON body required.", 400);
      });
      const result = await (await deps.service()).prepare(c.get("member"), c.req.param("requestId"),
        body, c.req.header("Idempotency-Key"));
      return c.json(result, result.meta.idempotentReplay ? 200 : 201);
    } catch (error) { return v2Error(c, error); }
  });
  router.post(`${base}/declared-manifests`, async c => {
    try {
      const body: unknown = await c.req.json().catch(() => {
        throw new V2DraftError("VALIDATION_ERROR", "JSON body required.", 400);
      });
      const result = await (await deps.service()).confirm(c.get("member"), c.req.param("requestId"),
        body, c.req.header("Idempotency-Key"));
      return c.json(result, result.meta.idempotentReplay ? 200 : 201);
    } catch (error) { return v2Error(c, error); }
  });
  router.get(`${base}/declared-manifests/current`, async c => {
    try { return c.json(await (await deps.service()).current(c.get("member"), c.req.param("requestId"))); }
    catch (error) { return v2Error(c, error); }
  });
  router.get(`${base}/declared-manifests/:manifestId`, async c => {
    try { return c.json(await (await deps.service()).read(c.get("member"), c.req.param("requestId"),
      c.req.param("manifestId"))); }
    catch (error) { return v2Error(c, error); }
  });
  router.get(`${base}/declared-manifests`, async c => {
    try { return c.json(await (await deps.service()).list(c.get("member"), c.req.param("requestId"), c.req.query())); }
    catch (error) { return v2Error(c, error); }
  });
  return router;
}

export const declaredManifestsRouter = createDeclaredManifestsRouter({
  async service() {
    const { manifestRepository } = await import(
      "@/server/modules/declared-manifests/infrastructure/supabase-manifest-repository"
    );
    return new ManifestService(await manifestRepository());
  },
});
