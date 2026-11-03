import assert from 'node:assert/strict';
import {test} from 'node:test';
import {dashboardFixture} from '@/shared/schemas/meta/loading-dashboard.fixtures';
import {readLoadingDashboard} from './dashboard-reader';

const actor={organizationId:'DEMO-ORG-JUAN',facilityIds:['DEMO-DEP-01']};
test('reader passes trusted organization and session to the repository',async()=>{
  const s=dashboardFixture('open');s.source='CONNECTED';
  const result=await readLoadingDashboard(actor,s.session.id,{async readSource(org,id){assert.equal(org,actor.organizationId);assert.equal(id,s.session.id);return s;}});
  assert.equal(result.status,200);
});
test('other organizations, facilities and sessions cannot leak a snapshot',async()=>{
  for(const change of ['organizationId','facilityId','id'] as const){const s=dashboardFixture('open');s.source='CONNECTED';s.session[change]='foreign';
    assert.deepEqual(await readLoadingDashboard(actor,'DEMO-SES-029',{async readSource(){return s;}}),{status:404,error:'NOT_FOUND'});
  }
});
test('no granted facility means no repository call',async()=>{
  assert.equal((await readLoadingDashboard({...actor,facilityIds:[]},'session',{async readSource(){throw Error('must not read');}})).status,403);
});
test('production reader rejects fixture data and malformed sources',async()=>{
  assert.equal((await readLoadingDashboard(actor,'DEMO-SES-029',{async readSource(){return dashboardFixture('open');}})).status,422);
  assert.equal((await readLoadingDashboard(actor,'DEMO-SES-029',{async readSource(){return {count:0};}})).status,422);
});
test('missing session is not found',async()=>{
  assert.equal((await readLoadingDashboard(actor,'missing',{async readSource(){return null;}})).status,404);
});
