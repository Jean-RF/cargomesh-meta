/** Opt-in LOCAL Meta acceptance: creates labelled synthetic request/documents, never a booking. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadIntakeOptions,createFreightRequestV2,getFreightRequestV2} from '../src/features/v2-intake/v2-intake-client';
import {buildPrototypeExample,mapDraftToCreateFreightRequestV2Input} from '../src/features/v2-intake/prototype-model';
import {prepareManifest,confirmManifest} from '../src/features/v2-intake/manifest-client';
import {manifestPreparationInput} from '../src/features/v2-intake/manifest-review-model';
import {DocumentList,DocumentDossier,DocumentRevision} from '../src/shared/schemas/meta/documents';
const origin='http://127.0.0.1:8080',api=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,password=process.env.CARGOMESH_DEMO_CLIENT_PASSWORD;
assert.equal(api,'http://127.0.0.1:64321','Only the isolated local Meta database is allowed.');
assert.equal(process.env.CARGOMESH_DEMO_CLIENT_EMAIL,'qa-v2-a@cargomesh.test');assert.ok(key&&password);
function pdf(label:string){
 const content=`BT /F1 14 Tf 30 150 Td (${label}) Tj ET`;
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',`<< /Length ${content.length} >>\nstream\n${content}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 let text='%PDF-1.4\n';const offsets:number[]=[];objects.forEach((value,i)=>{offsets.push(Buffer.byteLength(text));text+=`${i+1} 0 obj\n${value}\nendobj\n`;});const start=Buffer.byteLength(text);
 text+=`xref\n0 6\n0000000000 65535 f \n${offsets.map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n${start}\n%%EOF\n`;return Buffer.from(text);
}
async function login(email:string){const r=await fetch(`${api}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:key!,'Content-Type':'application/json'},body:JSON.stringify({email,password})});assert.equal(r.status,200,'Local auth failed');return (await r.json()).access_token as string;}
function auth(token:string):typeof fetch{return (input,init)=>{const url=new URL(String(input),origin);assert.equal(url.origin,origin);const headers=new Headers(init?.headers);headers.set('Authorization',`Bearer ${token}`);return fetch(url,{...init,headers});};}
async function main(){
 const client=auth(await login('qa-v2-a@cargomesh.test')),foreign=auth(await login('qa-v2-b@cargomesh.test')),base='/api/v2/meta/documents';
 const json=async(path:string,body?:unknown,key?:string)=>{const r=await client(path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key??crypto.randomUUID()},body:JSON.stringify(body)});const data=await r.json();assert.ok(r.ok,`Document request failed: ${r.status} ${data.error?.code??''}`);return data;};
 assert.equal((await fetch(origin+base)).status,401);
 const {options,source}=await loadIntakeOptions(client,'api');assert.equal(source,'api');const draft=buildPrototypeExample(options.data);draft.cargoDescription='Local document integration acceptance - synthetic cargo';
 const created=await createFreightRequestV2(mapDraftToCreateFreightRequestV2Input(draft,options.data),crypto.randomUUID(),client);const request=(await getFreightRequestV2(created.data.id,client)).data;
 const preparation=await prepareManifest(request,manifestPreparationInput(request,null,{}),crypto.randomUUID(),client);
 const manifest=await confirmManifest(request,{preparationId:preparation.data.id,expectedDraftVersion:request.draftVersion,expectedManifestRevision:0,contentHash:preparation.data.contentHash,confirmed:true},crypto.randomUUID(),client);
 const bytes=pdf('DEMO - organization profile - not an official certificate');const uploadKey=crypto.randomUUID();
 async function upload(metadata:unknown,data:Buffer,filename:string,key=crypto.randomUUID()){
  const form=new FormData();form.set('metadata',JSON.stringify(metadata));form.set('file',new File([new Uint8Array(data)],filename,{type:'application/pdf'}));
  const r=await client(base,{method:'POST',headers:{'Idempotency-Key':key},body:form});const result=await r.json();assert.ok(r.ok,`Upload failed: ${r.status} ${result.error?.code??''}`);return DocumentRevision.parse(result.data);
 }
 const metadata={title:'Local demo organization profile',kind:'COMPANY_PROFILE',requestId:null,documentId:null,expectedVersion:0};
 const profile=await upload(metadata,bytes,'profile.pdf',uploadKey);assert.equal(profile.state,'READY');const retry=await upload(metadata,bytes,'profile.pdf',uploadKey);assert.equal(retry.id,profile.id);
 const library=DocumentList.parse(await json(base));assert.ok(library.data.some(d=>d.id===profile.id));
 const attach={action:'link',revisionId:profile.id,expectedVersion:0};await json(`${base}/requests/${request.id}`,attach);
 const packing=await upload({title:'Local demo packing list',kind:'PACKING_LIST',requestId:request.id,documentId:null,expectedVersion:0},pdf('DEMO - packing list - reviewed cargo declaration'),'packing-list.pdf');
 await json(`${base}/requests/${request.id}`,{action:'link',revisionId:packing.id,expectedVersion:0});
 let dossier=DocumentDossier.parse(await json(`${base}/requests/${request.id}`));assert.equal(dossier.data.filter(d=>d.active).length,2);assert.equal(dossier.relations.length,0);
 assert.equal(dossier.data.find(d=>d.revision.id===packing.id)?.manifestId,manifest.data.id);assert.ok(dossier.data.every(d=>d.correspondenceCurrent));
 const signed=await json(`${base}/${profile.id}/download`);assert.equal(signed.expiresIn,60);assert.equal(new URL(signed.url).origin,api);
 const downloaded=await fetch(signed.url);assert.equal(downloaded.status,200);assert.equal(createHash('sha256').update(Buffer.from(await downloaded.arrayBuffer())).digest('hex'),profile.sha256);
 const objectUrl=new URL(signed.url);const publicUrl=objectUrl.origin+objectUrl.pathname.replace('/object/sign/','/object/public/');assert.notEqual((await fetch(publicUrl)).status,200);
 assert.equal((await foreign(`${base}/${profile.id}/download`)).status,404);
 const next=await upload({...metadata,documentId:profile.documentId,expectedVersion:profile.documentVersion},pdf('DEMO - revised organization profile'),'profile-v2.pdf');assert.equal(next.version,2);
 dossier=DocumentDossier.parse(await json(`${base}/requests/${request.id}`));assert.equal(dossier.data.find(d=>d.revision.documentId===profile.documentId)?.revision.id,profile.id);
 const link=dossier.data.find(d=>d.revision.id===profile.id)!;await json(`${base}/requests/${request.id}`,{action:'link',revisionId:next.id,expectedVersion:link.version});
 dossier=DocumentDossier.parse(await json(`${base}/requests/${request.id}`));assert.equal(dossier.data.find(d=>d.revision.documentId===profile.documentId)?.revision.id,next.id);
 const bad=new FormData();bad.set('metadata',JSON.stringify(metadata));bad.set('file',new File(['<html>not a pdf</html>'],'bad.pdf',{type:'application/pdf'}));assert.equal((await client(base,{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()},body:bad})).status,400);
 console.log(JSON.stringify({status:'PASS',scope:'LOCAL_ONLY',requestId:request.id,manifestId:manifest.data.id,documentRevisions:3,checks:['real private upload','upload replay','library reload','request linkage','packing list manifest binding','signed download hash','public access denied','foreign tenant denied','revision history preserved','replacement link explicit','invalid file denied'],commercialMutations:false}));
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Local document acceptance failed');process.exitCode=1;});
