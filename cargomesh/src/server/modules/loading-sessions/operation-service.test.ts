import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {LoadingOperationService,type LoadingOperationRepository} from './operation-service';
import {createLoadingOperationRepository} from './supabase-operation-repository';
import {createLoadingAnalysisSessionReader,createLoadingReconciliationAccess,recordLoadingObservation} from './producer-ports';
import {loadingBundleFixture,loadingPassportFixture,loadingId} from '@/shared/schemas/meta/loading-operation.fixtures';

const b=loadingBundleFixture(),actor={organizationId:b.session.organizationId,memberId:b.session.openedBy},key=loadingId(99);
const repository=(call:LoadingOperationRepository['call']):LoadingOperationRepository=>({call});
describe('Loading operation trust boundary',()=>{
 it('requires identity, explicit unit mapping, versions and UUID idempotency before writes',async()=>{
  let calls=0;const service=new LoadingOperationService(repository(async()=>{calls++;return null;}));
  await assert.rejects(service.open(actor,{},key));await assert.rejects(service.change(actor,b.session.id,'close',{expectedVersion:0},key));await assert.rejects(service.change(actor,b.session.id,'close',{expectedVersion:1},'bad'));
  await assert.rejects(service.list({...actor,memberId:'bad'},{}));assert.equal(calls,0);
 });
 it('does not return a foreign session or list and propagates a persistence failure',async()=>{
  const foreign=loadingBundleFixture();foreign.session.organizationId=loadingId(90);foreign.session.manifest.declaration.source.organizationId=loadingId(90);foreign.observations[0].organizationId=loadingId(90);
  const service=new LoadingOperationService(repository(async(_a,action)=>action==='list'?[foreign.session]:foreign));
  await assert.rejects(service.read(actor,b.session.id));await assert.rejects(service.list(actor,{}));
  await assert.rejects(new LoadingOperationService(repository(async()=>{throw new Error('offline');})).read(actor,b.session.id),/offline/);
 });
 it('rejects an opening receipt that changes the operator chosen unit mapping',async()=>{
  const service=new LoadingOperationService(repository(async()=>({record:b,replay:false})));
  await assert.rejects(service.open(actor,{requestId:b.session.requestId,manifestId:b.session.manifest.id,manifestRevision:1,facilityId:b.session.facilityId,mode:'DEMO',groups:[{groupId:b.session.groups[0].id,unit:'BOX'}]},key),/Opening receipt scope mismatch/);
 });
 it('keeps historical Passport readable but refuses explanation from a stale source',async()=>{
  const p=loadingPassportFixture(),service=new LoadingOperationService(repository(async()=>({record:p,currentVersion:p.sessionVersion+1,manifestCurrent:true,explanations:[]})));
  const read=await service.readPassport(actor,b.session.id,p.id);assert.equal(read.meta.isCurrent,false);assert.equal(read.data.comparison.rows[0].delta,2);
  await assert.rejects(service.explanationFacts(actor,b.session.id,p.id,b.session.groups[0].id),/current session version/);
 });
 it('rechecks the bound actor and currency for producer read ports',async()=>{
  const member={...actor,userId:loadingId(70)},service=new LoadingOperationService(repository(async(_a,action)=>action==='read'?b:{record:loadingPassportFixture(),currentVersion:4,manifestCurrent:true,explanations:[]}));
  const sessions=createLoadingAnalysisSessionReader(service,member);assert.equal((await sessions.getForAnalysis(member,b.session.id))?.manifestRevision,1);assert.equal(await sessions.getForAnalysis({...member,userId:loadingId(71)},b.session.id),null);
  const access=createLoadingReconciliationAccess(service,member,{sessionId:b.session.id,passportId:loadingId(11),groupId:b.session.groups[0].id},()=> 'hash');
  const ref={actor:member,reconciliationId:b.session.groups[0].comparisonId,reconciliationVersion:4,signal:new AbortController().signal};
  assert.equal((await access.readAuthorized(ref))?.facts.differenceQuantity,2);assert.equal(await access.checkCurrent({...ref,factsFingerprint:'hash'}),'CURRENT');assert.equal(await access.checkCurrent({...ref,factsFingerprint:'changed'}),'STALE');
 });
 it('uses scoped RPC args and exposes missing capability without a fallback',async()=>{
  const db={async rpc(name:string,args:Record<string,unknown>){assert.equal(name,'meta_loading_sessions_v1');assert.equal(args.p_organization_id,actor.organizationId);return {data:null,error:{code:'PGRST202',message:'missing'}};}};
  const service=new LoadingOperationService(createLoadingOperationRepository(db));await assert.rejects(service.read(actor,b.session.id),/not installed/);
 });
 it('does not forward invalid worker counts to privileged persistence',async()=>{
  let calls=0;await assert.rejects(recordLoadingObservation({async rpc(){calls++;return {data:null,error:null};}},{}));assert.equal(calls,0);
 });
});
