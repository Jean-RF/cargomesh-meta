import 'server-only';
import {z} from 'zod';
import {LoadingJobProjectionSchema,LoadingObservationIngressSchema,LoadingPassportRecordSchema,type LoadingPassportRecord} from '@/shared/schemas/meta/loading-operation';
import {loadingExplanationFacts,validateLoadingExplanation} from '@/shared/meta/loading-operation';
import {V2DraftError} from '../freight-requests/application/draft-service';
import type {LoadingOperationService} from './operation-service';
import {loadingRpcError,type LoadingRpcClient} from './supabase-operation-repository';

/** Construct per authenticated request. This structurally implements Ramón's SessionReader. */
export function createLoadingAnalysisSessionReader(service:LoadingOperationService,member:{userId:string;memberId:string;organizationId:string}){
  return {async getForAnalysis(actor:{userId:string;organizationId:string},sessionId:string){
    if(actor.userId!==member.userId||actor.organizationId!==member.organizationId)return null;
    try{
      const {data,comparison}=await service.read(member,sessionId);
      if(data.currentManifest===null||comparison.rows.some(r=>r.status==='OUTDATED'))throw new V2DraftError('STALE_MANIFEST','Review the current manifest before starting another analysis.',409);
      return {sessionId:data.session.id,organizationId:data.session.organizationId,manifestRevision:data.session.manifest.revision,groups:data.session.groups.map(g=>({groupId:g.id,label:g.label,unit:g.unit})),status:data.session.state};
    }catch(error){if(error instanceof V2DraftError&&error.httpStatus===404)return null;throw error;}
  }};
}

/** Call only after Ramón has authenticated and persisted the worker callback, using a server writer. */
export async function recordLoadingObservation(writer:LoadingRpcClient,rawSavedJob:unknown){
  const j=LoadingJobProjectionSchema.parse(rawSavedJob),o=j.observation,r=o.result;
  const value=LoadingObservationIngressSchema.parse({groupId:j.groupId,reportedCoverage:j.coverage,unit:o.config.unit,status:r.status,entries:r.entries,exits:r.exits,net:r.net,
    source:o.clip.source,clipSha256:o.clip.sha256,realInference:o.segmentation.real_inference,overlayUploaded:o.evidence.overlay_uploaded,analysisVersion:o.analysis_version,timeMapping:o.clip.time_mapping,
    flags:r.flags.map(f=>({kind:f.kind,seconds:f.seconds,detail:f.detail})),events:r.events.map(e=>({objectId:e.object_id,seconds:e.seconds,direction:e.direction})),
  });
  const {data,error}=await writer.rpc('meta_record_loading_observation_v1',{p_organization_id:j.organizationId,p_session_id:j.sessionId,p_job_id:j.jobId,p_attempt:j.attempt,p_manifest_revision:j.manifestRevision,p_evidence_id:j.evidenceId,p_value:value});
  if(error)loadingRpcError(error);
  return z.object({id:z.string().uuid().nullable(),recorded:z.boolean(),reason:z.enum(['RECORDED','ALREADY_RECORDED','STALE_ATTEMPT'])}).strict().parse(data);
}

/** Luis owns generation. Juan checks the exact frozen scope before accepting the explanation. */
export async function recordLoadingExplanation(writer:LoadingRpcClient,passport:LoadingPassportRecord,groupId:string,result:unknown){
  const p=LoadingPassportRecordSchema.innerType().strip().pipe(LoadingPassportRecordSchema).parse(passport),value=validateLoadingExplanation(p,groupId,result);
  const {data,error}=await writer.rpc('meta_record_loading_explanation_v1',{p_organization_id:p.organizationId,p_passport_id:p.id,p_group_id:groupId,p_value:value});
  if(error)loadingRpcError(error);
  return z.object({recorded:z.boolean()}).strict().parse(data);
}
/** Bind one authorized Passport group to Luis's ReconciliationAccess, using his fingerprint function. */
export function createLoadingReconciliationAccess(service:LoadingOperationService,member:{userId:string;memberId:string;organizationId:string},scope:{sessionId:string;passportId:string;groupId:string},fingerprint:(facts:ReturnType<typeof loadingExplanationFacts>)=>string){
 type Reference={actor:{userId:string;memberId:string;organizationId:string};reconciliationId:string;reconciliationVersion:number;signal:AbortSignal};
 async function read(reference:Reference){
  reference.signal.throwIfAborted();
  if(reference.actor.userId!==member.userId||reference.actor.memberId!==member.memberId||reference.actor.organizationId!==member.organizationId)return null;
  try{
   const result=await service.readPassport(member,scope.sessionId,scope.passportId);
   reference.signal.throwIfAborted();
   const facts=loadingExplanationFacts(result.data,scope.groupId);
   if(facts.reconciliationId!==reference.reconciliationId||facts.reconciliationVersion!==reference.reconciliationVersion)return null;
   return {organizationId:member.organizationId,state:'ACTIVE' as const,facts,isCurrent:result.meta.isCurrent};
  }catch(error){if(error instanceof V2DraftError&&error.httpStatus===404)return null;throw error;}
 }
 return {
  async readAuthorized(reference:Reference){return read(reference);},
  async checkCurrent(reference:Reference&{factsFingerprint:string}):Promise<'CURRENT'|'DENIED'|'STALE'>{
   const r=await read(reference);return !r?'DENIED':r.isCurrent&&fingerprint(r.facts)===reference.factsFingerprint?'CURRENT':'STALE';
  },
 };
}
