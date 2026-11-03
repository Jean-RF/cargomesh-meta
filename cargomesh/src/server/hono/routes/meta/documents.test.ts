import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Hono,type MiddlewareHandler} from 'hono';
import {createDocumentsRouter} from './documents';
import type {AuthVariables} from '../../middleware/auth';
import {DocumentService} from '@/server/modules/media-evidence/document-service';
let calls=0;
const service=async()=>new DocumentService({async call(){calls++;return {data:[],nextOffset:null};}},{async put(){throw new Error('must not put');},async signed(){throw new Error('must not sign');}});
const auth:MiddlewareHandler<{Variables:AuthVariables}>=async(c,next)=>{c.set('member',{memberId:'d0510000-0000-4000-8000-000000000001',organizationId:'d0510000-0000-4000-8000-000000000002',userId:'d0510000-0000-4000-8000-000000000003',userEmail:'synthetic@example.invalid',role:'SUPERVISOR',status:'ACTIVE'});await next();};
test('document routes reject cookie CSRF, missing versions and malformed body before persistence',async()=>{
 const app=new Hono().route('/api/v2',createDocumentsRouter(service,auth));const path='http://localhost/api/v2/meta/documents';calls=0;
 assert.equal((await app.request(path,{method:'POST',headers:{Origin:'https://other.invalid'},body:'x'})).status,403);
 assert.equal((await app.request(path,{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json'},body:'{}'})).status,400);
 const request=path+'/requests/d0510000-0000-4000-8000-000000000004';
 assert.equal((await app.request(request,{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json'},body:'{'})).status,400);
 assert.equal((await app.request(request,{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json'},body:'{"action":"unlink","linkId":"d0510000-0000-4000-8000-000000000005"}'})).status,400);
 assert.equal(calls,0);
 const result=await app.request(path);assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'private, no-store');
});
test('native document boundary rejects an invalid bearer before service access',async()=>{
 const app=new Hono().route('/api/v2',createDocumentsRouter(async()=>{throw new Error('must not resolve');}));
 assert.equal((await app.request('http://localhost/api/v2/meta/documents',{headers:{Authorization:'invalid'}})).status,401);
});
test('each document request authenticates once, including root and nested paths',async()=>{
 let authenticated=0;
 const countingAuth:typeof auth=async(c,next)=>{authenticated++;await auth(c,next);};
 const app=new Hono().route('/api/v2',createDocumentsRouter(service,countingAuth));
 for(const path of ['/meta/documents','/meta/documents?offset=0','/meta/documents/requests/d0510000-0000-4000-8000-000000000004']){
  authenticated=0;const r=await app.request('http://localhost/api/v2'+path);
  assert.equal(r.status,200);assert.equal(authenticated,1,path);assert.equal(r.headers.get('cache-control'),'private, no-store');
 }
 authenticated=0;
 assert.equal((await app.request('http://localhost/api/v2/meta/documents',{method:'POST',headers:{Origin:'https://foreign.invalid'},body:'{}'})).status,403);
 assert.equal(authenticated,1);
});
