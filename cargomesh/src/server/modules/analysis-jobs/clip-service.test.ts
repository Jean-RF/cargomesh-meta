import test from "node:test";
import assert from "node:assert/strict";
import {clipMediaUrl, completeClipUpload, listClips, registerClip} from "./clip-service";
import {detectContainer} from "./media-format";
import {ACTOR, OUTSIDER, SESSION, code, mp4, setup, sha256, type Env} from "./test-support";

const ascii = (value: string) => [...value].map((char) => char.charCodeAt(0));
const box = (type: string, brands: string[]) => new Uint8Array([0, 0, 0, 8 + 4 * (brands.length + 1), ...ascii(type), ...ascii(brands[0]), 0, 0, 0, 0, ...brands.slice(1).flatMap(ascii)]);

async function register(env: Env, bytes: Uint8Array, key = crypto.randomUUID(), overrides: Record<string, unknown> = {}) {
  return registerClip(env.deps(), ACTOR, {sessionId: SESSION, source: "OWN_CAPTURE", mimeType: "video/mp4", sizeBytes: bytes.byteLength, sha256: sha256(bytes), ...overrides}, key);
}
const pathOf = (env: Env, clipId: string) => env.store.allClips().find((clip) => clip.clipId === clipId)!.storagePath;

test("el formato real sale de los primeros bytes, no de la extensión", () => {
  assert.equal(detectContainer(mp4()), "MP4");
  assert.equal(detectContainer(box("ftyp", ["qt  ", "qt  "])), "MOV");
  assert.equal(detectContainer(box("ftyp", ["mp42", "isom", "mp42"])), "MP4");
  assert.equal(detectContainer(new Uint8Array([0, 0, 0, 8, ...ascii("wide"), 0, 0, 0, 8])), "MOV", "QuickTime antiguo sin ftyp");
  assert.equal(detectContainer(box("ftyp", ["heic", "mif1", "heic"])), null, "una foto HEIC no es video");
  assert.equal(detectContainer(box("ftyp", ["XAVC", "XAVC", "mp42"])), "MP4", "las marcas compatibles cuentan");
  assert.equal(detectContainer(box("ftyp", ["M4A ", "M4A ", "isom"])), null, "un audio M4A no es video aunque sea compatible con isom");
  assert.equal(detectContainer(new Uint8Array([0x89, ...ascii("PNG\r\n\u001a\n"), 0, 0, 0, 0])), null);
  assert.equal(detectContainer(new Uint8Array([0, 0, 0])), null);
});

test("registrar deja el clip en PENDING con una URL de subida y la misma clave lo repite", async () => {
  const env = setup();
  const bytes = mp4();
  const key = crypto.randomUUID();
  const first = await register(env, bytes, key);
  assert.equal(first.clip.state, "PENDING");
  assert.equal(first.replay, false);
  assert.match(first.upload?.url ?? "", /token=up/);
  assert.equal("storagePath" in first.clip, false, "la ruta del bucket no sale al navegador");
  const again = await register(env, bytes, key);
  assert.equal(again.replay, true);
  assert.equal(again.clip.clipId, first.clip.clipId);
  await assert.rejects(register(env, bytes, key, {source: "SYNTHETIC_RENDER"}), code("IDEMPOTENCY_CONFLICT"));
  await assert.rejects(register(env, bytes, "no-uuid"), code("VALIDATION_ERROR"));
  await assert.rejects(register(env, bytes, crypto.randomUUID(), {sizeBytes: 50 * 1024 * 1024 + 1}));
  await assert.rejects(register(env, bytes, crypto.randomUUID(), {mimeType: "video/webm"}));
});

test("la subida se verifica: sin objeto, tamaño, hash y formato distintos nunca quedan READY", async () => {
  const env = setup();
  const declared = mp4("the declared clip");
  const {clip} = await register(env, declared);
  await assert.rejects(completeClipUpload(env.deps(), env.server(), ACTOR, clip.clipId), code("UPLOAD_INCOMPLETE"));

  env.objects.set(pathOf(env, clip.clipId), mp4("another clip of other size"));
  await assert.rejects(completeClipUpload(env.deps(), env.server(), ACTOR, clip.clipId), code("MEDIA_INVALID"));
  assert.equal(env.store.allClips()[0].rejection, "SIZE_MISMATCH");
  await assert.rejects(completeClipUpload(env.deps(), env.server(), ACTOR, clip.clipId), code("EVIDENCE_REJECTED"));

  const sameSize = setup();
  const original = await register(sameSize, declared);
  sameSize.objects.set(pathOf(sameSize, original.clip.clipId), mp4("the declared clap"));
  await assert.rejects(completeClipUpload(sameSize.deps(), sameSize.server(), ACTOR, original.clip.clipId), code("MEDIA_INVALID"));
  assert.equal(sameSize.store.allClips()[0].rejection, "HASH_MISMATCH");

  const notVideo = setup();
  const png = new Uint8Array([0x89, ...ascii("PNG\r\n\u001a\n"), ...ascii("not a video at all")]);
  const image = await register(notVideo, png);
  notVideo.objects.set(pathOf(notVideo, image.clip.clipId), png);
  await assert.rejects(completeClipUpload(notVideo.deps(), notVideo.server(), ACTOR, image.clip.clipId), code("MEDIA_INVALID"));
  assert.equal(notVideo.store.allClips()[0].rejection, "UNSUPPORTED_FORMAT");
});

test("una subida correcta queda READY una vez y solo entonces se puede reproducir", async () => {
  const env = setup();
  const bytes = mp4();
  const {clip} = await register(env, bytes);
  await assert.rejects(clipMediaUrl(env.deps(), ACTOR, clip.clipId), code("EVIDENCE_NOT_READY"));
  env.objects.set(pathOf(env, clip.clipId), bytes);
  const ready = await completeClipUpload(env.deps(), env.server(), ACTOR, clip.clipId);
  assert.deepEqual([ready.state, ready.container], ["READY", "MP4"]);
  assert.equal((await completeClipUpload(env.deps(), env.server(), ACTOR, clip.clipId)).state, "READY");
  const media = await clipMediaUrl(env.deps(), ACTOR, clip.clipId);
  assert.match(media.url, /ttl=300$/, "las URLs del navegador duran 5 minutos");
});

test("sesión cerrada, lector u otra organización no registran, verifican ni leen clips ajenos", async () => {
  const env = setup();
  const bytes = mp4();
  const {clip} = await register(env, bytes);
  const closed = setup({session: {status: "CLOSED"}});
  await assert.rejects(register(closed, bytes), code("SESSION_NOT_OPEN"));
  const reader = {...ACTOR, role: "REQUESTER" as const};
  await assert.rejects(registerClip(env.deps(reader), reader, {sessionId: SESSION, source: "OWN_CAPTURE", mimeType: "video/mp4", sizeBytes: 9, sha256: "a".repeat(64)}, crypto.randomUUID()), code("FORBIDDEN_WORKFLOW"));
  await assert.rejects(completeClipUpload(env.deps(reader), env.server(), reader, clip.clipId), code("FORBIDDEN_WORKFLOW"));
  await assert.rejects(registerClip(env.deps(OUTSIDER), OUTSIDER, {sessionId: SESSION, source: "OWN_CAPTURE", mimeType: "video/mp4", sizeBytes: 9, sha256: "a".repeat(64)}, crypto.randomUUID()), code("LOADING_SESSION_NOT_FOUND"));
  await assert.rejects(completeClipUpload(env.deps(OUTSIDER), env.server(), OUTSIDER, clip.clipId), code("EVIDENCE_NOT_FOUND"));
  await assert.rejects(clipMediaUrl(env.deps(OUTSIDER), OUTSIDER, clip.clipId), code("EVIDENCE_NOT_FOUND"));
  assert.deepEqual(await listClips(env.deps(OUTSIDER), OUTSIDER, {sessionId: SESSION}), []);
  assert.equal((await listClips(env.deps(), ACTOR, {sessionId: SESSION})).length, 1);
});
