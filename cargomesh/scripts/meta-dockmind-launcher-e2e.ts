/**
 * Prueba de aceptación de DockMind por HTTP real, con el lanzador local del worker (`dockmind serve-local`):
 * job desde la sesión -> despacho con Modal-Key/Modal-Secret -> descarga y subida con URLs firmadas de Storage ->
 * callback firmado -> resultado persistido -> observación de Juan -> video del intento correcto. Después repite el
 * callback, la recuperación y el despacho: ninguno duplica la observación ni vuelve a analizar.
 *
 * A diferencia de meta-dockmind-local-e2e.ts, aquí no se sustituye nada de la app: rutas de createHonoApp, wiring,
 * despachador y Storage reales, con DOCKMIND_WORKER_MODE=LOCAL_LOOPBACK. El worker es el proceso Python del
 * lanzador con el segmentador FIXTURE del clip sintético (sin inferencia real ni costo). Las credenciales se crean
 * en una carpeta temporal fuera del repositorio y se borran al terminar.
 *
 * Uso, desde cargomesh/, con una Supabase local (perfil V2 o la base Meta local) arrancada y su seed sintético:
 *   npx supabase status --workdir ../supabase-v2 -o json > <fuera del repo>/v2-status.json
 *   CARGOMESH_LOCAL_SECRETS_PATH=<ese archivo> node --conditions=react-server --import tsx scripts/meta-dockmind-launcher-e2e.ts
 * Por defecto usa FIXTURE sin coste. --sam --live requiere autorización explícita
 * de gasto, una clave local y limita el launcher a una inferencia del clip sintético generado.
 * DOCKMIND_PYTHON selecciona un venv externo; DOCKMIND_E2E_OUTPUT_DIR separa la evidencia nueva.
 */
import assert from "node:assert/strict";
import {spawn, spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {createServer, type IncomingHttpHeaders} from "node:http";
import {createServer as createNetServer} from "node:net";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {createClient} from "@supabase/supabase-js";

const WORKER = resolve("dockmind-worker");
// Operator-only CLI setting: permits an isolated venv outside the source checkout.
const PYTHON = [process.env.DOCKMIND_PYTHON, join(WORKER, ".venv", "Scripts", "python.exe"), join(WORKER, ".venv", "bin", "python")].find((p):p is string=>Boolean(p&&existsSync(p)));
const ORG_A = "c2300000-0000-4000-8000-000000000001";
const CONFIG = {line: {x1: 0.5, y1: 0, x2: 0.5, y2: 1, inside_x: 0.8, inside_y: 0.5}, unit: "BOX", concept: "cardboard box"};
const LAUNCHER_KEYS = ["DOCKMIND_WORKER_MODE", "DOCKMIND_WORKER_URL", "DOCKMIND_CALLBACK_URL", "DOCKMIND_CALLBACK_SECRET", "MODAL_PROXY_TOKEN_ID", "MODAL_PROXY_TOKEN_SECRET"];

const freePort = () => new Promise<number>((done) => {
  const probe = createNetServer().listen(0, "127.0.0.1", () => {
    const {port} = probe.address() as {port: number};
    probe.close(() => done(port));
  });
});
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

async function main() {
  const realSam = process.argv.includes('--sam');
  assert(!realSam || process.argv.includes('--live'), 'Paid synthetic SAM check requires --sam --live explicitly');
  assert(!realSam || process.env.META_MODEL_API_KEY, 'Local Meta key required for authorized SAM check');
  const statusPath = process.env.CARGOMESH_LOCAL_SECRETS_PATH;
  assert(statusPath, "Pasa el JSON de `supabase status` en CARGOMESH_LOCAL_SECRETS_PATH, fuera del repositorio");
  assert(PYTHON, "Falta el venv del worker en dockmind-worker/.venv");
  const local = JSON.parse(readFileSync(statusPath, "utf8")) as Record<string, string>;
  assert.match(local.API_URL, /^http:\/\/127\.0\.0\.1:\d+$/, "Solo una Supabase local en 127.0.0.1");
  assert.equal(process.env.VERCEL, undefined);
  Object.assign(process.env, {
    NEXT_PUBLIC_SUPABASE_URL: local.API_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
  });
  const {createHonoApp} = await import("../src/server/hono/app");
  const {ConfirmedManifestSchema} = await import("../src/shared/schemas/meta/manifest-commands");
  const {dockmindServerDeps} = await import("../src/server/modules/analysis-jobs/wiring");
  const {buildEvidencePack} = await import("../src/server/modules/analysis-jobs/evidence-pack");

  const seed = readFileSync("../supabase/scenarios/v2-road-baseline/seed.sql", "utf8");
  const password = seed.match(/crypt\('([^']+)'/)?.[1];
  assert(password, "Seed sintético local sin cambios requerido");
  const signIn = async (email: string) => {
    const client = createClient(local.API_URL, local.ANON_KEY, {auth: {persistSession: false, autoRefreshToken: false}});
    const {data, error} = await client.auth.signInWithPassword({email, password});
    assert.ifError(error);
    return data.session!.access_token;
  };
  const token = await signIn("qa-v2-a@cargomesh.test");

  // App real en 127.0.0.1. El puente solo traduce node:http a fetch y guarda los callbacks para repetirlos tal cual.
  const app = createHonoApp();
  const callbacks: {raw: Buffer; headers: IncomingHttpHeaders}[] = [];
  const bridge = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const raw = Buffer.concat(chunks);
    if (req.url === "/api/v2/meta/dockmind/callback") callbacks.push({raw, headers: req.headers});
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) if (typeof value === "string") headers.set(key, value);
    const response = await app.fetch(new Request(`http://127.0.0.1${req.url}`, {method: req.method, headers, body: chunks.length ? new Uint8Array(raw) : undefined}));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  });
  await new Promise<void>((done) => bridge.listen(0, "127.0.0.1", done));
  const appOrigin = `http://127.0.0.1:${(bridge.address() as {port: number}).port}`;

  // Clip sintético con su FIXTURE y archivo privado del lanzador, fuera del repositorio.
  const work = mkdtempSync(join(tmpdir(), "dockmind-launcher-"));
  const childEnv = {NODE_ENV: process.env.NODE_ENV, PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, PYTHONIOENCODING: "utf-8",
    ...(realSam ? {META_MODEL_API_KEY:process.env.META_MODEL_API_KEY,META_SAM_MODEL:'sam-3.1'} : {})};
  const python = (args: string[]) => spawnSync(PYTHON!, ["-m", "dockmind", ...args], {cwd: WORKER, encoding: "utf8", env: childEnv});
  let launcher: ReturnType<typeof spawn> | null = null;
  try {
    const generated = python(["synthetic", "--out", work, "--only", "todas"]);
    assert.equal(generated.status, 0, generated.stderr);
    const clipBytes = readFileSync(join(work, "sintetico_todas.mp4"));
    const settingsFile = join(work, "privado", "dockmind-local.env");
    const created = python(["local-credentials", "--out", settingsFile, "--storage", local.API_URL, "--app", appOrigin, "--port", String(await freePort())]);
    assert.equal(created.status, 0, created.stderr);
    const settings = Object.fromEntries(readFileSync(settingsFile, "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
    for (const name of LAUNCHER_KEYS) process.env[name] = settings[name];

    const segmentArgs = realSam ? ['--segmenter','sam','--paid-calls','1'] : ['--segmenter','fixture','--fixture',join(work,'sintetico_todas.fixture.txt')];
    const child = spawn(PYTHON!, ["-m", "dockmind", "serve-local", "--config", settingsFile, ...segmentArgs], {cwd: WORKER, env: childEnv});
    launcher = child;
    const receipts: Record<string, any>[] = [];
    let banner = "";
    child.stdout.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString("utf8").split("\n")) {
        if (line.startsWith("{")) receipts.push(JSON.parse(line));
        else banner += `${line}\n`;
      }
    });
    let launcherErrors = "";
    child.stderr.on("data", (chunk: Buffer) => (launcherErrors += chunk.toString("utf8")));
    for (let i = 0; i < 100 && !banner.includes("Lanzador local DockMind en"); i += 1) await sleep(100);
    assert.ok(banner.includes(realSam ? 'Segmentador: META_SAM_API' : 'Segmentador: FIXTURE'), 'El lanzador no arrancó con el segmentador solicitado');

    const call = async (path: string, body?: unknown) => {
      const response = await fetch(`${appOrigin}/api/v2${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: {Authorization: `Bearer ${token}`, ...(body === undefined ? {} : {"Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID()})},
        ...(body === undefined ? {} : {body: JSON.stringify(body)}),
      });
      return {status: response.status, body: (await response.json()) as Record<string, any>};
    };
    const checks: string[] = [];

    // 1. Solicitud, manifiesto confirmado y sesión DEMO de Juan.
    const request = await call("/freight/requests", {
      schemaVersion: "2.0", origin: {facilityId: "c2330000-0000-4000-8000-000000000001"}, destination: {facilityId: "c2330000-0000-4000-8000-000000000002"},
      pickupWindow: {startsAt: "2026-11-04T08:00:00Z", endsAt: "2026-11-04T18:00:00Z"}, deliveryWindow: {startsAt: "2026-11-05T08:00:00Z", endsAt: "2026-11-05T20:00:00Z"},
      acceptedModes: ["ROAD"], requiredEquipment: null,
      cargoSpecification: {categoryCode: "GENERAL", description: "[SYNTHETIC] DockMind lanzador local", packaging: "BOX", totalWeightKg: 600, totalVolumeM3: 6, divisible: true, requirements: [],
        units: [{packageType: "Cajas de prueba", quantity: 6, weightPerUnitKg: 100, volumePerUnitM3: 1, dimensionsCm: {length: 100, width: 100, height: 100}, indivisible: true, stackable: false}]},
      contacts: {pickup: {name: "Synthetic sender", phoneE164: "+12025550123"}, recipient: {name: "Synthetic receiver", phoneE164: "+12025550124"}},
    });
    assert.equal(request.status, 201, JSON.stringify(request.body.error));
    const requestId = request.body.data.id;
    const preparation = await call(`/freight/requests/${requestId}/declaration-preparations`, {expectedDraftVersion: 1, expectedManifestRevision: 0});
    assert.equal(preparation.status, 201, JSON.stringify(preparation.body.error));
    const confirmed = await call(`/freight/requests/${requestId}/declared-manifests`,
      {preparationId: preparation.body.data.id, expectedDraftVersion: 1, expectedManifestRevision: 0, contentHash: preparation.body.data.contentHash, confirmed: true});
    assert.equal(confirmed.status, 201, JSON.stringify(confirmed.body.error));
    const manifest = ConfirmedManifestSchema.parse(confirmed.body.data);
    const opened = await call("/meta/loading-sessions", {
      requestId, facilityId: "c2330000-0000-4000-8000-000000000001", manifestId: manifest.id, manifestRevision: manifest.revision, mode: "DEMO",
      groups: manifest.declaration.groupBindings.map((g: {groupId: string}) => ({groupId: g.groupId, unit: "BOX"})),
    });
    assert.equal(opened.status, 201, JSON.stringify(opened.body.error));
    const session = opened.body.data.session as {id: string; groups: {id: string}[]};
    const groupId = session.groups[0].id;
    checks.push("Sesión DEMO de Juan sobre un manifiesto CR-01 confirmado, por HTTP con Bearer");

    // 2. Clip privado READY con subida firmada directa a Storage.
    const clipValue = {sessionId: session.id, source: "SYNTHETIC_RENDER", mimeType: "video/mp4", sizeBytes: clipBytes.byteLength, sha256: sha256(clipBytes)};
    const registered = await call("/meta/dockmind/clips", clipValue);
    assert.equal(registered.status, 201, JSON.stringify(registered.body.error));
    const clipId = registered.body.data.clip.clipId as string;
    const put = await fetch(registered.body.data.upload.url, {method: "PUT", body: clipBytes, headers: {"content-type": "video/mp4", "x-upsert": "false"}});
    assert.ok(put.ok, `subida firmada: HTTP ${put.status}`);
    assert.equal((await call(`/meta/dockmind/clips/${clipId}/complete`, {})).body.data.state, "READY");
    checks.push("Clip privado registrado, subido con URL firmada y verificado READY");

    // 3. El lanzador rechaza a quien no trae las cabeceras de proxy auth.
    const workerUrl = process.env.DOCKMIND_WORKER_URL!;
    const anonymous = await fetch(workerUrl, {method: "POST", headers: {"content-type": "application/json"}, body: "{}"});
    assert.equal(anonymous.status, 401);
    checks.push("El lanzador responde 401 sin Modal-Key/Modal-Secret");

    // 4. Job desde la sesión -> despacho real -> worker -> callback firmado -> resultado persistido -> Juan.
    const createdJob = await call("/meta/dockmind/jobs", {sessionId: session.id, evidenceId: clipId, groupId, coverage: "COMPLETE", config: CONFIG});
    assert.equal(createdJob.status, 201, JSON.stringify(createdJob.body.error));
    const jobId = createdJob.body.data.jobId as string;
    let view: Record<string, any> = {};
    for (let i = 0; i < (realSam ? 300 : 240); i += 1) {
      view = (await call(`/meta/dockmind/jobs/${jobId}`)).body.data;
      if (view.status !== "QUEUED" && view.status !== "RUNNING" && view.delivery.status !== "PENDING") break;
      await sleep(realSam ? 2000 : 250);
    }
    assert.deepEqual([view.status, view.delivery.status, view.overlayStatus, view.attempt], ["SUCCEEDED", "DELIVERED", "VERIFIED", 1], JSON.stringify(view));
    assert.deepEqual([view.result.net, view.result.clipSource, view.result.realInference, view.groupId, view.coverage], [6, "SYNTHETIC_RENDER", realSam, groupId, "COMPLETE"]);
    for (let i = 0; i < 40 && receipts.length === 0; i += 1) await sleep(100);
    assert.equal(receipts.length, 1);
    const [receipt] = receipts;
    assert.deepEqual([receipt.job_id, receipt.attempt, receipt.group_id, receipt.reused, receipt.delivery.delivered], [jobId, 1, groupId, false, true]);
    assert.deepEqual([receipt.provider.segmenter, receipt.provider.real_inference], [realSam ? 'META_SAM_API' : 'FIXTURE', realSam]);
    const observations = async () => ((await call(`/meta/loading-sessions/${session.id}`)).body.data.observations as {id: string; jobId: string; attempt: number}[]).filter((o) => o.jobId === jobId);
    const delivered = await observations();
    assert.deepEqual(delivered.map((o) => o.attempt), [1]);
    checks.push(`Job -> despacho HTTP al lanzador -> Storage -> callback firmado -> SUCCEEDED persistido -> una observación de Juan (neto 6, ${realSam ? 'META_SAM_API' : 'FIXTURE'})`);

    // 5. Video anotado del intento correcto: URL del intento 1 y mismos bytes que declaró el worker.
    const overlay = await call(`/meta/dockmind/jobs/${jobId}/overlay`);
    assert.match(overlay.body.data.url, /-a1-overlay\.mp4\?/);
    const video = new Uint8Array(await (await fetch(overlay.body.data.url)).arrayBuffer());
    assert.equal(sha256(video), receipt.overlay_sha256);
    checks.push("El video que se reproduce es el del intento 1 y su SHA-256 coincide con el que declaró el worker");

    // 6. Callback repetido, recuperación y despacho repetido: sin otra observación ni otro análisis.
    assert.equal(callbacks.length, 1);
    const signed: Record<string, string> = {};
    for (const [key, value] of Object.entries(callbacks[0].headers)) {
      if ((key.startsWith("x-dockmind-") || key === "content-type") && typeof value === "string") signed[key] = value;
    }
    const replay = await fetch(`${appOrigin}/api/v2/meta/dockmind/callback`, {method: "POST", body: new Uint8Array(callbacks[0].raw), headers: signed});
    const replayBody = (await replay.json()) as Record<string, any>;
    assert.deepEqual([replay.status, replayBody.data.accepted, replayBody.data.reason], [202, false, "ALREADY_RECORDED"], JSON.stringify(replayBody));
    // La recuperación solo actúa sobre una entrega PENDING: con la observación ya entregada no vuelve a entregar.
    const recovered = await call(`/meta/dockmind/jobs/${jobId}/delivery`, {expectedAttempt: 1});
    assert.deepEqual([recovered.status, recovered.body.error?.code], [409, "DELIVERY_NOT_PENDING"], JSON.stringify(recovered.body));
    const redispatch = await fetch(workerUrl, {
      method: "POST",
      headers: {"content-type": "application/json", "Modal-Key": process.env.MODAL_PROXY_TOKEN_ID!, "Modal-Secret": process.env.MODAL_PROXY_TOKEN_SECRET!},
      body: JSON.stringify({
        schema: "dockmind.job.v2", job_id: jobId, attempt: 1, organization_id: ORG_A,
        session_id: session.id, evidence_id: clipId, group_id: groupId, manifest_revision: manifest.revision,
        clip_url: `${local.API_URL}/storage/v1/object/sign/meta-dockmind/repetido.mp4?token=x`, callback_url: process.env.DOCKMIND_CALLBACK_URL,
        source: "SYNTHETIC_RENDER", config: CONFIG,
      }),
    });
    assert.deepEqual([redispatch.status, ((await redispatch.json()) as {duplicate: boolean}).duplicate], [200, true]);
    assert.equal((await call(`/meta/dockmind/jobs/${jobId}/retry`, {expectedAttempt: 1})).body.error.code, "ANALYSIS_NOT_RETRYABLE");
    await sleep(1000);
    assert.equal((await observations()).length, 1);
    assert.equal(receipts.length, 1);
    assert.equal(callbacks.length, 2, "el callback del worker y la repetición de esta prueba; ninguno nuevo del worker");
    checks.push("Callback repetido (202 ALREADY_RECORDED), recuperación (409 DELIVERY_NOT_PENDING) y despacho repetido (duplicate): una sola observación y un solo análisis");

    // 7. Paquete de evidencia desde el job persistido y una lectura nueva del video del intento.
    const server = dockmindServerDeps();
    const record = await server.ledger.get(jobId);
    assert(record);
    const pack = buildEvidencePack(record, await server.overlays.inspect(record.overlayPath), new Date());
    assert.deepEqual([pack.label, pack.overlay.verified, pack.clip.sameBytes, pack.providerUsage?.billable], ["SYNTHETIC_OR_FIXTURE", true, true, realSam]);
    checks.push("Paquete de evidencia: identidad, configuración, procedencia, marcas de tiempo y video verificado; rotulado SYNTHETIC_OR_FIXTURE");

    // Explicit synthetic QA coverage, not human verification of physical cargo.
    const beforeSelection = await call(`/meta/loading-sessions/${session.id}`);
    const selected = await call(`/meta/loading-sessions/${session.id}/observation-selections`, {
      expectedVersion: beforeSelection.body.data.session.version, groupId, observationId: delivered[0].id,
      coverage: 'COMPLETE', reason: 'Automated QA of the matching generated synthetic clip; not physical review.',
    });
    assert.equal(selected.status, 200, JSON.stringify(selected.body.error));
    const closed = await call(`/meta/loading-sessions/${session.id}/close`, {expectedVersion:selected.body.data.session.version});
    assert.equal(closed.status, 200, JSON.stringify(closed.body.error));
    assert.equal(closed.body.comparison.rows.find((r:{id:string})=>r.id===groupId).delta, 0);
    const passport = await call(`/meta/loading-sessions/${session.id}/passports`, {expectedVersion:closed.body.data.session.version});
    assert.equal(passport.status, 201, JSON.stringify(passport.body.error));
    const reopened = await call(`/meta/loading-sessions/${session.id}/passports/${passport.body.data.id}`);
    assert.equal(reopened.status, 200);
    assert.equal(reopened.body.data.id, passport.body.data.id);
    assert.equal(reopened.body.data.source.observations[0].realInference, realSam);
    assert.equal(reopened.body.data.comparison.rows.find((r:{id:string})=>r.id===groupId).delta, 0);
    checks.push('Cobertura QA sintética explícita, cierre versionado, diferencia cero y Passport persistido/reabierto; sin explicación pagada');

    const out = process.env.DOCKMIND_E2E_OUTPUT_DIR
      ? resolve(process.env.DOCKMIND_E2E_OUTPUT_DIR)
      : resolve("..", "docs", "meta", "evidence", "dockmind-local-launcher");
    mkdirSync(out, {recursive: true});
    writeFileSync(join(out, "recorrido-lanzador.json"), `${JSON.stringify({
      ranAt: new Date().toISOString(),
      scope: `Supabase local (${local.API_URL}), app createHonoApp en 127.0.0.1 con DOCKMIND_WORKER_MODE=LOCAL_LOOPBACK y lanzador \`dockmind serve-local\`; sin Modal ni base alojada`,
      segmenter: realSam ? 'META_SAM_API real sobre clip SYNTHETIC_RENDER; una llamada autorizada, no captura propia' : 'FIXTURE del clip SYNTHETIC_RENDER sintetico_todas (6 cruces); no es inferencia real ni captura propia',
      checks, receipt, passport:{id:passport.body.data.id,sessionVersion:passport.body.data.sessionVersion}, replay: {status: replay.status, reason: replayBody.data.reason}, evidencePack: pack,
    }, null, 2)}\n`);
    console.log(checks.map((check, index) => `${index + 1}. ${check}`).join("\n"));
    console.log(`Evidencia: ${join(out, "recorrido-lanzador.json")}`);
  } finally {
    launcher?.kill();
    bridge.close();
    rmSync(work, {recursive: true, force: true}); // el archivo con las credenciales del lanzador no queda en disco
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Recorrido fallido");
  process.exit(1);
});
