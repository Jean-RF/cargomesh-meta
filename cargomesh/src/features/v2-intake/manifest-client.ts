import { z } from 'zod';
import { workspaceFetch } from '@/features/workspace-mode/workspace-fetch';
import { ConfirmedManifestSchema, ManifestPreparationSchema, ConfirmManifestSchema, PrepareManifestSchema,
  type ConfirmManifest, type PrepareManifest } from '@/shared/schemas/meta/manifest-commands';
import type { FreightRequestV2Data } from './contracts';
import { V2IntakeApiError } from './v2-intake-client';

type FetchLike = typeof fetch;
const receipt = z.object({idempotentReplay: z.boolean()});
const preparationResponse = z.object({schemaVersion: z.literal('0.1'), data: ManifestPreparationSchema, meta: receipt});
const confirmationResponse = z.object({schemaVersion: z.literal('0.1'), data: ConfirmedManifestSchema, meta: receipt});
const currentResponse = z.object({schemaVersion: z.literal('0.1'), data: ConfirmedManifestSchema.nullable(),
  meta: z.object({currentRequestDraftVersion: z.number().int().positive(), matchesCurrentRequest: z.boolean().nullable()})});
const readResponse = z.object({schemaVersion: z.literal('0.1'), data: ConfirmedManifestSchema});

function endpoint(requestId: string, suffix: string) {
  return `/api/v2/freight/requests/${z.string().uuid().parse(requestId)}/${suffix}`;
}
async function command<T>(path: string, schema: z.ZodType<T>, init: RequestInit, fetcher: FetchLike): Promise<T> {
  const response = await fetcher(path, {...init, cache: 'no-store', credentials: 'same-origin'});
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new V2IntakeApiError({code: body?.error?.code ?? `HTTP_${response.status}`,
      message: body?.error?.message ?? 'The declaration could not be read or saved.', status: response.status,
      retryable: body?.error?.retryable ?? response.status >= 500});
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new V2IntakeApiError({code: 'MANIFEST_CONTRACT_MISMATCH',
    message: 'The declaration response does not match its contract.', status: 502, retryable: false});
  return parsed.data;
}
function assertScope(source: {requestId: string; organizationId: string}, request: FreightRequestV2Data) {
  if (source.requestId !== request.id || source.organizationId !== request.organizationId)
    throw new V2IntakeApiError({code: 'MANIFEST_SCOPE_MISMATCH', message: 'The declaration belongs to another request.', status: 502, retryable: false});
}
function assertVersion(actual: number, expected: number) {
  if (actual !== expected) throw new V2IntakeApiError({code: 'STALE_DRAFT',
    message: 'Reload the saved draft before reviewing its declaration.', status: 409, retryable: false});
}
export async function readCurrentManifest(request: FreightRequestV2Data, fetcher: FetchLike = workspaceFetch) {
  const result = await command(endpoint(request.id, 'declared-manifests/current'), currentResponse, {}, fetcher);
  assertVersion(result.meta.currentRequestDraftVersion, request.draftVersion);
  if (result.data) {
    assertScope(result.data.declaration.source, request);
    if (result.meta.matchesCurrentRequest !== (result.data.declaration.source.requestDraftVersion === request.draftVersion))
      throw new V2IntakeApiError({code: 'MANIFEST_CONTRACT_MISMATCH', message: 'Declaration revision correlation failed.', status: 502, retryable: false});
  } else if (result.meta.matchesCurrentRequest !== null) {
    throw new V2IntakeApiError({code: 'MANIFEST_CONTRACT_MISMATCH', message: 'No declaration has been confirmed.', status: 502, retryable: false});
  }
  return result;
}
export async function prepareManifest(request: FreightRequestV2Data, input: PrepareManifest, key: string, fetcher: FetchLike = workspaceFetch) {
  const parsed = PrepareManifestSchema.parse(input);
  assertVersion(parsed.expectedDraftVersion, request.draftVersion);
  const result = await command(endpoint(request.id, 'declaration-preparations'), preparationResponse,
    {method: 'POST', headers: {'Content-Type': 'application/json', 'Idempotency-Key': z.string().uuid().parse(key)}, body: JSON.stringify(parsed)}, fetcher);
  assertScope(result.data.candidate.source, request);
  assertVersion(result.data.candidate.source.requestDraftVersion, parsed.expectedDraftVersion);
  if (result.data.expectedManifestRevision !== parsed.expectedManifestRevision)
    throw new V2IntakeApiError({code: 'STALE_MANIFEST', message: 'The manifest baseline changed.', status: 409, retryable: false});
  return result;
}
export async function confirmManifest(request: FreightRequestV2Data, input: ConfirmManifest, key: string, fetcher: FetchLike = workspaceFetch) {
  const parsed = ConfirmManifestSchema.parse(input);
  assertVersion(parsed.expectedDraftVersion, request.draftVersion);
  const result = await command(endpoint(request.id, 'declared-manifests'), confirmationResponse,
    {method: 'POST', headers: {'Content-Type': 'application/json', 'Idempotency-Key': z.string().uuid().parse(key)}, body: JSON.stringify(parsed)}, fetcher);
  assertScope(result.data.declaration.source, request);
  assertVersion(result.data.declaration.source.requestDraftVersion, parsed.expectedDraftVersion);
  if (result.data.preparationId !== parsed.preparationId || result.data.contentHash !== parsed.contentHash || result.data.revision !== parsed.expectedManifestRevision + 1)
    throw new V2IntakeApiError({code: 'MANIFEST_CONTRACT_MISMATCH', message: 'The receipt does not match the reviewed declaration.', status: 502, retryable: false});
  return result;
}
export async function reopenManifest(request: FreightRequestV2Data, manifestId: string, fetcher: FetchLike = workspaceFetch) {
  const result = await command(endpoint(request.id, `declared-manifests/${z.string().uuid().parse(manifestId)}`), readResponse, {}, fetcher);
  assertScope(result.data.declaration.source, request);
  if (result.data.id !== manifestId) throw new V2IntakeApiError({code: 'MANIFEST_SCOPE_MISMATCH', message: 'Another manifest was returned.', status: 502, retryable: false});
  return result;
}

/** One key per intent; network retries keep exactly the same key and body. */
export class ManifestIntents {
  private readonly keys = new Map<string, string>();
  key(requestId: string, action: 'prepare' | 'confirm', input: unknown) {
    const fingerprint = JSON.stringify([requestId, action, input]);
    if (!this.keys.has(fingerprint)) this.keys.set(fingerprint, crypto.randomUUID());
    return this.keys.get(fingerprint)!;
  }
  clear() { this.keys.clear(); }
}
