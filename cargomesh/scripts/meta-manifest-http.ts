/** Explicit local-only acceptance. Creates one labelled synthetic draft, never a booking. */
import assert from 'node:assert/strict';
import {loadIntakeOptions, createFreightRequestV2, reviseFreightRequestV2, getFreightRequestV2} from '../src/features/v2-intake/v2-intake-client';
import {buildPrototypeExample, mapDraftToCreateFreightRequestV2Input, mapDraftToRevisionInput, requestToPrototypeDraft} from '../src/features/v2-intake/prototype-model';
import {cargoGroups, replaceCargoGroups} from '../src/features/v2-intake/cargo-groups';
import {prepareManifest, confirmManifest, readCurrentManifest, reopenManifest, ManifestIntents} from '../src/features/v2-intake/manifest-client';
import {manifestPreparationInput, restoredManifestGroups} from '../src/features/v2-intake/manifest-review-model';

const origin = 'http://127.0.0.1:8080';
const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.CARGOMESH_DEMO_CLIENT_EMAIL;
const password = process.env.CARGOMESH_DEMO_CLIENT_PASSWORD;
assert.equal(apiUrl, 'http://127.0.0.1:64321', 'This test only permits the isolated Meta local API.');
assert.ok(key && email === 'qa-v2-a@cargomesh.test' && password, 'Explicit synthetic local account required.');

async function login(account: string) {
  const response = await fetch(`${apiUrl}/auth/v1/token?grant_type=password`, {method: 'POST',
    headers: {apikey: key!, 'Content-Type': 'application/json'}, body: JSON.stringify({email: account, password})});
  assert.equal(response.status, 200, `Local Auth failed with status ${response.status}`);
  const result = await response.json();
  assert.equal(typeof result.access_token, 'string');
  return result.access_token as string;
}
function authorized(token: string): typeof fetch {
  return (input, init) => {
    const url = new URL(String(input), origin);
    assert.equal(url.origin, origin, 'HTTP acceptance is limited to the local frontend.');
    const headers = new Headers(init?.headers); headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, {...init, headers});
  };
}

async function main() {
  const client = authorized(await login(email!));
  const {options, source} = await loadIntakeOptions(client, 'api');
  assert.equal(source, 'api');
  let draft = buildPrototypeExample(options.data);
  draft.cargoDescription = 'CR-01 local HTTP acceptance · synthetic two-group cargo';
  const first = cargoGroups(draft)[0];
  draft = replaceCargoGroups(draft, [first, {...first, id: 'group-1', originalIndex: undefined,
    unitPackageType: 'BOX', unitQuantity: '3', unitWeightPerUnitKg: '5', unitVolumePerUnitM3: '0.1',
    unitLengthCm: '50', unitWidthCm: '40', unitHeightCm: '50'}]);
  const payload = mapDraftToCreateFreightRequestV2Input(draft, options.data);
  const creationKey = crypto.randomUUID();
  const created = await createFreightRequestV2(payload, creationKey, client);
  const replay = await createFreightRequestV2(payload, creationKey, client);
  assert.equal(replay.data.id, created.data.id);
  assert.equal(created.data.cargoSpecification.units.length, 2);
  const request = (await getFreightRequestV2(created.data.id, client)).data;
  const initial = await readCurrentManifest(request, client);
  assert.equal(initial.data, null);
  const intents = new ManifestIntents(), input = manifestPreparationInput(request, null, {});
  const review = await prepareManifest(request, input, intents.key(request.id, 'prepare', input), client);
  assert.equal(review.data.candidate.groupBindings.length, 2);
  const confirm = {preparationId: review.data.id, expectedDraftVersion: request.draftVersion,
    expectedManifestRevision: 0, contentHash: review.data.contentHash, confirmed: true as const};
  const confirmKey = intents.key(request.id, 'confirm', confirm);
  const [a, b] = await Promise.all([confirmManifest(request, confirm, confirmKey, client), confirmManifest(request, confirm, confirmKey, client)]);
  assert.equal(a.data.id, b.data.id);
  assert.equal(Number(a.meta.idempotentReplay) + Number(b.meta.idempotentReplay), 1);
  const reopened = (await reopenManifest(request, a.data.id, client)).data;
  assert.deepEqual(reopened, a.data);
  assert.deepEqual(reopened.declaration.cargoSpecification, review.data.candidate.cargoSpecification);
  assert.deepEqual(reopened.declaration.groupBindings, review.data.candidate.groupBindings);

  const noSession = await fetch(`${origin}/api/v2/freight/requests/${request.id}/declared-manifests/current`);
  assert.equal(noSession.status, 401);
  const foreign = await authorized(await login('qa-v2-b@cargomesh.test'))(`/api/v2/freight/requests/${request.id}/declared-manifests/current`);
  assert.ok([403, 404].includes(foreign.status), `Other tenant unexpectedly returned ${foreign.status}`);
  const session = await fetch(`${origin}/api/auth/workspace-session`, {method: 'POST',
    headers: {Origin: origin, 'Content-Type': 'application/json'}, body: JSON.stringify({workspace: 'client'})});
  assert.equal(session.status, 200, `Automatic local session failed: ${await session.clone().text()}`);
  const cookie = session.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  assert.ok(cookie, 'Automatic local session did not establish its authorized cookies.');
  const crossOrigin = await fetch(`${origin}/api/v2/freight/requests/${request.id}/declaration-preparations`, {method: 'POST',
    headers: {Cookie: cookie, Origin: 'https://unrelated.example', 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID()},
    body: JSON.stringify(input)});
  assert.equal(crossOrigin.status, 403);

  const restored = requestToPrototypeDraft(request);
  assert.ok(restored);
  const reversed = cargoGroups(restored).reverse();
  reversed[0].unitQuantity = '4';
  const correctedDraft = replaceCargoGroups(restored, reversed);
  const revised = (await reviseFreightRequestV2(request.id, request.draftVersion,
    mapDraftToRevisionInput(correctedDraft, options.data, request), crypto.randomUUID(), client)).data;
  assert.equal(revised.id, request.id);
  assert.equal(revised.draftVersion, request.draftVersion + 1);
  const previous = (await readCurrentManifest(revised, client)).data;
  assert.ok(previous);
  assert.deepEqual(restoredManifestGroups(revised, previous), {}, 'A new version must not guess group identities.');
  const choices = Object.fromEntries(previous.declaration.groupBindings.map(binding => [1 - binding.sourceUnitIndex, binding.groupId]));
  const revisionInput = manifestPreparationInput(revised, previous, choices);
  const review2 = await prepareManifest(revised, revisionInput, intents.key(revised.id, 'prepare', revisionInput), client);
  const confirmation2 = {preparationId: review2.data.id, expectedDraftVersion: revised.draftVersion,
    expectedManifestRevision: previous.revision, contentHash: review2.data.contentHash, confirmed: true as const};
  const race2 = await Promise.allSettled([
    confirmManifest(revised, confirmation2, intents.key(revised.id, 'confirm', confirmation2), client),
    confirmManifest(revised, confirmation2, crypto.randomUUID(), client),
  ]);
  assert.equal(race2.filter(result => result.status === 'fulfilled').length, 1, 'Exactly one independent confirmation may win.');
  const rejected = race2.find(result => result.status === 'rejected');
  assert.ok(rejected && rejected.status === 'rejected' && rejected.reason.status === 409);
  const saved2 = race2.find(result => result.status === 'fulfilled');
  assert.ok(saved2 && saved2.status === 'fulfilled');
  const final = (await reopenManifest(revised, saved2.value.data.id, client)).data;
  assert.equal(final.revision, 2);
  assert.equal(final.declaration.groupBindings[0].groupId, previous.declaration.groupBindings[1].groupId);
  assert.equal(final.declaration.cargoSpecification.units[0].quantity, 4);
  assert.deepEqual(final.declaration.cargoSpecification, revised.cargoSpecification);
  assert.equal((await getFreightRequestV2(request.id, client)).data.status, 'DRAFT');
  assert.deepEqual((await reopenManifest(revised, previous.id, client)).data, previous, 'Historical revision remains immutable.');
  console.log(JSON.stringify({status: 'PASS', environment: 'meta-cr01-validation', requestId: request.id,
    requestVersion: revised.draftVersion, manifestId: final.id, manifestRevision: final.revision, groups: 2,
    checks: ['native form payload', 'idempotent creation', 'concurrent confirmation replay', 'same-ID correction',
      'explicit group identity mapping', 'different-key confirmation serialization', 'reopen identical content', 'historical snapshot', 'tenant isolation', '401 without session',
      'automatic local session without login', 'cross-origin rejection', 'request remains DRAFT']}, null, 2));
}
main().catch(error => {console.error(error instanceof Error ? error.message : 'Local acceptance failed.'); process.exitCode = 1;});
