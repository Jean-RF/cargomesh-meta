import { MediaInitResultSchema } from "@/shared/schemas/meta/declaration-media";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { v2AuthMiddleware } from "../../middleware/v2-auth";
import type { AuthVariables } from "../../middleware/auth";
import { v2Error } from "../../middleware/v2-error";
import { hasSessionOrigin } from "@/server/auth/session-origin";
import { V2DraftError } from "@/server/modules/freight-requests/application/draft-service";
import {
  initializeMedia,
  finishMedia,
  listMedia,
  removeMedia,
  bindMedia,
  analyzeMedia,
  previewVoiceMedia,
} from "@/server/modules/media-evidence/declaration-media";
export const declarationMediaRouter = new Hono<{ Variables: AuthVariables }>();
declarationMediaRouter.use(
  "*",
  v2AuthMiddleware,
  bodyLimit({ maxSize: 32768 }),
);
declarationMediaRouter.use("*", async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  if (
    c.req.method !== "GET" &&
    !c.req.header("Authorization") &&
    !hasSessionOrigin(c.req.raw)
  )
    return v2Error(
      c,
      new V2DraftError(
        "FORBIDDEN_ORIGIN",
        "Same-origin request required.",
        403,
      ),
    );
  await next();
});
declarationMediaRouter.post("/:action", async (c) => {
  try {
    const actor = c.get("member"),
      body = await c.req.json();
    let data: unknown;
    if (
      actor.status !== "ACTIVE" ||
      !["OWNER", "SUPERVISOR", "REQUESTER"].includes(actor.role)
    )
      throw new V2DraftError(
        "FORBIDDEN_TENANT",
        "Active client membership required.",
        403,
      );
    switch (c.req.param("action")) {
      case "initialize":
        data = MediaInitResultSchema.parse(await initializeMedia(actor, body));
        break;
      case "finish":
        data = await finishMedia(
          actor,
          z.object({ id: z.string().uuid() }).strict().parse(body).id,
        );
        break;
      case "list":
        data = await listMedia(actor, body);
        break;
      case "remove":
        await removeMedia(
          actor,
          z.object({ id: z.string().uuid() }).strict().parse(body).id,
        );
        data = { removed: true };
        break;
      case "bind":
        await bindMedia(actor, body);
        data = { linked: true };
        break;
      case "analyze":
        data = await analyzeMedia(actor, body);
        break;
      default:
        return c.json(
          { error: { code: "NOT_FOUND", message: "Unknown media action." } },
          404,
        );
    }
    return c.json({ schemaVersion: "1.0", data });
  } catch (error) {
    return v2Error(
      c,
      error instanceof SyntaxError
        ? new V2DraftError("VALIDATION_ERROR", "JSON required.", 400)
        : error,
    );
  }
});
declarationMediaRouter.get("/audio", async (c) => {
  try {
    const actor = c.get("member");
    if (
      actor.status !== "ACTIVE" ||
      !["OWNER", "SUPERVISOR", "REQUESTER"].includes(actor.role)
    )
      throw new V2DraftError(
        "FORBIDDEN_TENANT",
        "Active client membership required.",
        403,
      );
    const id = z.string().uuid().parse(c.req.query("id"));
    const bytes = await previewVoiceMedia(actor, id);
    return new Response(new Uint8Array(bytes).buffer, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": 'inline; filename="voice-note.wav"',
      },
    });
  } catch (error) {
    return v2Error(c, error);
  }
});
