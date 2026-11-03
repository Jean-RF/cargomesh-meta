/** Read-only local timing probe. No AI, uploads, commercial commands or UI changes.
 * Reports development first-hit compilation separately from warm reads. A small
 * local sample is not a production benchmark or a browser navigation measurement.
 */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const origin='http://127.0.0.1:8080';
const folder=process.env.META_PERFORMANCE_DIR;
assert(folder&&resolve(folder).startsWith(resolve('../../tmp')+'\\'),'Explicit integration/tmp output required');
mkdirSync(folder,{recursive:true});
const request='8b0fed7d-4cc3-4cc3-b819-8f68fdeefebe',session='36dd509e-6612-4ce2-8663-46531abce043',passport='331e9301-b37f-46a3-ad06-2b5eab9ca4d6',booking='654a02b7-c366-4298-8e1a-003481cbfb0a';
const records=[];
const warmOnly=process.argv.includes('--warm-only'),apisOnly=process.argv.includes('--apis-only');
const round=n=>Math.round(n*10)/10;
async function identity(workspace){
 const start=performance.now();
 const r=await fetch(origin+'/api/auth/workspace-session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({workspace}),signal:AbortSignal.timeout(90000)});
 assert.equal(r.status,200,workspace+' auto session failed');const cookie=r.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');assert(cookie);
 console.log(JSON.stringify({workspace,sessionMs:round(performance.now()-start)}));return cookie;
}
async function sample(path,cookie){
 const start=performance.now();const response=await fetch(origin+path,{headers:{Cookie:cookie},signal:AbortSignal.timeout(90000),redirect:'manual'});
 const headersAt=performance.now();const bytes=(await response.arrayBuffer()).byteLength;
 return {status:response.status,headersMs:round(headersAt-start),totalMs:round(performance.now()-start),bytes};
}
async function measure(workspace,path,cookie,extra=3){
 if(warmOnly)extra=0;
 const item={workspace,path,first:null,warm:[],error:null};
 try{item.first=await sample(path,cookie);for(let i=0;i<extra;i++)item.warm.push(await sample(path,cookie));}
 catch(error){item.error=error.name??'NETWORK_ERROR';}
 records.push(item);
 const times=item.warm.map(r=>r.totalMs).sort((a,b)=>a-b);
 item.warmMedianMs=times.length?times[Math.floor(times.length/2)]:null;item.warmMaxMs=times.length?times.at(-1):null;
 writeFileSync(join(folder,'result.json'),JSON.stringify({at:new Date().toISOString(),scope:'Read-only loopback development HTTP, first-hit versus warm; no browser/production/paid AI measurement',records},null,2)+'\n');
 console.log(JSON.stringify({workspace,path,first:item.first,warmMedianMs:item.warmMedianMs,warmMaxMs:item.warmMaxMs,statuses:item.warm.map(r=>r.status),error:item.error}));
}
const client=await identity('client');
for(const path of [
 '/api/v2/freight/requests?limit=25&offset=0','/api/v2/freight/requests/'+request,
 '/api/v2/meta/loading-sessions?limit=20&offset=0','/api/v2/meta/loading-sessions/'+session,
 `/api/v2/meta/loading-sessions/${session}/passports/${passport}`,
 '/api/v2/meta/dockmind/jobs?sessionId='+session,'/api/v2/meta/documents',
])await measure('client-api',path,client,5);
if(!apisOnly)for(const path of ['/clients','/clients/requests','/clients/requests/'+request,'/clients/freight-request/new','/clients/organization','/clients/tracking',`/tetris?session=${session}&passport=${passport}`])await measure('client-page',path,client);
const carrier=await identity('carrier');
for(const path of ['/api/v2/carriers/c2340000-0000-4000-8000-000000000001/documents/bookings/'+booking,...(apisOnly?[]:['/carriers','/carriers/orders','/carriers/orders/'+booking,'/carriers/fleet'])])await measure('carrier',path,carrier);
console.log('Completed read-only local timing probe');
