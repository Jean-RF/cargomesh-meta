import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareDeclaredManifestCandidate} from '@/server/modules/declared-manifests/domain/prepare-candidate';
import {prepareManifest, confirmManifest, readCurrentManifest, reopenManifest, ManifestIntents} from './manifest-client';
import {manifestPreparationInput, restoredManifestGroups, reviewStillCurrent} from './manifest-review-model';
import type {FreightRequestV2Data} from './contracts';
import type {ConfirmedManifest, ManifestPreparation} from '@/shared/schemas/meta/manifest-commands';

const fixture = JSON.parse(readFileSync('../docs/meta/contracts/fixtures/cr00/complete.json', 'utf8'));
const request: FreightRequestV2Data = fixture.request;
const bindings = request.cargoSpecification.units.map((_, sourceUnitIndex) => ({sourceUnitIndex,
  groupId: `50000000-0000-4000-8000-${String(sourceUnitIndex + 1).padStart(12, '0')}`}));
const candidate = prepareDeclaredManifestCandidate(request, {actorOrganizationId: request.organizationId,
  expectedRequestDraftVersion: request.draftVersion, groupBindings: bindings});
const preparation: ManifestPreparation = {id: '80000000-0000-4000-8000-000000000001',
  preparedByMemberId: '60000000-0000-4000-8000-000000000001', expectedManifestRevision: 0,
  preparedAt: '2026-11-01T00:00:00Z', expiresAt: '2026-11-01T00:30:00Z', contentHash: 'a'.repeat(64), candidate};
const manifest: ConfirmedManifest = {id: '90000000-0000-4000-8000-000000000001', revision: 1, status: 'CONFIRMED',
  preparationId: preparation.id, confirmedByMemberId: preparation.preparedByMemberId, confirmedAt: '2026-11-01T00:01:00Z',
  contentHash: preparation.contentHash, declaration: candidate};
const confirmation = {preparationId: preparation.id, expectedDraftVersion: request.draftVersion,
  expectedManifestRevision: 0, contentHash: preparation.contentHash, confirmed: true as const};
function response(body: unknown, status = 200) {return Response.json(body, {status});}

test('prepare → explicit confirmation → reopen retains request, revision, units and every group UUID', async () => {
  const calls: Array<{path: string; init?: RequestInit}> = [];
  const fetcher: typeof fetch = async (path, init) => {
    calls.push({path: String(path), init});
    if (String(path).endsWith('/current')) return response({schemaVersion: '0.1', data: manifest,
      meta: {currentRequestDraftVersion: request.draftVersion, matchesCurrentRequest: true}});
    if (init?.method === 'POST') return response({schemaVersion: '0.1',
      data: String(path).endsWith('/declaration-preparations') ? preparation : manifest, meta: {idempotentReplay: false}}, 201);
    return response({schemaVersion: '0.1', data: manifest});
  };
  const intents = new ManifestIntents(), input = manifestPreparationInput(request, null, {});
  const reviewed = await prepareManifest(request, input, intents.key(request.id, 'prepare', input), fetcher);
  assert.equal(reviewed.data.candidate.cargoSpecification.units.length, request.cargoSpecification.units.length);
  const saved = await confirmManifest(request, confirmation, intents.key(request.id, 'confirm', confirmation), fetcher);
  const current = await readCurrentManifest(request, fetcher);
  const reopened = await reopenManifest(request, saved.data.id, fetcher);
  assert.deepEqual(reopened.data, saved.data);
  assert.deepEqual(current.data?.declaration.groupBindings, bindings);
  assert.equal(current.data?.declaration.source.requestId, request.id);
  assert.deepEqual(restoredManifestGroups(request, reopened.data), Object.fromEntries(bindings.map(b => [b.sourceUnitIndex, b.groupId])));
  assert.equal(JSON.parse(String(calls[1].init?.body)).confirmed, true);
  assert.notEqual(new Headers(calls[0].init?.headers).get('Idempotency-Key'), new Headers(calls[1].init?.headers).get('Idempotency-Key'));
  assert.ok(calls.every(call => call.init?.cache === 'no-store' && call.init.credentials === 'same-origin'));
});

test('a failed network confirmation retries the same intent, never a new request or booking', async () => {
  const intents = new ManifestIntents(), keys: string[] = [];
  const fetcher: typeof fetch = async (path, init) => {
    assert.ok(String(path).endsWith(`/requests/${request.id}/declared-manifests`));
    keys.push(new Headers(init?.headers).get('Idempotency-Key')!);
    if (keys.length === 1) throw Error('connection lost after possible commit');
    return response({schemaVersion: '0.1', data: manifest, meta: {idempotentReplay: true}});
  };
  await assert.rejects(() => confirmManifest(request, confirmation, intents.key(request.id, 'confirm', confirmation), fetcher));
  const result = await confirmManifest(request, confirmation, intents.key(request.id, 'confirm', confirmation), fetcher);
  assert.equal(result.meta.idempotentReplay, true);
  assert.equal(keys[0], keys[1]);
});

test('client rejects another tenant, stale source versions and receipts for another preparation/hash', async () => {
  const wrong = structuredClone(manifest); wrong.declaration.source.organizationId = crypto.randomUUID();
  await assert.rejects(() => reopenManifest(request, manifest.id, async () => response({schemaVersion: '0.1', data: wrong})), /another request/);
  await assert.rejects(() => readCurrentManifest(request, async () => response({schemaVersion: '0.1', data: manifest,
    meta: {currentRequestDraftVersion: request.draftVersion + 1, matchesCurrentRequest: false}})), /Reload/);
  await assert.rejects(() => confirmManifest(request, {...confirmation, contentHash: 'b'.repeat(64)}, crypto.randomUUID(),
    async () => response({schemaVersion: '0.1', data: manifest, meta: {idempotentReplay: false}})), /receipt/);
  await assert.rejects(() => readCurrentManifest(request, async () => response({schemaVersion: '0.1', data: null,
    meta: {currentRequestDraftVersion: request.draftVersion, matchesCurrentRequest: true}})), /No declaration/);
});

test('revisions require explicit complete unique group mappings; reordering retains the chosen UUIDs', () => {
  const changed = {...request, draftVersion: request.draftVersion + 1};
  assert.deepEqual(restoredManifestGroups(changed, manifest), {});
  assert.throws(() => manifestPreparationInput(changed, manifest, {}), /GROUP_MAPPING_REQUIRED/);
  const selections = Object.fromEntries(bindings.map((b, i) => [i, bindings[bindings.length - i - 1].groupId]));
  const revised = manifestPreparationInput(changed, manifest, selections);
  assert.equal(revised.groups?.[0].groupId, bindings.at(-1)?.groupId);
  assert.equal(revised.expectedManifestRevision, 1);
  const duplicate = Object.fromEntries(bindings.map(b => [b.sourceUnitIndex, bindings[0].groupId]));
  if (bindings.length > 1) assert.throws(() => manifestPreparationInput(changed, manifest, duplicate));
  const added = {...changed, cargoSpecification: {...changed.cargoSpecification,
    units: [...changed.cargoSpecification.units, changed.cargoSpecification.units[0]]}};
  assert.equal(manifestPreparationInput(added, manifest, {...selections, [bindings.length]: 'new'}).groups?.at(-1)?.groupId, null);
});

test('manual changes, unsaved data, expiry or another request invalidate review consent', () => {
  const now = Date.parse('2026-11-01T00:10:00Z');
  assert.equal(reviewStillCurrent(preparation, request, false, 'reviewed', 'reviewed', now), true);
  assert.equal(reviewStillCurrent(preparation, request, true, 'reviewed', 'reviewed', now), false);
  assert.equal(reviewStillCurrent(preparation, request, false, 'reviewed', 'edited', now), false);
  assert.equal(reviewStillCurrent(preparation, request, false, 'reviewed', 'reviewed', Date.parse(preparation.expiresAt)), false);
  assert.equal(reviewStillCurrent(preparation, {...request, draftVersion: request.draftVersion + 1}, false, 'reviewed', 'reviewed', now), false);
});

test('403 and missing migration stay explicit errors and never become simulated success', async () => {
  for (const [status, code] of [[403, 'FORBIDDEN_TENANT'], [503, 'MANIFESTS_NOT_INSTALLED']] as const) {
    await assert.rejects(() => readCurrentManifest(request, async () => response({schemaVersion: '2.0',
      error: {code, message: code, retryable: false}}, status)), error => error instanceof Error && error.message === code);
  }
});
