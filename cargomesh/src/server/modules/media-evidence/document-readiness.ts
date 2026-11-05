import {DocumentList} from '@/shared/schemas/meta/documents';
import {companyDocumentStatus,type DocumentReadiness} from '@/shared/schemas/meta/document-readiness';
import type {DocumentActor,DocumentService} from './document-service';
export async function readDocumentReadiness(service:Pick<DocumentService,'library'>,actor:DocumentActor,now=Date.now()):Promise<DocumentReadiness>{
 const base={organizationId:actor.organizationId!,requiredToCreate:false as const,requirementsPolicy:'REQUIREMENTS_TO_CONFIRM' as const,regulatoryReview:'NOT_ASSESSED' as const};
 try{
  const rows:ReturnType<typeof DocumentList.parse>['data']=[];let offset:number|null=0;const visited=new Set<number>();
  while(offset!==null){if(visited.has(offset)||visited.size>=20)return {...base,companyProfile:'UNKNOWN'};visited.add(offset);
   const page=DocumentList.parse(await service.library(actor,{offset}));
   if(page.data.some(row=>row.organizationId!==actor.organizationId))return {...base,companyProfile:'UNKNOWN'};
   rows.push(...page.data);offset=page.nextOffset;
  }
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Lima'}).format(now);
  return {...base,companyProfile:companyDocumentStatus(rows,today)};
 }catch{return {...base,companyProfile:'UNKNOWN'};}
}
