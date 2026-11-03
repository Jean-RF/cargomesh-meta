import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {Hono} from 'hono';
import type {MiddlewareHandler} from 'hono';
import type {AuthVariables} from '../../middleware/auth';
import {createLoadingSessionsRouter} from './loading-sessions';
import {LoadingOperationService} from '@/server/modules/loading-sessions/operation-service';
import {loadingBundleFixture,loadingId} from '@/shared/schemas/meta/loading-operation.fixtures';
import type {PassportExplanationService} from '@/server/modules/loading-sessions/passport-explanation-service';
const b=loadingBundleFixture();
const auth:MiddlewareHandler<{Variables:AuthVariables}>=async(c,next)=>{c.set('member',{memberId:b.session.openedBy,organizationId:b.session.organizationId,userId:loadingId(80),userEmail:'synthetic@example.invalid',role:'OWNER',status:'ACTIVE'});await next();};
describe('Loading HTTP routes',()=>{
 it('authenticates root GET/POST and nested reads once while retaining root guards',async()=>{
  let authenticated=0,calls=0;
  const countingAuth:typeof auth=async(c,next)=>{authenticated++;await auth(c,next);};
  const service=new LoadingOperationService({async call(_actor,action){calls++;return action==='list'?[b.session]:b;}});
  const app=new Hono().route('/api/v2',createLoadingSessionsRouter({service:async()=>service,authenticate:countingAuth}));
  const base='http://localhost/api/v2/meta/loading-sessions';
  for(const path of [base,base+'?limit=20',base+'/'+b.session.id]){
   authenticated=0;const r=await app.request(path);assert.equal(r.status,200);assert.equal(authenticated,1,path);
   assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(r.headers.get('vary'),'Cookie, Authorization');
  }
  for(const [body,origin,expected]of [['{}','https://foreign.invalid',403],[' '.repeat(33000),'http://localhost',413],['{}','http://localhost',400]] as const){
   authenticated=0;const previous=calls;
   assert.equal((await app.request(base,{method:'POST',body,headers:{Origin:origin,'Content-Type':'application/json'}})).status,expected);
   assert.equal(authenticated,1);assert.equal(calls,previous);
  }
 });
 it('blocks cross-origin cookies, malformed JSON, oversized bodies and missing versions',async()=>{
  let calls=0;const service=new LoadingOperationService({async call(){calls++;return {record:b,replay:false};}}),app=new Hono().route('/api/v2',createLoadingSessionsRouter({service:async()=>service,authenticate:auth}));
  const path=`http://localhost/api/v2/meta/loading-sessions/${b.session.id}/close`;
  const request=(body:string,headers:Record<string,string>={})=>app.request(path,{method:'POST',body,headers:{'Content-Type':'application/json','Idempotency-Key':loadingId(99),...headers}});
  assert.equal((await request('{}',{Origin:'https://other.invalid'})).status,403);
  assert.equal((await request('{',{Origin:'http://localhost'})).status,400);
  assert.equal((await request(' '.repeat(33000),{Origin:'http://localhost'})).status,413);
  assert.equal((await request('{}',{Origin:'http://localhost'})).status,400);assert.equal(calls,0);
  const ok=await request('{"expectedVersion":4}',{Origin:'http://localhost'});assert.equal(ok.status,200);assert.equal(ok.headers.get('cache-control'),'private, no-store');
 });
 it('uses the native authentication boundary when no injected test actor is supplied',async()=>{
  const app=new Hono().route('/api/v2',createLoadingSessionsRouter({service:async()=>{throw new Error('should not read');}}));
  assert.equal((await app.request('http://localhost/api/v2/meta/loading-sessions',{headers:{Authorization:'invalid'}})).status,401);
 });
 it('protects explanation commands, forwards identity/scope/key and makes status a read-only call',async()=>{
  const calls:any[]=[],fake={async generate(actor:unknown,scope:unknown,body:unknown,key:unknown){calls.push({actor,scope,body,key});return {schemaVersion:'1.0',data:{status:'IN_PROGRESS'}};},async list(actor:unknown,scope:unknown){calls.push({actor,scope,read:true});return {schemaVersion:'1.0',data:{attempts:[]}};}} as unknown as PassportExplanationService;
  const app=new Hono().route('/api/v2',createLoadingSessionsRouter({service:async()=>{throw Error('unused');},explanations:async()=>fake,authenticate:auth}));
  const path=`http://localhost/api/v2/meta/loading-sessions/${b.session.id}/passports/${loadingId(11)}/explanations`,body={groupId:b.session.groups[0].id,expectedVersion:4,language:'es',retryOf:null};
  assert.equal((await app.request(path,{method:'POST',headers:{Origin:'https://foreign.invalid','Content-Type':'application/json'},body:JSON.stringify(body)})).status,403);assert.equal(calls.length,0);
  assert.equal((await app.request(path,{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json','Idempotency-Key':loadingId(99)},body:JSON.stringify(body)})).status,200);
  assert.equal(calls[0].actor.organizationId,b.session.organizationId);assert.equal(calls[0].scope.passportId,loadingId(11));assert.equal(calls[0].key,loadingId(99));
  const read=await app.request(path);assert.equal(read.status,200);assert.equal(read.headers.get('cache-control'),'private, no-store');assert.equal(calls[1].read,true);
 });
});
