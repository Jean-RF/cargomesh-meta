import {it} from 'node:test';
import assert from 'node:assert/strict';
import {readLoadingSessionView} from './operation-read';
import {loadingBundleFixture,loadingId} from '@/shared/schemas/meta/loading-operation.fixtures';
import type {loadingApi} from './operation-api';

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
