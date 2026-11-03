import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  createSupabaseAnalysisJobLedger, createSupabaseAnalysisJobRepository, createSupabaseClipRepository, type DockMindRpcClient,
} from "./supabase-repositories";
import {ACTOR, GROUP, ORG, SESSION, code} from "./test-support";

const OBSERVATION = (JSON.parse(readFileSync(
  new URL("../../../shared/schemas/meta/fixtures/dockmind-result.requires-review.json", import.meta.url), "utf8",
)) as {observation: unknown}).observation;
const CLIP = "00000000-0000-4000-8000-00000000c001";
const JOB = "00000000-0000-4000-8000-00000000d001";
// Forma exacta de private.meta_dockmind_*_record: Postgres devuelve microsegundos y +00:00.
const clipRow = {
  clipId: CLIP, organizationId: ORG, sessionId: SESSION, source: "OWN_CAPTURE", mimeType: "video/mp4", sizeBytes: 10, sha256: "c".repeat(64),
  state: "READY", container: "MP4", rejection: null, storagePath: `org/${ORG}/${SESSION}/${CLIP}.mp4`, createdBy: ACTOR.memberId,
  createdAt: "2026-10-31T05:00:00.123456+00:00", updatedAt: "2026-10-31T05:00:01.5+00:00", readyAt: "2026-10-31T05:00:01.5+00:00",
};
const jobRow = {
  jobId: JOB, organizationId: ORG, sessionId: SESSION, evidenceId: CLIP, manifestRevision: 2, groupId: GROUP, coverage: "PARTIAL",
  source: "OWN_CAPTURE", clipSha256: "c".repeat(64), dedupeKey: "d".repeat(64), attempt: 1, status: "SUCCEEDED", workerCallId: "fc-1", error: null,
  config: {line: {x1: 0.5, y1: 0, x2: 0.5, y2: 1, inside_x: 0.8, inside_y: 0.5}, unit: "BOX", concept: "cardboard box", margin: 0.01, min_track_frames: 3},
  observation: OBSERVATION, overlayPath: `org/${ORG}/${SESSION}/${CLIP}-${JOB}-a1-overlay.mp4`,
  overlay: {status: "VERIFIED", sha256: "7".repeat(64)},
  delivery: {status: "PENDING", tries: 0, error: null, observationId: null, deliveredAt: null},
  createdBy: ACTOR.memberId, createdAt: "2026-10-31T05:00:00+00:00", updatedAt: "2026-10-31T05:00:30+00:00",
  dispatchedAt: "2026-10-31T05:00:01+00:00", completedAt: "2026-10-31T05:00:30+00:00",
};

function client(reply: {data?: unknown; error?: {code?: string; message: string}}) {
  const calls: {name: string; args: Record<string, unknown>}[] = [];
  const db: DockMindRpcClient = {
    rpc: async (name, args) => {
      calls.push({name, args});
      return {data: reply.data ?? null, error: reply.error ?? null};
    },
  };
  return {db, calls};
}

test("el miembro llama a meta_dockmind_v1 con su organización, membresía, acción y clave", async () => {
  const {db, calls} = client({data: {record: clipRow, replay: false}});
  const saved = await createSupabaseClipRepository(db, ACTOR).register(
    {sessionId: SESSION, source: "OWN_CAPTURE", mimeType: "video/mp4", sizeBytes: 10, sha256: "c".repeat(64)}, "00000000-0000-4000-8000-000000000099",
  );
  assert.deepEqual(calls[0], {name: "meta_dockmind_v1", args: {
    p_organization_id: ORG, p_member_id: ACTOR.memberId, p_action: "register_clip",
    p_value: {sessionId: SESSION, source: "OWN_CAPTURE", mimeType: "video/mp4", sizeBytes: 10, sha256: "c".repeat(64)}, p_key: "00000000-0000-4000-8000-000000000099",
  }});
  assert.equal("createdBy" in saved.record, false);
  assert.equal(saved.record.readyAt, "2026-10-31T05:00:01.5+00:00");
});

test("el job viaja con el clip como evidencia y vuelve con su entrega", async () => {
  const {db, calls} = client({data: {record: jobRow, created: true}});
  const {record} = await createSupabaseAnalysisJobRepository(db, ACTOR).create({
    sessionId: SESSION, evidenceId: CLIP, manifestRevision: 2, groupId: GROUP, coverage: "PARTIAL", config: jobRow.config as never,
  });
  assert.deepEqual(calls[0].args.p_value, {sessionId: SESSION, clipId: CLIP, groupId: GROUP, coverage: "PARTIAL", manifestRevision: 2, config: jobRow.config});
  assert.equal(record.delivery.status, "PENDING");
});

test("el servidor usa meta_dockmind_server_v1 para el resultado y la entrega", async () => {
  const completed = client({data: {record: jobRow, outcome: "RECORDED"}});
  await createSupabaseAnalysisJobLedger(() => completed.db).complete({
    jobId: JOB, attempt: 1, organizationId: ORG, sessionId: SESSION, evidenceId: CLIP, groupId: GROUP, manifestRevision: 2,
    status: "SUCCEEDED", error: null, observation: OBSERVATION as never, overlay: {status: "VERIFIED", sha256: "7".repeat(64)},
  });
  assert.deepEqual((completed.calls[0].args.p_value as {overlay: unknown}).overlay, {status: "VERIFIED", sha256: "7".repeat(64)});
  assert.equal(completed.calls[0].name, "meta_dockmind_server_v1");
  assert.equal(completed.calls[0].args.p_action, "complete_job");
  assert.equal((completed.calls[0].args.p_value as {id: string}).id, JOB);

  const delivered = client({data: {record: {...jobRow, delivery: {status: "DELIVERED", tries: 1, error: null, observationId: CLIP, deliveredAt: jobRow.updatedAt}}, applied: true}});
  const result = await createSupabaseAnalysisJobLedger(() => delivered.db).recordDelivery(JOB, 1, {outcome: "DELIVERED", observationId: CLIP});
  assert.deepEqual(delivered.calls[0].args, {p_action: "record_delivery", p_value: {id: JOB, attempt: 1, outcome: "DELIVERED", observationId: CLIP}});
  assert.equal(result.applied, true);
});

test("los códigos de la base llegan como errores de dominio; lo desconocido no se filtra", async () => {
  const repo = (error: {code?: string; message: string}) => createSupabaseClipRepository(client({error}).db, ACTOR);
  await assert.rejects(repo({code: "PT409", message: "IDEMPOTENCY_CONFLICT"}).get(CLIP), (e: any) => e.code === "IDEMPOTENCY_CONFLICT" && e.httpStatus === 409);
  await assert.rejects(repo({code: "PT403", message: "FORBIDDEN_WORKFLOW"}).get(CLIP), (e: any) => e.httpStatus === 403);
  await assert.rejects(repo({code: "PGRST202", message: "Could not find the function"}).get(CLIP), code("DOCKMIND_NOT_INSTALLED"));
  await assert.rejects(repo({code: "PT400", message: "invalid input syntax"}).get(CLIP), code("DOCKMIND_COMMAND_FAILED"));
  await assert.rejects(repo({code: "XX000", message: "secret detail"}).get(CLIP), (e: any) => e.message === "DOCKMIND_DATABASE_ERROR");
});
