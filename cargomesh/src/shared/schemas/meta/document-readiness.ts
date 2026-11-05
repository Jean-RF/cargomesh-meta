import {z} from 'zod';
import type {DocumentRevision} from './documents';
export const DocumentReadinessSchema=z.object({organizationId:z.string().uuid(),companyProfile:z.enum(['AVAILABLE','MISSING','EXPIRED','INCOMPLETE','UNKNOWN']),requiredToCreate:z.literal(false),requirementsPolicy:z.literal('REQUIREMENTS_TO_CONFIRM'),regulatoryReview:z.literal('NOT_ASSESSED')}).strict();
export type DocumentReadiness=z.infer<typeof DocumentReadinessSchema>;
/** Readiness means a stored revision is usable; it never proves authenticity or legal compliance. */
export function companyDocumentStatus(rows:DocumentRevision[],today:string):DocumentReadiness['companyProfile']{
 const newest=rows.filter(row=>row.kind==='COMPANY_PROFILE'&&row.requestId===null&&!rows.some(other=>other.documentId===row.documentId&&other.version>row.version));
 if(!newest.length)return 'MISSING';
 if(newest.some(row=>row.state==='READY'&&(!row.expiresOn||row.expiresOn>=today)&&(!row.issuedOn||row.issuedOn<=today)))return 'AVAILABLE';
 return newest.every(row=>row.expiresOn&&row.expiresOn<today)?'EXPIRED':'INCOMPLETE';
}
