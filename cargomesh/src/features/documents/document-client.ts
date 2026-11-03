import {workspaceFetch} from '@/features/workspace-mode/workspace-fetch';
import {DocumentList,DocumentDossier,DocumentRevision,DocumentShare} from '@/shared/schemas/meta/documents';
import {z} from 'zod';
const base='/api/v2/meta/documents';
const copy:Record<string,string>={
 DOCUMENTS_NOT_INSTALLED:'Documents are not installed in this environment.',DOCUMENT_STORAGE_UNAVAILABLE:'Private file storage is unavailable. Retry without changing the file.',
 FORBIDDEN_DOCUMENT_REVIEW:'Only a carrier administrator or dispatcher can record a document review.',
 FORBIDDEN_WORKFLOW:'Only an organization owner or supervisor can manage private documents.',FORBIDDEN_DOCUMENT:'You do not have access to these documents.',
 STALE_DOCUMENT:'The document changed. Reload before uploading a revision.',STALE_DOCUMENT_LINK:'The attachment changed. Reload before continuing.',STALE_DOCUMENT_SHARE:'The review changed. Reload before continuing.',
 STALE_MANIFEST:'The cargo declaration changed. Confirm its current manifest and attach the corresponding packing list again.',CONFIRMED_MANIFEST_REQUIRED:'Confirm the cargo manifest before attaching its packing list.',
 EXPIRED_DOCUMENT:'This document has expired. Request an updated revision.',UPLOAD_INCOMPLETE:'The file upload is incomplete. Retry the same upload.',
 UNSUPPORTED_DOCUMENT:'Use a plain PDF without scripts, encryption or attachments, or a PNG/JPEG image.',DOCUMENT_SIZE:'Select a non-empty file up to 4 MiB.',DOCUMENT_TYPE_MISMATCH:'The file content does not match its type.',DOCUMENT_QUOTA:'The organization reached its document storage quota.',
};
export async function documentRequest(path:string,body?:unknown,key?:string){
 let response:Response;try{response=await workspaceFetch(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json',...(body instanceof FormData?{}:body===undefined?{}:{'Content-Type':'application/json'}),...(key?{'Idempotency-Key':key}:{})},...(body===undefined?{}:{body:body instanceof FormData?body:JSON.stringify(body)})});}catch{throw new Error('Connection interrupted. Retry the same action.');}
 const raw:unknown=await response.json().catch(()=>null);
 if(!response.ok){const error=z.object({error:z.object({code:z.string()})}).safeParse(raw);const code=error.success?error.data.error.code:'HTTP_'+response.status;throw new Error(copy[code]??`Document action failed (${code}).`);}
 return raw;
}
export const documents={
 async library(requestId?:string,offset=0,documentId?:string){const params=new URLSearchParams({offset:String(offset),...(requestId?{requestId}:{}),...(documentId?{documentId}:{})});return DocumentList.parse(await documentRequest(`${base}?${params}`));},
 async upload(file:File,metadata:unknown,key:string){const body=new FormData();body.set('file',file);body.set('metadata',JSON.stringify(metadata));return z.object({data:DocumentRevision}).parse(await documentRequest(base,body,key)).data;},
 async dossier(requestId:string){return DocumentDossier.parse(await documentRequest(`${base}/requests/${requestId}`));},
 command(requestId:string,body:unknown,key:string){return documentRequest(`${base}/requests/${requestId}`,body,key);},
 async download(id:string,carrierId?:string){const path=carrierId?`/api/v2/carriers/${carrierId}/documents/shares/${id}/download`:`${base}/${id}/download`;return z.object({url:z.string().url(),expiresIn:z.number()}).parse(await documentRequest(path));},
 async carrier(carrierId:string,bookingId:string){return z.object({data:z.array(z.object({share:DocumentShare,revision:DocumentRevision,manifestId:z.string().nullable(),manifestRevision:z.number().nullable(),correspondenceCurrent:z.boolean()})),policy:z.literal('REQUIREMENTS_TO_CONFIRM')}).parse(await documentRequest(`/api/v2/carriers/${carrierId}/documents/bookings/${bookingId}`));},
 review(carrierId:string,shareId:string,value:unknown,key:string){return documentRequest(`/api/v2/carriers/${carrierId}/documents/shares/${shareId}/reviews`,value,key);},
};
