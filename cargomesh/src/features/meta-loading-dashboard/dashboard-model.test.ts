import assert from 'node:assert/strict';
import {test} from 'node:test';
import {dashboardFixture} from '@/shared/schemas/meta/loading-dashboard.fixtures';
import {LoadingDashboardSourceSchema} from '@/shared/schemas/meta/loading-dashboard';
import {buildLoadingDashboard,knownPercentage,retainLoadingDashboard} from './dashboard-model';

test('JU-00: unknown and zero denominators never produce a percentage',()=>{
  for(const [n,d] of [[0,null],[null,10],[10,0]] as const)assert.equal(knownPercentage(n,d),null);
  assert.equal(knownPercentage(0,10),0);assert.equal(knownPercentage(12,10),120);
});
test('JU-00: no observation is unknown, never confirmed zero',()=>{
  const s=dashboardFixture('open');s.observation=null;
  const view=buildLoadingDashboard(s);assert.equal(view.totals[0].observed,null);assert.ok(view.rows.every(r=>r.observed===null&&r.delta===null));
});
test('JU-00: a session without an authorized operation is visibly a demo',()=>{
  const s=dashboardFixture('open');s.source='CONNECTED';assert.equal(buildLoadingDashboard(s).isDemo,true);
  s.session.operationId='operation-authorized';assert.equal(buildLoadingDashboard(s).isDemo,false);
});
test('JU-01: pallets and boxes stay in separate totals',()=>{
  const view=buildLoadingDashboard(dashboardFixture('open'));
  assert.deepEqual(view.totals.map(t=>[t.unit,t.declared,t.planned,t.observed]),[['PALLET',18,18,14],['BOX',40,40,null]]);
});
test('JU-01: partial pages and unknown group counts never become global totals',()=>{
  const view=buildLoadingDashboard(dashboardFixture('unknown'));
  assert.equal(view.scope,'LOADED_GROUPS');assert.equal(view.totals[0].declared,null);assert.equal(view.totals[0].planned,null);
});
test('JU-01: complete plan with no allocation means explicit zero, incomplete plan means pending',()=>{
  const s=dashboardFixture('open');s.plan!.allocations=[];assert.equal(buildLoadingDashboard(s).rows[0].planned,0);
  s.plan!.complete=false;assert.equal(buildLoadingDashboard(s).rows[0].planned,null);
});
test('JU-01: stale or incompatible plans cannot supply planned quantities',()=>{
  const s=dashboardFixture('open');s.plan!.manifestRevision=2;assert.equal(buildLoadingDashboard(s).totals[0].planned,null);
  s.plan!.manifestRevision=3;s.plan!.allocations[0].unit='BOX';assert.equal(buildLoadingDashboard(s).rows[0].planned,null);
});
test('JU-01: empty and older refreshes preserve the previous snapshot',()=>{
  const old=buildLoadingDashboard(dashboardFixture('open')),latest=buildLoadingDashboard(dashboardFixture('review'));
  assert.equal(retainLoadingDashboard(latest,null),latest);assert.equal(retainLoadingDashboard(latest,old),latest);assert.equal(retainLoadingDashboard(old,latest),latest);
});
test('an open session shows progress without declaring a shortage',()=>{
  const v=buildLoadingDashboard(dashboardFixture('open'));assert.ok(v.rows.every(r=>r.status==='NOT_READY'&&r.delta===null));assert.equal(v.rows[0].progressPercent,75);
});
test('closed sufficient evidence gives a proposed difference and a match deterministically',()=>{
  const s=dashboardFixture('review'),v=buildLoadingDashboard(s);assert.deepEqual(v,buildLoadingDashboard(structuredClone(s)));
  assert.equal(v.rows[0].status,'DIFFERENCE_PROPOSED');assert.equal(v.rows[0].delta,1);
  assert.equal(v.rows[1].status,'MATCH');assert.equal(v.rows[1].delta,0);assert.equal(v.totals[0].pendingReview,1);
});
test('incomplete coverage or uncertainty cannot prove a difference',()=>{
  for(const field of ['coverage','quality','count'] as const){const s=dashboardFixture('review');
    if(field==='coverage')s.observation!.groups[0].coverage='PARTIAL';
    else if(field==='quality')s.observation!.groups[0].quality='UNCERTAIN';else s.observation!.groups[0].count=null;
    const row=buildLoadingDashboard(s).rows[0];assert.equal(row.status,'INSUFFICIENT_EVIDENCE');assert.equal(row.delta,null);
  }
});
test('a changed manifest revision makes the comparison outdated',()=>{
  const row=buildLoadingDashboard(dashboardFixture('outdated')).rows[0];assert.equal(row.status,'OUTDATED');assert.equal(row.delta,null);assert.equal(row.observed,null);
});
test('units and sessions must match before comparing',()=>{
  const s=dashboardFixture('incompatible');assert.equal(buildLoadingDashboard(s).rows[0].status,'INCOMPATIBLE_SCOPE');
  s.observation!.sessionId='other-session';assert.ok(buildLoadingDashboard(s).rows.every(r=>r.status==='INCOMPATIBLE_SCOPE'&&r.observed===null));
});
test('an explicit complete count of zero remains a confirmed zero',()=>{
  const s=dashboardFixture('review');s.manifest.groups[0].count=0;s.observation!.groups[0].count=0;
  const r=buildLoadingDashboard(s).rows[0];assert.equal(r.observed,0);assert.equal(r.status,'MATCH');assert.equal(r.progressPercent,null);
});
test('duplicate observations, negative counts and foreign allocations fail contract validation',()=>{
  const duplicate=dashboardFixture('open');duplicate.observation!.groups.push(duplicate.observation!.groups[0]);assert.equal(LoadingDashboardSourceSchema.safeParse(duplicate).success,false);
  const negative=dashboardFixture('open');negative.manifest.groups[0].count=-1;assert.equal(LoadingDashboardSourceSchema.safeParse(negative).success,false);
  const foreign=dashboardFixture('open');foreign.plan!.allocations[0].vehicleId='unknown';assert.equal(LoadingDashboardSourceSchema.safeParse(foreign).success,false);
});
test('integer overflow in a total is unknown rather than a rounded count',()=>{
  const s=dashboardFixture('open');s.manifest.groups[0].count=Number.MAX_SAFE_INTEGER;s.manifest.groups[1].count=1;
  assert.equal(buildLoadingDashboard(s).totals[0].declared,null);
});
