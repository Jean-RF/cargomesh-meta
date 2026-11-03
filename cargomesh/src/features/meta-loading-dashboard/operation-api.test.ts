import {it} from 'node:test';
import assert from 'node:assert/strict';
import {createLoadingApi} from './operation-api';
import {loadingBundleFixture,loadingPassportFixture,loadingId} from '@/shared/schemas/meta/loading-operation.fixtures';
import {loadingPassport} from '@/shared/meta/loading-operation';
it('keeps caller idempotency on transport retries and reads the authorized source only',async()=>{
 const b=loadingBundleFixture(),seen:string[]=[],api=createLoadingApi(async(_url,init)=>{seen.push((init!.headers as Record<string,string>)['Idempotency-Key']);if(seen.length===1)throw new Error('offline');return Response.json({data:b});});
 await assert.rejects(api.change(b.session.id,'close',{expectedVersion:4},loadingId(99)));
 await api.change(b.session.id,'close',{expectedVersion:4},loadingId(99));assert.deepEqual(seen,[loadingId(99),loadingId(99)]);
});
it('checks explanation response scope and sends stable command keys with an abort signal',async()=>{
 const p=loadingPassportFixture(),groupId=p.source.session.groups[0].id,key=loadingId(99),signal=new AbortController().signal;
 const response={schemaVersion:'1.0',data:{sessionId:p.sessionId,passportId:p.id,groupId,status:'IN_PROGRESS',attempt:null,explanation:null,guidance:null},meta:{idempotentReplay:true}};
 const seen:any[]=[],api=createLoadingApi(async(_url,init)=>{seen.push(init);return Response.json(response);});
 await api.explain(p.sessionId,p.id,{groupId,expectedVersion:p.sessionVersion,language:'es',retryOf:null},key,signal);
 assert.equal(seen[0].signal,signal);assert.equal(seen[0].headers['Idempotency-Key'],key);
 const forged=createLoadingApi(async()=>Response.json({...response,data:{...response.data,passportId:loadingId(98)}}));
 await assert.rejects(forged.explain(p.sessionId,p.id,{groupId,expectedVersion:p.sessionVersion,language:'es',retryOf:null},key),/PASSPORT_SCOPE_MISMATCH/);
 const statuses=createLoadingApi(async()=>Response.json({schemaVersion:'1.0',data:{sessionId:p.sessionId,passportId:loadingId(98),attempts:[]}}));
 await assert.rejects(statuses.explanationAttempts(p.sessionId,p.id),/PASSPORT_SCOPE_MISMATCH/);
});
it('validates Passport source before deriving comparison and rejects forged evidence scope',async()=>{
 const p=loadingPassportFixture(),api=createLoadingApi(async()=>Response.json({data:{...loadingPassport(p),explanations:[]},meta:{currentSessionVersion:4,manifestCurrent:true,isCurrent:true}}));
 assert.equal((await api.passport(p.sessionId,p.id)).data.comparison.rows[0].delta,2);
 await assert.rejects(api.passport(loadingId(98),p.id));
});
