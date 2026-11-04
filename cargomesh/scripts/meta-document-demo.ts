/** Opt-in synthetic acceptance, restricted to the authorized Meta API64321/app8080.
 * Uses the reviewed two-group commercial scenario, supplied plain PDFs and real
 * authenticated HTTP. Never contacts AI, confirms dispatch or charges payment.
 */
import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {DocumentDossier, DocumentRevision} from '../src/shared/schemas/meta/documents';

async function main() {
  const folder = process.env.META_DOCUMENT_DEMO_STATE_DIR;
  assert.ok(folder, 'Explicit local acceptance state directory required.');
  const origin = 'http://127.0.0.1:8080';
  const api = process.env.NEXT_PUBLIC_SUPABASE_URL;
  assert.equal(api, 'http://127.0.0.1:64321');
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const password = process.env.CARGOMESH_DEMO_CLIENT_PASSWORD!;
  assert.ok(anon && password);
  const refs = JSON.parse(await readFile(resolve(folder, 'commercial-refs.json'), 'utf8'));
  const statePath = resolve(folder, 'document-flow-state.json');
  let state: Record<string, any> = {};
  try {state = JSON.parse(await readFile(statePath, 'utf8'));} catch {}
  const save = () => writeFile(statePath, JSON.stringify(state, null, 2) + '\n');
  const intent = async (name: string) => {if (!state[name]) {state[name] = randomUUID(); await save();} return state[name] as string;};
  async function login(email: string) {
    const response = await fetch(api + '/auth/v1/token?grant_type=password', {
      method: 'POST', headers: {apikey: anon, 'Content-Type': 'application/json'},
      body: JSON.stringify({email, password}), signal: AbortSignal.timeout(20000),
    });
    assert.equal(response.status, 200, 'Local demo authentication failed.');
    return (await response.json()).access_token as string;
  }
  const token = await login('qa-v2-a@cargomesh.test');
  const foreign = await login('qa-v2-b@cargomesh.test');
  const requestId = refs.request.id, manifest = refs.manifest.record;
  const carrierId = 'c2340000-0000-4000-8000-000000000001';
  const base = '/api/v2/meta/documents';
  const checks: string[] = [];
  const pass = (name: string) => {checks.push(name); console.log('PASS: ' + name);};
  async function http(path: string, body?: unknown, key?: string, access = token, expected: number[] = [200, 201]) {
    const headers: Record<string, string> = {};
    if (access) headers.Authorization = 'Bearer ' + access;
    if (key) headers['Idempotency-Key'] = key;
    if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const response = await fetch(origin + path, {method: body === undefined ? 'GET' : 'POST', headers,
      ...(body === undefined ? {} : {body: body instanceof FormData ? body : JSON.stringify(body)}),
      signal: AbortSignal.timeout(90000),
    });
    const value = await response.json();
    assert.ok(expected.includes(response.status), `${path}: HTTP ${response.status}, ${value.error?.code ?? 'unexpected response'}`);
    return value;
  }
  const request = (await http('/api/v2/freight/requests/' + requestId)).data;
  assert.deepEqual(request.cargoSpecification.units.map((u: any) => u.quantity), [8, 4]);
  assert.equal(request.cargoSpecification.totalWeightKg, 120);
  assert.equal(request.cargoSpecification.totalVolumeM3, 0.432);
  const currentManifest = (await http('/api/v2/freight/requests/' + requestId + '/declared-manifests/current')).data;
  assert.equal(currentManifest.id, manifest.id);
  assert.deepEqual(currentManifest.declaration.groupBindings, manifest.declaration.groupBindings);
  pass('same saved request, confirmed manifest and both stable group UUIDs');
  await http(base, undefined, undefined, '', [401]);
  pass('organization document library requires authentication');
  async function upload(kind: 'COMPANY_PROFILE' | 'PACKING_LIST', name: string, title: string) {
    const bytes = await readFile(resolve(import.meta.dirname, '../../output/pdf/meta-document-demo', name));
    const key = await intent(kind + '-upload-key');
    const form = () => {
      const value = new FormData();
      value.set('metadata', JSON.stringify({title, kind, requestId: kind === 'PACKING_LIST' ? requestId : null,
        documentId: null, expectedVersion: 0, issuedOn: '2026-11-01', expiresOn: null}));
      value.set('file', new File([new Uint8Array(bytes)], name, {type: 'application/pdf'}));
      return value;
    };
    const first = DocumentRevision.parse((await http(base, form(), key)).data);
    const replay = DocumentRevision.parse((await http(base, form(), key)).data);
    assert.equal(first.id, replay.id);
    assert.equal(first.state, 'READY');
    assert.equal(first.sha256, createHash('sha256').update(bytes).digest('hex'));
    state[kind] = first; await save();
    pass(kind + ': supplied private PDF uploaded and replayed without duplication');
    return first;
  }
  const profile = await upload('COMPANY_PROFILE', 'demo-company-information-formal-plain.pdf', 'DEMO - Pacific Home Goods company information');
  const packing = await upload('PACKING_LIST', 'demo-packing-list-formal-plain.pdf', 'DEMO - PL-DEMO-001 - 8 + 4 BOX');
  const dossierPath = base + '/requests/' + requestId;
  for (const revision of [profile, packing]) {
    let dossier = DocumentDossier.parse(await http(dossierPath));
    if (!dossier.data.some(link => link.active && link.revision.id === revision.id))
      await http(dossierPath, {action: 'link', revisionId: revision.id, expectedVersion: 0}, await intent(revision.kind + '-link-key'));
  }
  let dossier = DocumentDossier.parse(await http(dossierPath));
  const packingLink = dossier.data.find(link => link.active && link.revision.id === packing.id)!;
  assert.equal(packingLink.manifestId, manifest.id);
  assert.equal(packingLink.manifestRevision, manifest.revision);
  assert.ok(packingLink.correspondenceCurrent);
  pass('corporate document reused and packing list bound to the exact confirmed manifest');
  const evidence = {reference: 'demo:PL-DEMO-001:reviewed-document-flow', provider: 'CargoMesh local demo operator',
    observedAt: new Date().toISOString(), validUntil: '2026-12-01T00:00:00Z', provenanceStatus: 'SIMULATED'};
  if (!state.booking) {
    const command = {schemaVersion: '2.0', decisionId: refs.decision.id, offerId: refs.offer.id, authorization: 'AUTHORIZE', evidence};
    // Save the exact payload before sending: a lost response must replay one authorization.
    state.bookingCommand ??= command; await save();
    state.booking = (await http('/api/v2/bookings', state.bookingCommand, await intent('booking-key'))).data;
    await save();
  }
  const bookingId = state.booking.id;
  const authorized = (await http('/api/v2/bookings/' + bookingId)).data;
  assert.equal(authorized.requestId, requestId);
  pass('booking explicitly authorized through native authenticated HTTP');
  for (const revision of [profile, packing]) {
    dossier = DocumentDossier.parse(await http(dossierPath));
    const link = dossier.data.find(item => item.active && item.revision.id === revision.id)!;
    if (!link.shares.some(share => share.bookingId === bookingId && share.state === 'ACTIVE'))
      await http(dossierPath, {action: 'share', linkId: link.id, bookingId, expectedVersion: link.version}, await intent(revision.kind + '-share-key'));
  }
  const carrierPath = '/api/v2/carriers/' + carrierId + '/documents';
  let carrier = await http(carrierPath + '/bookings/' + bookingId);
  assert.equal(carrier.policy, 'REQUIREMENTS_TO_CONFIRM');
  assert.deepEqual(carrier.data.map((item: any) => item.revision.id).sort(), [profile.id, packing.id].sort());
  pass('carrier sees only the two revisions explicitly shared for this booking');
  for (const item of carrier.data) {
    const link = await http(carrierPath + '/shares/' + item.share.id + '/download');
    assert.equal(new URL(link.url).origin, api);
    const download = await fetch(link.url);
    assert.equal(download.status, 200);
    assert.equal(createHash('sha256').update(Buffer.from(await download.arrayBuffer())).digest('hex'), item.revision.sha256);
    const publicUrl = new URL(link.url); publicUrl.pathname = publicUrl.pathname.replace('/object/sign/', '/object/public/');
    assert.notEqual((await fetch(publicUrl.origin + publicUrl.pathname)).status, 200);
    await http(carrierPath + '/shares/' + item.share.id + '/download', undefined, undefined, foreign, [403, 404]);
    const reviewName = item.revision.kind + '-review-command';
    if (item.share.review !== 'ACCEPTED') {
      state[reviewName] ??= {expectedVersion: item.share.version, decision: 'ACCEPTED', reason: item.revision.kind === 'PACKING_LIST'
        ? 'DEMO review only: 8 + 4 BOX, 120 kg and 0.432 m3 match the saved declaration; CargoMesh maintains exact request/group/manifest links. No physical weighing, dispatch or legal certification.'
        : 'DEMO review only: fictional company sheet retained as self-declared reference. Not proof of tax registration, legal identity or authority.'};
      await save();
      await http(carrierPath + '/shares/' + item.share.id + '/reviews', state[reviewName], await intent(item.revision.kind + '-review-key'));
      const repeat = await http(carrierPath + '/shares/' + item.share.id + '/reviews', state[reviewName], await intent(item.revision.kind + '-review-key'));
      assert.ok(repeat);
    }
  }
  pass('private downloads preserve hashes; public and foreign access denied; reviews replay safely');
  carrier = await http(carrierPath + '/bookings/' + bookingId);
  assert.ok(carrier.data.every((item: any) => item.share.review === 'ACCEPTED'));
  const unchanged = (await http('/api/v2/bookings/' + bookingId)).data;
  assert.equal(unchanged.status, authorized.status);
  pass('carrier acceptance persists after reload and does not confirm or dispatch the booking');
  const finalRequest = (await http('/api/v2/freight/requests/' + requestId)).data;
  assert.deepEqual(finalRequest.cargoSpecification.units.map((u: any) => u.quantity), [8, 4]);
  const result = {scope: 'META_LOCAL_ONLY', requestId, manifestId: manifest.id, manifestRevision: manifest.revision,
    groups: manifest.declaration.groupBindings, bookingId, bookingStatus: unchanged.status,
    documentRevisions: [profile, packing], reviews: carrier.data.map((item: any) => ({shareId: item.share.id, revisionId: item.revision.id, review: item.share.review})),
    checks, inferenceCalls: 0, payment: false, dispatchConfirmed: false,
    clientUrl: origin + '/clients/requests/' + requestId, carrierUrl: origin + '/carriers/orders/' + bookingId};
  await writeFile(resolve(folder, 'document-flow-result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({status: 'PASS', requestId, manifestId: manifest.id, bookingId, bookingStatus: unchanged.status, checks: checks.length}));
}
main().catch(error => {console.error(error instanceof Error ? error.message : 'Local document acceptance failed'); process.exitCode = 1;});
