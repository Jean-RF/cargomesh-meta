import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectTetrisReadiness} from './tetris-readiness';
const configured=()=>({CARGOMESH_AI_PROVIDER:'META',META_MUSE_MODEL:'muse-spark-1.3',META_MODEL_API_KEY:'synthetic-private-key',
 DOCKMIND_WORKER_URL:'https://worker.example/jobs',DOCKMIND_CALLBACK_URL:'https://app.example/callback',MODAL_PROXY_TOKEN_ID:'synthetic-id',MODAL_PROXY_TOKEN_SECRET:'synthetic-token',DOCKMIND_CALLBACK_SECRET:'s'.repeat(40),
 NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-service-key'});
test('Meta key alone never certifies a functional video pipeline',()=>{
 const e=configured(),r=inspectTetrisReadiness({CARGOMESH_AI_PROVIDER:e.CARGOMESH_AI_PROVIDER,META_MUSE_MODEL:e.META_MUSE_MODEL,META_MODEL_API_KEY:e.META_MODEL_API_KEY});
 assert.equal(r.status,'CONFIGURATION_INCOMPLETE');assert.equal(r.checks[0].status,'CONFIGURED');assert.equal(r.checks[1].status,'NOT_CONFIGURED');
});
test('configured transport is readiness only, not live acceptance',()=>{
 const r=inspectTetrisReadiness(configured());assert.equal(r.status,'READY_FOR_INTEGRATION_TEST');
 assert.equal(r.workerVerified,false);assert.equal(r.databaseVerified,false);assert.equal(r.liveRequestMade,false);
});
test('production refuses local worker URLs and weak callback secrets',()=>{
 const r=inspectTetrisReadiness({...configured(),NODE_ENV:'production',DOCKMIND_WORKER_MODE:'LOCAL_LOOPBACK',DOCKMIND_CALLBACK_SECRET:'short'});
 assert.equal(r.checks[1].status,'NOT_CONFIGURED');assert.equal(r.checks[2].status,'NOT_CONFIGURED');
});
test('report cannot leak environment, endpoints or credentials',()=>{
 const e=configured(),s=JSON.stringify(inspectTetrisReadiness(e));
 for(const k of ['META_MODEL_API_KEY','SUPABASE_SERVICE_ROLE_KEY','MODAL_PROXY_TOKEN_SECRET','DOCKMIND_CALLBACK_SECRET','DOCKMIND_WORKER_URL'] as const)assert.equal(s.includes(e[k]),false);
});
test('local acceptance refuses hosted Supabase even with otherwise configured credentials',()=>{
 const r=inspectTetrisReadiness(configured(),{localOnly:true});
 assert.equal(r.status,'CONFIGURATION_INCOMPLETE');assert.equal(r.checks.at(-1)?.status,'NOT_CONFIGURED');
});
test('local acceptance requires explicit loopback on all services and refuses Vercel',()=>{
 const env={...configured(),DOCKMIND_WORKER_MODE:'LOCAL_LOOPBACK',DOCKMIND_WORKER_URL:'http://127.0.0.1:8765/jobs',DOCKMIND_CALLBACK_URL:'http://127.0.0.1:8080/api/v2/meta/dockmind/callback',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:64321'};
 assert.equal(inspectTetrisReadiness(env,{localOnly:true}).status,'READY_FOR_INTEGRATION_TEST');
 assert.equal(inspectTetrisReadiness({...env,VERCEL:'1'},{localOnly:true}).status,'CONFIGURATION_INCOMPLETE');
});
