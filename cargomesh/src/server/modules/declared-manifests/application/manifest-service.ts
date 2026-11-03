import { z } from "zod";
import {
  ConfirmManifestSchema, ConfirmedManifestSchema, ManifestPageSchema,
  ManifestPreparationSchema, PrepareManifestSchema,
  type ConfirmManifest, type ConfirmedManifest, type ManifestPage,
  type PrepareManifest,
} from "@/shared/schemas/meta/manifest-commands";
import { V2DraftError, type V2Actor } from "../../freight-requests/application/draft-service";

/** SQL rechecks actor, source version and all mutations inside one transaction. */
export interface ManifestRepository {
  prepare(actor: V2Actor, requestId: string, input: PrepareManifest, key: string):
    Promise<{ record: unknown; replay: boolean }>;
  confirm(actor: V2Actor, requestId: string, input: ConfirmManifest, key: string):
    Promise<{ record: unknown; replay: boolean }>;
  list(actor: V2Actor, requestId: string, page: ManifestPage): Promise<unknown[]>;
  current(actor: V2Actor, requestId: string):
    Promise<{ record: unknown | null; currentRequestDraftVersion: number }>;
  read(actor: V2Actor, requestId: string, manifestId: string): Promise<unknown>;
}

function identity(actor: V2Actor, requestId: string) {
  if (!z.string().uuid().safeParse(actor.memberId).success ||
      !z.string().uuid().safeParse(actor.organizationId).success) {
    throw new V2DraftError("UNAUTHORIZED", "Active organization membership required.", 401);
  }
  return z.string().uuid().parse(requestId);
}

function scope(record: ConfirmedManifest, actor: V2Actor, requestId: string) {
  const source = record.declaration.source;
  if (source.organizationId !== actor.organizationId || source.requestId !== requestId) {
    throw new Error("MANIFEST_REPOSITORY_SCOPE_MISMATCH");
  }
  return record;
}

/** No model, booking, dispatch, upload or session side effects. */
export class ManifestService {
  constructor(private readonly repository: ManifestRepository) {}

  async prepare(actor: V2Actor, rawId: string, raw: unknown, rawKey: string | undefined) {
    const requestId = identity(actor, rawId);
    const input = PrepareManifestSchema.parse(raw);
    const key = z.string().uuid().parse(rawKey);
    // Replay MUST be resolved by the repository before source-version checks.
    const saved = await this.repository.prepare(actor, requestId, input, key);
    const record = ManifestPreparationSchema.parse(saved.record);
    if (record.candidate.source.organizationId !== actor.organizationId ||
        record.candidate.source.requestId !== requestId ||
        record.candidate.source.requestDraftVersion !== input.expectedDraftVersion ||
        record.preparedByMemberId !== actor.memberId ||
        record.expectedManifestRevision !== input.expectedManifestRevision) {
      throw new Error("MANIFEST_PREPARATION_SCOPE_MISMATCH");
    }
    return { schemaVersion: "0.1" as const, data: record,
      meta: { idempotentReplay: saved.replay } };
  }

  async confirm(actor: V2Actor, rawId: string, raw: unknown, rawKey: string | undefined) {
    const requestId = identity(actor, rawId);
    const input = ConfirmManifestSchema.parse(raw);
    const key = z.string().uuid().parse(rawKey);
    const saved = await this.repository.confirm(actor, requestId, input, key);
    const record = scope(ConfirmedManifestSchema.parse(saved.record), actor, requestId);
    if (record.preparationId !== input.preparationId || record.contentHash !== input.contentHash ||
        record.declaration.source.requestDraftVersion !== input.expectedDraftVersion ||
        record.revision !== input.expectedManifestRevision + 1 ||
        record.confirmedByMemberId !== actor.memberId) {
      throw new Error("MANIFEST_CONFIRMATION_RECEIPT_MISMATCH");
    }
    return { schemaVersion: "0.1" as const, data: record,
      meta: { idempotentReplay: saved.replay } };
  }

  async current(actor: V2Actor, rawId: string) {
    const requestId = identity(actor, rawId);
    const saved = await this.repository.current(actor, requestId);
    const version = z.number().int().positive().parse(saved.currentRequestDraftVersion);
    const record = saved.record === null ? null
      : scope(ConfirmedManifestSchema.parse(saved.record), actor, requestId);
    return { schemaVersion: "0.1" as const, data: record,
      meta: { currentRequestDraftVersion: version,
        matchesCurrentRequest: record === null ? null
          : record.declaration.source.requestDraftVersion === version } };
  }

  async list(actor: V2Actor, rawId: string, query: unknown) {
    const requestId = identity(actor, rawId);
    const page = ManifestPageSchema.parse(query);
    const rows = await this.repository.list(actor, requestId, page);
    if (rows.length > page.limit) throw new Error("MANIFEST_PAGE_OVERFLOW");
    const data = rows.map(row => scope(ConfirmedManifestSchema.parse(row), actor, requestId));
    return { schemaVersion: "0.1" as const, data,
      meta: { ...page, nextOffset: rows.length === page.limit ? page.offset + page.limit : null } };
  }

  async read(actor: V2Actor, rawId: string, rawManifestId: string) {
    const requestId = identity(actor, rawId);
    const manifestId = z.string().uuid().parse(rawManifestId);
    const record = scope(ConfirmedManifestSchema.parse(
      await this.repository.read(actor, requestId, manifestId)), actor, requestId);
    if (record.id !== manifestId) throw new Error("MANIFEST_REPOSITORY_ID_MISMATCH");
    return { schemaVersion: "0.1" as const, data: record };
  }
}
