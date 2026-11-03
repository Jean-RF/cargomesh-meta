import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DockMindJobSchema, DockMindLoopbackJobSchema, DockMindResultSchema} from "./dockmind";

// Fixtures exportados por el worker real (cargomesh/dockmind-worker/scripts/export_contract_fixtures.py):
// clip SYNTHETIC_RENDER y segmentador FIXTURE, nunca inferencia real.
const fixture = (name: string): unknown => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));

test("el job de ejemplo cumple dockmind.job.v2", () => {
  assert.equal(DockMindJobSchema.safeParse(fixture("dockmind-job.json")).success, true);
});

test("el job del lanzador local solo admite http://127.0.0.1 y el de Modal solo https", () => {
  const job = fixture("dockmind-job.json") as Record<string, unknown>;
  const local = {
    ...job,
    clip_url: "http://127.0.0.1:64321/storage/v1/object/sign/meta-dockmind/clip.mp4?token=x",
    overlay_upload_url: "http://127.0.0.1:64321/storage/v1/object/upload/sign/meta-dockmind/a1-overlay.mp4?token=y",
    callback_url: "http://127.0.0.1:8080/api/v2/meta/dockmind/callback",
  };
  assert.equal(DockMindLoopbackJobSchema.safeParse(local).success, true);
  assert.equal(DockMindJobSchema.safeParse(local).success, false);
  assert.equal(DockMindLoopbackJobSchema.safeParse(job).success, false);
  for (const url of ["http://localhost:8080/api", "http://127.0.0.1.example.com:80/x", "http://10.0.0.5:8080/x"]) {
    assert.equal(DockMindLoopbackJobSchema.safeParse({...local, callback_url: url}).success, false, url);
  }
  assert.equal(DockMindLoopbackJobSchema.safeParse({...local, extra: true}).success, false);
});

test("el resultado con oclusión queda en revisión y no inventa el cruce tapado", () => {
  const result = DockMindResultSchema.parse(fixture("dockmind-result.requires-review.json"));
  assert.equal(result.status, "SUCCEEDED");
  assert.equal(result.observation?.result.status, "REQUIRES_REVIEW");
  assert.equal(result.observation?.result.net, 3);
  assert.equal(result.observation?.segmentation.real_inference, false);
  assert.ok(result.observation?.result.flags.some((flag) => flag.kind === "ID_SWITCH_SUSPECTED"));
});

test("el resultado fallido trae un código estable y ninguna observación", () => {
  const result = DockMindResultSchema.parse(fixture("dockmind-result.failed.json"));
  assert.equal(result.status, "FAILED");
  assert.equal(result.error?.code, "PROVIDER_UNAVAILABLE");
  assert.equal(result.observation, null);
});

test("se rechazan resultados incoherentes", () => {
  const ok = fixture("dockmind-result.requires-review.json") as Record<string, any>;
  const clone = () => structuredClone(ok);

  const withoutObservation = {...clone(), observation: null};
  assert.equal(DockMindResultSchema.safeParse(withoutObservation).success, false);

  const fakeInference = clone();
  fakeInference.observation.segmentation.real_inference = true;
  assert.equal(DockMindResultSchema.safeParse(fakeInference).success, false);

  const badNet = clone();
  badNet.observation.result.net = 99;
  assert.equal(DockMindResultSchema.safeParse(badNet).success, false);

  const okWithFlags = clone();
  okWithFlags.observation.result.status = "OK";
  assert.equal(DockMindResultSchema.safeParse(okWithFlags).success, false);

  const roiOutsideFrame = clone();
  roiOutsideFrame.observation.clip.roi = {x: 0.5, y: 0.27, width: 1.4, height: 0.48};
  assert.equal(DockMindResultSchema.safeParse(roiOutsideFrame).success, false);
});

test("la ventana alrededor de la línea viaja en fracciones del cuadro original", () => {
  const withRoi = structuredClone(fixture("dockmind-result.requires-review.json")) as Record<string, any>;
  withRoi.observation.clip.roi = {x: 0.5016, y: 0.2667, width: 0.3953, height: 0.4833};
  assert.equal(DockMindResultSchema.safeParse(withRoi).success, true);
});

test("se rechazan jobs con URLs no https o unidades desconocidas", () => {
  const job = fixture("dockmind-job.json") as Record<string, any>;
  assert.equal(DockMindJobSchema.safeParse({...job, callback_url: "http://app.example.test/cb"}).success, false);
  assert.equal(DockMindJobSchema.safeParse({...job, config: {...job.config, unit: "CAJA"}}).success, false);
  assert.equal(DockMindJobSchema.safeParse({...job, extra: true}).success, false);
});
