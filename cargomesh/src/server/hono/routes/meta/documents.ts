import {Hono} from 'hono';
import type {MiddlewareHandler} from 'hono';
import {z} from 'zod';
import {bodyLimit} from 'hono/body-limit';
import {hasSessionOrigin} from '@/server/auth/session-origin';
import {V2DraftError} from '@/server/modules/freight-requests/application/draft-service';
import type {AuthVariables} from '../../middleware/auth';
import {v2AuthMiddleware} from '../../middleware/v2-auth';
import {v2Error} from '../../middleware/v2-error';
import {carrierPortalIdentity} from '../carrier-portal';
import {DocumentService,type DocumentActor} from '@/server/modules/media-evidence/document-service';
import {DOCUMENT_LIMIT} from '@/shared/schemas/meta/documents';
import {readDocumentReadiness} from '@/server/modules/media-evidence/document-readiness';
const base='/meta/documents';
export function createDocumentsRouter(service:()=>Promise<DocumentService>,authenticate:MiddlewareHandler<{Variables:AuthVariables}>=v2AuthMiddleware){
 const router=new Hono<{Variables:AuthVariables}>();
 // Hono's wildcard includes the collection root. Register once: root+wildcard
 // ran authentication, origin checks and body limits twice for GET/POST base.
 for(const path of [`${base}/*`]){
  router.use(path,authenticate);
  router.use(path,async(c,next)=>{c.header('Cache-Control','private, no-store');c.header('Vary','Cookie, Authorization');
   if(c.req.method==='POST'&&!c.req.header('Authorization')&&!hasSessionOrigin(c.req.raw))return v2Error(c,new V2DraftError('FORBIDDEN_ORIGIN','Same-origin document command required.',403));await next();});
  router.use(path,bodyLimit({maxSize:DOCUMENT_LIMIT+65536,onError:c=>v2Error(c,new V2DraftError('DOCUMENT_SIZE','Maximum file size is 4 MiB.',413))}));
 }
 const actor=(m:AuthVariables['member']):DocumentActor=>({organizationId:m.organizationId,actorId:m.memberId,carrierId:null});
 router.get(`${base}/readiness`,async c=>{try{return c.json(await readDocumentReadiness(await service(),actor(c.get('member'))));}catch(e){return v2Error(c,e);}});
 router.post(`${base}/packing-list/prepare`,async c=>{try{
  const member=c.get('member');if(member.status!=='ACTIVE'||!['OWNER','SUPERVISOR','REQUESTER'].includes(member.role))throw new V2DraftError('FORBIDDEN_DOCUMENT','Active client membership required.',403);
  if(!c.req.header('Content-Type')?.startsWith('multipart/form-data;'))throw new V2DraftError('VALIDATION_ERROR','Multipart PDF required.',400);
  const form=await c.req.formData(),file=form.get('file');
  if(!file||typeof file==='string'||file.size>DOCUMENT_LIMIT||file.type!=='application/pdf')throw new V2DraftError('DOCUMENT_TYPE_MISMATCH','Select a packing list PDF up to 4 MiB.',400);
  const revision=z.string().regex(/^\d{1,9}$/).transform(Number).pipe(z.number().int().nonnegative()).parse(form.get('inputRevision')),language=z.enum(['es','en']).parse(form.get('language'));
  const {analyzePackingList}=await import('@/server/modules/media-evidence/packing-list');
  return c.json(await analyzePackingList(new Uint8Array(await file.arrayBuffer()),revision,language,c.req.raw.signal));
 }catch(e){return v2Error(c,e instanceof V2DraftError||e instanceof z.ZodError?e:new V2DraftError('PACKING_LIST_ANALYSIS_FAILED','Unable to analyze this PDF. No draft was changed; retry or enter the data manually.',502));}});
 router.get(base,async c=>{try{return c.json(await (await service()).library(actor(c.get('member')),c.req.query()));}catch(e){return v2Error(c,e);}});
 router.post(base,async c=>{try{
  // Authenticate before buffering bytes. Never trust object paths or organization IDs from the browser.
  if(!['OWNER','SUPERVISOR'].includes(c.get('member').role))throw new V2DraftError('FORBIDDEN_DOCUMENT','Organization supervisor required.',403);
  if(!c.req.header('Content-Type')?.startsWith('multipart/form-data;'))throw new V2DraftError('VALIDATION_ERROR','Multipart file upload required.',400);
  const form=await c.req.formData(),file=form.get('file');
  if(!file||typeof file==='string'||file.size>DOCUMENT_LIMIT)throw new V2DraftError('DOCUMENT_SIZE','Select a PDF, PNG or JPEG up to 4 MiB.',413);
  const metadata:unknown=JSON.parse(String(form.get('metadata')));
  return c.json(await (await service()).upload(actor(c.get('member')),metadata,{name:file.name,type:file.type,bytes:new Uint8Array(await file.arrayBuffer())},c.req.header('Idempotency-Key')),201);
 }catch(e){return v2Error(c,e instanceof SyntaxError?new V2DraftError('VALIDATION_ERROR','Document metadata required.',400):e);}});
 router.get(`${base}/requests/:requestId`,async c=>{try{return c.json(await (await service()).dossier(actor(c.get('member')),c.req.param('requestId')));}catch(e){return v2Error(c,e);}});
 router.post(`${base}/requests/:requestId`,async c=>{try{return c.json(await (await service()).command(actor(c.get('member')),c.req.param('requestId'),await c.req.json(),c.req.header('Idempotency-Key')));}catch(e){return v2Error(c,e instanceof SyntaxError?new V2DraftError('VALIDATION_ERROR','JSON required.',400):e);}});
 router.get(`${base}/:revisionId/download`,async c=>{try{return c.json(await (await service()).download(actor(c.get('member')),c.req.param('revisionId')));}catch(e){return v2Error(c,e);}});
 const carrierBase='/carriers/:carrierId/documents';
 router.use(`${carrierBase}/*`,bodyLimit({maxSize:32768}));
 async function carrier(c:Parameters<typeof carrierPortalIdentity>[0],work:(a:DocumentActor)=>Promise<unknown>){return carrierPortalIdentity(c,async()=>{
  const {requireAuthenticatedCarrier}=await import('@/server/auth/carrier');const identity=await requireAuthenticatedCarrier(c.req.param('carrierId')!);
  return c.json(z.record(z.unknown()).parse(await work({organizationId:null,actorId:identity.operatorId,carrierId:identity.carrierId})));
 });}
 router.get(`${carrierBase}/bookings/:bookingId`,c=>carrier(c,async a=>(await service()).dossier(a,c.req.param('bookingId'))));
 router.get(`${carrierBase}/shares/:shareId/download`,c=>carrier(c,async a=>(await service()).download(a,c.req.param('shareId'))));
 router.post(`${carrierBase}/shares/:shareId/reviews`,c=>carrier(c,async a=>(await service()).review(a,c.req.param('shareId'),await c.req.json().catch(()=>{throw new V2DraftError('VALIDATION_ERROR','JSON required.',400);}),c.req.header('Idempotency-Key'))));
 return router;
}
export const documentsRouter=createDocumentsRouter(async()=>{const {documentService}=await import('@/server/modules/media-evidence/document-repository');return documentService();});
