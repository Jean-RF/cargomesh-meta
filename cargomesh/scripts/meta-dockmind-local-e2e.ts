/**
 * Recorrido local de punta a punta de DockMind (Ramón/Jean): clip privado -> job persistente -> worker ->
 * observación de Juan -> sesión del dashboard. Solo la Supabase local del perfil V2; nunca Modal, SAM ni una base alojada.
 *
 * Real en este recorrido: Auth local, rutas Hono V2 con Bearer, RPC y tablas de la migración, bucket privado con
 * URLs firmadas, sesión y manifiesto de Juan/CR-01, `recordLoadingObservation` y el worker Python (`parse_job`,
 * `run_job`, video anotado, callback firmado con reenvío). Diferencias rotuladas: el segmentador es el FIXTURE del
 * clip sintético (sin inferencia real) y las URLs https del host de prueba se traducen a 127.0.0.1.
 *
 * Uso, desde cargomesh/, con el perfil V2 local arrancado y su seed sintético:
 *   npx supabase status --workdir ../supabase-v2 -o json > <fuera del repo>/v2-status.json
 *   CARGOMESH_LOCAL_SECRETS_PATH=<ese archivo> node --conditions=react-server --import tsx scripts/meta-dockmind-local-e2e.ts
 */
import assert from "node:assert/strict";
import {spawn, spawnSync} from "node:child_process";
import {createHash, randomBytes} from "node:crypto";
import {existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {createServer} from "node:http";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {createClient} from "@supabase/supabase-js";
import {Hono} from "hono";
import type {DockMindJob} from "../src/shared/schemas/meta/dockmind";
import type {ClipStorage, ServerDeps, WorkerDispatcher} from "../src/server/modules/analysis-jobs/ports";

const LOCAL_API = "http://127.0.0.1:58321";
const TEST_ORIGIN = "https://local.dockmind.test";
const ORG_A = "c2300000-0000-4000-8000-000000000001";
const WORKER = resolve("dockmind-worker");
const PYTHON = [join(WORKER, ".venv", "Scripts", "python.exe"), join(WORKER, ".venv", "bin", "python")].find(existsSync);
const CONFIG = {line: {x1: 0.5, y1: 0, x2: 0.5, y2: 1, inside_x: 0.8, inside_y: 0.5}, unit: "BOX", concept: "cardboard box"};

async function main() {
  const statusPath = process.env.CARGOMESH_LOCAL_SECRETS_PATH;
  assert(statusPath, "Pasa el JSON de `supabase status` en CARGOMESH_LOCAL_SECRETS_PATH, fuera del repositorio");
  assert(PYTHON, "Falta el venv del worker en dockmind-worker/.venv");
  const local = JSON.parse(readFileSync(statusPath, "utf8")) as Record<string, string>;
  assert.equal(local.API_URL, LOCAL_API, "Solo la Supabase local del perfil V2");
  Object.assign(process.env, {
    NEXT_PUBLIC_SUPABASE_URL: local.API_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY, DOCKMIND_CALLBACK_SECRET: randomBytes(32).toString("hex"),
  });
  const {createHonoApp} = await import("../src/server/hono/app");
  const {createDockMindRouter} = await import("../src/server/hono/routes/meta/dockmind");
  const {dockmindRequestDeps, dockmindServerDeps} = await import("../src/server/modules/analysis-jobs/wiring");
  const {CLIP_URL_TTL_SECONDS} = await import("../src/server/modules/analysis-jobs/config");
  const {ConfirmedManifestSchema} = await import("../src/shared/schemas/meta/manifest-commands");

  // Usuarios sintéticos del seed local (organizaciones A y B); la clave sale del seed y no se imprime.
  const seed = readFileSync("../supabase/scenarios/v2-road-baseline/seed.sql", "utf8");
  const password = seed.match(/crypt\('([^']+)'/)?.[1];
  assert(password, "Seed sintético local sin cambios requerido");
  const signIn = async (email: string) => {
    const client = createClient(local.API_URL, local.ANON_KEY, {auth: {persistSession: false, autoRefreshToken: false}});
    const {data, error} = await client.auth.signInWithPassword({email, password});
    assert.ifError(error);
    return data.session!.access_token;
  };
  const tokenA = await signIn("qa-v2-a@cargomesh.test");
  const tokenB = await signIn("qa-v2-b@cargomesh.test");

  // Worker local: el mismo código Python que corre en Modal, con FIXTURE y URLs traducidas a 127.0.0.1.
  const clips = mkdtempSync(join(tmpdir(), "dockmind-e2e-"));
  const generated = spawnSync(PYTHON, ["-m", "dockmind", "synthetic", "--out", clips, "--only", "todas"], {cwd: WORKER, encoding: "utf8"});
  assert.equal(generated.status, 0, generated.stderr);
  const clipBytes = readFileSync(join(clips, "sintetico_todas.mp4"));
  const fixture = join(clips, "sintetico_todas.fixture.txt");

  const receipts = new Map<string, Promise<Record<string, unknown>>>();
  const payloads = new Map<string, DockMindJob>();
  let dispatched = 0;
  let port = 0;
  // Despacho cortado: el worker recibió el job pero la API vio un timeout. Ese intento queda guardado para correrlo tarde.
  const hold = {next: false, held: null as DockMindJob | null};
  const runWorker = (job: DockMindJob) => {
    const child = spawn(PYTHON!, [join(WORKER, "scripts", "local_e2e_job.py"), fixture], {
      cwd: WORKER,
      env: {
        NODE_ENV: process.env.NODE_ENV, PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, PYTHONIOENCODING: "utf-8",
        DOCKMIND_CALLBACK_SECRET: process.env.DOCKMIND_CALLBACK_SECRET,
        DOCKMIND_LOCAL_URL_MAP: JSON.stringify({[`${TEST_ORIGIN}/storage/`]: `${LOCAL_API}/storage/`, [`${TEST_ORIGIN}/api/`]: `http://127.0.0.1:${port}/api/`}),
      }, // solo lo que el worker necesita: las claves de Supabase no pasan al proceso
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk) => (out += chunk));
    child.stderr.on("data", (chunk) => (err += chunk));
    const receipt = new Promise<Record<string, unknown>>((done, fail) => child.on("close", (code) => (code === 0 ? done(JSON.parse(out.trim().split("\n").at(-1)!)) : fail(new Error(err.slice(-2000))))));
    child.stdin.end(JSON.stringify(job));
    return {receipt, pid: child.pid};
  };
  const dispatcher: WorkerDispatcher = {
    async dispatch(job: DockMindJob) {
      payloads.set(`${job.job_id}:${job.attempt}`, job);
      if (hold.next) {
        hold.next = false;
        hold.held = job;
        throw new Error("timeout del despacho (simulado): el worker ya tenía el job");
      }
      dispatched += 1;
      const {receipt, pid} = runWorker(job);
      receipts.set(`${job.job_id}:${job.attempt}`, receipt);
      return {callId: `local-${pid}`, duplicate: false};
    },
  };
  const toTestOrigin = (url: string) => url.replace(`${LOCAL_API}/`, `${TEST_ORIGIN}/`);
  const toLocal = (url: string) => url.replace(`${TEST_ORIGIN}/`, `${LOCAL_API}/`);
  const failures = {next: 0};
  const baseServer = dockmindServerDeps();
  // Falla inyectada de Juan para el caso obligatorio; el resto del servidor es el real.
  const server = (): ServerDeps => ({
    ...baseServer,
    observations: {
      record: async (job) => {
        if (failures.next > 0) {
          failures.next -= 1;
          throw new Error("LOADING_DATABASE_ERROR (falla inyectada por el recorrido)");
        }
        return baseServer.observations.record(job);
      },
    },
  });
  const dock = new Hono().basePath("/api/v2").route("/", createDockMindRouter({
    async request(member) {
      const deps = await dockmindRequestDeps(member);
      const storage: ClipStorage = {
        ...deps.storage,
        signedReadUrl: async (path, ttl) => toTestOrigin(await deps.storage.signedReadUrl(path, ttl)),
        signedOverlayUploadUrl: async (path) => toTestOrigin(await deps.storage.signedOverlayUploadUrl(path)),
      };
      return {...deps, storage, worker: () => dispatcher, config: () => ({callbackUrl: `${TEST_ORIGIN}/api/v2/meta/dockmind/callback`, clipUrlTtlSeconds: CLIP_URL_TTL_SECONDS, workerMode: "MODAL"})};
    },
    server,
  }));
  const bridge = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) if (typeof value === "string") headers.set(key, value);
    const response = await dock.fetch(new Request(`http://127.0.0.1:${port}${req.url}`, {method: req.method, headers, body: chunks.length ? Buffer.concat(chunks) : undefined}));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  });
  await new Promise<void>((done) => bridge.listen(0, "127.0.0.1", done));
  port = (bridge.address() as {port: number}).port;

  const core = createHonoApp();
  async function call(app: {request: (path: string, init?: RequestInit) => Response | Promise<Response>}, token: string, path: string, body?: unknown, key?: string) {
    const response = await app.request(`http://localhost/api/v2${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {Authorization: `Bearer ${token}`, ...(body === undefined ? {} : {"Content-Type": "application/json", "Idempotency-Key": key ?? crypto.randomUUID()})},
      ...(body === undefined ? {} : {body: JSON.stringify(body)}),
    });
    return {status: response.status, body: (await response.json()) as Record<string, any>};
  }
  const checks: string[] = [];
  const evidence: Record<string, unknown> = {};

  // 1. Solicitud, manifiesto confirmado (CR-01) y sesiones de Juan: DEMO en la sede 1, VERIFICATION en la sede 2.
  const payload = {
    schemaVersion: "2.0", origin: {facilityId: "c2330000-0000-4000-8000-000000000001"}, destination: {facilityId: "c2330000-0000-4000-8000-000000000002"},
    pickupWindow: {startsAt: "2026-11-02T08:00:00Z", endsAt: "2026-11-02T18:00:00Z"}, deliveryWindow: {startsAt: "2026-11-03T08:00:00Z", endsAt: "2026-11-03T20:00:00Z"},
    acceptedModes: ["ROAD"], requiredEquipment: null,
    cargoSpecification: {categoryCode: "GENERAL", description: "[SYNTHETIC] DockMind local e2e", packaging: "BOX", totalWeightKg: 600, totalVolumeM3: 6, divisible: true, requirements: [],
      units: [{packageType: "Cajas de prueba", quantity: 6, weightPerUnitKg: 100, volumePerUnitM3: 1, dimensionsCm: {length: 100, width: 100, height: 100}, indivisible: true, stackable: false}]},
    contacts: {pickup: {name: "Synthetic sender", phoneE164: "+12025550123"}, recipient: {name: "Synthetic receiver", phoneE164: "+12025550124"}},
  };
  const request = await call(core, tokenA, "/freight/requests", payload);
  assert.equal(request.status, 201, JSON.stringify(request.body.error));
  const requestId = request.body.data.id;
  const preparation = await call(core, tokenA, `/freight/requests/${requestId}/declaration-preparations`, {expectedDraftVersion: 1, expectedManifestRevision: 0});
  assert.equal(preparation.status, 201, JSON.stringify(preparation.body.error));
  const confirmed = await call(core, tokenA, `/freight/requests/${requestId}/declared-manifests`,
    {preparationId: preparation.body.data.id, expectedDraftVersion: 1, expectedManifestRevision: 0, contentHash: preparation.body.data.contentHash, confirmed: true});
  assert.equal(confirmed.status, 201, JSON.stringify(confirmed.body.error));
  const manifest = ConfirmedManifestSchema.parse(confirmed.body.data);
  const openSession = async (facilityId: string, mode: "DEMO" | "VERIFICATION") => {
    const opened = await call(core, tokenA, "/meta/loading-sessions", {
      requestId, facilityId, manifestId: manifest.id, manifestRevision: manifest.revision, mode,
      groups: manifest.declaration.groupBindings.map((g: {groupId: string}) => ({groupId: g.groupId, unit: "BOX"})),
    });
    assert.equal(opened.status, 201, JSON.stringify(opened.body.error));
    return opened.body.data.session as {id: string; groups: {id: string}[]};
  };
  const demo = await openSession("c2330000-0000-4000-8000-000000000001", "DEMO");
  const verification = await openSession("c2330000-0000-4000-8000-000000000002", "VERIFICATION");
  const groupId = demo.groups[0].id;
  Object.assign(evidence, {requestId, manifestId: manifest.id, manifestRevision: manifest.revision, demoSessionId: demo.id, verificationSessionId: verification.id, groupId});
  checks.push("Auth local -> solicitud -> manifiesto CR-01 confirmado -> sesiones DEMO y VERIFICATION de Juan");

  // 2. Clip privado: PENDING -> subida directa con URL firmada -> verificación de tamaño, hash y formato -> READY.
  const sha256 = createHash("sha256").update(clipBytes).digest("hex");
  const clipValue = {sessionId: demo.id, source: "SYNTHETIC_RENDER", mimeType: "video/mp4", sizeBytes: clipBytes.byteLength, sha256};
  const clipKey = crypto.randomUUID();
  const registered = await call(dock, tokenA, "/meta/dockmind/clips", clipValue, clipKey);
  assert.equal(registered.status, 201, JSON.stringify(registered.body.error));
  const clipId = registered.body.data.clip.clipId as string;
  assert.equal((await call(dock, tokenA, "/meta/dockmind/clips", clipValue, clipKey)).body.data.clip.clipId, clipId);
  assert.equal((await call(dock, tokenA, `/meta/dockmind/clips/${clipId}/complete`, {})).body.error.code, "UPLOAD_INCOMPLETE");
  const put = await fetch(registered.body.data.upload.url, {method: "PUT", body: clipBytes, headers: {"content-type": "video/mp4", "x-upsert": "false"}});
  assert.ok(put.ok, `subida firmada: HTTP ${put.status}`);
  const ready = await call(dock, tokenA, `/meta/dockmind/clips/${clipId}/complete`, {});
  assert.equal(ready.body.data.state, "READY", JSON.stringify(ready.body));
  const anonymous = await fetch(`${LOCAL_API}/storage/v1/object/public/meta-dockmind/org/${ORG_A}/${demo.id}/${clipId}.mp4`);
  assert.ok(!anonymous.ok, "el original no es público");
  Object.assign(evidence, {clipId, clipSha256: sha256, clipBytes: clipBytes.byteLength, clipContainer: ready.body.data.container, anonymousReadStatus: anonymous.status});
  checks.push("Clip privado registrado (replay con la misma clave), verificado READY; lectura anónima rechazada");

  const waitFor = async (jobId: string, attempt = 1) => {
    const receipt = await receipts.get(`${jobId}:${attempt}`)!;
    for (let i = 0; i < 40; i += 1) {
      const view = (await call(dock, tokenA, `/meta/dockmind/jobs/${jobId}`)).body.data;
      if (view.status === "SUCCEEDED" || view.status === "FAILED") return {view, receipt};
      await new Promise((done) => setTimeout(done, 250));
    }
    throw new Error("El job no terminó");
  };
  const startJob = async (coverage: string, config: Record<string, unknown> = CONFIG) => {
    const created = await call(dock, tokenA, "/meta/dockmind/jobs", {sessionId: demo.id, evidenceId: clipId, groupId, coverage, config});
    assert.equal(created.status, 201, JSON.stringify(created.body.error));
    return created.body.data.jobId as string;
  };
  const sessionObservations = async () => (await call(core, tokenA, `/meta/loading-sessions/${demo.id}`)).body.data.observations as {id: string; jobId: string; attempt: number; net: number; source: string; realInference: boolean; evidenceId: string}[];

  // 3. Job -> worker -> callback firmado -> SUCCEEDED -> observación entregada a la sesión de Juan.
  const job1 = await startJob("COMPLETE");
  const run1 = await waitFor(job1);
  assert.deepEqual([run1.view.status, run1.view.delivery.status, run1.view.result.net], ["SUCCEEDED", "DELIVERED", 6]);
  const observed1 = (await sessionObservations()).filter((o) => o.jobId === job1);
  assert.equal(observed1.length, 1);
  assert.deepEqual([observed1[0].net, observed1[0].source, observed1[0].realInference, observed1[0].evidenceId], [6, "SYNTHETIC_RENDER", false, clipId]);
  const overlay = await call(dock, tokenA, `/meta/dockmind/jobs/${job1}/overlay`);
  const overlayVideo = await fetch(toLocal(overlay.body.data.url));
  assert.equal(overlayVideo.status, 200);
  const overlayBytes = (await overlayVideo.arrayBuffer()).byteLength;
  assert.equal((await call(dock, tokenA, "/meta/dockmind/jobs", {sessionId: demo.id, evidenceId: clipId, groupId, coverage: "COMPLETE", config: {...CONFIG, margin: 0.01, min_track_frames: 3}})).status, 200, "mismo payload canónico, mismo job");
  assert.equal((await call(dock, tokenA, `/meta/dockmind/jobs/${job1}/retry`, {expectedAttempt: 1})).body.error.code, "ANALYSIS_NOT_RETRYABLE");
  evidence.job1 = {jobId: job1, receipt: run1.receipt, delivery: run1.view.delivery, observationId: observed1[0].id, overlayBytes};
  checks.push("Job -> worker Python -> callback firmado -> SUCCEEDED -> observación de Juan (neto 6, sintético, sin inferencia real) y video anotado privado");

  // 4. Caso obligatorio: SUCCEEDED guardado -> falla Juan -> callback repetido -> una observación, sin nueva inferencia.
  failures.next = 1;
  const before2 = dispatched;
  const job2 = await startJob("PARTIAL");
  const run2 = await waitFor(job2);
  const observed2 = (await sessionObservations()).filter((o) => o.jobId === job2);
  assert.deepEqual([run2.view.delivery.status, run2.view.delivery.tries, observed2.length, dispatched - before2], ["DELIVERED", 2, 1, 1]);
  assert.deepEqual([(run2.receipt.delivery as {tries: number}).tries, (run2.receipt.delivery as {delivered: boolean}).delivered, run2.receipt.reused], [2, true, false]);
  evidence.job2 = {jobId: job2, receipt: run2.receipt, delivery: run2.view.delivery, observationId: observed2[0].id, workerDispatches: dispatched - before2};
  checks.push("Caso obligatorio: Juan falló una vez, el worker reenvió tras el 503, una sola observación y un solo análisis");

  // 5. Reenvíos agotados -> entrega pendiente durable -> recuperación por HTTP sin volver a analizar.
  failures.next = 3;
  const before3 = dispatched;
  const job3 = await startJob("COMPLETE", {...CONFIG, margin: 0.02});
  const run3 = await waitFor(job3);
  assert.deepEqual([run3.view.status, run3.view.delivery.status, run3.view.delivery.tries], ["SUCCEEDED", "PENDING", 3]);
  assert.equal((run3.receipt.delivery as {problem: string}).problem, "UNREACHABLE");
  assert.equal((await sessionObservations()).filter((o) => o.jobId === job3).length, 0);
  const recovered = await call(dock, tokenA, `/meta/dockmind/jobs/${job3}/delivery`, {expectedAttempt: 1});
  assert.equal(recovered.body.data.delivery.status, "DELIVERED", JSON.stringify(recovered.body));
  assert.equal((await sessionObservations()).filter((o) => o.jobId === job3).length, 1);
  assert.equal(dispatched - before3, 1);
  evidence.job3 = {jobId: job3, receipt: run3.receipt, pendingTries: run3.view.delivery.tries, recoveredDelivery: recovered.body.data.delivery, workerDispatches: dispatched - before3};
  checks.push("Reenvíos agotados: entrega PENDING durable y recuperada por HTTP; sin nuevo despacho");

  // 6. Aislamiento entre organizaciones y procedencia DEMO / VERIFICATION.
  const outsider = {
    readJob: (await call(dock, tokenB, `/meta/dockmind/jobs/${job1}`)).status,
    clipMedia: (await call(dock, tokenB, `/meta/dockmind/clips/${clipId}/media`)).status,
    listJobs: (await call(dock, tokenB, `/meta/dockmind/jobs?sessionId=${demo.id}`)).body.data.length,
    registerClip: (await call(dock, tokenB, "/meta/dockmind/clips", clipValue)).status,
  };
  assert.deepEqual(outsider, {readJob: 404, clipMedia: 404, listJobs: 0, registerClip: 404});
  const synthetic = await call(dock, tokenA, "/meta/dockmind/clips", {...clipValue, sessionId: verification.id});
  assert.deepEqual([synthetic.status, synthetic.body.error.code], [422, "REAL_EVIDENCE_REQUIRED"]);
  Object.assign(evidence, {outsider, verificationSyntheticClip: {status: synthetic.status, code: synthetic.body.error.code}});
  checks.push("Organización B no lee, lista ni adjunta; VERIFICATION rechaza un render sintético");

  // 7. Prueba obligatoria con Storage y worker reales: el intento 1 llega tarde y no cambia el video ni la observación del 2.
  hold.next = true;
  const job4 = await startJob("PARTIAL", {...CONFIG, margin: 0.03});
  const queued = (await call(dock, tokenA, `/meta/dockmind/jobs/${job4}`)).body.data;
  assert.deepEqual([queued.status, queued.attempt, queued.error?.code, queued.retryable], ["QUEUED", 1, "PROVIDER_UNAVAILABLE", true]);
  const retried = await call(dock, tokenA, `/meta/dockmind/jobs/${job4}/retry`, {expectedAttempt: 1});
  assert.equal(retried.body.data.attempt, 2, JSON.stringify(retried.body));
  const run4 = await waitFor(job4, 2);
  assert.deepEqual([run4.view.status, run4.view.attempt, run4.view.overlayStatus, run4.view.delivery.status], ["SUCCEEDED", 2, "VERIFIED", "DELIVERED"]);
  const attempt1 = hold.held!;
  const attempt2 = payloads.get(`${job4}:2`)!;
  assert.match(attempt1.overlay_upload_url ?? "", /-a1-overlay\.mp4/);
  assert.match(attempt2.overlay_upload_url ?? "", /-a2-overlay\.mp4/);
  const digest = (bytes: ArrayBuffer) => createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  const playback = async () => {
    const url = (await call(dock, tokenA, `/meta/dockmind/jobs/${job4}/overlay`)).body.data.url as string;
    assert.match(url, /-a2-overlay\.mp4/);
    return digest(await (await fetch(toLocal(url))).arrayBuffer());
  };
  const before = await playback();
  assert.equal(before, run4.receipt.overlay_sha256);
  // Llega tarde el worker del intento 1: analiza, sube a la ruta de su intento y avisa.
  const late = await runWorker(attempt1).receipt;
  assert.deepEqual([late.status, (late.delivery as {http_status: number}).http_status, late.overlay_uploaded], ["SUCCEEDED", 202, true]);
  // Aun con la URL del intento 2, la subida solo crea: no reemplaza el video guardado.
  const replace = await fetch(toLocal(attempt2.overlay_upload_url!), {method: "PUT", body: Buffer.from("bytes de otro video"), headers: {"content-type": "video/mp4", "x-upsert": "false"}});
  const replaceBody = (await replace.json().catch(() => ({}))) as {statusCode?: string; error?: string};
  assert.ok(!replace.ok, `la subida repetida debe rechazarse: HTTP ${replace.status}`);
  const after = (await call(dock, tokenA, `/meta/dockmind/jobs/${job4}`)).body.data;
  assert.deepEqual([after.attempt, after.overlayStatus, after.delivery.status, after.delivery.observationId], [2, "VERIFIED", "DELIVERED", run4.view.delivery.observationId]);
  assert.equal(await playback(), before);
  const observed4 = (await sessionObservations()).filter((o) => o.jobId === job4);
  assert.deepEqual(observed4.map((o) => o.attempt), [2]);
  evidence.lateAttempt = {
    jobId: job4, attempt1Receipt: late, attempt2Receipt: run4.receipt, overlayStatus: after.overlayStatus, observationId: after.delivery.observationId,
    repeatedUpload: {httpStatus: replace.status, statusCode: replaceBody.statusCode ?? null, error: replaceBody.error ?? null},
    playbackSha256: {before, after: before},
  };
  checks.push("Prueba obligatoria: el intento 1 tardío subió a su propia ruta y su callback fue STALE_ATTEMPT; el video y la observación del intento 2 se conservan");

  const observations = await sessionObservations();
  evidence.sessionObservations = observations.map((o) => ({id: o.id, jobId: o.jobId, net: o.net, source: o.source, realInference: o.realInference}));
  const out = resolve("..", "docs", "meta", "evidence", "dockmind-local-e2e");
  mkdirSync(out, {recursive: true});
  writeFileSync(join(out, "recorrido-local.json"), `${JSON.stringify({
    ranAt: new Date().toISOString(), scope: "Supabase local del perfil V2 (127.0.0.1:58321) y rutas Hono en proceso; sin Modal, SAM ni base alojada",
    segmenter: "FIXTURE del clip SYNTHETIC_RENDER sintetico_todas (6 cruces); no es inferencia real", checks, ...evidence,
  }, null, 2)}\n`);
  bridge.close();
  console.log(checks.map((check, index) => `${index + 1}. ${check}`).join("\n"));
  console.log(`Evidencia: ${join(out, "recorrido-local.json")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Recorrido fallido");
  process.exit(1);
});
