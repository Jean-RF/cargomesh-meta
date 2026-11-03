import { z } from "zod";
import { createV2ServerSupabaseClient } from "@/server/db/supabase/v2";
import { V2DraftError, type V2Actor } from "../../freight-requests/application/draft-service";
import type { ManifestRepository } from "../application/manifest-service";

type RpcArgs = {
  p_organization_id: string; p_member_id: string; p_request_id: string;
  p_action: "prepare" | "confirm" | "current" | "list" | "read";
  p_value: unknown; p_key: string | null; p_limit: number; p_offset: number;
};
const SavedSchema = z.object({ record: z.unknown(), replay: z.boolean() }).strict();

/** Narrow bridge until types are regenerated from the reviewed/applied migration. */
export async function manifestRepository(): Promise<ManifestRepository> {
  const db = await createV2ServerSupabaseClient();
  const rpc = db.rpc.bind(db) as unknown as (
    name: "meta_declared_manifests_v1", args: RpcArgs,
  ) => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>;
  async function call(actor: V2Actor, requestId: string, action: RpcArgs["p_action"],
    value: unknown = null, key: string | null = null, limit = 20, offset = 0) {
    const { data, error } = await rpc("meta_declared_manifests_v1", {
      p_organization_id: actor.organizationId, p_member_id: actor.memberId,
      p_request_id: requestId, p_action: action, p_value: value,
      p_key: key, p_limit: limit, p_offset: offset,
    });
    if (error) {
      if (["PGRST202", "42883", "42P01"].includes(error.code ?? "")) {
        throw new V2DraftError("MANIFESTS_NOT_INSTALLED",
          "Persistent declarations are not installed in this environment.", 503);
      }
      const status: Record<string, number> = { PT400: 400, PT403: 403, PT404: 404, PT409: 409 };
      if (status[error.code ?? ""]) {
        throw new V2DraftError(/^[A-Z][A-Z0-9_]+$/.test(error.message)
          ? error.message : "MANIFEST_COMMAND_FAILED",
        "Declaration command could not be completed; reload its current state.", status[error.code ?? ""]);
      }
      throw new Error("MANIFEST_DATABASE_ERROR");
    }
    return data;
  }
  return {
    async prepare(actor, id, input, key) {
      const saved = SavedSchema.parse(await call(actor, id, "prepare", input, key));
      return { record: saved.record, replay: saved.replay };
    },
    async confirm(actor, id, input, key) {
      const saved = SavedSchema.parse(await call(actor, id, "confirm", input, key));
      return { record: saved.record, replay: saved.replay };
    },
    async current(actor, id) {
      const saved = z.object({ record: z.unknown().nullable(),
        currentRequestDraftVersion: z.number().int().positive() }).strict()
        .parse(await call(actor, id, "current"));
      return { record: saved.record ?? null, currentRequestDraftVersion: saved.currentRequestDraftVersion };
    },
    async list(actor, id, page) {
      return z.array(z.unknown()).parse(await call(actor, id, "list", null, null, page.limit, page.offset));
    },
    async read(actor, id, manifestId) {
      return call(actor, id, "read", { manifestId });
    },
  };
}
