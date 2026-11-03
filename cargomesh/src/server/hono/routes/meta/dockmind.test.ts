import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {Hono, type MiddlewareHandler} from "hono";
import type {AuthVariables} from "../../middleware/auth";
import {signDockMindBody} from "@/server/modules/analysis-jobs/callback-signature";
import {ACTOR, CONFIG, SECRET, SESSION, T0, mp4, resultFor, setup, sha256, type Env} from "@/server/modules/analysis-jobs/test-support";
import {createDockMindRouter} from "./dockmind";

const auth: MiddlewareHandler<{Variables: AuthVariables}> = async (c, next) => {
  c.set("member", {memberId: ACTOR.memberId, organizationId: ACTOR.organizationId, userId: ACTOR.userId, userEmail: "synthetic@example.invalid", role: "SUPERVISOR", status: "ACTIVE"});
  await next();
};
const app = (env: Env) => new Hono().route("/api/v2", createDockMindRouter({request: async () => env.deps(), server: () => env.server(), authenticate: auth}));
const base = "http://localhost/api/v2/meta/dockmind";
const post = (path: string, body: string, headers: Record<string, string> = {}) =>
  ({method: "POST", body, headers: {"Content-Type": "application/json", Origin: "http://localhost", ...headers}}) as RequestInit;
const signed = (raw: string, at = T0) => {
  const timestamp = Math.floor(at / 1000);
  return {"x-dockmind-timestamp": String(timestamp), "x-dockmind-signature": signDockMindBody(raw, SECRET, timestamp)};
};

async function uploadedClip(env: Env, http: Hono) {
  const bytes = mp4();
  const value = {sessionId: SESSION, source: "OWN_CAPTURE", mimeType: "video/mp4", sizeBytes: bytes.byteLength, sha256: sha256(bytes)};
  const registered = await http.request(`${base}/clips`, post("", JSON.stringify(value), {"Idempotency-Key": crypto.randomUUID()}));
  assert.equal(registered.status, 201);
  const {data} = await registered.json() as {data: {clip: {clipId: string}; upload: {url: string}}};
  // El navegador sube directo al bucket con la URL firmada; aquí se simula el objeto subido.
  env.objects.set(env.store.allClips()[0].storagePath, bytes);
  const complete = await http.request(`${base}/clips/${data.clip.clipId}/complete`, post("", "{}"));
  assert.equal(complete.status, 200);
  return data.clip.clipId;
}

describe("DockMind HTTP routes", () => {
  it("bloquean cookies de otro origen, JSON roto, cuerpos grandes y comandos sin clave de idempotencia", async () => {
    const env = setup();
    const http = app(env);
    assert.equal((await http.request(`${base}/jobs`, post("", "{}", {Origin: "https://other.invalid"}))).status, 403);
    assert.equal((await http.request(`${base}/jobs`, post("", "{"))).status, 400);
    assert.equal((await http.request(`${base}/jobs`, post("", " ".repeat(33_000)))).status, 413);
    const noKey = await http.request(`${base}/clips`, post("", JSON.stringify({sessionId: SESSION, source: "OWN_CAPTURE", mimeType: "video/mp4", sizeBytes: 10, sha256: "a".repeat(64)})));
    assert.equal(noKey.status, 400);
    const list = await http.request(`${base}/jobs?sessionId=${SESSION}`);
    assert.equal(list.status, 200);
    assert.equal(list.headers.get("cache-control"), "private, no-store");
    assert.equal(env.store.allClips().length, 0);
  });

  it("usan la autenticación nativa; el callback no pide sesión de usuario, solo la firma", async () => {
    const env = setup();
    const http = new Hono().route("/api/v2", createDockMindRouter({request: async () => env.deps(), server: () => env.server()}));
    assert.equal((await http.request(`${base}/jobs?sessionId=${SESSION}`, {headers: {Authorization: "invalid"}})).status, 401);
    const unsigned = await http.request(`${base}/callback`, {method: "POST", body: "{}", headers: {"Content-Type": "application/json"}});
    assert.equal(unsigned.status, 401);
    assert.equal(((await unsigned.json()) as {error: {code: string}}).error.code, "INVALID_SIGNATURE");
  });

  it("recorren clip -> job -> callback firmado -> observación entregada, con la firma sobre el cuerpo crudo", async () => {
    const env = setup();
    const http = app(env);
    const evidenceId = await uploadedClip(env, http);
    const created = await http.request(`${base}/jobs`, post("", JSON.stringify({sessionId: SESSION, evidenceId, config: CONFIG})));
    assert.equal(created.status, 201);
    const job = env.store.allJobs()[0];
    // El worker sube el video anotado a la ruta de este intento con la URL que recibió.
    const video = mp4("video anotado");
    assert.equal(env.upload(env.sent[0].overlay_upload_url!, video), 200);

    const raw = JSON.stringify(resultFor(job, {}, video));
    const reserialized = JSON.stringify(JSON.parse(raw), null, 2);
    const tampered = await http.request(`${base}/callback`, {method: "POST", body: reserialized, headers: {"Content-Type": "application/json", ...signed(raw)}});
    assert.equal(tampered.status, 401, "un JSON re-serializado no conserva la firma");

    const accepted = await http.request(`${base}/callback`, {method: "POST", body: raw, headers: {"Content-Type": "application/json", ...signed(raw)}});
    assert.equal(accepted.status, 200);
    assert.deepEqual(((await accepted.json()) as {data: unknown}).data, {accepted: true, reason: "RECORDED", delivery: "DELIVERED"});
    const read = (await (await http.request(`${base}/jobs/${job.jobId}`)).json()) as {data: {delivery: {status: string}; status: string}};
    assert.deepEqual([read.data.status, read.data.delivery.status], ["SUCCEEDED", "DELIVERED"]);
    const overlay = (await (await http.request(`${base}/jobs/${job.jobId}/overlay`)).json()) as {data: {url: string}};
    assert.match(overlay.data.url, /-a1-overlay\.mp4\?ttl=300$/);
  });

  it("si Juan falla responden 503 para que el worker reenvíe y la entrega se recupera por HTTP", async () => {
    const env = setup();
    const http = app(env);
    const evidenceId = await uploadedClip(env, http);
    await http.request(`${base}/jobs`, post("", JSON.stringify({sessionId: SESSION, evidenceId, config: CONFIG})));
    const job = env.store.allJobs()[0];
    env.juan.failures.push(new Error("LOADING_DATABASE_ERROR"));
    const raw = JSON.stringify(resultFor(job));
    const pending = await http.request(`${base}/callback`, {method: "POST", body: raw, headers: {"Content-Type": "application/json", ...signed(raw)}});
    assert.equal(pending.status, 503);
    assert.deepEqual(((await pending.json()) as {error: unknown}).error, {code: "DELIVERY_PENDING", message: "The result is saved; the observation delivery will be retried.", retryable: true});

    assert.equal((await http.request(`${base}/jobs/${job.jobId}/delivery`, post("", JSON.stringify({expectedAttempt: 2})))).status, 409);
    const recovered = await http.request(`${base}/jobs/${job.jobId}/delivery`, post("", JSON.stringify({expectedAttempt: 1})));
    assert.equal(recovered.status, 200);
    assert.equal(((await recovered.json()) as {data: {delivery: {status: string}}}).data.delivery.status, "DELIVERED");
    assert.equal(env.juan.rows.size, 1);
    assert.equal(env.sent.length, 1);
  });
});
