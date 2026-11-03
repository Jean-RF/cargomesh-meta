import test from "node:test";
import assert from "node:assert/strict";
import type {AnalysisJobView} from "@/server/modules/analysis-jobs/view";
import {flagLabel, formatSeconds, shouldPoll, sourceNotices, statusLabel} from "./job-status-model";
import {CENTER_DRAFT, EMPTY_DRAFT, addClick, nextStep, toFraction, validateDraft} from "./line-model";

const es = (spanish: string) => spanish;

test("los clics van extremo, extremo, adentro y un cuarto clic empieza otra línea", () => {
  let draft = EMPTY_DRAFT;
  for (const point of [{x: 0.5, y: 0.1}, {x: 0.5, y: 0.9}, {x: 0.8, y: 0.5}]) draft = addClick(draft, point);
  assert.equal(nextStep(draft), "done");
  const restarted = addClick(draft, {x: 0.2, y: 0.2});
  assert.deepEqual(restarted, {start: {x: 0.2, y: 0.2}, end: null, inside: null});
});

test("el clic se convierte a fracciones del cuadro y se recorta a sus bordes", () => {
  const rect = {left: 100, top: 50, width: 800, height: 450};
  assert.deepEqual(toFraction(500, 275, rect), {x: 0.5, y: 0.5});
  assert.deepEqual(toFraction(2000, -10, rect), {x: 1, y: 0});
});

test("una línea válida cumple el contrato del job", () => {
  const check = validateDraft(CENTER_DRAFT, 16 / 9);
  assert.equal(check.ok, true);
  if (check.ok) assert.deepEqual(check.line, {x1: 0.5, y1: 0.05, x2: 0.5, y2: 0.95, inside_x: 0.8, inside_y: 0.5});
});

test("se rechazan líneas incompletas, muy cortas o con el adentro sobre la línea", () => {
  assert.deepEqual(validateDraft({...CENTER_DRAFT, inside: null}, 16 / 9), {ok: false, reason: "INCOMPLETE"});
  assert.deepEqual(validateDraft({start: {x: 0.5, y: 0.5}, end: {x: 0.51, y: 0.51}, inside: {x: 0.9, y: 0.5}}, 16 / 9), {ok: false, reason: "LINE_TOO_SHORT"});
  assert.deepEqual(validateDraft({...CENTER_DRAFT, inside: {x: 0.505, y: 0.4}}, 16 / 9), {ok: false, reason: "INSIDE_ON_LINE"});
});

const view = (overrides: Partial<AnalysisJobView>): AnalysisJobView => ({
  jobId: "job-1", sessionId: "ses-1", evidenceId: "ev-1", manifestRevision: 2, groupId: "grp-cajas", coverage: "PARTIAL",
  attempt: 1, status: "SUCCEEDED",
  retryable: false, createdAt: "2026-10-30T05:00:00Z", updatedAt: "2026-10-30T05:00:40Z", error: null,
  delivery: {status: "DELIVERED", tries: 1, error: null, observationId: "obs-1", deliveredAt: "2026-10-30T05:00:41Z"},
  overlayStatus: "VERIFIED",
  result: {
    unit: "BOX", observationStatus: "REQUIRES_REVIEW", entries: 3, exits: 0, net: 3, events: [],
    flags: [{kind: "ID_SWITCH_SUSPECTED", seconds: 5.8, detail: "x"}], clipSource: "SYNTHETIC_RENDER",
    realInference: false, overlayUploaded: true, analysisVersion: "dockmind-0.1.0",
  },
  ...overrides,
});

test("se consulta mientras el job está en cola o en curso y se detiene al terminar", () => {
  assert.equal(shouldPoll(null), true);
  assert.equal(shouldPoll({status: "RUNNING"}), true);
  assert.equal(shouldPoll({status: "SUCCEEDED"}), false);
  assert.equal(shouldPoll({status: "FAILED"}), false);
});

test("los segundos se muestran como minutos y décimas", () => {
  assert.equal(formatSeconds(5.8), "0:05.8");
  assert.equal(formatSeconds(75), "1:15.0");
});

test("el estado y las marcas se explican en lenguaje del operador", () => {
  assert.equal(statusLabel(view({}), es), "Requiere revisión");
  assert.equal(statusLabel(view({status: "QUEUED", result: null, error: {code: "PROVIDER_UNAVAILABLE", message: "x"}}), es), "En cola: el worker no respondió");
  assert.equal(flagLabel("ID_SWITCH_SUSPECTED", es), "Posible cambio de identidad junto a la línea");
});

test("un render o un fixture nunca se presentan como cámara o inferencia real", () => {
  assert.deepEqual(sourceNotices(view({}), es), ["Clip sintético, no es una cámara real", "Resultado de prueba: no es inferencia real de SAM"]);
  const real = view({});
  real.result = {...real.result!, clipSource: "OWN_CAPTURE", realInference: true};
  assert.deepEqual(sourceNotices(real, es), []);
});
