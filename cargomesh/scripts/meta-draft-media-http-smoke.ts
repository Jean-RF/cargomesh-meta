import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { randomUUID, createHash } from "node:crypto";
import { resolve } from "node:path";
import { MediaAnalysisSchema } from "../src/shared/schemas/meta/declaration-media";
import { parseIntakeOptionsResponse } from "../src/features/v2-intake/intake-options";
import {
  buildPrototypeExample,
  mapDraftToCreateFreightRequestV2Input,
  applyChatFieldsToDraft,
} from "../src/features/v2-intake/prototype-model";
import { selectedMediaFields } from "../src/features/v2-intake/media-draft-model";

// Explicitly limited to the isolated Meta development database. Never fall back to hosted credentials.
async function main() {
  const origin = process.env.HAC40_APP_URL ?? "http://127.0.0.1:8080",
    url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  assert.ok(["http://127.0.0.1:65321", "http://127.0.0.1:58321"].includes(url), "Only the dedicated local Meta/V2 test profiles are allowed.");
  assert.ok(["http://127.0.0.1:8080", "http://127.0.0.1:3172"].includes(origin), "Local application required.");
  assert.ok(!process.env.CI || !process.argv.includes("--live"), "CI must never call paid inference.");
  const auth = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  async function login(email: string) {
    const result = await auth.auth.signInWithPassword({
      email,
      password: process.env.HAC12_LOCAL_QA_PASSWORD ?? "LOCAL_ONLY_CARGOMESH_QA_V2_2026!",
    });
    assert.ifError(result.error);
    return result.data.session!.access_token;
  }
  const a = await login("qa-v2-a@cargomesh.test"),
    b = await login("qa-v2-b@cargomesh.test");
  const scope = {
    draftKey: randomUUID(),
    requestId: null as string | null,
    requestVersion: null as number | null,
  };
  let passed = 0;
  function pass(name: string) {
    passed++;
    console.log(JSON.stringify({ case: name, status: "PASS" }));
  }
  async function command(
    action: string,
    body: unknown,
    token: string | undefined = a,
    expected: number | number[] = 200,
  ) {
    const response = await fetch(
      `${origin}/api/v2/declaration-media/${action}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      },
    );
    const json = await response.json();
    assert.ok(
      (Array.isArray(expected) ? expected : [expected]).includes(response.status),
      `${action}: ${response.status} ${json.error?.code ?? "unexpected response"}`,
    );
    return response.ok ? json.data : json.error;
  }
  await command("list", scope, "", 401);
  pass("unauthenticated-denied");
  await command(
    "initialize",
    {
      ...scope,
      idempotencyKey: randomUUID(),
      contentSha256: "a".repeat(64),
      kind: "photo",
      mimeType: "audio/wav",
      fileName: "wrong.wav",
      byteSize: 10,
    },
    a,
    400,
  );
  pass("kind-mime-mismatch-denied");
  await command(
    "initialize",
    {
      ...scope,
      idempotencyKey: randomUUID(),
      contentSha256: "a".repeat(64),
      kind: "photo",
      mimeType: "image/png",
      fileName: "huge.png",
      byteSize: 6 * 1024 * 1024,
    },
    a,
    400,
  );
  pass("oversize-denied");
  const initializations = new Map<string, unknown>();
  const uploadUrls = new Map<string, string>();
  async function upload(
    name: string,
    kind: "label" | "photo" | "audio",
    bytes?: Uint8Array,
  ) {
    const content =
      bytes ??
      new Uint8Array(
        await readFile(
          resolve(import.meta.dirname, `../../docs/meta/demo-assets/luis/${name}`),
        ),
      );
    const mimeType = kind === "audio" ? "audio/wav" : "image/png";
    const init = {
      ...scope,
      idempotencyKey: randomUUID(),
      contentSha256: createHash("sha256").update(content).digest("hex"),
      kind,
      mimeType,
      fileName: name,
      byteSize: content.length,
    };
    const initial = await command("initialize", init);
    // Discard the initial response; recover the exact reservation over authenticated HTTP.
    const prepared = await command("initialize", init);
    assert.equal(prepared.item.id, initial.item.id);
    assert.equal(prepared.replay, true);
    initializations.set(prepared.item.id, init);
    uploadUrls.set(prepared.item.id, prepared.uploadUrl);
    const sent = await fetch(prepared.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: Buffer.from(content),
    });
    assert.equal(sent.ok, true);
    return prepared.item.id as string;
  }
  const damaged = await upload(
    "invalid.png",
    "photo",
    new Uint8Array([1, 2, 3, 4]),
  );
  await command("finish", { id: damaged }, a, 400);
  await command("remove", { id: damaged });
  pass("actual-image-decode-rejects-forged-png");
  const label = await upload("shipping-label.png", "label");
  await command("finish", { id: label });
  const readyReplay = await command("initialize", initializations.get(label));
  assert.equal(readyReplay.item.id, label);
  assert.equal(readyReplay.item.state, "READY");
  assert.equal(readyReplay.uploadUrl, null);
  const conflict = await command("initialize", { ...(initializations.get(label) as object), fileName: "changed.png" }, a, 409);
  assert.equal(conflict.code, "IDEMPOTENCY_CONFLICT");
  pass("private-storage-upload-and-verification-ready-replay-has-no-upload-permission");
  pass("same-key-different-payload-has-stable-http-409-code");
  const overwrite = await fetch(uploadUrls.get(label)!, {
    method: "PUT", headers: { "Content-Type": "image/png", "x-upsert": "true" }, body: new Uint8Array([1, 2, 3]),
  });
  assert.equal(overwrite.ok, false);
  assert.equal((await command("finish", { id: label })).state, "READY");
  pass("original-signed-upload-cannot-overwrite-ready-evidence");
  for (const action of ["finish", "remove"])
    await command(action, { id: label }, b, 403);
  await command(
    "analyze",
    {
      ...scope,
      evidenceIds: [label],
      text: "",
      inputRevision: 1,
      language: "es",
    },
    b,
    403,
  );
  pass("foreign-member-cannot-read-analyze-or-remove");
  await command(
    "analyze",
    {
      ...scope,
      draftKey: randomUUID(),
      evidenceIds: [label],
      text: "",
      inputRevision: 1,
      language: "es",
    },
    a,
    403,
  );
  pass("wrong-draft-denied");
  const direct = await fetch(`${url}/rest/v1/meta_declaration_media?select=*`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${a}`,
    },
  });
  assert.equal(direct.status, 403);
  pass("authenticated-direct-table-access-denied");
  const optionsReply = await fetch(`${origin}/api/v2/intake/options`, {
    headers: { Authorization: `Bearer ${a}` },
  });
  const parsedOptions = parseIntakeOptionsResponse(await optionsReply.json());
  assert.ok(parsedOptions);
  const options = parsedOptions.data;
  let draft = buildPrototypeExample(options);
  // The seeded development example is dated; this test uses explicit future windows.
  const time = (days: number) =>
    new Date(Date.now() + days * 86400000).toISOString().slice(0, 16);
  draft = {
    ...draft,
    pickupWindowStartsAt: time(2),
    pickupWindowEndsAt: time(3),
    deliveryWindowStartsAt: time(4),
    deliveryWindowEndsAt: time(5),
  };
  const audio = await upload("synthetic-note.wav", "audio");
  await command("finish", { id: audio });
  async function preview(id: string, token: string, expected: number) {
    const reply = await fetch(
      `${origin}/api/v2/declaration-media/audio?id=${encodeURIComponent(id)}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    assert.equal(reply.status, expected);
    return reply;
  }
  const playable = await preview(audio, a, 200);
  assert.equal(playable.headers.get("content-type"), "audio/wav");
  assert.match(playable.headers.get("cache-control") ?? "", /no-store/);
  assert.deepEqual(
    Buffer.from(await playable.arrayBuffer()),
    await readFile(
      resolve(
        process.cwd(),
        "../docs/meta/demo-assets/luis/synthetic-note.wav",
      ),
    ),
  );
  const readyAudioReplay = await command("initialize", initializations.get(audio));
  assert.equal(readyAudioReplay.item.id, audio);
  assert.equal(readyAudioReplay.uploadUrl, null);
  pass("voice-preview-returns-original-private-wave");
  await preview(audio, "", 401);
  await preview(audio, b, 403);
  pass("voice-preview-denies-unauthenticated-and-foreign-actor");
  await preview(label, a, 400);
  pass("voice-preview-rejects-non-audio");
  for (const kind of ["photo", "audio"]) {
    const name = kind === "audio" ? "synthetic-note.wav" : "shipping-label.png";
    const bytes = await readFile(resolve(import.meta.dirname, `../../docs/meta/demo-assets/luis/${name}`));
    const mismatch = await command("initialize", {
      draftKey: randomUUID(), requestId: null, requestVersion: null, idempotencyKey: randomUUID(), contentSha256: "a".repeat(64),
      kind, mimeType: kind === "audio" ? "audio/wav" : "image/png", fileName: name, byteSize: bytes.length,
    });
    const uploaded = await fetch(mismatch.uploadUrl, { method: "PUT", headers: { "Content-Type": kind === "audio" ? "audio/wav" : "image/png" }, body: bytes });
    assert.equal(uploaded.ok, true);
    const invalidContent = await command("finish", { id: mismatch.item.id }, a, 409);
    assert.equal(invalidContent.code, "MEDIA_CONTENT_MISMATCH");
    await command("remove", { id: mismatch.item.id });
    pass(kind+"-uploaded-content-must-match-initialization-fingerprint");
  }
  if (process.argv.includes("--live")) {
    const analysis = MediaAnalysisSchema.parse(
      await command("analyze", {
        ...scope,
        evidenceIds: [label],
        inputRevision: 2,
        language: "es",
        text: "Son 3 cajas, no 4.",
      }),
    );
    assert.equal(analysis.requiresHumanConfirmation, true);
    assert.equal(
      analysis.proposal.fields.find((field) => field.field === "unitQuantity")
        ?.value,
      3,
    );
    draft = applyChatFieldsToDraft(
      draft,
      selectedMediaFields(
        analysis.proposal,
        new Set(analysis.proposal.fields.map((field) => field.field)),
      ),
    );
    pass("real-meta-label-and-latest-text-correction");
    const voice = MediaAnalysisSchema.parse(
      await command("analyze", {
        ...scope,
        evidenceIds: [audio],
        inputRevision: 3,
        language: "es",
        text: "Son 3 cajas. Cada caja pesa 8 kg y mide 40 x 30 x 20 cm.",
      }),
    );
    assert.ok(voice.transcripts[0]?.text.trim());
    assert.equal(voice.requiresHumanConfirmation, true);
    pass("real-meta-wave-transcription-and-proposal");
  }
  const input = mapDraftToCreateFreightRequestV2Input(draft, options);
  async function native(path: string, body?: unknown) {
    const response = await fetch(origin + "/api/v2/freight/requests" + path, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${a}`,
        "Content-Type": "application/json",
        "Idempotency-Key": randomUUID(),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    assert.ok(response.ok, `native save: ${result.error?.code}`);
    return result.data;
  }
  const created = await native("", input);
  scope.requestId = created.id;
  scope.requestVersion = created.draftVersion;
  await command("bind", scope);
  assert.ok(
    JSON.stringify((await command("list", scope)).map((item: {id: string}) => item.id).sort()) === JSON.stringify([label, audio].sort()),
  );
  const boundReplay = await command("initialize", initializations.get(audio));
  assert.equal(boundReplay.item.id, audio);
  assert.equal(boundReplay.uploadUrl, null);
  pass("native-save-links-exact-attachments-and-original-initialize-replays-after-binding");
  const source = { draftKey: randomUUID(), requestId: null, requestVersion: null };
  const reservation = (context: object) => ({ ...context, idempotencyKey: randomUUID(), contentSha256: "a".repeat(64), kind: "photo", mimeType: "image/png", fileName: "synthetic-quota.png", byteSize: 100 });
  const sourceRows = await Promise.all([command("initialize", reservation(source)), command("initialize", reservation(source))]);
  const [binding, creating] = await Promise.all([
    command("bind", { ...source, requestId: scope.requestId, requestVersion: scope.requestVersion }, a, [200, 400]),
    command("initialize", reservation(scope), a, [200, 400]),
  ]);
  const bound = await command("list", scope);
  const unbound = await command("list", source);
  assert.ok(bound.length <= 4 && unbound.length <= 4);
  if (binding?.code) {
    assert.equal(binding.code, "MEDIA_LIMIT");
    assert.equal(unbound.length, 2);
    assert.ok(creating.item);
  } else {
    assert.equal(bound.length, 4);
    assert.equal(unbound.length, 0);
    assert.equal(creating.code, "MEDIA_LIMIT");
  }
  for (const row of sourceRows) await command("remove", { id: row.item.id });
  if (creating.item) await command("remove", { id: creating.item.id });
  pass("binding-and-saved-initialization-share-one-atomic-quota");
  const revisedInput = structuredClone(input);
  revisedInput.cargoSpecification.description =
    "Corrección manual persistida con adjuntos";
  const revised = await native(`/${created.id}/revisions`, {
    expectedDraftVersion: created.draftVersion,
    value: revisedInput,
  });
  assert.equal(revised.id, created.id);
  assert.ok(revised.draftVersion > created.draftVersion);
  await command(
    "analyze",
    {
      ...scope,
      evidenceIds: [label],
      inputRevision: 4,
      language: "es",
      text: "",
    },
    a,
    409,
  );
  pass("stale-saved-version-denied-before-provider");
  scope.requestVersion = revised.draftVersion;
  const reopened = await native(`/${created.id}`);
  assert.equal(reopened.id, created.id);
  assert.equal(
    reopened.cargoSpecification.description,
    "Corrección manual persistida con adjuntos",
  );
  assert.ok(
    JSON.stringify((await command("list", scope)).map((item: {id: string}) => item.id).sort()) === JSON.stringify([label, audio].sort()),
  );
  pass("manual-correction-and-evidence-survive-reopen");
  await command("list", scope, b, 403);
  pass("foreign-request-denied");
  await command("remove", { id: label });
  assert.ok(
    !(await command("list", scope)).some(
      (item: { id: string }) => item.id === label,
    ),
  );
  pass("removed-evidence-stays-out-of-draft");
  await command("remove", { id: audio });
  await preview(audio, a, 403);
  pass("voice-preview-denies-removed-audio");
  console.log(
    JSON.stringify({
      passed,
      live: process.argv.includes("--live"),
      commercialWrites: 0,
    }),
  );
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Media integration test failed",
  );
  process.exitCode = 1;
});
