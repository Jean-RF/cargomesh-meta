import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import sharp from "sharp";
import type { AuthenticatedMemberContext } from "@/server/auth/member";
import { createV2ServerSupabaseClient } from "@/server/db/supabase/v2";
import {
  MediaInitSchema,
  MediaScopeSchema,
  MediaAnalyzeSchema,
} from "@/shared/schemas/meta/declaration-media";
import { inspectWave } from "@/server/ai/meta/wave";
import { interpretMetaMediaDeclaration } from "@/server/ai/meta/interpret-media-declaration";
import { IMAGE_LIMITS } from "@/server/ai/meta/media-input";
import { transcribeEvidence } from "@/server/ai/meta/transcribe";
import { V2DraftError } from "../freight-requests/application/draft-service";

const bucket = "declaration-media";
const failure = (code: string, message: string, status = 400) =>
  new V2DraftError(code, message, status);
export function mediaAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw failure("NOT_CONFIGURED", "Media storage is not configured.", 503);
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
type Actor = AuthenticatedMemberContext;
type Scope = ReturnType<typeof MediaScopeSchema.parse>;
export async function checkMediaRequest(actor: Actor, scope: Scope) {
  if (!scope.requestId) {
    if (scope.requestVersion !== null)
      throw failure("VALIDATION_ERROR", "Request version requires a request.");
    return;
  }
  const db = await createV2ServerSupabaseClient();
  const { data, error } = await db
    .from("freight_requests")
    .select("id,organization_id,status,draft_version")
    .eq("id", scope.requestId)
    .eq("organization_id", actor.organizationId)
    .maybeSingle();
  if (error || !data)
    throw failure("FORBIDDEN_TENANT", "Request is not available.", 403);
  if (data.status !== "DRAFT" || data.draft_version !== scope.requestVersion)
    throw failure(
      "INPUT_REVISION_MISMATCH",
      "Reload the current draft before analyzing.",
      409,
    );
}
function rows(actor: Actor) {
  return mediaAdmin()
    .from("meta_declaration_media")
    .select("*")
    .eq("organization_id", actor.organizationId)
    .eq("member_id", actor.memberId)
    .neq("state", "REMOVED");
}
const item = (r: any) => ({
  id: r.id,
  kind: r.kind,
  fileName: r.file_name,
  mimeType: r.mime_type,
  byteSize: r.byte_size,
  state: r.state,
});
async function own(actor: Actor, id: string) {
  const { data, error } = await rows(actor).eq("id", id).maybeSingle();
  if (error || !data)
    throw failure("FORBIDDEN_TENANT", "Attachment is not available.", 403);
  return data;
}
export async function initializeMedia(actor: Actor, raw: unknown) {
  const input = MediaInitSchema.parse(raw);
  if (
    (input.kind === "audio") !== (input.mimeType === "audio/wav") ||
    input.byteSize > (input.kind === "audio" ? 30000000 : 5 * 1024 * 1024)
  )
    throw failure("MEDIA_INVALID", "Unsupported file type or size.");
  const { idempotencyKey, ...value } = input;
  const db = await createV2ServerSupabaseClient();
  const { data, error } = await db.rpc("initialize_meta_declaration_media", {
    p_organization_id: actor.organizationId,
    p_member_id: actor.memberId,
    p_idempotency_key: idempotencyKey,
    p_value: value,
  });
  if (error) mediaCommandError(error);
  const result = data as unknown as { row: any; replay: boolean };
  // READY is immutable: replay needs no upload permission and must never replace bytes.
  if (result.row.state === "READY")
    return { item: item(result.row), uploadUrl: null, replay: result.replay };
  const signed = await mediaAdmin()
    .storage.from(bucket)
    .createSignedUploadUrl(result.row.object_path, { upsert: false });
  // Keep the committed reservation on storage failure or lost HTTP response.
  // Retrying with the same key can recover it without consuming another slot.
  if (signed.error)
    throw failure("MEDIA_UNAVAILABLE", "Storage could not prepare upload. Retry the same file.", 503);
  return { item: item(result.row), uploadUrl: signed.data.signedUrl, replay: result.replay };
}
function mediaCommandError(error: { code?: string; message: string }): never {
  const allowed = ["IDEMPOTENCY_CONFLICT", "INPUT_REVISION_MISMATCH", "MEDIA_REMOVED", "MEDIA_LIMIT", "MEDIA_INVALID", "VALIDATION_ERROR", "FORBIDDEN_TENANT"];
  const messages: Record<string, string> = {
    IDEMPOTENCY_CONFLICT: "This upload key was already used for a different file or draft.",
    INPUT_REVISION_MISMATCH: "Reload the current draft before continuing.",
    MEDIA_REMOVED: "This attachment was removed. Select the file again to start a new upload.",
    MEDIA_LIMIT: "Use at most four attachments, one voice note and 12 MB of images per draft.",
    MEDIA_INVALID: "Unsupported file type or size.",
    VALIDATION_ERROR: "Invalid attachment information.",
    FORBIDDEN_TENANT: "Attachment or draft is not available.",
  };
  if (allowed.includes(error.message) && ["PT400", "PT403", "PT409"].includes(error.code ?? ""))
    throw failure(error.message, messages[error.message], Number(error.code!.slice(2)));
  throw failure("MEDIA_UNAVAILABLE", "Attachments are unavailable. Retry the same operation.", 503);
}
/** Cookie-authenticated playback, including reopened drafts; never exposes a storage URL. */
export async function previewVoiceMedia(actor: Actor, id: string) {
  const row = await own(actor, id);
  if (row.kind !== "audio" || row.state !== "READY")
    throw failure("MEDIA_INVALID", "Verified voice note required.");
  const bytes = await loadMediaBytes(row);
  const current = await own(actor, id);
  if (
    current.state !== "READY" ||
    current.sha256 !== row.sha256 ||
    createHash("sha256").update(bytes).digest("hex") !== row.sha256
  )
    throw failure(
      "MEDIA_INVALID",
      "Voice note changed. Reload attachments.",
      409,
    );
  return bytes;
}
export async function loadMediaBytes(row: any) {
  const { data, error } = await mediaAdmin()
    .storage.from(bucket)
    .download(row.object_path);
  if (error || !data)
    throw failure("MEDIA_INVALID", "Upload is missing or incomplete.");
  if (data.size !== row.byte_size || data.size > 30000000)
    throw failure("MEDIA_INVALID", "File size does not match the upload.");
  const bytes = new Uint8Array(await data.arrayBuffer());
  if (row.kind === "audio") {
    if (!inspectWave(bytes))
      throw failure("MEDIA_INVALID", "Use mono PCM16 WAV at 16 or 24 kHz.");
  } else {
    try {
      const image = sharp(bytes, {
          limitInputPixels: 20000000,
          failOn: "warning",
        }),
        meta = await image.metadata();
      if (
        !meta.width ||
        !meta.height ||
        meta.width > 8192 ||
        meta.height > 8192 ||
        (meta.pages && meta.pages > 1) ||
        meta.format !== (row.mime_type === "image/png" ? "png" : "jpeg")
      )
        throw Error();
      await image
        .resize({ width: 16, height: 16, fit: "inside" })
        .raw()
        .toBuffer();
    } catch {
      throw failure("MEDIA_INVALID", "Image is damaged or unsupported.");
    }
  }
  return bytes;
}
export async function finishMedia(actor: Actor, id: string) {
  const row = await own(actor, id);
  if (row.state === "READY") return item(row);
  const bytes = await loadMediaBytes(row),
    sha256 = createHash("sha256").update(bytes).digest("hex");
  if (row.expected_sha256 && sha256 !== row.expected_sha256)
    throw failure("MEDIA_CONTENT_MISMATCH", "File content differs from the reserved attachment.", 409);
  const { data, error } = await mediaAdmin()
    .from("meta_declaration_media")
    .update({ state: "READY", sha256 })
    .eq("id", id)
    .eq("member_id", actor.memberId)
    .eq("state", "PENDING")
    .select("*")
    .maybeSingle();
  if (!error && !data) {
    const current = await own(actor, id);
    if (current.state === "READY" && current.sha256 === sha256) return item(current);
  }
  if (error || !data)
    throw failure(
      "MEDIA_UNAVAILABLE",
      "Attachment could not be verified.",
      503,
    );
  return item(data);
}
export async function listMedia(actor: Actor, raw: unknown) {
  const scope = MediaScopeSchema.parse(raw);
  await checkMediaRequest(actor, scope);
  let query = rows(actor);
  query = scope.requestId
    ? query.eq("request_id", scope.requestId)
    : query.eq("draft_key", scope.draftKey).is("request_id", null);
  const { data, error } = await query.order("created_at");
  if (error)
    throw failure("MEDIA_UNAVAILABLE", "Attachments are unavailable.", 503);
  return (data ?? []).map(item);
}
export async function removeMedia(actor: Actor, id: string) {
  const row = await own(actor, id);
  const { error } = await mediaAdmin()
    .from("meta_declaration_media")
    .update({ state: "REMOVED" })
    .eq("id", row.id)
    .eq("member_id", actor.memberId);
  if (error)
    throw failure("MEDIA_UNAVAILABLE", "Attachment could not be removed.", 503);
}
export async function bindMedia(actor: Actor, raw: unknown) {
  const scope = MediaScopeSchema.parse(raw);
  if (!scope.requestId)
    throw failure("VALIDATION_ERROR", "Saved request required.");
  const db = await createV2ServerSupabaseClient();
  const { error } = await db.rpc("bind_meta_declaration_media", {
    p_organization_id: actor.organizationId,
    p_member_id: actor.memberId,
    p_draft_key: scope.draftKey,
    p_request_id: scope.requestId,
    p_request_version: scope.requestVersion!,
  });
  if (error) mediaCommandError(error);
}
export async function analyzeMedia(actor: Actor, raw: unknown) {
  const deadline = Date.now() + 52000;
  const input = MediaAnalyzeSchema.parse(raw);
  if (new Set(input.evidenceIds).size !== input.evidenceIds.length)
    throw failure("VALIDATION_ERROR", "Duplicate attachment.");
  await checkMediaRequest(actor, input);
  const records = await Promise.all(
    input.evidenceIds.map((id) => own(actor, id)),
  );
  for (const row of records)
    if (
      row.state !== "READY" ||
      (input.requestId
        ? row.request_id !== input.requestId
        : row.request_id !== null || row.draft_key !== input.draftKey)
    )
      throw failure(
        "FORBIDDEN_TENANT",
        "Attachment is outside this draft.",
        403,
      );
  if (
    records.filter((row) => row.kind === "audio").length > 1 ||
    records
      .filter((row) => row.kind !== "audio")
      .reduce((sum, row) => sum + row.byte_size, 0) > IMAGE_LIMITS.totalBytes
  )
    throw failure(
      "MEDIA_LIMIT",
      "Use one voice note and at most 12 MB of images.",
    );
  const evidence: Array<{
      evidenceId: string;
      kind: "photo" | "label" | "audio";
      text: string | null;
    }> = [],
    images: Array<{
      evidenceId: string;
      mimeType: "image/png" | "image/jpeg";
      bytes: Uint8Array;
    }> = [],
    transcripts: Array<{ evidenceId: string; text: string }> = [];
  for (const row of records) {
    const bytes = await loadMediaBytes(row);
    if (createHash("sha256").update(bytes).digest("hex") !== row.sha256)
      throw failure("MEDIA_INVALID", "Attachment content changed.");
    if (row.kind === "audio") {
      const result = await transcribeEvidence(
        {
          schemaVersion: "1.0",
          evidenceId: row.id,
          inputRevision: input.inputRevision,
          language: input.language,
        },
        actor,
        {
          evidence: {
            readAuthorized: async () => ({
              evidenceId: row.id,
              organizationId: actor.organizationId,
              inputRevision: input.inputRevision,
              state: "ACTIVE",
              bytes,
              contentSha256: row.sha256,
            }),
            checkCurrent: async () => {
              try {
                const current = await own(actor, row.id);
                if (
                  current.state !== "READY" ||
                  current.sha256 !== row.sha256 ||
                  current.request_id !== row.request_id
                )
                  return "STALE";
                await checkMediaRequest(actor, input);
                return "CURRENT";
              } catch {
                return "DENIED";
              }
            },
          },
        },
        { deadlineMs: Math.min(25000, Math.max(1, deadline - Date.now())) },
      );
      if (!result.ok)
        throw failure(
          result.error.code,
          "Audio could not be transcribed. Try again or use the form.",
          502,
        );
      if (result.transcription.status === "EMPTY")
        throw failure(
          "EMPTY_TRANSCRIPT",
          "No speech detected. Record again or type the details.",
        );
      transcripts.push({ evidenceId: row.id, text: result.transcription.text });
      evidence.push({
        evidenceId: row.id,
        kind: "audio",
        text: result.transcription.text,
      });
    } else {
      images.push({ evidenceId: row.id, mimeType: row.mime_type, bytes });
      evidence.push({ evidenceId: row.id, kind: row.kind, text: null });
    }
  }
  if (deadline - Date.now() < 1000)
    throw failure(
      "PROVIDER_UNAVAILABLE",
      "Analysis timed out. Your draft has not changed.",
      504,
    );
  const result = await interpretMetaMediaDeclaration(
    {
      schemaVersion: "1.0",
      inputRevision: input.inputRevision,
      language: input.language,
      text: input.text || null,
      evidence,
    },
    {
      currentInputRevision: input.inputRevision,
      authorizedEvidenceIds: records.map((r) => r.id),
      expectedUnit: null,
    },
    {
      images,
      env: {
        ...process.env,
        META_PROPOSAL_TIMEOUT_MS: String(
          Math.min(45000, deadline - Date.now()),
        ),
      },
    },
  );
  if (!result.ok)
    throw failure(
      result.error.code,
      "Analysis is unavailable. Your draft has not changed.",
      502,
    );
  await checkMediaRequest(actor, input);
  for (const row of records) {
    const current = await own(actor, row.id);
    if (
      current.state !== "READY" ||
      current.sha256 !== row.sha256 ||
      current.request_id !== row.request_id
    )
      throw failure(
        "INPUT_REVISION_MISMATCH",
        "Attachment changed during analysis. Analyze again.",
        409,
      );
  }
  return {
    proposal: result.proposal,
    transcripts,
    inputRevision: input.inputRevision,
    requiresHumanConfirmation: true,
  };
}
