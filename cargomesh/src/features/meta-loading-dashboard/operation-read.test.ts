import {it} from 'node:test';
import assert from 'node:assert/strict';
import {readLoadingSessionView,readLoadingCatalog} from './operation-read';
import {loadingBundleFixture,loadingId} from '@/shared/schemas/meta/loading-operation.fixtures';
import type {loadingApi} from './operation-api';
import {ROAD_REQUEST_FIXTURE} from '@/features/v2-intake/fixtures/contract-flow.fixture';
import {FreightRequestV2ResponseSchema} from '@/shared/schemas/v2/freight-request';
const authorizedRequest=()=>FreightRequestV2ResponseSchema.shape.data.parse(structuredClone(ROAD_REQUEST_FIXTURE));

it('request handoff reads the exact authorized record beyond the first page without losing pagination',async()=>{
 const selected=authorizedRequest(),calls:string[]=[];
 const api={requests:async()=>{calls.push('requests');return {data:[],meta:{nextOffset:100}};},
   facilities:async()=>{calls.push('facilities');return {data:[],meta:{nextOffset:null}};},
   request:async(id:string)=>{calls.push(id);return selected;}};
 const result=await readLoadingCatalog(api,selected.id);
 assert.deepEqual(calls,['requests','facilities',selected.id]);assert.equal(result.requests.data[0].id,selected.id);
 assert.equal(result.requests.meta.nextOffset,100);
 await assert.rejects(readLoadingCatalog({...api,request:async()=>{throw Error('DENIED');}},selected.id),/DENIED/);
 await assert.rejects(readLoadingCatalog({...api,request:async()=>({...selected,id:loadingId(99)})},selected.id),/REQUEST_SCOPE_MISMATCH/);
});
it('a request already in the authorized page is not fetched again',async()=>{
 const selected=authorizedRequest();let reads=0;
 const api={requests:async()=>({data:[selected],meta:{nextOffset:null}}),facilities:async()=>({data:[],meta:{nextOffset:null}}),request:async()=>{reads++;return selected;}};
 assert.equal((await readLoadingCatalog(api,selected.id)).requests.data.length,1);assert.equal(reads,0);
});

it('starts session, history and exact selected Passport before any read resolves',async()=>{
 const calls:string[]=[],release: (()=>void)[]=[];
 const gate=()=>new Promise<void>(done=>release.push(done));
 const b=loadingBundleFixture(),selected=loadingId(99);
 const restored={data:{id:selected},meta:{isCurrent:false}} as Awaited<ReturnType<typeof loadingApi.passport>>;
 const api={
  read:async(id:string)=>{calls.push('session:'+id);await gate();return b;},
  passports:async(id:string)=>{calls.push('history:'+id);await gate();return [];},
  passport:async(id:string,pid:string)=>{calls.push('passport:'+id+':'+pid);await gate();return restored;},
 };
 const pending=readLoadingSessionView(api,b.session.id,selected);
 assert.deepEqual(calls,['session:'+b.session.id,'history:'+b.session.id,'passport:'+b.session.id+':'+selected]);
 release.forEach(done=>done());const r=await pending;
 assert.equal(r.bundle,b);assert.equal(r.passport,restored);assert.equal(r.passport!.meta.isCurrent,false);
});
it('does not read a Passport when none is selected and propagates authorization failures',async()=>{
 const b=loadingBundleFixture();let passportReads=0;
 const api={read:async()=>b,passports:async()=>[],passport:async()=>{passportReads++;throw Error('DENIED');}};
 assert.equal((await readLoadingSessionView(api,b.session.id,null)).passport,null);assert.equal(passportReads,0);
 await assert.rejects(readLoadingSessionView(api,b.session.id,loadingId(99)),/DENIED/);
 assert.equal(passportReads,1);
});
