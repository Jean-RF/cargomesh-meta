/** Opt-in local integration of the existing document case. No cloud or paid inference.
 * Real Auth/RPC/Storage/Python/HMAC. SYNTHETIC_RENDER + FIXTURE + INJECTED explanation.
 * Run with .env.local, react-server conditions and META_CONNECTED_DEMO_DIR outside Git.
 */
import assert from 'node:assert/strict';
import {createHash, randomBytes, randomUUID} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {createServer} from 'node:http';
import {spawn, spawnSync} from 'node:child_process';
import {resolve, join} from 'node:path';
import {Hono} from 'hono';
import {createClient} from '@supabase/supabase-js';
import type {DockMindJob} from '../src/shared/schemas/meta/dockmind';
import type {WorkerDispatcher} from '../src/server/modules/analysis-jobs/ports';
import type {LoadingBundle} from '../src/shared/schemas/meta/loading-operation';
import type {ExplanationProvider} from '../src/server/ai/meta/explain-reconciliation';
import {LoadingOperationService} from '../src/server/modules/loading-sessions/operation-service';
import {createLoadingOperationRepository, type LoadingRpcClient} from '../src/server/modules/loading-sessions/supabase-operation-repository';
import {createPassportExplanationRepository} from '../src/server/modules/loading-sessions/passport-explanation-repository';
import {PassportExplanationService} from '../src/server/modules/loading-sessions/passport-explanation-service';
import {loadingExplanationFacts} from '../src/shared/meta/loading-operation';

async function main() {
  const api = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  assert.equal(api, 'http://127.0.0.1:64321', 'Authorized isolated Meta database only');
  const folder = process.env.META_CONNECTED_DEMO_DIR;
  assert(folder && resolve(folder).startsWith(resolve('../../tmp') + '\\'), 'Use integration/tmp for local artifacts');
  mkdirSync(folder, {recursive:true});
  const statePath=join(folder,'state.json');
  const state: Record<string, any> = existsSync(statePath) ? JSON.parse(readFileSync(statePath,'utf8')) : {};
  const save=()=>writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');
  const key=(name:string)=>{if(!state[name]){state[name]=randomUUID();save();}return state[name] as string;};
  process.env.DOCKMIND_CALLBACK_SECRET=randomBytes(32).toString('hex');
  const requestId='8b0fed7d-4cc3-4cc3-b819-8f68fdeefebe';
  const manifestId='163cd0cc-a0d2-4f8e-bcde-310c689fcafd';
  const groupIds=['879dc96b-3c00-43e1-b772-619996b2b713','d1b2aab3-29d2-4b90-8a70-d369c0dd1f6c'];
  const worker=resolve('dockmind-worker'), python=join(worker,'.venv','Scripts','python.exe');
  assert(existsSync(python));
  // Geometry defines detections; expected quantities are only checked after the counter runs.
  const generated=spawnSync(python,['-c',String.raw`
import sys
from pathlib import Path
from dockmind.synthetic import Scenario,SyntheticBox,render,fixture_text
out=Path(sys.argv[1])
for name,n in [('group-a',8),('group-b',3)]:
 boxes=tuple(SyntheticBox(i,380+(i%3)*80,((.5+i*1.4,-120.),(.5+i*1.4+4.75,1400.))) for i in range(n))
 scenario=Scenario(name,6.+(n-1)*1.4,boxes)
 if not (out/(name+'.mp4')).exists(): render(scenario,out/(name+'.mp4'))
 (out/(name+'.fixture.txt')).write_text(fixture_text(scenario),encoding='utf8')
print('Rendered two explicitly synthetic clips')
`,folder],{cwd:worker,encoding:'utf8',env:{...process.env,PYTHONPATH:'src'}});
  assert.equal(generated.status,0,generated.stderr.slice(-1000));
  console.log(generated.stdout.trim());
  const reader=createClient(api,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const logged=await reader.auth.signInWithPassword({email:'qa-v2-a@cargomesh.test',password:process.env.CARGOMESH_DEMO_CLIENT_PASSWORD!});
  assert.ifError(logged.error);
  const token=logged.data.session!.access_token;
  const {createHonoApp}=await import('../src/server/hono/app');
  const {createDockMindRouter}=await import('../src/server/hono/routes/meta/dockmind');
  const {dockmindRequestDeps,dockmindServerDeps}=await import('../src/server/modules/analysis-jobs/wiring');
  const receipts=new Map<string,Promise<Record<string,any>>>();
  const test='https://local.dockmind.test';
  let port=0,dispatches=0;
  const dispatcher:WorkerDispatcher={async dispatch(job:DockMindJob){
    const index=groupIds.indexOf(job.group_id!); assert(index>=0,'Unknown manifest group');
    const child=spawn(python,[join(worker,'scripts','local_e2e_job.py'),join(folder,`group-${index===0?'a':'b'}.fixture.txt`)],{
      cwd:worker,env:{NODE_ENV:process.env.NODE_ENV,PATH:process.env.PATH,SYSTEMROOT:process.env.SYSTEMROOT,TEMP:process.env.TEMP,TMP:process.env.TMP,PYTHONIOENCODING:'utf-8',
        DOCKMIND_CALLBACK_SECRET:process.env.DOCKMIND_CALLBACK_SECRET,
        DOCKMIND_LOCAL_URL_MAP:JSON.stringify({[test+'/storage/']:api+'/storage/',[test+'/api/']:`http://127.0.0.1:${port}/api/`})}});
    let out='',err='';child.stdout.on('data',c=>out+=c);child.stderr.on('data',c=>err+=c);
    receipts.set(job.job_id,new Promise((done,fail)=>{child.on('error',fail);child.on('close',code=>code===0?done(JSON.parse(out.trim().split('\n').at(-1)!)):fail(new Error(err.slice(-1500))));}));
    child.stdin.end(JSON.stringify(job));dispatches++;
    return {callId:`local-${child.pid}`,duplicate:false};
  }};
  const dock=new Hono().basePath('/api/v2').route('/',createDockMindRouter({async request(member){
    const deps=await dockmindRequestDeps(member);
    return {...deps,storage:{...deps.storage,
      signedReadUrl:async(path,ttl)=>(await deps.storage.signedReadUrl(path,ttl)).replace(api,test),
      signedOverlayUploadUrl:async path=>(await deps.storage.signedOverlayUploadUrl(path)).replace(api,test)},
      worker:()=>dispatcher,config:()=>({callbackUrl:test+'/api/v2/meta/dockmind/callback',clipUrlTtlSeconds:3600,workerMode:'MODAL' as const})};
  },server:dockmindServerDeps}));
  const bridge=createServer(async(req,res)=>{try{
    const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(chunk as Buffer);
    const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(typeof v==='string')headers.set(k,v);
    const response=await dock.fetch(new Request(`http://127.0.0.1:${port}${req.url}`,{method:req.method,headers,body:chunks.length?Buffer.concat(chunks):undefined}));
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500);res.end();}});
  await new Promise<void>(done=>bridge.listen(0,'127.0.0.1',done));port=(bridge.address() as {port:number}).port;
  const core=createHonoApp();
  async function call(app:typeof core,path:string,body?:unknown,idempotency?:string):Promise<Record<string,any>>{
    const r=await app.request('http://localhost/api/v2'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,
      ...(body===undefined?{}:{'Content-Type':'application/json','Idempotency-Key':idempotency??randomUUID()})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const value=await r.json() as Record<string,any>;
    assert(r.ok,`${path}: HTTP ${r.status} ${value.error?.code}`);return value;
  }
  try{
    const manifest=(await call(core,`/freight/requests/${requestId}/declared-manifests/current`)).data;
    assert.equal(manifest.id,manifestId);assert.deepEqual(manifest.declaration.groupBindings.map((g:any)=>g.groupId),groupIds);
    const opened=await call(core,'/meta/loading-sessions',{requestId,manifestId,manifestRevision:1,facilityId:'c2330000-0000-4000-8000-000000000001',mode:'DEMO',groups:groupIds.map(groupId=>({groupId,unit:'BOX'}))},key('openKey'));
    state.sessionId=opened.data.session.id;save();
    const base=`/meta/loading-sessions/${state.sessionId}`;
    let bundle:LoadingBundle=(await call(core,base)).data;
    if(bundle.session.state==='OPEN')for(const [index,groupId]of groupIds.entries()){
      const bytes:Buffer=readFileSync(join(folder,`group-${index===0?'a':'b'}.mp4`));
      const sha256=createHash('sha256').update(bytes).digest('hex');
      const registered:Record<string,any>=(await call(dock,'/meta/dockmind/clips',{sessionId:state.sessionId,source:'SYNTHETIC_RENDER',mimeType:'video/mp4',sizeBytes:bytes.length,sha256},key(`clipKey${index}`))).data;
      const clipId:string=registered.clip.clipId;
      if(registered.clip.state!=='READY'){
        const put=await fetch(registered.upload.url,{method:'PUT',headers:{'content-type':'video/mp4','x-upsert':'false'},body:new Uint8Array(bytes)});
        assert(put.ok,'Private clip upload failed');
      }
      await call(dock,`/meta/dockmind/clips/${clipId}/complete`,{});
      const command:Record<string,unknown>={sessionId:state.sessionId,evidenceId:clipId,groupId,coverage:'COMPLETE',config:{line:{x1:.5,y1:0,x2:.5,y2:1,inside_x:.8,inside_y:.5},unit:'BOX',concept:'cardboard box'}};
      const job:Record<string,any>=(await call(dock,'/meta/dockmind/jobs',command)).data;
      const receipt=receipts.has(job.jobId)?await receipts.get(job.jobId):null;
      const view:Record<string,any>=(await call(dock,`/meta/dockmind/jobs/${job.jobId}`)).data;
      assert.deepEqual([view.status,view.delivery.status,view.overlayStatus],['SUCCEEDED','DELIVERED','VERIFIED']);
      assert.equal((await call(dock,'/meta/dockmind/jobs',command)).data.jobId,job.jobId,'Replay created another job');
      const overlay=(await call(dock,`/meta/dockmind/jobs/${job.jobId}/overlay`)).data;
      const movie:Response=await fetch(overlay.url.replace(test,api));assert.equal(movie.status,200);
      const overlaySha256=createHash('sha256').update(Buffer.from(await movie.arrayBuffer())).digest('hex');
      if(receipt)assert.equal(overlaySha256,receipt.overlay_sha256);
      bundle=(await call(core,base)).data;
      const observed=bundle.observations.filter(o=>o.jobId===job.jobId);assert.equal(observed.length,1);
      assert.equal(observed[0].net,index===0?8:3);assert.equal(observed[0].realInference,false);
      state[`group${index}`]={groupId,clipId,sha256,jobId:job.jobId,observationId:observed[0].id,observed:observed[0].net,source:observed[0].source,realInference:false,overlaySha256,receipt};save();
      bundle=(await call(core,base+'/observation-selections',{expectedVersion:bundle.session.version,groupId,observationId:observed[0].id,coverage:'COMPLETE',reason:'[SYNTHETIC] Automated QA acceptance of complete single-group generated clip; fixture counter, no physical or SAM validation.'},key(`selectionKey${index}`))).data;
      console.log(`Group ${index+1}: private clip -> Python FIXTURE -> ${observed[0].net} BOX -> persisted observation and verified overlay`);
    }
    bundle=(await call(core,base)).data;
    if(bundle.session.state==='OPEN')bundle=(await call(core,base+'/close',{expectedVersion:bundle.session.version},key('closeKey'))).data;
    const passport=(await call(core,base+'/passports',{expectedVersion:bundle.session.version},key('passportKey'))).data;
    state.passportId=passport.id;save();
    assert.deepEqual(passport.comparison.rows.map((r:any)=>[r.declared,r.observed,r.status]),[[8,8,'MATCH'],[4,3,'DIFFERENCE_PROPOSED']]);
    const admin=createClient(api,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
    const actor={userId:'c2310000-0000-4000-8000-000000000001',memberId:'c2320000-0000-4000-8000-000000000001',organizationId:'c2300000-0000-4000-8000-000000000001',role:'OWNER' as const,status:'ACTIVE',userEmail:'qa-v2-a@cargomesh.test'};
    let injectedCalls=0;
    for(const groupId of groupIds){
      const facts=loadingExplanationFacts(passport,groupId);
      const provider:ExplanationProvider={transport:'INJECTED',configuration:()=>({model:'muse-spark-1.3',timeoutMs:2000,maxOutputTokens:2048}),requestJson:async()=>{
        injectedCalls++;return {content:JSON.stringify({schemaVersion:'1.0',reconciliationId:facts.reconciliationId,reconciliationVersion:facts.reconciliationVersion,comparisonStatus:facts.comparisonStatus,
          summaryFact:facts.comparisonStatus==='MATCH'?'COMPARATOR_MATCH':'COMPARATOR_DIFFERENCE',reasonFacts:['SESSION_CLOSED','EVIDENCE_SUFFICIENT','SAME_UNIT','REFERENCED_EVENTS'],suggestedActions:['REVIEW_EVIDENCE','CHECK_MANIFEST'],evidenceRefs:facts.events.slice(0,1),requiresHumanReview:true}),model:'muse-spark-1.3',requestId:'injected-local-connected-demo',usage:null};
      }};
      const service=new PassportExplanationService({operations:new LoadingOperationService(createLoadingOperationRepository(reader as unknown as LoadingRpcClient)),repository:createPassportExplanationRepository(reader as unknown as LoadingRpcClient,()=>admin as unknown as LoadingRpcClient),provider});
      const generated=await service.generate(actor,{sessionId:state.sessionId,passportId:passport.id},{groupId,expectedVersion:passport.sessionVersion,language:'es',retryOf:null},key('explanation-'+groupId));
      assert.equal(generated.data.status,'SAVED');
    }
    const reopened=await call(core,base+`/passports/${passport.id}`);
    assert.equal(reopened.meta.isCurrent,true);assert.equal(reopened.data.explanations.length,2);
    const metadata=(await call(core,base+`/passports/${passport.id}/explanations`)).data;
    assert(metadata.attempts.every((a:any)=>a.metadata.transport==='INJECTED'));
    state.result={ranAt:new Date().toISOString(),requestId,manifestId,sessionId:state.sessionId,passportId:passport.id,dispatches,injectedCalls,
      mode:'DEMO',segmenter:'FIXTURE',realInference:false,explanationTransport:'INJECTED',rows:passport.comparison.rows,
      effects:passport.effects,url:`http://127.0.0.1:8080/tetris?session=${state.sessionId}&passport=${passport.id}`};save();
    writeFileSync(join(folder,'result.json'),JSON.stringify(state.result,null,2)+'\n');
    console.log('PASS: same two manifest groups -> closed comparison -> persisted Passport -> two grounded INJECTED explanations -> reopen');
    console.log(state.result.url);
  }finally{await new Promise<void>(done=>bridge.close(()=>done()));}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Local integration failed');process.exitCode=1;});
