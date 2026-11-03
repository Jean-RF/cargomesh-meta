import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {createHash} from 'node:crypto';
import {createV2ServerSupabaseClient} from '@/server/db/supabase/v2';
import {V2DraftError} from '../freight-requests/application/draft-service';
import {DocumentService,type DocumentRepository,type DocumentStorage} from './document-service';
const unavailable=()=>new V2DraftError('DOCUMENT_STORAGE_UNAVAILABLE','Private document storage is unavailable.',503);
function storage():DocumentStorage{
 const client=()=>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw unavailable();
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}).storage.from('meta-documents');
 };
 return {
  async put(path,bytes,mime){
   const bucket=client();const {error}=await bucket.upload(path,bytes,{contentType:mime,upsert:false,cacheControl:'0'});
   if(!error)return;
   if(String(error.statusCode)!=='409'&&String(error.statusCode)!=='400')throw unavailable();
   // A crashed request may have stored the bytes before metadata finalization. Never overwrite it.
   const old=await bucket.download(path);if(old.error||!old.data)throw unavailable();
   if(createHash('sha256').update(Buffer.from(await old.data.arrayBuffer())).digest('hex')!==createHash('sha256').update(bytes).digest('hex'))throw new V2DraftError('DOCUMENT_OBJECT_CONFLICT','Stored bytes differ from this upload.',409);
  },
  async signed(path,filename){const {data,error}=await client().createSignedUrl(path,60,{download:filename});if(error||!data)throw unavailable();return data.signedUrl;},
 };
}
export async function documentService(){
 const db=await createV2ServerSupabaseClient();
 const rpc=db.rpc.bind(db) as unknown as (name:string,args:Record<string,unknown>)=>PromiseLike<{data:unknown;error:{code?:string;message:string}|null}>;
 const repository:DocumentRepository={async call(actor,action,target,value,key){
  const {data,error}=await rpc('meta_documents_v1',{p_org:actor.organizationId,p_actor:actor.actorId,p_carrier:actor.carrierId,p_action:action,p_target:target,p_value:value,p_key:key});
  if(error){if(['PGRST202','42883','42P01'].includes(error.code??''))throw new V2DraftError('DOCUMENTS_NOT_INSTALLED','Documents are not installed in this environment.',503);
   const statuses:Record<string,number>={PT400:400,PT401:401,PT403:403,PT404:404,PT409:409,PT422:422};
   if(statuses[error.code??''])throw new V2DraftError(/^[A-Z][A-Z0-9_]+$/.test(error.message)?error.message:'DOCUMENT_COMMAND_FAILED','Document command could not be completed.',statuses[error.code??'']);
   throw new Error('DOCUMENT_DATABASE_ERROR');}
  return data;
 }};
 return new DocumentService(repository,storage());
}
