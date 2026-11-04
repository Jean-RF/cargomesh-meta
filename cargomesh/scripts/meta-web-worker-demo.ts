/** Opt-in local HTTP acceptance of the running Next8080 + dockmind8765 stack.
 * Same document case, separate DEMO session. No in-process routers, fake dispatchers,
 * paid inference, commercial commands or automatic explanations. Coverage actions
 * are explicitly automated QA of SYNTHETIC_RENDER clips, not human physical review.
 * Start the launcher with the matching group's FIXTURE before --group=a or b.
 */
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {basename,join,resolve} from 'node:path';
import type {LoadingBundle} from '../src/shared/schemas/meta/loading-operation';

async function main(){
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'http://127.0.0.1:64321');
  assert.equal(process.env.DOCKMIND_WORKER_MODE,'LOCAL_LOOPBACK');
  assert.equal(process.env.DOCKMIND_WORKER_URL,'http://127.0.0.1:8765/jobs');
  assert.equal(process.env.DOCKMIND_CALLBACK_URL,'http://127.0.0.1:8080/api/v2/meta/dockmind/callback');
  assert.notEqual(process.env.NODE_ENV,'production');assert(!process.env.VERCEL);
  const folder=process.env.META_WEB_WORKER_STATE_DIR,clips=process.env.META_WEB_WORKER_CLIP_DIR;
  assert(folder&&clips,'Explicit local state and compatible synthetic clips required');
  assert(resolve(folder).startsWith(resolve('../../tmp')+'\\'));
  mkdirSync(folder,{recursive:true});
  const statePath=join(folder,'state.json');
  const state:Record<string,any>=existsSync(statePath)?JSON.parse(readFileSync(statePath,'utf8')):{};
  const save=()=>writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');
  const intent=(name:string)=>{if(!state[name]){state[name]=randomUUID();save();}return state[name] as string;};
  const group=process.argv.find(a=>a.startsWith('--group='))?.split('=')[1];
  const finalize=process.argv.includes('--finalize');assert(group==='a'||group==='b'||finalize,'Use --group=a/b or --finalize');
  const requestId='8b0fed7d-4cc3-4cc3-b819-8f68fdeefebe',manifestId='163cd0cc-a0d2-4f8e-bcde-310c689fcafd';
  const ids=['879dc96b-3c00-43e1-b772-619996b2b713','d1b2aab3-29d2-4b90-8a70-d369c0dd1f6c'];
  // Optional reviewed supplier package. Its reference evaluates the result AFTER
  // counting; it is never included in the analysis command or sent to the worker.
  const deliveryPath=process.env.META_WEB_WORKER_DELIVERY_FILE;
  const deliveryBytes=deliveryPath?readFileSync(deliveryPath):null;
  const delivery:unknown=deliveryBytes?JSON.parse(deliveryBytes.toString('utf8')):null;
  const samples:Array<{clip:string;sha256:string;bytes:number;group_id:string;unidades_declaradas:number}>=[];
  if(delivery){
    assert(typeof delivery==='object'&&'clips' in delivery&&Array.isArray(delivery.clips));
    assert.equal(delivery.clips.length,2);
    for(const [i,id]of ids.entries()){
      const sample:(typeof samples)[number]|undefined=delivery.clips.find((s:Record<string,unknown>)=>s.group_id===id);
      assert(sample&&typeof sample.clip==='string'&&sample.clip===basename(sample.clip));
      assert.equal(sample.clip,`grupo_${i===0?'a':'b'}_sintetico.mp4`);
      assert.equal(typeof sample.sha256,'string');assert.match(sample.sha256,/^[a-f0-9]{64}$/);
      assert(Number.isSafeInteger(sample.bytes)&&sample.bytes>0);assert.equal(sample.unidades_declaradas,i===0?8:4);
      samples.push(sample);
    }
    const digest=createHash('sha256').update(deliveryBytes!).digest('hex');
    if(state.deliverySha256)assert.equal(state.deliverySha256,digest,'Delivery changed: use a separate acceptance state');
    state.deliverySha256=digest;save();
  }
  const expectedCounts=samples.length?samples.map(s=>s.unidades_declaradas):[8,3];
  const origin='http://127.0.0.1:8080';
  const auth=await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL+'/auth/v1/token?grant_type=password',{
    method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,'Content-Type':'application/json'},
    body:JSON.stringify({email:'qa-v2-a@cargomesh.test',password:process.env.CARGOMESH_DEMO_CLIENT_PASSWORD}),signal:AbortSignal.timeout(20000)});
  assert.equal(auth.status,200,'Local Auth unavailable');const token=(await auth.json()).access_token as string;
  async function http(path:string,body?:unknown,key?:string):Promise<Record<string,any>>{
    const r=await fetch(origin+'/api/v2'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,
      ...(body===undefined?{}:{'Content-Type':'application/json','Idempotency-Key':key??randomUUID()})},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(90000)});
    const value=await r.json() as Record<string,any>;assert(r.ok,`${path}: HTTP ${r.status} ${value.error?.code??'INVALID_RESPONSE'}`);return value;
  }
  const manifest=(await http(`/freight/requests/${requestId}/declared-manifests/current`)).data;
  assert.equal(manifest.id,manifestId);assert.deepEqual(manifest.declaration.groupBindings.map((g:any)=>g.groupId),ids);
  if(!state.sessionId){
    const opened=await http('/meta/loading-sessions',{requestId,manifestId,manifestRevision:1,facilityId:'c2330000-0000-4000-8000-000000000001',mode:'DEMO',groups:ids.map(groupId=>({groupId,unit:'BOX'}))},intent('openKey'));
    state.sessionId=opened.data.session.id;state.requestId=requestId;state.manifestId=manifestId;save();
  }
  const base='/meta/loading-sessions/'+state.sessionId;
  let bundle:LoadingBundle=(await http(base)).data;
  if(group){
    assert.equal(bundle.session.state,'OPEN','Use a new explicit acceptance state for another session');
    const index=group==='a'?0:1,groupId=ids[index];
    const bytes=readFileSync(join(clips,samples[index]?.clip??`group-${group}.mp4`));
    const sha256=createHash('sha256').update(bytes).digest('hex');
    if(samples[index]){assert.equal(sha256,samples[index].sha256,'Supplier clip hash mismatch');assert.equal(bytes.length,samples[index].bytes);}
    const registered=(await http('/meta/dockmind/clips',{sessionId:state.sessionId,source:'SYNTHETIC_RENDER',mimeType:'video/mp4',sizeBytes:bytes.length,sha256},intent('clipKey-'+group))).data;
    const clipId=registered.clip.clipId as string;
    if(registered.clip.state!=='READY'){
      const upload=await fetch(registered.upload.url,{method:'PUT',body:new Uint8Array(bytes),headers:{'Content-Type':'video/mp4','x-upsert':'false'},signal:AbortSignal.timeout(30000)});
      assert(upload.ok,'Private clip upload failed');
    }
    await http(`/meta/dockmind/clips/${clipId}/complete`,{});
    const command={sessionId:state.sessionId,evidenceId:clipId,groupId,coverage:'COMPLETE',config:{line:{x1:.5,y1:0,x2:.5,y2:1,inside_x:.8,inside_y:.5},unit:'BOX',concept:'cardboard box'}};
    const started=(await http('/meta/dockmind/jobs',command)).data;
    let view=started;
    for(let i=0;i<60;i++){
      view=(await http('/meta/dockmind/jobs/'+started.jobId)).data;
      if(view.status==='FAILED'||(view.status==='SUCCEEDED'&&view.delivery.status==='DELIVERED'))break;
      await new Promise(done=>setTimeout(done,2000));
    }
    assert.deepEqual([view.status,view.delivery.status,view.overlayStatus],['SUCCEEDED','DELIVERED','VERIFIED'],'HTTP worker pipeline incomplete');
    assert.equal(view.result.net,expectedCounts[index],'Counter does not match the reviewed synthetic scenario');
    assert.equal((await http('/meta/dockmind/jobs',command)).data.jobId,started.jobId,'Replay created another job');
    bundle=(await http(base)).data;
    const observations=bundle.observations.filter(o=>o.jobId===started.jobId);assert.equal(observations.length,1);
    const observation=observations[0];assert.equal(observation.groupId,groupId);assert.equal(observation.clipSha256,sha256);
    assert.equal(observation.realInference,false);assert.equal(observation.source,'SYNTHETIC_RENDER');
    const overlay=(await http(`/meta/dockmind/jobs/${started.jobId}/overlay`)).data;
    const media=await fetch(overlay.url,{signal:AbortSignal.timeout(30000)});assert.equal(media.status,200);
    const overlaySha256=createHash('sha256').update(Buffer.from(await media.arrayBuffer())).digest('hex');
    const selected=bundle.selections.find(s=>s.groupId===groupId);
    if(selected?.observationId!==observation.id)bundle=(await http(base+'/observation-selections',{
      expectedVersion:bundle.session.version,groupId,observationId:observation.id,coverage:'COMPLETE',
      reason:'[SYNTHETIC] Automated HTTP QA: matching single-group fixture; complete synthetic clip, no physical review or real SAM.'},intent('selectKey-'+group))).data;
    state['group-'+group]={groupId,clipId,clipSha256:sha256,jobId:started.jobId,attempt:view.attempt,observationId:observation.id,
      net:observation.net,source:observation.source,realInference:false,status:view.status,delivery:view.delivery.status,overlayStatus:view.overlayStatus,overlaySha256};save();
    console.log(`PASS group ${group.toUpperCase()}: real Next HTTP -> local launcher -> ${observation.net} BOX -> verified overlay -> Juan observation`);
    console.log(`http://127.0.0.1:8080/tetris?session=${state.sessionId}`);
  }
  if(finalize){
    assert(state['group-a']&&state['group-b'],'Both distinct groups must be processed first');
    bundle=(await http(base)).data;
    if(bundle.session.state==='OPEN')bundle=(await http(base+'/close',{expectedVersion:bundle.session.version},intent('closeKey'))).data;
    const passport=(await http(base+'/passports',{expectedVersion:bundle.session.version},intent('passportKey'))).data;
    assert.deepEqual(passport.comparison.rows.map((r:any)=>[r.declared,r.observed,r.status]),
      [[8,expectedCounts[0],expectedCounts[0]===8?'MATCH':'DIFFERENCE_PROPOSED'],[4,expectedCounts[1],expectedCounts[1]===4?'MATCH':'DIFFERENCE_PROPOSED']]);
    const reopened=await http(base+'/passports/'+passport.id);assert.equal(reopened.meta.isCurrent,true);assert.equal(reopened.data.id,passport.id);
    const jobs=(await http('/meta/dockmind/jobs?sessionId='+state.sessionId)).data;assert.equal(jobs.length,2);
    state.result={at:new Date().toISOString(),requestId,manifestId,sessionId:state.sessionId,passportId:passport.id,
      transport:'NEXT_HTTP_LOCAL_LOOPBACK',segmenter:'FIXTURE',realInference:false,explanationCalls:0,deliverySha256:state.deliverySha256??null,
      rows:passport.comparison.rows.map((r:any)=>({groupId:r.id,declared:r.declared,observed:r.observed,unit:r.unit,status:r.status,delta:r.delta})),
      groups:[state['group-a'],state['group-b']],effects:passport.effects,
      url:`http://127.0.0.1:8080/tetris?session=${state.sessionId}&passport=${passport.id}`};save();
    writeFileSync(join(folder,'result.json'),JSON.stringify(state.result,null,2)+'\n');
    console.log('PASS: HTTP close -> Passport -> reopen, both groups preserved; no paid explanation');console.log(state.result.url);
  }
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Local web-worker acceptance failed');process.exitCode=1;});
