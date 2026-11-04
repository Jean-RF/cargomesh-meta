import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as schemas from "@/shared/schemas/meta/declaration-media";
import * as model from "./media-draft-model";
import * as groupScope from './assistant-group-scope';
import {
  EMPTY_PROTOTYPE_DRAFT,
  applyChatFieldsToDraft,
} from "./prototype-model";
import { ROAD_REQUEST_FIXTURE } from "./fixtures/contract-flow.fixture";
import { inspectWave } from "@/server/ai/meta/wave";
import { ModelProposalSchema } from "@/shared/schemas/meta/model-proposal";
import type { useDeclarationMedia } from "./use-declaration-media";

const evidenceId = "d0310000-0000-4000-8000-000000000001";
const item = {
  id: evidenceId,
  kind: "label",
  fileName: "label.png",
  mimeType: "image/png",
  byteSize: 100,
  state: "READY",
};
function proposal(revision: number) {
  return {
    inputRevision: revision,
    requiresHumanConfirmation: true,
    transcripts: [],
    proposal: {
      schemaVersion: "1.0",
      inputRevision: revision,
      status: "PROPOSED",
      refusalReason: null,
      requiresHumanConfirmation: true,
      missingFields: [],
      warnings: ["UNVERIFIED_LABEL"],
      fields: [
        {
          field: "unitQuantity",
          value: 3,
          provenance: {
            source: "label",
            basis: "EXPLICIT",
            quote: "3 BOX",
            evidenceId,
            inputRevision: revision,
          },
        },
        {
          field: "unitWeightKg",
          value: 8,
          provenance: {
            source: "label",
            basis: "EXPLICIT",
            quote: "8 kg",
            evidenceId,
            inputRevision: revision,
          },
        },
      ],
    },
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { resolve, promise };
}

/** Real hook executed with deterministic React effects and deferred HTTP/microphone ports. */
function setup(
  options: {
    analyze?: (body: any) => Promise<unknown>;
    microphone?: () => Promise<unknown>;
    list?: () => Promise<unknown>;
    initialize?: (body: any) => Promise<unknown>;
    finish?: () => Promise<unknown>;
    storage?: Map<string, string>;
    request?: unknown;
  } = {},
) {
  let cursor = 0,
    changed = false,
    draft = structuredClone(EMPTY_PROTOTYPE_DRAFT),
    request: any = options.request ?? null;
  const slots: any[] = [],
    effects: Array<() => void> = [],
    calls: Array<{ action: string; body: any }> = [],
    applied: any[] = [];
  const same = (a: unknown[], b: unknown[]) =>
    a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
  const hooks = {
    useState(initial: unknown) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [
        slots[i],
        (next: any) => {
          const value = typeof next === "function" ? next(slots[i]) : next;
          if (!Object.is(slots[i], value)) {
            slots[i] = value;
            changed = true;
          }
        },
      ];
    },
    useRef(initial: unknown) {
      const i = cursor++;
      return slots[i] ?? (slots[i] = { current: initial });
    },
    useEffect(run: () => unknown, deps: unknown[]) {
      const i = cursor++,
        prior = slots[i];
      if (!prior || !same(prior.deps, deps)) {
        const entry = { deps, cleanup: prior?.cleanup };
        slots[i] = entry;
        effects.push(() => {
          entry.cleanup?.();
          entry.cleanup = run();
        });
      }
    },
  };
  const exports: {
    useDeclarationMedia: typeof useDeclarationMedia;
    recordedWave: (blob: Blob) => Promise<ArrayBuffer>;
  } = {} as never;
  const audioContext = class {
    async decodeAudioData() {
      return { duration: 0.001 };
    }
    async close() {}
  };
  const offlineContext = class {
    destination = {};
    createBufferSource() {
      return { connect() {}, start() {} };
    }
    async startRendering() {
      return { getChannelData: () => new Float32Array([1, -1, 0]) };
    }
  };
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync(
        new URL("./use-declaration-media.ts", import.meta.url),
        "utf8",
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2017,
        },
      },
    ).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === "react") return hooks;
        if (name.includes("schemas/meta/declaration-media")) return schemas;
        if (name === "./media-draft-model") return model;
        if (name === './assistant-group-scope') return groupScope;
        throw Error(name);
      },
      crypto,
      window: { sessionStorage: {
        getItem: (name: string) => options.storage?.get(name) ?? null,
        setItem: (name: string, value: string) => options.storage?.set(name, value),
        removeItem: (name: string) => options.storage?.delete(name),
      } },
      AbortSignal,
      File,
      Blob,
      ArrayBuffer,
      DataView,
      AudioContext: audioContext,
      OfflineAudioContext: offlineContext,
      navigator: {
        mediaDevices: {
          getUserMedia:
            options.microphone ?? (async () => ({ getTracks: () => [] })),
        },
      },
      MediaRecorder: class {},
      setInterval,
      clearInterval,
      fetch: async (path: string, init: any) => {
        if (path === "https://signed.invalid/upload") return { ok: true };
        const action = path.split("/").pop()!,
          body = JSON.parse(init.body);
        calls.push({ action, body });
        const data =
          action === "initialize"
            ? await (options.initialize?.(body) ?? { item: { ...item, state: "PENDING" }, uploadUrl: "https://signed.invalid/upload", replay: false })
            : action === "finish"
              ? await (options.finish?.() ?? item)
              : action === "list"
                ? await (options.list?.() ?? [])
                : action === "analyze"
                  ? await (options.analyze?.(body) ??
                      proposal(body.inputRevision))
                  : {};
        return { ok: true, json: async () => ({ schemaVersion: "1.0", data }) };
      },
    },
  );
  let state!: ReturnType<typeof useDeclarationMedia>;
  function render() {
    for (let i = 0; i < 40; i++) {
      cursor = 0;
      changed = false;
      state = exports.useDeclarationMedia(draft, request, (fields) => {
        applied.push(fields);
        draft = applyChatFieldsToDraft(draft, fields);
      });
      while (effects.length) effects.shift()!();
      if (!changed) return state;
    }
    throw Error("Unstable media hook");
  }
  async function settle() {
    for (let i = 0; i < 4; i++) {
      await new Promise(setImmediate);
      render();
    }
    return state;
  }
  render();
  return {
    render,
    settle,
    calls,
    applied,
    exports,
    change(value: Partial<typeof draft>) {
      draft = { ...draft, ...value };
      render();
    },
    open(value: any) {
      request = value;
      render();
    },
    unmount() {
      for (const entry of slots) entry?.cleanup?.();
    },
    get state() {
      return state;
    },
    get draft() {
      return draft;
    },
  };
}
async function attach(app: ReturnType<typeof setup>) {
  await app.settle();
  await app.state.upload(
    new File(["test"], "label.png", { type: "image/png" }),
    "label",
  );
  await app.settle();
}

test("review is required; selected facts update the existing draft and canonical totals", async () => {
  const app = setup();
  app.change({ unitWeightPerUnitKg: "8", originFacilityId: "keep-origin" });
  await attach(app);
  await app.state.analyze("", "es");
  await app.settle();
  app.state.confirm();
  assert.equal(app.applied.length, 0);
  app.state.setReviewed(true);
  app.render();
  app.state.confirm();
  app.render();
  assert.equal(app.applied.length, 1);
  assert.equal(app.draft.unitQuantity, "3");
  assert.equal(app.draft.totalWeightKg, "24");
  assert.equal(app.draft.originFacilityId, "keep-origin");
  assert.equal(app.state.analysis, null);
});
test("reviewed media cannot silently apply quantity to the first of multiple cargo groups", async () => {
  const app = setup();
  app.change({ unitQuantity: '8', additionalUnits: [{ ...EMPTY_PROTOTYPE_DRAFT, id: 'group-1', unitQuantity: '4' }] });
  await attach(app);
  await app.state.analyze('', 'es');
  await app.settle();
  app.state.setReviewed(true);
  app.render();
  const before = JSON.stringify(app.draft);
  app.state.confirm();
  app.render();
  assert.equal(app.applied.length, 0);
  assert.equal(JSON.stringify(app.draft), before);
  assert.match(app.state.error, /varios grupos/i);
});

test("unchecked proposed fields preserve the manual value", async () => {
  const app = setup();
  app.change({ unitWeightPerUnitKg: "12" });
  await attach(app);
  await app.state.analyze("", "es");
  await app.settle();
  app.state.setSelected(new Set(["unitQuantity"]));
  app.state.setReviewed(true);
  app.render();
  app.state.confirm();
  app.render();
  assert.equal(app.draft.unitWeightPerUnitKg, "12");
  assert.equal(app.draft.totalWeightKg, "36");
});
test("manual correction during inference discards its late proposal", async () => {
  const late = deferred<unknown>(),
    app = setup({ analyze: () => late.promise });
  await attach(app);
  const pending = app.state.analyze("", "es");
  app.render();
  app.change({ unitQuantity: "7" });
  late.resolve(
    proposal(app.calls.find((c) => c.action === "analyze")!.body.inputRevision),
  );
  await pending;
  await app.settle();
  assert.equal(app.state.analysis, null);
  assert.equal(app.draft.unitQuantity, "7");
  assert.equal(app.applied.length, 0);
});
test("reset cannot resurrect an in-flight proposal or its attachments", async () => {
  const late = deferred<unknown>(),
    app = setup({ analyze: () => late.promise });
  await attach(app);
  const pending = app.state.analyze("", "es");
  app.render();
  app.state.reset();
  app.render();
  late.resolve(
    proposal(app.calls.find((c) => c.action === "analyze")!.body.inputRevision),
  );
  await pending;
  await app.settle();
  assert.equal(app.state.analysis, null);
  assert.equal(app.state.items.length, 0);
  assert.equal(app.applied.length, 0);
});
test("first native save binds media; opening another request uses a new draft scope", async () => {
  const app = setup();
  await attach(app);
  const originalKey = app.calls.find((c) => c.action === "initialize")!.body
    .draftKey;
  app.open(ROAD_REQUEST_FIXTURE);
  await app.settle();
  assert.equal(
    app.calls.find((c) => c.action === "bind")!.body.draftKey,
    originalKey,
  );
  app.open({
    ...ROAD_REQUEST_FIXTURE,
    id: "d0310000-0000-4000-8000-000000000002",
  });
  await app.settle();
  const binds = app.calls.filter((c) => c.action === "bind");
  assert.notEqual(binds.at(-1)!.body.draftKey, originalKey);
  assert.equal(app.state.items.length, 0);
});
test("closing recording before microphone permission resolves stops the returned tracks", async () => {
  const mic = deferred<any>();
  let stopped = 0;
  const app = setup({ microphone: () => mic.promise });
  await app.settle();
  const pending = app.state.startRecording();
  app.render();
  app.state.cancelRecording();
  mic.resolve({ getTracks: () => [{ stop: () => stopped++ }] });
  await pending;
  await app.settle();
  assert.equal(stopped, 1);
  assert.equal(app.state.recording, false);
});
test("unmount during pending microphone access releases tracks", async () => {
  const mic = deferred<any>();
  let stopped = 0;
  const app = setup({ microphone: () => mic.promise });
  await app.settle();
  const pending = app.state.startRecording();
  app.unmount();
  mic.resolve({ getTracks: () => [{ stop: () => stopped++ }] });
  await pending;
  assert.equal(stopped, 1);
});
test("unsaved attachments are recovered instead of invisibly occupying the quota", async () => {
  const app = setup({ list: async () => [item] });
  assert.equal(app.state.ensureIdle(), false);
  await app.settle();
  assert.equal(app.state.items[0]?.id, evidenceId);
  assert.equal(app.state.busy, false);
  assert.equal(app.state.ensureIdle(), true);
});
test("saving remains blocked while analysis is in flight", async () => {
  const late = deferred<unknown>(),
    app = setup({ analyze: () => late.promise });
  await attach(app);
  const pending = app.state.analyze("", "es");
  assert.equal(app.state.ensureIdle(), false);
  late.resolve(
    proposal(app.calls.find((c) => c.action === "analyze")!.body.inputRevision),
  );
  await pending;
  await app.settle();
  assert.equal(app.state.ensureIdle(), true);
});
test("recorded browser audio is converted to valid bounded mono PCM16 WAV", async () => {
  const app = setup(),
    wave = await app.exports.recordedWave(new Blob(["fake browser audio"]));
  const facts = inspectWave(new Uint8Array(wave));
  assert.equal(facts?.sampleRate, 16000);
  assert.equal(facts?.channels, 1);
  assert.equal(facts?.bitsPerSample, 16);
  assert.equal(facts?.dataBytes, 6);
});
test("only three reviewed dimensions derive volume; partial dimensions do not invent it", () => {
  const p = proposal(0).proposal;
  p.fields = [];
  const raw = {
    ...p,
    fields: ["unitLengthCm", "unitWidthCm", "unitHeightCm"].map((field, i) => ({
      field,
      value: [40, 30, 20][i],
      provenance: {
        source: "label",
        basis: "EXPLICIT",
        quote: "40 x 30 x 20 cm",
        evidenceId,
        inputRevision: 0,
      },
    })),
  };
  const valid = ModelProposalSchema.parse(raw),
    all = new Set(raw.fields.map((field) => field.field));
  assert.equal(
    model
      .selectedMediaFields(valid, all)
      .find((field) => field.field === "unitVolumePerUnitM3")?.value,
    "0.024",
  );
  all.delete("unitHeightCm");
  assert.ok(
    !model
      .selectedMediaFields(valid, all)
      .some((field) => field.field === "unitVolumePerUnitM3"),
  );
});

for (const kind of ["photo", "audio"] as const) {
  test(`${kind}: lost initialize response retries identical key/payload despite occupied quota`, async () => {
    let attempt = 0;
    const app = setup({
      initialize: async () => {
        if (++attempt === 1) throw Error("response lost after commit");
        return { item: { ...item, kind, state: "PENDING" }, uploadUrl: "https://signed.invalid/upload", replay: true };
      },
      list: async () => attempt ? [{ ...item, kind, state: "PENDING" }] : [],
    });
    await app.settle();
    const file = new File(["same bytes"], kind === "audio" ? "voice.wav" : "cargo.png", { type: kind === "audio" ? "audio/wav" : "image/png" });
    await app.state.upload(file, kind);
    await app.settle();
    assert.equal(app.state.canRetryUpload, true);
    assert.equal(app.state.items.length, 1);
    await app.state.retryUpload();
    await app.settle();
    const calls = app.calls.filter((c) => c.action === "initialize");
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0].body, calls[1].body);
    assert.match(calls[0].body.contentSha256, /^[a-f0-9]{64}$/);
    assert.equal(app.state.canRetryUpload, false);
    assert.equal(app.applied.length, 0);
  });
}
test("reload then reselect same bytes recovers the persisted operation key", async () => {
  const storage = new Map<string, string>();
  const first = setup({ storage, initialize: async () => { throw Error("lost"); } });
  await first.settle();
  const file = new File(["one photo"], "photo.png", { type: "image/png" });
  await first.state.upload(file, "photo");
  const original = first.calls.find((c) => c.action === "initialize")!.body;
  first.unmount();
  const second = setup({ storage });
  await second.settle();
  await second.state.upload(file, "photo");
  assert.deepEqual(second.calls.find((c) => c.action === "initialize")!.body, original);
});
test("READY replay recovers lost finish response without another PUT or finish", async () => {
  let attempt = 0;
  const app = setup({
    initialize: async () => ({ item: { ...item, state: ++attempt === 1 ? "PENDING" : "READY" }, replay: attempt > 1, uploadUrl: attempt === 1 ? "https://signed.invalid/upload" : null }),
    finish: async () => { throw Error("lost finish response"); },
  });
  await app.settle();
  await app.state.upload(new File(["photo"], "photo.png", { type: "image/png" }), "photo");
  await app.settle();
  await app.state.retryUpload();
  await app.settle();
  assert.equal(app.state.items[0]?.state, "READY");
  assert.equal(app.calls.filter((c) => c.action === "finish").length, 1);
  assert.ok(!app.calls.some((c) => c.action === "remove"));
});

test("first native save does not rotate an unresolved upload operation", async () => {
  const storage = new Map<string, string>();
  let attempts = 0;
  const app = setup({ storage, initialize: async () => {
    if (++attempts === 1) throw Error("response lost");
    return { item, uploadUrl: null, replay: true };
  } });
  await app.settle();
  await app.state.upload(new File(["voice"], "voice.wav", { type: "audio/wav" }), "audio");
  await app.settle();
  const original = app.calls.find((c) => c.action === "initialize")!.body;
  app.open(ROAD_REQUEST_FIXTURE);
  await app.settle();
  await app.state.retryUpload();
  await app.settle();
  const replay = app.calls.filter((c) => c.action === "initialize").at(-1)!.body;
  assert.deepEqual(replay, original);
  assert.equal(app.state.items[0]?.id, evidenceId);
});

test("saved request recovery keys remain separate across direct links and reloads", async () => {
  const storage = new Map<string, string>();
  const first = setup({ storage });
  await attach(first);
  const originalKey = first.calls.find((c) => c.action === "initialize")!.body.draftKey;
  first.open(ROAD_REQUEST_FIXTURE);
  await first.settle();
  first.unmount();
  assert.ok(!storage.has("cargomesh-meta-media-draft-key"));
  const other = setup({ storage, request: { ...ROAD_REQUEST_FIXTURE, id: "d0310000-0000-4000-8000-000000000099" } });
  await other.settle();
  assert.notEqual(other.calls.find((c) => c.action === "bind")!.body.draftKey, originalKey);
  other.unmount();
  const reopened = setup({ storage, request: ROAD_REQUEST_FIXTURE });
  await reopened.settle();
  assert.equal(reopened.calls.find((c) => c.action === "bind")!.body.draftKey, originalKey);
  const fresh = setup({ storage });
  await fresh.settle();
  assert.notEqual(fresh.calls.find((c) => c.action === "list")!.body.draftKey, originalKey);
});

test("removing an unrelated photo frees quota without discarding the voice retry", async () => {
  let attempts = 0;
  const photo = { ...item, id: "d0310000-0000-4000-8000-000000000098", kind: "photo", fileName: "unrelated.png" };
  const app = setup({ list: async () => [photo], initialize: async () => {
    if (++attempts === 1) throw Error("MEDIA_LIMIT");
    return { item, uploadUrl: null, replay: true };
  } });
  await app.settle();
  await app.state.upload(new File(["voice bytes"], "voice.wav", { type: "audio/wav" }), "audio");
  await app.settle();
  await app.state.remove(photo.id);
  await app.settle();
  assert.equal(app.state.canRetryUpload, true);
  await app.state.retryUpload();
  await app.settle();
  const operations = app.calls.filter((c) => c.action === "initialize");
  assert.equal(operations.length, 2);
  assert.deepEqual(operations[0].body, operations[1].body);
});
