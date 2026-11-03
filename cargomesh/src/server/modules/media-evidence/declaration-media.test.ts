import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import * as crypto from "node:crypto";
import ts from "typescript";
import * as schemas from "@/shared/schemas/meta/declaration-media";
import { V2DraftError } from "../freight-requests/application/draft-service";
import type * as Service from "./declaration-media";

const actor = { organizationId: crypto.randomUUID(), memberId: crypto.randomUUID(), userId: crypto.randomUUID(), userEmail: "synthetic@test.invalid", role: "OWNER" as const, status: "ACTIVE" };
const input = () => ({ idempotencyKey: crypto.randomUUID(), contentSha256: "a".repeat(64), draftKey: crypto.randomUUID(), requestId: null, requestVersion: null, kind: "photo", mimeType: "image/png", fileName: "cargo.png", byteSize: 100 });

/** Service is real; REST transaction and Storage ports are doubles. Atomicity is tested separately in PostgreSQL. */
function setup() {
  const calls: Array<{ name: string; args: any }> = [], receipts = new Map<string, any>();
  let storageFailure = false, ready = false;
  const exports = {} as typeof Service;
  const admin = {
    from() { throw Error("Unexpected non-atomic table write/read during initialization"); },
    storage: { from: () => ({
      createSignedUploadUrl: async (path: string, options: unknown) => {
        calls.push({ name: "sign", args: { path, options } });
        return storageFailure ? { error: { message: "storage unavailable" } } : { data: { signedUrl: "https://signed.invalid/upload" } };
      },
    }) },
  };
  const db = { rpc: async (name: string, args: any) => {
    calls.push({ name, args });
    if (name === "bind_meta_declaration_media") return { error: null };
    const key = [args.p_organization_id, args.p_member_id, args.p_idempotency_key].join(":");
    const payload = JSON.stringify(args.p_value), prior = receipts.get(key);
    if (prior && prior.payload !== payload) return { error: { code: "PT409", message: "IDEMPOTENCY_CONFLICT" } };
    const row = prior?.row ?? { id: crypto.randomUUID(), kind: args.p_value.kind, file_name: args.p_value.fileName,
      mime_type: args.p_value.mimeType, byte_size: args.p_value.byteSize, object_path: "synthetic/private/path", state: "PENDING" };
    receipts.set(key, { row, payload });
    if (ready) row.state = "READY";
    return { data: { row, replay: Boolean(prior) }, error: null };
  } };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./declaration-media.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, process: { env: { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:65321", SUPABASE_SERVICE_ROLE_KEY: "synthetic-double-not-a-key" } },
    require(name: string) {
      if (name === "server-only") return {};
      if (name === "node:crypto") return crypto;
      if (name === "@supabase/supabase-js") return { createClient: () => admin };
      if (name.includes("db/supabase/v2")) return { createV2ServerSupabaseClient: async () => db };
      if (name.includes("schemas/meta/declaration-media")) return schemas;
      if (name.includes("draft-service")) return { V2DraftError };
      if (name.includes("media-input")) return { IMAGE_LIMITS: { totalBytes: 12 * 1024 * 1024 } };
      // No paid provider or filesystem decode is used by these initialization tests.
      if (name === "sharp" || name.includes("/ai/meta/")) return {};
      throw Error(name);
    },
  });
  return { exports, calls, receipts, failStorage: (value: boolean) => { storageFailure = value; }, ready: () => { ready = true; } };
}
for (const kind of ["photo", "audio"] as const) {
  test(`${kind}: service recovers a lost response using the same authenticated RPC key`, async () => {
    const app = setup(), payload = { ...input(), kind, mimeType: kind === "audio" ? "audio/wav" : "image/png" };
    const first = await app.exports.initializeMedia(actor, payload);
    const recovered = await app.exports.initializeMedia(actor, payload);
    assert.equal(first.item.id, recovered.item.id);
    assert.equal(recovered.replay, true);
    assert.equal(app.receipts.size, 1);
    const rpc = app.calls[0];
    assert.equal(rpc.args.p_organization_id, actor.organizationId);
    assert.equal(rpc.args.p_member_id, actor.memberId);
    assert.equal(rpc.args.p_idempotency_key, payload.idempotencyKey);
    assert.equal(rpc.args.p_value.contentSha256, payload.contentSha256);
    assert.equal(app.calls.find((c) => c.name === "sign")!.args.options.upsert, false);
    await assert.rejects(app.exports.initializeMedia(actor, { ...payload, byteSize: 101 }), { code: "IDEMPOTENCY_CONFLICT", httpStatus: 409 });
  });
}
test("storage failure preserves the committed reservation for retry", async () => {
  const app = setup(), payload = input();
  app.failStorage(true);
  await assert.rejects(app.exports.initializeMedia(actor, payload), { code: "MEDIA_UNAVAILABLE", httpStatus: 503 });
  assert.equal(app.receipts.size, 1);
  app.failStorage(false);
  const recovered = await app.exports.initializeMedia(actor, payload);
  assert.equal(recovered.replay, true);
  assert.equal(app.receipts.size, 1);
});
test("READY replay never signs an upload or overwrites the original", async () => {
  const app = setup(), payload = input();
  const original = await app.exports.initializeMedia(actor, payload);
  app.ready();
  app.calls.length = 0;
  const replay = await app.exports.initializeMedia(actor, payload);
  assert.equal(replay.item.id, original.item.id);
  assert.equal(replay.item.state, "READY");
  assert.equal(replay.uploadUrl, null);
  assert.deepEqual(app.calls.map((c) => c.name), ["initialize_meta_declaration_media"]);
});
test("initialization requires both stable key and original byte fingerprint", async () => {
  const app = setup(), { idempotencyKey, ...missingKey } = input();
  await assert.rejects(app.exports.initializeMedia(actor, missingKey));
  await assert.rejects(app.exports.initializeMedia(actor, { ...input(), contentSha256: "invalid" }));
  assert.equal(app.calls.length, 0);
});
test("binding uses the authenticated atomic command and expected saved version", async () => {
  const app = setup(), scope = { draftKey: crypto.randomUUID(), requestId: crypto.randomUUID(), requestVersion: 2 };
  await app.exports.bindMedia(actor, scope);
  assert.deepEqual(JSON.parse(JSON.stringify(app.calls)), [{ name: "bind_meta_declaration_media", args: {
    p_organization_id: actor.organizationId, p_member_id: actor.memberId, p_draft_key: scope.draftKey,
    p_request_id: scope.requestId, p_request_version: 2,
  } }]);
});
