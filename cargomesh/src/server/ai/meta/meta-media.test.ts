import assert from "node:assert/strict";
import test from "node:test";
import { interpretMetaMediaDeclaration } from "./interpret-media-declaration";
import { IMAGE_LIMITS, prepareDeclarationImages } from "./media-input";
import type { DeclarationInput } from "@/shared/schemas/meta/model-proposal";

const env = { CARGOMESH_AI_PROVIDER: "META", META_MODEL_API_KEY: "not-a-real-key", META_MUSE_MODEL: "muse-spark-1.3" };
const id = "11111111-1111-4111-8111-111111111111";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
const input = (kind: "photo" | "label" | "audio" = "photo", text: string | null = null): DeclarationInput => ({
  schemaVersion: "1.0", inputRevision: 2, language: "en", text: null,
  evidence: [{ evidenceId: id, kind, text }],
});
const scope = () => ({ currentInputRevision: 2, authorizedEvidenceIds: [id], expectedUnit: null });
const image = () => ({ evidenceId: id, mimeType: "image/png" as const, bytes: png });
const proposal = () => ({ schemaVersion: "1.0", inputRevision: 2, status: "PROPOSED", refusalReason: null,
  fields: [{ field: "unitQuantity", value: 3, provenance: { source: "photo", evidenceId: id,
    inputRevision: 2, basis: "VISIBLE", quote: null } }],
  missingFields: ["unitWeightKg", "unitLengthCm", "unitWidthCm", "unitHeightCm"],
  warnings: ["NO_SCALE", "VISIBLE_COUNT_ONLY"], requiresHumanConfirmation: true });
function mock(outputs: unknown[], onCall?: () => void, status = 200) {
  const bodies: any[] = [];
  const fetch: typeof globalThis.fetch = async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body))); onCall?.();
    if (status !== 200) return new Response('{"error":{"message":"private details"}}', { status });
    const output = outputs[Math.min(bodies.length - 1, outputs.length - 1)];
    return new Response(JSON.stringify({ id: "media-test", object: "chat.completion", created: 1,
      model: env.META_MUSE_MODEL, choices: [{ index: 0, finish_reason: "stop", message: {
        role: "assistant", content: JSON.stringify(output) } }],
      usage: { prompt_tokens: 20, completion_tokens: 30, total_tokens: 50 },
    }), { headers: { "content-type": "application/json", "x-request-id": "media-request" } });
  };
  return { bodies, fetch };
}

test("SDK sends actual image bytes paired with evidence; result never includes bytes/key", async () => {
  const m = mock([proposal()]);
  const result = await interpretMetaMediaDeclaration(input(), scope(), { images: [image()], env, fetch: m.fetch });
  assert.equal(result.ok, true);
  const content = m.bodies[0].messages[1].content;
  assert.equal(content[2].type, "image_url");
  assert.equal(content[2].image_url.url, `data:image/png;base64,${png.toString("base64")}`);
  assert.match(content[1].text, new RegExp(id));
  assert.equal(m.bodies[0].response_format.type, "json_schema");
  assert.equal(m.bodies[0].store, false);
  assert.doesNotMatch(JSON.stringify(result), /not-a-real-key|data:image|base64/);
});

test("foreign evidence and stale input are rejected before transport", async () => {
  const m = mock([proposal()]);
  const foreign = await interpretMetaMediaDeclaration(input(), { ...scope(), authorizedEvidenceIds: [] },
    { images: [image()], env, fetch: m.fetch });
  const stale = await interpretMetaMediaDeclaration(input(), { ...scope(), currentInputRevision: 3 },
    { images: [image()], env, fetch: m.fetch });
  assert.equal(!foreign.ok && foreign.error.code, "FORBIDDEN_TENANT");
  assert.equal(!stale.ok && stale.error.code, "INPUT_REVISION_MISMATCH");
  assert.equal(m.bodies.length, 0);
});

test("missing, duplicate, extra or URL-based image inputs cannot invoke provider", async () => {
  const m = mock([proposal()]);
  for (const images of [[], [image(), image()], [{ ...image(), evidenceId: "22222222-2222-4222-8222-222222222222" }],
    [{ evidenceId: id, mimeType: "image/png", url: "http://127.0.0.1/private" }]]) {
    const result = await interpretMetaMediaDeclaration(input(), scope(), {
      images: images as ReturnType<typeof image>[], env, fetch: m.fetch });
    assert.equal(!result.ok && result.error.code, "MEDIA_INVALID");
  }
  assert.equal(m.bodies.length, 0);
});

test("MIME, truncation, dimensions, per-image and combined-byte bounds fail closed", () => {
  const giant = Buffer.from(png); giant.writeUInt32BE(9000, 16);
  const hugePixels = Buffer.from(png); hugePixels.writeUInt32BE(8000, 16); hugePixels.writeUInt32BE(8000, 20);
  const empty = Buffer.from(png); empty.writeUInt32BE(0, 20);
  for (const candidate of [{ ...image(), mimeType: "image/jpeg" }, { ...image(), bytes: png.subarray(0, 25) },
    { ...image(), bytes: giant }, { ...image(), bytes: hugePixels }, { ...image(), bytes: empty },
    { ...image(), bytes: new Uint8Array(IMAGE_LIMITS.perImageBytes + 1) }])
    assert.equal(prepareDeclarationImages(input(), [candidate]), null);
  const ids = [id, "22222222-2222-4222-8222-222222222222", "33333333-3333-4333-8333-333333333333"];
  assert.equal(prepareDeclarationImages({ ...input(), evidence: ids.map(evidenceId => ({ evidenceId, kind: "photo", text: null })) },
    ids.map(evidenceId => ({ ...image(), evidenceId, bytes: new Uint8Array(5 * 1024 * 1024) }))), null);
});

test("a photograph cannot invent weight, even if provider complies structurally", async () => {
  const bad = proposal(); bad.fields[0].field = "unitWeightKg";
  const m = mock([bad]);
  const result = await interpretMetaMediaDeclaration(input(), scope(), { images: [image()], env, fetch: m.fetch });
  assert.equal(!result.ok && result.error.code, "MODEL_OUTPUT_INVALID");
  assert.equal(m.bodies.length, 2);
});

test("readable label permits explicit quoted measurements with unverified warning", async () => {
  const label = { ...proposal(), fields: [{ field: "unitWeightKg", value: 15,
    provenance: { source: "label", evidenceId: id, inputRevision: 2, basis: "EXPLICIT", quote: "15 kg" } }],
    missingFields: ["unitQuantity"], warnings: ["UNVERIFIED_LABEL"] };
  const m = mock([label]);
  const result = await interpretMetaMediaDeclaration(input("label"), scope(), { images: [image()], env, fetch: m.fetch });
  assert.equal(result.ok, true);
});

test("unreadable label returns missing fields, not fabricated measurements", async () => {
  const m = mock([{ ...proposal(), fields: [], warnings: ["INCOMPLETE_DECLARATION"] }]);
  const result = await interpretMetaMediaDeclaration(input("label"), scope(), { images: [image()], env, fetch: m.fetch });
  assert.equal(result.ok, true);
  if (result.ok) { assert.equal(result.proposal.fields.length, 0); assert.ok(result.proposal.missingFields.includes("unitWeightKg")); }
});

test("audio accepts transcript only and explicit correction is sourced to latest text", async () => {
  const p = { ...proposal(), fields: [{ field: "unitQuantity", value: 10, provenance: {
    source: "text", evidenceId: null, inputRevision: 2, basis: "EXPLICIT", quote: "10 boxes" } }], warnings: [] };
  const m = mock([p]);
  const result = await interpretMetaMediaDeclaration({ ...input("audio", "12 boxes"), text: "Correction: 10 boxes." },
    scope(), { images: [], env, fetch: m.fetch });
  assert.equal(result.ok, true);
  assert.equal(typeof m.bodies[0].messages[1].content, "string");
  const missing = await interpretMetaMediaDeclaration(input("audio"), scope(), { images: [], env, fetch: m.fetch });
  assert.equal(!missing.ok && missing.error.code, "MEDIA_INVALID");
  assert.equal(m.bodies.length, 1);
});

test("audio quote must occur in resolved transcript", async () => {
  const p = { ...proposal(), fields: [{ field: "unitQuantity", value: 12, provenance: {
    source: "audio", evidenceId: id, inputRevision: 2, basis: "EXPLICIT", quote: "12 boxes" } }], warnings: [] };
  const m = mock([p]);
  const result = await interpretMetaMediaDeclaration(input("audio", "10 boxes"), scope(), { images: [], env, fetch: m.fetch });
  assert.equal(!result.ok && result.error.code, "MODEL_OUTPUT_INVALID");
});

test("new draft revision discards a delayed result before any application", async () => {
  const s = scope(); const m = mock([proposal()], () => { s.currentInputRevision = 3; });
  const result = await interpretMetaMediaDeclaration(input(), s, { images: [image()], env, fetch: m.fetch });
  assert.equal(!result.ok && result.error.code, "INPUT_REVISION_MISMATCH");
  assert.equal(m.bodies.length, 1);
});

test("revoked evidence also rejects empty/refusal responses", async () => {
  const s = scope(); const m = mock([{ ...proposal(), status: "REFUSED", refusalReason: "UNSUPPORTED_CONTENT", fields: [] }],
    () => { s.authorizedEvidenceIds = []; });
  const result = await interpretMetaMediaDeclaration(input(), s, { images: [image()], env, fetch: m.fetch });
  assert.equal(!result.ok && result.error.code, "FORBIDDEN_TENANT");
});

test("provider error has one attempt, safe metadata and keeps manual path available", async () => {
  const m = mock([], undefined, 429);
  const result = await interpretMetaMediaDeclaration(input(), scope(), { images: [image()], env, fetch: m.fetch });
  assert.equal(!result.ok && result.error.code, "PROVIDER_UNAVAILABLE");
  assert.equal(result.metadata.attempts, 1);
  assert.equal(m.bodies.length, 1);
  assert.doesNotMatch(JSON.stringify(result), /private details|not-a-real-key|base64/);
});
