import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { z } from "zod";
import { randomUUID, webcrypto } from "node:crypto";
import * as schemas from "@/shared/schemas/meta/passport-explanation";
import * as model from "@/shared/meta/loading-operation";
import { renderGroundedExplanation } from "@/shared/schemas/meta/explanation-plan";
import { loadingPassportFixture } from "@/shared/schemas/meta/loading-operation.fixtures";
import type { usePassportExplanations } from "./use-passport-explanations";

function deferred<T>() { let resolve!: (v: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
const p = loadingPassportFixture(), groupId = p.source.session.groups[0].id, facts = model.loadingExplanationFacts(p, groupId);
const value = renderGroundedExplanation(facts, { schemaVersion: "1.0", reconciliationId: facts.reconciliationId, reconciliationVersion: facts.reconciliationVersion,
  comparisonStatus: facts.comparisonStatus, summaryFact: "COMPARATOR_DIFFERENCE", reasonFacts: ["SESSION_CLOSED"], suggestedActions: ["REQUEST_HUMAN_REVIEW"], evidenceRefs: [], requiresHumanReview: true }, "es");
const attempt = (state: "SAVED" | "RUNNING" | "GENERATED" | "FAILED" = "SAVED") => ({
  id: randomUUID(), groupId, state, language: "es" as const, createdAt: new Date().toISOString(), completedAt: null,
  errorCode: state === "FAILED" ? "GENERATION_INTERRUPTED" as const : null, processingMayHaveOccurred: state === "FAILED", metadata: null,
});
function result(a = attempt()) {
  return schemas.PassportExplanationReplySchema.parse({ schemaVersion: "1.0", data: { sessionId: p.sessionId, passportId: p.id, groupId,
    status: a.state === "SAVED" ? "SAVED" : a.state === "FAILED" ? "FAILED" : "IN_PROGRESS", attempt: a, explanation: a.state === "SAVED" ? value : null, guidance: null }, meta: { idempotentReplay: false } });
}
function setup(options: { generate?: (body: any, key: string) => Promise<any>; list?: () => Promise<any[]>; onSaved?: () => Promise<void>; storage?: Map<string, string>; canOperate?: boolean; current?: boolean } = {}) {
  let cursor = 0, changed = false, onSavedCalls = 0;
  const slots: any[] = [], effects: Array<() => void> = [], calls: Array<{ body: any; key: string }> = [];
  const same = (a: any[], b: any[]) => a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
  const hooks = {
    useRef(initial: any) { const i = cursor++; return slots[i] ?? (slots[i] = { current: initial }); },
    useState(initial: any) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (next: any) => { const v = typeof next === "function" ? next(slots[i]) : next; if (!Object.is(v, slots[i])) { slots[i] = v; changed = true; } }]; },
    useCallback(fn: any, deps: any[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, fn }; return slots[i].fn; },
    useEffect(fn: any, deps: any[]) { const i = cursor++, prior = slots[i]; if (!prior || !same(prior.deps, deps)) { const entry = { deps, cleanup: prior?.cleanup }; slots[i] = entry; effects.push(() => { entry.cleanup?.(); entry.cleanup = fn(); }); } },
  };
  const exports = {} as { usePassportExplanations: typeof usePassportExplanations };
  const passport = { data: { ...model.loadingPassport(p), explanations: [] }, meta: { currentSessionVersion: p.sessionVersion, manifestCurrent: true, isCurrent: options.current ?? true } };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./use-passport-explanations.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, crypto: { randomUUID, subtle: webcrypto.subtle }, AbortController, AbortSignal, setTimeout, clearTimeout,
    window: { sessionStorage: { getItem: (key: string) => options.storage?.get(key) ?? null, setItem: (key: string, v: string) => options.storage?.set(key, v), removeItem: (key: string) => options.storage?.delete(key) } },
    require(name: string) {
      if (name === "react") return hooks; if (name === "zod") return { z };
      if (name.includes("schemas/meta/passport-explanation")) return schemas;
      if (name.includes("shared/meta/loading-operation")) return model;
      if (name === "./operation-api") return { loadingErrorMessage: () => "network error", loadingApi: {
        explanationAttempts: async () => options.list?.() ?? [],
        explain: async (_sid: string, _pid: string, body: any, key: string) => { calls.push({ body, key }); return options.generate?.(body, key) ?? result(); },
      } };
      throw Error(name);
    },
  });
  let state!: ReturnType<typeof usePassportExplanations>;
  function render() { for (let i = 0; i < 35; i++) { cursor = 0; changed = false; state = exports.usePassportExplanations(passport, options.canOperate ?? true, async () => { onSavedCalls++; await options.onSaved?.(); }); while (effects.length) effects.shift()!(); if (!changed) return; } throw Error("unstable hook"); }
  async function settle() { for (let i = 0; i < 5; i++) { await new Promise(setImmediate); render(); } }
  render();
  return { get state() { return state; }, calls, settle, render, savedCalls: () => onSavedCalls, unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}
test("a lost generation response retries the same payload/key and then adopts the saved explanation", async () => {
  let count = 0;
  const app = setup({ storage: new Map(), generate: async () => { if (++count === 1) throw Error("lost"); return result(); } });
  await app.settle(); await app.state.generate(groupId, "es"); await app.settle();
  await app.state.generate(groupId, "en"); await app.settle();
  assert.equal(app.calls.length, 2); assert.deepEqual(app.calls[0], app.calls[1]);
  assert.equal(app.state.saved[groupId].summary, value.summary); assert.equal(app.savedCalls(), 1); app.unmount();
});
test("remount recovers the operation key from session storage", async () => {
  const storage = new Map<string, string>(), first = setup({ storage, generate: async () => { throw Error("lost"); } });
  await first.settle(); await first.state.generate(groupId, "es"); const original = first.calls[0]; first.unmount();
  const second = setup({ storage }); await second.settle(); await second.state.generate(groupId, "es");
  assert.deepEqual(JSON.parse(JSON.stringify(second.calls[0])), JSON.parse(JSON.stringify(original))); second.unmount();
});
test("double clicks share one request and late results do not update an unmounted Passport", async () => {
  const delayed = deferred<any>(), app = setup({ generate: async () => delayed.promise });
  await app.settle(); const first = app.state.generate(groupId, "es"); await app.state.generate(groupId, "es");
  assert.equal(app.calls.length, 1); app.unmount(); delayed.resolve(result()); await first;
  assert.equal(app.savedCalls(), 0);
});
test("a failed/uncertain attempt requires explicit consent and a new key referring to the old attempt", async () => {
  const failed = attempt("FAILED"), app = setup({ list: async () => [failed] });
  await app.settle(); await app.state.generate(groupId, "es", true, false); assert.equal(app.calls.length, 0);
  await app.state.generate(groupId, "es", true, true); await app.settle();
  assert.equal(app.calls[0].body.retryOf, failed.id); app.unmount();
});
test("read-only membership, historical Passport and unknown group cannot request generation", async () => {
  for (const options of [{ canOperate: false }, { current: false }]) {
    const app = setup(options); await app.settle(); await app.state.generate(groupId, "es"); assert.equal(app.calls.length, 0); app.unmount();
  }
  const app = setup(); await app.settle(); await app.state.generate(randomUUID(), "es"); assert.equal(app.calls.length, 0); app.unmount();
});
test("reading status never invokes generation and adopts a saved result only once", async () => {
  const saved = attempt(), app = setup({ list: async () => [saved] }); await app.settle();
  await app.state.refresh(); await app.settle(); assert.equal(app.calls.length, 0); assert.equal(app.savedCalls(), 1); app.unmount();
});

test("a failed Passport reread can be recovered by checking status without another provider request", async () => {
  const saved = attempt(); let reads = 0;
  const app = setup({ list: async () => [saved], onSaved: async () => { if (++reads === 1) throw Error("read lost"); } });
  await app.settle(); assert.equal(app.savedCalls(), 1); assert.equal(app.state.error, "network error");
  await app.state.refresh(); await app.settle();
  assert.equal(app.savedCalls(), 2); assert.equal(app.state.error, ""); assert.equal(app.calls.length, 0);
  await app.state.refresh(); await app.settle(); assert.equal(app.savedCalls(), 2); app.unmount();
});
