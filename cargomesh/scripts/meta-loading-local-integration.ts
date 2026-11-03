/** Local assembled-contract check. Never calls a model, hosted database, or real worker. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createClient} from '@supabase/supabase-js';
import {LoadingBundleSchema} from '../src/shared/schemas/meta/loading-operation';
import {loadingExplanationFacts} from '../src/shared/meta/loading-operation';
import {LoadingOperationService} from '../src/server/modules/loading-sessions/operation-service';
import {createLoadingOperationRepository,type LoadingRpcClient} from '../src/server/modules/loading-sessions/supabase-operation-repository';
import {createLoadingAnalysisSessionReader,createLoadingReconciliationAccess,recordLoadingObservation,recordLoadingExplanation} from '../src/server/modules/loading-sessions/producer-ports';

async function main(){
const api=process.env.CARGOMESH_LOADING_TEST_APP_URL??'http://127.0.0.1:3001';
assert(['http://127.0.0.1:3001','http://localhost:3000'].includes(api),'Dedicated local app only');
const secretPath=process.env.CARGOMESH_LOCAL_SECRETS_PATH;assert(secretPath,'Provide the local CLI status JSON path outside the repository');
const local=JSON.parse(readFileSync(secretPath,'utf8'));
assert.equal(local.API_URL,'http://127.0.0.1:64351','Dedicated isolated local Supabase only');
const user=createClient(local.API_URL,local.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const writer=createClient(local.API_URL,local.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}) as unknown as LoadingRpcClient;
const seed=readFileSync('../supabase/scenarios/v2-road-baseline/seed.sql','utf8');
const password=seed.match(/crypt\('([^']+)'/)?.[1];assert(password,'Unchanged synthetic local Auth fixture required');
const auth=await user.auth.signInWithPassword({email:'qa-v2-a@cargomesh.test',password});assert.ifError(auth.error);assert(auth.data.session);
const token=auth.data.session.access_token;
const actor={userId:auth.data.user!.id,memberId:'c2320000-0000-4000-8000-000000000001',organizationId:'c2300000-0000-4000-8000-000000000001',role:'OWNER' as const,status:'ACTIVE',userEmail:'qa-v2-a@cargomesh.test'};
async function http(path:string,value?:unknown,key?:string,expected=200){
 const r=await fetch(`${api}/api/v2${path}`,{method:value===undefined?'GET':'POST',headers:{Authorization:`Bearer ${token}`,...(value===undefined?{}:{'Content-Type':'application/json','Idempotency-Key':key??crypto.randomUUID()})},...(value===undefined?{}:{body:JSON.stringify(value)})});
 const body=await r.json();assert.equal(r.status,expected,`${path}: ${body.error?.code??'unexpected response'}`);return body;
}
// Producers are loaded from the assembled validation worktree, not vendored into Juan's PR.
const producer=(p:string)=>import(pathToFileURL(resolve('src',p)).href);
const [{ConfirmedManifestSchema},{createMemoryAnalysisJobRepository},jobsApi,signer,luis]=await Promise.all([
 producer('shared/schemas/meta/manifest-commands.ts'),producer('server/modules/analysis-jobs/memory-repository.ts'),producer('server/modules/analysis-jobs/service.ts'),producer('server/modules/analysis-jobs/callback-signature.ts'),producer('server/ai/meta/explain-reconciliation.ts'),
]);
const checks:string[]=[];
const payload={schemaVersion:'2.0',origin:{facilityId:'c2330000-0000-4000-8000-000000000001'},destination:{facilityId:'c2330000-0000-4000-8000-000000000002'},pickupWindow:{startsAt:'2026-11-02T08:00:00Z',endsAt:'2026-11-02T18:00:00Z'},deliveryWindow:{startsAt:'2026-11-03T08:00:00Z',endsAt:'2026-11-03T20:00:00Z'},acceptedModes:['ROAD'],requiredEquipment:null,cargoSpecification:{categoryCode:'GENERAL',description:'[SYNTHETIC] Juan assembled local verification',packaging:'BOX',totalWeightKg:800,totalVolumeM3:8,divisible:true,requirements:[],units:[{packageType:'Cajas de prueba',quantity:8,weightPerUnitKg:100,volumePerUnitM3:1,dimensionsCm:{length:100,width:100,height:100},indivisible:true,stackable:false}]},contacts:{pickup:{name:'Synthetic sender',phoneE164:'+12025550123'},recipient:{name:'Synthetic receiver',phoneE164:'+12025550124'}}};
const request=(await http('/freight/requests',payload,undefined,201)).data;
const preparation=(await http(`/freight/requests/${request.id}/declaration-preparations`,{expectedDraftVersion:1,expectedManifestRevision:0},undefined,201)).data;
const manifest=ConfirmedManifestSchema.parse((await http(`/freight/requests/${request.id}/declared-manifests`,{preparationId:preparation.id,expectedDraftVersion:1,expectedManifestRevision:0,contentHash:preparation.contentHash,confirmed:true},undefined,201)).data);
const open={requestId:request.id,facilityId:payload.origin.facilityId,manifestId:manifest.id,manifestRevision:manifest.revision,mode:'DEMO',groups:manifest.declaration.groupBindings.map((g:{groupId:string})=>({groupId:g.groupId,unit:'BOX'}))};
const openKey=crypto.randomUUID();let b=LoadingBundleSchema.parse((await http('/meta/loading-sessions',open,openKey,201)).data);
assert.equal((await http('/meta/loading-sessions',open,openKey)).data.session.id,b.session.id);
checks.push('Native Auth -> request -> CR-01 prepare/explicit confirm -> persistent session; opening replay');
const path=`/meta/loading-sessions/${b.session.id}`,sessionId=b.session.id,groupId=b.session.groups[0].id;
const service=new LoadingOperationService(createLoadingOperationRepository(user as unknown as LoadingRpcClient));
const savedJobs=createMemoryAnalysisJobRepository(),callbackSecret='synthetic-local-test-secret-'.repeat(3);
const fixture=JSON.parse(readFileSync('src/shared/schemas/meta/fixtures/dockmind-result.requires-review.json','utf8'));
const deps={sessions:createLoadingAnalysisSessionReader(service,actor),clips:{getClip:async()=>({evidenceId:'synthetic-local-clip',organizationId:actor.organizationId,sessionId,source:'SYNTHETIC_RENDER',mimeType:'video/mp4',sizeBytes:1000}),signedReadUrl:async()=> 'https://synthetic.example.invalid/clip',signedOverlayUploadUrl:async()=>null},jobs:savedJobs,worker:{dispatch:async()=>({callId:'injected-no-network',duplicate:false})},config:{callbackUrl:'https://synthetic.example.invalid/callback',callbackSecret,clipUrlTtlSeconds:300},now:()=>new Date(),newId:()=>crypto.randomUUID()};
async function result(positive:boolean){
 const config={line:fixture.observation.config.line,unit:'BOX',concept:'cardboard box',margin:positive?0.02:0.01};
 const requested=await jobsApi.requestAnalysis(deps,actor,{sessionId,evidenceId:'synthetic-local-clip',groupId,coverage:'COMPLETE',config});
 const job=await savedJobs.get(requested.job.jobId);assert(job);
 const rawResult={...structuredClone(fixture),job_id:job.jobId,attempt:job.attempt,session_id:sessionId,evidence_id:job.evidenceId,manifest_revision:job.manifestRevision};
 // Positive contract fixture only: no claim that a new video/inference cleared a real alert.
 if(positive){rawResult.observation.result.status='OK';rawResult.observation.result.flags=[];rawResult.observation.config.margin=config.margin;}
 const raw=JSON.stringify(rawResult),timestamp=Math.floor(Date.now()/1000),headers=new Headers({'x-dockmind-timestamp':String(timestamp),'x-dockmind-signature':signer.signDockMindBody(raw,callbackSecret,timestamp)});
 assert.equal((await jobsApi.receiveWorkerCallback(deps,raw,headers)).accepted,true);
 const saved=await savedJobs.get(job.jobId);assert(saved);const accepted=await recordLoadingObservation(writer,saved);
 assert.equal(accepted.reason,'RECORDED');assert.equal((await recordLoadingObservation(writer,saved)).reason,'ALREADY_RECORDED');
 return accepted.id!;
}
let observationId=await result(false);b=LoadingBundleSchema.parse((await http(path)).data);
assert.equal(b.observations[0].flags[0].kind,'ID_SWITCH_SUSPECTED');
const select=async(id:string)=>{b=LoadingBundleSchema.parse((await http(`${path}/observation-selections`,{expectedVersion:b.session.version,groupId,observationId:id,coverage:'COMPLETE',reason:'[SYNTHETIC] Full group contract test, not physical verification'})).data);};
await select(observationId);
assert.equal((await http(path)).comparison.rows[0].delta,null);
// Produce a separate synthetic OK job while the analysis scope is open.
observationId=await result(true);b=LoadingBundleSchema.parse((await http(path)).data);await select(observationId);
const closeKey=crypto.randomUUID(),close={expectedVersion:b.session.version};
await http(`${path}/close`,{expectedVersion:1},undefined,409);
b=LoadingBundleSchema.parse((await http(`${path}/close`,close,closeKey)).data);
assert.equal((await http(`${path}/close`,close,closeKey)).meta.idempotentReplay,true);
const compared=await http(path);assert.equal(compared.comparison.rows[0].delta,5);assert.equal(compared.comparison.rows[0].planned,null);
checks.push('Actual Ramon service + HMAC callback; uncertain fixture retained; separate OK contract fixture; no inference/Modal call');
const passport=(await http(`${path}/passports`,{expectedVersion:b.session.version},undefined,201)).data;
const facts=loadingExplanationFacts(passport,groupId);
const access=createLoadingReconciliationAccess(service,actor,{sessionId,passportId:passport.id,groupId},luis.explanationFactsFingerprint);
const plan={schemaVersion:'1.0',reconciliationId:facts.reconciliationId,reconciliationVersion:facts.reconciliationVersion,comparisonStatus:'DIFFERENCE_PROPOSED',summaryFact:'COMPARATOR_DIFFERENCE',reasonFacts:['SESSION_CLOSED','EVIDENCE_SUFFICIENT','SAME_UNIT','REFERENCED_EVENTS'],suggestedActions:['REVIEW_EVIDENCE'],evidenceRefs:facts.events.slice(0,1),requiresHumanReview:true};
const explained=await luis.explainReconciliation({schemaVersion:'1.0',reconciliationId:facts.reconciliationId,reconciliationVersion:facts.reconciliationVersion,language:'es'},actor,{reconciliation:access,provider:{transport:'INJECTED',configuration:()=>({model:'muse-spark-1.3-local-fixture',timeoutMs:1000,maxOutputTokens:2048}),requestJson:async()=>({content:JSON.stringify(plan),model:'muse-spark-1.3-local-fixture',requestId:'local-contract-test',usage:null})}});
assert(explained.ok&&explained.explanation,JSON.stringify(explained.ok?explained.guidance:explained.error));await recordLoadingExplanation(writer,passport,groupId,explained.explanation);
let reread=await http(`${path}/passports/${passport.id}`);assert.equal(reread.data.explanations.length,1);assert.equal(reread.meta.isCurrent,true);assert.match(reread.data.explanations[0].value.summary,/diferencia registrada 5 BOX/);
checks.push('Actual Luis access + grounded renderer + injected provider -> stored scoped explanation -> Passport reload');
let changed=await http(`/freight/requests/${request.id}/revisions`,{expectedDraftVersion:1,value:payload});
assert.equal((await http(path)).data.currentManifest.contentCurrent,true);
const revisionPayload=structuredClone(payload);revisionPayload.cargoSpecification.units[0].quantity=9;revisionPayload.cargoSpecification.totalWeightKg=900;revisionPayload.cargoSpecification.totalVolumeM3=9;
changed=await http(`/freight/requests/${request.id}/revisions`,{expectedDraftVersion:changed.data.draftVersion,value:revisionPayload});
assert.equal((await http(path)).comparison.rows[0].status,'OUTDATED');reread=await http(`${path}/passports/${passport.id}`);assert.equal(reread.meta.isCurrent,false);assert.equal(reread.data.comparison.rows[0].delta,5);
await http(`${path}/passports/${passport.id}/explanation-input?groupId=${groupId}`,undefined,undefined,409);
await http(`/freight/requests/${request.id}/revisions`,{expectedDraftVersion:changed.data.draftVersion,value:payload});
checks.push('Unchanged material survives draft version; material revision invalidates live comparison, preserves historical Passport, blocks stale explanation');
assert.equal((await http(path)).comparison.rows[0].status,'DIFFERENCE_PROPOSED');
const resultPath=process.env.CARGOMESH_LOADING_TEST_RESULT;assert(resultPath,'Provide an output path outside the repository');
writeFileSync(resultPath,JSON.stringify({synthetic:true,liveInference:false,hostedChanges:false,app:api,sessionId,requestId:request.id,passportId:passport.id,checks},null,2)+'\n');
console.log(JSON.stringify({passed:checks.length,synthetic:true,sessionId,passportId:passport.id,checks},null,2));
}
void main().catch(error=>{console.error(error instanceof Error?error.message:'Local integration failed.');process.exitCode=1;});
