import {z} from 'zod';
export const DOCUMENT_LIMIT=4*1024*1024;
export const DocumentKind=z.enum(['COMPANY_PROFILE','PACKING_LIST','OTHER']);
export const DocumentMetadata=z.object({
  title:z.string().trim().min(1).max(160),kind:DocumentKind,
  requestId:z.string().uuid().nullable().default(null),documentId:z.string().uuid().nullable().default(null),
  expectedVersion:z.number().int().nonnegative(),
  issuedOn:z.string().date().nullable().default(null),expiresOn:z.string().date().nullable().default(null),
}).strict().superRefine((v,c)=>{
  if(v.kind==='PACKING_LIST'&&!v.requestId)c.addIssue({code:'custom',path:['requestId'],message:'Packing list belongs to one request.'});
  if(v.kind==='COMPANY_PROFILE'&&v.requestId)c.addIssue({code:'custom',path:['requestId'],message:'Company profile belongs to the organization.'});
  if(v.issuedOn&&v.expiresOn&&v.expiresOn<v.issuedOn)c.addIssue({code:'custom',path:['expiresOn'],message:'Expiry precedes issue.'});
  if(!v.documentId&&v.expectedVersion!==0)c.addIssue({code:'custom',path:['expectedVersion'],message:'New documents start at zero.'});
});
export const DocumentRevision=z.object({
  id:z.string().uuid(),documentId:z.string().uuid(),organizationId:z.string().uuid(),
  title:z.string(),kind:DocumentKind,requestId:z.string().uuid().nullable(),version:z.number().int().positive(),
  documentVersion:z.number().int().positive(),filename:z.string(),mime:z.enum(['application/pdf','image/jpeg','image/png']),
  bytes:z.number().int().positive().max(DOCUMENT_LIMIT),sha256:z.string().regex(/^[a-f0-9]{64}$/),
  state:z.enum(['UPLOADING','READY']),issuedOn:z.string().nullable(),expiresOn:z.string().nullable(),createdAt:z.string(),
});
export type DocumentRevision=z.infer<typeof DocumentRevision>;
export const DocumentShare=z.object({id:z.string().uuid(),bookingId:z.string().uuid(),carrierId:z.string().uuid(),version:z.number().int().positive(),state:z.enum(['ACTIVE','REVOKED']),review:z.enum(['PENDING','ACCEPTED','CORRECTION_REQUESTED']),reason:z.string().nullable(),reviewedAt:z.string().nullable()});
export const DocumentLink=z.object({id:z.string().uuid(),active:z.boolean(),version:z.number().int().positive(),revision:DocumentRevision,manifestId:z.string().uuid().nullable(),manifestRevision:z.number().int().positive().nullable(),correspondenceCurrent:z.boolean(),shares:z.array(DocumentShare)});
export const DocumentList=z.object({data:z.array(DocumentRevision),nextOffset:z.number().int().nullable()});
export const DocumentDossier=z.object({data:z.array(DocumentLink),relations:z.array(z.object({id:z.string().uuid(),carrierId:z.string().uuid(),status:z.string()})),policy:z.literal('REQUIREMENTS_TO_CONFIRM')});
export const DocumentCommand=z.discriminatedUnion('action',[
  z.object({action:z.literal('link'),revisionId:z.string().uuid(),expectedVersion:z.number().int().nonnegative()}).strict(),
  z.object({action:z.literal('unlink'),linkId:z.string().uuid(),expectedVersion:z.number().int().positive()}).strict(),
  z.object({action:z.literal('share'),linkId:z.string().uuid(),bookingId:z.string().uuid(),expectedVersion:z.number().int().positive()}).strict(),
  z.object({action:z.literal('revoke'),shareId:z.string().uuid(),expectedVersion:z.number().int().positive()}).strict(),
]);
export const DocumentReview=z.object({expectedVersion:z.number().int().positive(),decision:z.enum(['ACCEPTED','CORRECTION_REQUESTED']),reason:z.string().trim().min(3).max(1000)}).strict();
