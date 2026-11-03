import test from "node:test";
import assert from "node:assert/strict";
import {V2DraftError} from "@/server/modules/freight-requests/application/draft-service";
import {DockMindJobSchema, DockMindLoopbackJobSchema} from "@/shared/schemas/meta/dockmind";
import {dockmindCallbackSecretFromEnv, dockmindWorkerSettingsFromEnv} from "./config";
import {buildEvidencePack} from "./evidence-pack";
import {createModalDispatcher} from "./modal-dispatcher";
import type {AnalysisJobDeps} from "./ports";
import {
  listAnalyses, overlayUrl, readAnalysis, receiveWorkerCallback, recoverDelivery, requestAnalysis, retryAnalysis,
} from "./service";
import {ACTOR, CONFIG, GROUP, ORG, OUTSIDER, SESSION, T0, callback, code, mp4, readyClip, resultFor, setup, sha256, type Env} from "./test-support";

async function startJob(env: Env, overrides: Record<string, unknown> = {}) {
  const evidenceId = await readyClip(env);
  const {job} = await requestAnalysis(env.deps(), ACTOR, {sessionId: SESSION, evidenceId, config: CONFIG, ...overrides});
  return env.store.allJobs().find((row) => row.jobId === job.jobId)!;
}

test("crea el job, lo envía una vez al worker con la identidad completa y queda RUNNING", async () => {
  const env = setup();
  const job = await startJob(env, {coverage: "COMPLETE"});
  assert.equal(job.status, "RUNNING");
  assert.equal(env.sent.length, 1);
  const payload = DockMindJobSchema.parse(env.sent[0]);
  assert.deepEqual(
    [payload.organization_id, payload.session_id, payload.evidence_id, payload.group_id, payload.manifest_revision, payload.attempt],
    [job.organizationId, SESSION, job.evidenceId, GROUP, 2, 1],
  );
  assert.equal(payload.source, "OWN_CAPTURE");
  assert.match(payload.clip_url, /ttl=3600$/);
  assert.match(payload.overlay_upload_url ?? "", new RegExp(`${job.jobId}-a1-overlay\\.mp4`));
});

test("el mismo payload canónico devuelve el mismo job sin volver a pagar el análisis", async () => {
  const env = setup();
  const evidenceId = await readyClip(env);
  const first = await requestAnalysis(env.deps(), ACTOR, {sessionId: SESSION, evidenceId, config: CONFIG});
  const again = await requestAnalysis(env.deps(), ACTOR, {sessionId: SESSION, evidenceId, config: {...CONFIG, margin: 0.01, min_track_frames: 3}});
  assert.equal(again.created, false);
  assert.equal(again.job.jobId, first.job.jobId);
  assert.equal(env.sent.length, 1);
  assert.equal(env.sent[0].config.margin, 0.01);
  assert.equal(env.sent[0].config.min_track_frames, 3);
  const otherCoverage = await requestAnalysis(env.deps(), ACTOR, {sessionId: SESSION, evidenceId, coverage: "COMPLETE", config: CONFIG});
  assert.equal(otherCoverage.created, true);
  assert.notEqual(otherCoverage.job.jobId, first.job.jobId);
});

test("sin Modal configurado no se crea el job; un lector no opera", async () => {
  const env = setup({modal: false});
  const evidenceId = await readyClip(env);
  await assert.rejects(requestAnalysis(env.deps(), ACTOR, {sessionId: SESSION, evidenceId, config: CONFIG}), code("NOT_CONFIGURED"));
  assert.equal(env.store.allJobs().length, 0);
  const reader = {...ACTOR, role: "REQUESTER" as const};
  await assert.rejects(requestAnalysis(setup().deps(reader), reader, {sessionId: SESSION, evidenceId, config: CONFIG}), code("FORBIDDEN_WORKFLOW"));
});

test("solo un clip verificado, de la misma sesión abierta y de la unidad del grupo", async () => {
  const env = setup();
  const evidenceId = await readyClip(env);
  await assert.rejects(requestAnalysis(env.deps(), ACTOR, {sessionId: SESSION, evidenceId, config: {...CONFIG, unit: "PALLET"}}), code("INCOMPATIBLE_UNIT"));
  await assert.rejects(requestAnalysis(env.deps(), ACTOR, {sessionId: SESSION, evidenceId: crypto.randomUUID(), config: CONFIG}), code("EVIDENCE_NOT_FOUND"));
  const closed = setup({session: {status: "CLOSED"}});
  await assert.rejects(requestAnalysis(closed.deps(), ACTOR, {sessionId: SESSION, evidenceId, config: CONFIG}), code("SESSION_NOT_OPEN"));
  const twoBoxGroups = setup({session: {groups: [{groupId: GROUP, label: "A", unit: "BOX"}, {groupId: crypto.randomUUID(), label: "B", unit: "BOX"}]}});
  const clip = await readyClip(twoBoxGroups);
  await assert.rejects(requestAnalysis(twoBoxGroups.deps(), ACTOR, {sessionId: SESSION, evidenceId: clip, config: CONFIG}), code("MANIFEST_GROUP_REQUIRED"));
});

test("si el worker no responde el job queda en cola con el motivo y el reintento sale desde el intento visto", async () => {
  const env = setup({dispatchFails: true});
  const job = await startJob(env);
  assert.equal(job.status, "QUEUED");
  assert.equal(job.error?.code, "PROVIDER_UNAVAILABLE");
  const view = await readAnalysis(env.deps(), ACTOR, job.jobId);
  assert.equal(view.retryable, true);
  await assert.rejects(retryAnalysis(env.deps(), ACTOR, job.jobId, {expectedAttempt: 2}), code("STALE_ANALYSIS_JOB"));
  const retried = await retryAnalysis(env.deps(), ACTOR, job.jobId, {expectedAttempt: 1});
  assert.equal(retried.attempt, 2);
});

test("de dos reintentos simultáneos solo uno crea el intento y lo despacha", async () => {
  const env = setup();
  const job = await startJob(env);
  await receiveWorkerCallback(env.server(), callback(resultFor(job, {status: "FAILED", error: {code: "PROVIDER_UNAVAILABLE", message: "x"}, observation: null}), T0).raw,
    callback(resultFor(job, {status: "FAILED", error: {code: "PROVIDER_UNAVAILABLE", message: "x"}, observation: null}), T0).headers);
  const outcomes = await Promise.allSettled([
    retryAnalysis(env.deps(), ACTOR, job.jobId, {expectedAttempt: 1}),
    retryAnalysis(env.deps(), ACTOR, job.jobId, {expectedAttempt: 1}),
  ]);
  assert.deepEqual(outcomes.map((o) => o.status).sort(), ["fulfilled", "rejected"]);
  assert.equal(env.sent.length, 2); // el primer intento y un solo reintento
  assert.equal(env.store.allJobs()[0].attempt, 2);
});

test("un callback que llega antes de que responda el despacho no vuelve el job a RUNNING", async () => {
  const env = setup();
  const evidenceId = await readyClip(env);
  const deps = env.deps();
  const worker = deps.worker();
  deps.worker = () => ({
    dispatch: async (payload) => {
      const job = env.store.allJobs().find((row) => row.jobId === payload.job_id)!;
      const sent = callback(resultFor(job), T0);
      await receiveWorkerCallback(env.server(), sent.raw, sent.headers);
      return worker.dispatch(payload);
    },
  });
  const {job} = await requestAnalysis(deps, ACTOR, {sessionId: SESSION, evidenceId, config: CONFIG});
  assert.equal(job.status, "SUCCEEDED");
  assert.equal(job.delivery.status, "DELIVERED");
});

test("el callback guarda el resultado y entrega la observación a Juan una vez", async () => {
  const env = setup();
  const job = await startJob(env);
  const sent = callback(resultFor(job), T0 + 30_000);
  const outcome = await receiveWorkerCallback(env.server(), sent.raw, sent.headers);
  assert.deepEqual(outcome, {accepted: true, reason: "RECORDED", delivery: "DELIVERED"});
  const saved = env.store.allJobs()[0];
  assert.equal(saved.status, "SUCCEEDED");
  assert.equal(saved.delivery.observationId, [...env.juan.rows.values()][0]);
  const again = await receiveWorkerCallback(env.server(), sent.raw, sent.headers);
  assert.deepEqual(again, {accepted: false, reason: "ALREADY_RECORDED", delivery: "DELIVERED"});
  assert.equal(env.juan.calls, 1, "una entrega ya hecha no se repite");
});

test("caso obligatorio: SUCCEEDED guardado, falla Juan, callback repetido y una sola observación sin nueva inferencia", async () => {
  const env = setup();
  const job = await startJob(env);
  env.juan.failures.push(new Error("LOADING_DATABASE_ERROR"));
  const sent = callback(resultFor(job), T0 + 30_000);

  await assert.rejects(receiveWorkerCallback(env.server(), sent.raw, sent.headers), (error: any) => error.code === "DELIVERY_PENDING" && error.httpStatus === 503);
  const pending = env.store.allJobs()[0];
  assert.equal(pending.status, "SUCCEEDED", "el análisis quedó guardado aunque Juan falló");
  assert.deepEqual([pending.delivery.status, pending.delivery.tries, pending.delivery.error?.code], ["PENDING", 1, "DELIVERY_UNAVAILABLE"]);

  // El worker reenvía porque recibió 503: el resultado ya está guardado, pero la entrega pendiente se reintenta.
  const repeated = await receiveWorkerCallback(env.server(), sent.raw, sent.headers);
  assert.deepEqual(repeated, {accepted: false, reason: "ALREADY_RECORDED", delivery: "DELIVERED"});
  assert.equal(env.juan.rows.size, 1, "observación registrada exactamente una vez");
  assert.equal(env.sent.length, 1, "no se volvió a despachar ni a ejecutar SAM");
  assert.equal(env.store.allJobs()[0].delivery.tries, 2);
});

test("dos callbacks simultáneos guardan un resultado y una observación", async () => {
  const env = setup();
  const job = await startJob(env);
  const sent = callback(resultFor(job), T0 + 30_000);
  const outcomes = await Promise.all([1, 2].map(() => receiveWorkerCallback(env.server(), sent.raw, sent.headers)));
  assert.deepEqual(outcomes.map((o) => o.reason).sort(), ["ALREADY_RECORDED", "RECORDED"]);
  assert.equal(env.juan.rows.size, 1);
  assert.equal(env.store.allJobs()[0].delivery.status, "DELIVERED");
});

test("agotados los reenvíos del worker y reiniciado el servidor, la entrega se recupera sin volver a analizar", async () => {
  const env = setup();
  const job = await startJob(env);
  const sent = callback(resultFor(job), T0 + 30_000);
  env.juan.failures.push(new Error("timeout"), new Error("timeout"), new Error("timeout"));
  for (let i = 0; i < 3; i += 1) {
    await assert.rejects(receiveWorkerCallback(env.server(), sent.raw, sent.headers), code("DELIVERY_PENDING"));
  }
  const before = await readAnalysis(env.deps(), ACTOR, job.jobId);
  assert.deepEqual([before.status, before.delivery.status, before.delivery.tries], ["SUCCEEDED", "PENDING", 3]);

  // Otro proceso del servidor: dependencias nuevas sobre el mismo estado persistido.
  await assert.rejects(recoverDelivery(env.deps(), env.server(), {...ACTOR, role: "REQUESTER"}, job.jobId, {expectedAttempt: 1}), code("FORBIDDEN_WORKFLOW"));
  await assert.rejects(recoverDelivery(env.deps(OUTSIDER), env.server(), OUTSIDER, job.jobId, {expectedAttempt: 1}), code("ANALYSIS_JOB_NOT_FOUND"));
  const recovered = await recoverDelivery(env.deps(), env.server(), ACTOR, job.jobId, {expectedAttempt: 1});
  assert.equal(recovered.delivery.status, "DELIVERED");
  assert.equal(env.juan.rows.size, 1);
  assert.equal(env.sent.length, 1, "la recuperación no despacha al worker");
  await assert.rejects(recoverDelivery(env.deps(), env.server(), ACTOR, job.jobId, {expectedAttempt: 1}), code("DELIVERY_NOT_PENDING"));
});

test("un rechazo de Juan que repetir no arregla queda REJECTED con su código y el worker no reenvía", async () => {
  const env = setup();
  const job = await startJob(env);
  env.juan.failures.push(new V2DraftError("REAL_EVIDENCE_REQUIRED", "Verification needs own capture.", 422));
  const sent = callback(resultFor(job), T0 + 30_000);
  const outcome = await receiveWorkerCallback(env.server(), sent.raw, sent.headers);
  assert.deepEqual(outcome, {accepted: true, reason: "RECORDED", delivery: "REJECTED"});
  assert.equal(env.store.allJobs()[0].delivery.error?.code, "REAL_EVIDENCE_REQUIRED");
  await assert.rejects(recoverDelivery(env.deps(), env.server(), ACTOR, job.jobId, {expectedAttempt: 1}), code("DELIVERY_NOT_PENDING"));
});

test("un análisis fallido no tiene nada que entregar", async () => {
  const env = setup();
  const job = await startJob(env);
  const failed = resultFor(job, {status: "FAILED", error: {code: "MEDIA_INVALID", message: "sin cuadros"}, observation: null});
  const sent = callback(failed, T0 + 30_000);
  assert.deepEqual(await receiveWorkerCallback(env.server(), sent.raw, sent.headers), {accepted: true, reason: "RECORDED", delivery: "NOT_REQUIRED"});
  assert.equal(env.juan.calls, 0);
});

test("la identidad exacta del job se compara antes de guardar nada", async () => {
  const env = setup();
  const job = await startJob(env);
  for (const overrides of [
    {organization_id: "00000000-0000-4000-8000-00000000a002"},
    {session_id: "00000000-0000-4000-8000-00000000b002"},
    {evidence_id: crypto.randomUUID()},
    {group_id: crypto.randomUUID()},
    {manifest_revision: 3},
    {attempt: 2},
  ]) {
    const sent = callback(resultFor(job, overrides), T0);
    await assert.rejects(receiveWorkerCallback(env.server(), sent.raw, sent.headers), code("INPUT_REVISION_MISMATCH"), JSON.stringify(overrides));
  }
  const otherBytes = resultFor(job);
  otherBytes.observation.clip.sha256 = "f".repeat(64);
  const otherConfig = resultFor(job);
  otherConfig.observation.config.margin = 0.05;
  const synthetic = resultFor(job);
  synthetic.observation.clip.source = "SYNTHETIC_RENDER";
  for (const result of [otherBytes, otherConfig, synthetic]) {
    const sent = callback(result, T0);
    await assert.rejects(receiveWorkerCallback(env.server(), sent.raw, sent.headers), code("INPUT_REVISION_MISMATCH"));
  }
  assert.equal(env.store.allJobs()[0].status, "RUNNING");
  assert.equal(env.juan.calls, 0);
});

test("firma inválida o vieja se rechaza; un intento viejo no pisa al nuevo", async () => {
  const env = setup({dispatchFails: true});
  const job = await startJob(env);
  const forged = callback(resultFor(job), T0, "otro-secreto-".repeat(4));
  await assert.rejects(receiveWorkerCallback(env.server(), forged.raw, forged.headers), code("INVALID_SIGNATURE"));
  const old = callback(resultFor(job), T0 - 10 * 60_000);
  await assert.rejects(receiveWorkerCallback(env.server(), old.raw, old.headers), code("INVALID_SIGNATURE"));

  await retryAnalysis(env.deps(), ACTOR, job.jobId, {expectedAttempt: 1});
  const late = callback(resultFor(job), T0);
  assert.deepEqual(await receiveWorkerCallback(env.server(), late.raw, late.headers), {accepted: false, reason: "STALE_ATTEMPT", delivery: "NOT_REQUIRED"});
  assert.equal(env.store.allJobs()[0].status, "QUEUED");
});

test("otra organización no ve, no lista ni reintenta el job", async () => {
  const env = setup();
  const job = await startJob(env);
  await assert.rejects(readAnalysis(env.deps(OUTSIDER), OUTSIDER, job.jobId), code("ANALYSIS_JOB_NOT_FOUND"));
  assert.deepEqual(await listAnalyses(env.deps(OUTSIDER), OUTSIDER, {sessionId: SESSION}), []);
  await assert.rejects(retryAnalysis(env.deps(OUTSIDER), OUTSIDER, job.jobId, {expectedAttempt: 1}), code("ANALYSIS_JOB_NOT_FOUND"));
  assert.equal((await listAnalyses(env.deps(), ACTOR, {sessionId: SESSION})).length, 1);
});

test("configuración: Modal y el callback exigen https y un secreto largo; sin ellas, NOT_CONFIGURED", () => {
  assert.throws(() => dockmindWorkerSettingsFromEnv({}), code("NOT_CONFIGURED"));
  assert.throws(() => dockmindWorkerSettingsFromEnv({
    DOCKMIND_CALLBACK_URL: "http://app.example.test/cb", DOCKMIND_WORKER_URL: "https://w.modal.run", MODAL_PROXY_TOKEN_ID: "wk", MODAL_PROXY_TOKEN_SECRET: "ws",
  }), code("NOT_CONFIGURED"));
  const modal = dockmindWorkerSettingsFromEnv({
    DOCKMIND_CALLBACK_URL: "https://app.example.test/cb", DOCKMIND_WORKER_URL: "https://w.modal.run", MODAL_PROXY_TOKEN_ID: "wk", MODAL_PROXY_TOKEN_SECRET: "ws",
  });
  assert.equal(modal.clipUrlTtlSeconds, 3600);
  assert.equal(modal.workerMode, "MODAL");
  assert.throws(() => dockmindCallbackSecretFromEnv({DOCKMIND_CALLBACK_SECRET: "corto"}), code("NOT_CONFIGURED"));
  assert.throws(() => dockmindCallbackSecretFromEnv({DOCKMIND_CALLBACK_SECRET: "replace-with-new-secret-of-32-characters"}), code("NOT_CONFIGURED"));
  assert.equal(dockmindCallbackSecretFromEnv({DOCKMIND_CALLBACK_SECRET: "x".repeat(32)}), "x".repeat(32));
});

test("configuración LOCAL_LOOPBACK: solo fuera de producción y con Supabase, app y worker en 127.0.0.1", () => {
  const local = {
    DOCKMIND_WORKER_MODE: "LOCAL_LOOPBACK", NODE_ENV: "development", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:64321",
    DOCKMIND_CALLBACK_URL: "http://127.0.0.1:8080/api/v2/meta/dockmind/callback", DOCKMIND_WORKER_URL: "http://127.0.0.1:8765/jobs",
    MODAL_PROXY_TOKEN_ID: "local-wk-1", MODAL_PROXY_TOKEN_SECRET: "local-ws-1",
  };
  assert.equal(dockmindWorkerSettingsFromEnv(local).workerMode, "LOCAL_LOOPBACK");
  assert.throws(() => dockmindWorkerSettingsFromEnv({...local, NODE_ENV: "production"}), code("NOT_CONFIGURED"));
  assert.throws(() => dockmindWorkerSettingsFromEnv({...local, VERCEL: "1"}), code("NOT_CONFIGURED"));
  for (const name of ["DOCKMIND_CALLBACK_URL", "DOCKMIND_WORKER_URL", "NEXT_PUBLIC_SUPABASE_URL"]) {
    for (const url of ["http://localhost:8080/x", "https://ref.supabase.co", "http://10.0.0.5:8080/x"]) {
      assert.throws(() => dockmindWorkerSettingsFromEnv({...local, [name]: url}), code("NOT_CONFIGURED"), `${name}=${url}`);
    }
  }
  // Sin el modo explícito rige Modal, que exige https; un modo desconocido no cae en ninguno de los dos.
  assert.throws(() => dockmindWorkerSettingsFromEnv({...local, DOCKMIND_WORKER_MODE: undefined}), code("NOT_CONFIGURED"));
  assert.throws(() => dockmindWorkerSettingsFromEnv({...local, DOCKMIND_WORKER_MODE: "local"}), code("NOT_CONFIGURED"));
});

test("el job lleva URLs de 127.0.0.1 solo en modo LOCAL_LOOPBACK; en modo MODAL no sale", async () => {
  const env = setup();
  const loopback = (workerMode: "MODAL" | "LOCAL_LOOPBACK"): AnalysisJobDeps => {
    const deps = env.deps();
    return {
      ...deps,
      storage: {
        ...deps.storage,
        signedReadUrl: async (path) => `http://127.0.0.1:64321/storage/v1/object/sign/meta-dockmind/${path}?token=read`,
        signedOverlayUploadUrl: async (path) => `http://127.0.0.1:64321/storage/v1/object/upload/sign/meta-dockmind/${path}?token=up`,
      },
      config: () => ({callbackUrl: "http://127.0.0.1:8080/api/v2/meta/dockmind/callback", clipUrlTtlSeconds: 3600, workerMode}),
    };
  };
  const modalClip = await readyClip(env, mp4("modal"));
  const refused = await requestAnalysis(loopback("MODAL"), ACTOR, {sessionId: SESSION, evidenceId: modalClip, config: CONFIG});
  assert.equal(refused.job.status, "QUEUED");
  assert.equal(env.sent.length, 0);
  const localClip = await readyClip(env, mp4("local"));
  const local = await requestAnalysis(loopback("LOCAL_LOOPBACK"), ACTOR, {sessionId: SESSION, evidenceId: localClip, config: CONFIG});
  assert.equal(local.job.status, "RUNNING");
  assert.equal(env.sent.length, 1);
  const sent = DockMindLoopbackJobSchema.parse(env.sent[0]);
  assert.match(sent.clip_url, /^http:\/\/127\.0\.0\.1:64321\//);
  assert.equal(sent.callback_url, "http://127.0.0.1:8080/api/v2/meta/dockmind/callback");
  assert.throws(() => DockMindJobSchema.parse(env.sent[0]));
});

test("el despachador manda los headers de proxy auth de Modal y no reintenta solo", async () => {
  const seen: RequestInit[] = [];
  const dispatcher = createModalDispatcher({
    url: "https://team--cargomesh-dockmind-jobs.modal.run", tokenId: "wk-1", tokenSecret: "ws-1",
    fetchImpl: async (_url, init) => {
      seen.push(init!);
      return new Response(JSON.stringify({call_id: "fc-1", duplicate: false}), {status: 200});
    },
  });
  const env = setup();
  const job = await startJob(env);
  assert.deepEqual(await dispatcher.dispatch(env.sent[0]), {callId: "fc-1", duplicate: false});
  assert.equal((seen[0].headers as Record<string, string>)["Modal-Key"], "wk-1");
  assert.equal((seen[0].headers as Record<string, string>)["Modal-Secret"], "ws-1");
  assert.equal(seen.length, 1);
  assert.equal(job.attempt, 1);
});

test("el arnés usa un MP4 real para la verificación de formato", () => {
  assert.equal(String.fromCharCode(...mp4().slice(4, 8)), "ftyp");
});

test("prueba obligatoria: un intento 1 tardío no cambia el video ni la observación del intento 2", async () => {
  const env = setup();
  const job = await startJob(env);
  const first = env.sent[0];
  assert.match(first.overlay_upload_url ?? "", /-a1-overlay\.mp4/);

  // El worker 1 no avisa a tiempo: a los 20 minutos el job RUNNING se puede reintentar.
  env.clock.now += 21 * 60_000;
  assert.equal((await retryAnalysis(env.deps(), ACTOR, job.jobId, {expectedAttempt: 1})).attempt, 2);
  const second = env.sent[1];
  assert.match(second.overlay_upload_url ?? "", /-a2-overlay\.mp4/);

  // El intento 2 sube su video anotado y termina.
  const video2 = mp4("video anotado del intento 2");
  assert.equal(env.upload(second.overlay_upload_url!, video2), 200);
  const attempt2 = env.store.allJobs()[0];
  const done = callback(resultFor(attempt2, {}, video2), env.clock.now);
  assert.deepEqual(await receiveWorkerCallback(env.server(), done.raw, done.headers), {accepted: true, reason: "RECORDED", delivery: "DELIVERED"});

  // Llega tarde el worker 1: su URL solo alcanza su propia ruta, y su callback es de un intento viejo.
  const video1 = mp4("video anotado viejo del intento 1");
  assert.equal(env.upload(first.overlay_upload_url!, video1), 200, "la ruta del intento 1 no la reproduce nadie");
  assert.equal(env.upload(second.overlay_upload_url!, video1), 409, "aun con la URL del intento 2, la subida solo crea");
  const late = callback(resultFor(job, {}, video1), env.clock.now);
  assert.deepEqual(await receiveWorkerCallback(env.server(), late.raw, late.headers), {accepted: false, reason: "STALE_ATTEMPT", delivery: "DELIVERED"});

  // Se conservan el video y la observación del intento 2.
  const saved = env.store.allJobs()[0];
  assert.deepEqual([saved.attempt, saved.overlay.status, saved.overlay.sha256], [2, "VERIFIED", sha256(video2)]);
  assert.equal(sha256(env.objects.get(saved.overlayPath)!), sha256(video2));
  assert.match((await overlayUrl(env.deps(), ACTOR, job.jobId)).url, /-a2-overlay\.mp4\?ttl=300$/);
  assert.deepEqual([...env.juan.rows.keys()], [`${ORG}:${job.jobId}:2`]);
  assert.equal(env.juan.received[0].observation?.evidence.overlay_uploaded, true);

  // Repetir el callback del 2 o pedir la recuperación no vuelve a analizar ni duplica la observación.
  assert.equal((await receiveWorkerCallback(env.server(), done.raw, done.headers)).reason, "ALREADY_RECORDED");
  await assert.rejects(recoverDelivery(env.deps(), env.server(), ACTOR, job.jobId, {expectedAttempt: 2}), code("DELIVERY_NOT_PENDING"));
  assert.deepEqual([env.sent.length, env.juan.rows.size, env.juan.calls], [2, 1, 1]);
});

test("el video anotado se verifica en la ruta del intento: ausente o distinto no se reproduce ni se informa a Juan", async () => {
  const env = setup();
  const evidenceId = await readyClip(env);
  const missing = (await requestAnalysis(env.deps(), ACTOR, {sessionId: SESSION, evidenceId, config: CONFIG})).job;
  const mismatch = (await requestAnalysis(env.deps(), ACTOR, {sessionId: SESSION, evidenceId, coverage: "COMPLETE", config: CONFIG})).job;
  const rows = () => env.store.allJobs();
  const claimed = mp4("lo que declara el worker");

  const noObject = callback(resultFor(rows().find((j) => j.jobId === missing.jobId)!, {}, claimed), T0);
  await receiveWorkerCallback(env.server(), noObject.raw, noObject.headers);
  assert.equal(env.upload(env.sent[1].overlay_upload_url!, mp4("otros bytes")), 200);
  const otherBytes = callback(resultFor(rows().find((j) => j.jobId === mismatch.jobId)!, {}, claimed), T0);
  await receiveWorkerCallback(env.server(), otherBytes.raw, otherBytes.headers);

  for (const [jobId, status] of [[missing.jobId, "MISSING"], [mismatch.jobId, "MISMATCH"]] as const) {
    const view = await readAnalysis(env.deps(), ACTOR, jobId);
    assert.deepEqual([view.status, view.overlayStatus, view.result?.overlayUploaded], ["SUCCEEDED", status, false]);
    await assert.rejects(overlayUrl(env.deps(), ACTOR, jobId), code("OVERLAY_NOT_AVAILABLE"));
  }
  assert.deepEqual(env.juan.received.map((j) => j.observation?.evidence.overlay_uploaded), [false, false]);
});

test("paquete de evidencia: identidad, configuración, procedencia y video del intento, sin URLs ni referencia manual", async () => {
  const env = setup();
  const job = await startJob(env, {coverage: "COMPLETE"});
  const video = mp4("video anotado del intento 1");
  assert.equal(env.upload(env.sent[0].overlay_upload_url!, video), 200);
  const done = callback(resultFor(job, {}, video), env.clock.now);
  await receiveWorkerCallback(env.server(), done.raw, done.headers);
  const saved = env.store.allJobs()[0];
  const now = await env.server().overlays.inspect(saved.overlayPath);
  const pack = buildEvidencePack(saved, now, new Date(T0));
  assert.deepEqual(pack.identity, {
    jobId: saved.jobId, attempt: 1, organizationId: ORG, sessionId: SESSION, evidenceId: saved.evidenceId, groupId: GROUP, manifestRevision: 2, coverage: "COMPLETE",
  });
  // El fixture del contrato es FIXTURE: aunque el clip sea propio, no es inferencia real.
  assert.equal(pack.label, "OWN_CAPTURE_WITHOUT_REAL_INFERENCE");
  assert.deepEqual([pack.provenance?.segmenter, pack.provenance?.realInference, pack.providerUsage?.billable], ["FIXTURE", false, false]);
  assert.deepEqual([pack.count?.status, pack.count?.net, pack.count?.reviewFlags.length], ["REQUIRES_REVIEW", 3, 1]);
  assert.equal(pack.clip.sameBytes, true);
  assert.deepEqual([pack.overlay.object?.endsWith("-a1-overlay.mp4"), pack.overlay.status, pack.overlay.verified], [true, "VERIFIED", true]);
  assert.equal(pack.delivery.status, "DELIVERED");
  assert.equal(buildEvidencePack(saved, {sha256: sha256(mp4("otro")), sizeBytes: 1}, new Date(T0)).overlay.verified, false);
  assert.doesNotMatch(JSON.stringify(pack), /https?:|token=|total_esperado/);
});
