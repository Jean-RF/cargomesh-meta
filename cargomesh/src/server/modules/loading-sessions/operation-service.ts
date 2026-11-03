import {z} from 'zod';
import {LoadingBundleSchema,LoadingPassportRecordSchema,LoadingVersionSchema,OpenLoadingSessionSchema,SelectLoadingObservationSchema,LoadingSessionSchema,type LoadingPassportRecord} from '@/shared/schemas/meta/loading-operation';
import {loadingComparison,loadingPassport,loadingExplanationFacts,validateLoadingExplanation} from '@/shared/meta/loading-operation';
import {V2DraftError,type V2Actor} from '../freight-requests/application/draft-service';

export type LoadingAction='open'|'read'|'list'|'select'|'close'|'passport'|'read_passport'|'list_passports';
export interface LoadingOperationRepository{
  call(actor:V2Actor,action:LoadingAction,sessionId:string|null,value:unknown,key:string|null,page?:{limit:number;offset:number}):Promise<unknown>;
}
const Id=z.string().uuid(),Page=z.object({limit:z.coerce.number().int().min(1).max(100).default(20),offset:z.coerce.number().int().min(0).max(1000000).default(0),requestId:Id.optional()}).strict();
const Saved=z.object({record:z.unknown(),replay:z.boolean()}).strict();
export class LoadingOperationService{
  constructor(private readonly repository:LoadingOperationRepository){}
  private actor(actor:V2Actor){if(!Id.safeParse(actor.organizationId).success||!Id.safeParse(actor.memberId).success)throw new V2DraftError('UNAUTHORIZED','Active organization membership required.',401);}
  private bundle(raw:unknown,actor:V2Actor,sessionId?:string){
    const b=LoadingBundleSchema.parse(raw);
    if(b.session.organizationId!==actor.organizationId||(sessionId&&b.session.id!==sessionId))throw new V2DraftError('LOADING_SESSION_NOT_FOUND','Loading session not found.',404);
    return b;
  }
  async list(actor:V2Actor,query:unknown){
    this.actor(actor);const p=Page.parse(query);
    const rows=z.array(LoadingSessionSchema).max(p.limit).parse(await this.repository.call(actor,'list',null,{requestId:p.requestId??null},null,p));
    if(rows.some(s=>s.organizationId!==actor.organizationId))throw new V2DraftError('INVALID_LOADING_SOURCE','Loading response scope mismatch.',502);
    return {schemaVersion:'1.0' as const,data:rows,meta:{limit:p.limit,offset:p.offset,nextOffset:rows.length===p.limit?p.offset+p.limit:null}};
  }
  async read(actor:V2Actor,id:string){this.actor(actor);const b=this.bundle(await this.repository.call(actor,'read',Id.parse(id),{},null),actor,id);return {schemaVersion:'1.0' as const,data:b,comparison:loadingComparison(b)};}
  async open(actor:V2Actor,body:unknown,key:unknown){
    this.actor(actor);const value=OpenLoadingSessionSchema.parse(body),saved=Saved.parse(await this.repository.call(actor,'open',null,value,Id.parse(key)));
    const b=this.bundle(saved.record,actor);
    if(b.session.requestId!==value.requestId||b.session.manifest.id!==value.manifestId||b.session.manifest.revision!==value.manifestRevision||b.session.facilityId!==value.facilityId||b.session.mode!==value.mode||b.session.groups.length!==value.groups.length||b.session.groups.some(g=>!value.groups.some(v=>v.groupId===g.id&&v.unit===g.unit)))throw new V2DraftError('INVALID_LOADING_SOURCE','Opening receipt scope mismatch.',502);
    return {schemaVersion:'1.0' as const,data:b,comparison:loadingComparison(b),meta:{idempotentReplay:saved.replay}};
  }
  async change(actor:V2Actor,id:string,action:'select'|'close',body:unknown,key:unknown){
    this.actor(actor);const value=action==='select'?SelectLoadingObservationSchema.parse(body):LoadingVersionSchema.parse(body);
    const saved=Saved.parse(await this.repository.call(actor,action,Id.parse(id),value,Id.parse(key))),b=this.bundle(saved.record,actor,id);
    return {schemaVersion:'1.0' as const,data:b,comparison:loadingComparison(b),meta:{idempotentReplay:saved.replay}};
  }
  private passportScope(raw:unknown,actor:V2Actor,id:string):LoadingPassportRecord{
    const p=LoadingPassportRecordSchema.parse(raw);
    if(p.organizationId!==actor.organizationId||p.sessionId!==id)throw new V2DraftError('PASSPORT_NOT_FOUND','Passport not found.',404);
    return p;
  }
  async createPassport(actor:V2Actor,id:string,body:unknown,key:unknown){
    this.actor(actor);const saved=Saved.parse(await this.repository.call(actor,'passport',Id.parse(id),LoadingVersionSchema.parse(body),Id.parse(key)));
    const p=this.passportScope(saved.record,actor,id);
    return {schemaVersion:'1.0' as const,data:loadingPassport(p),meta:{idempotentReplay:saved.replay}};
  }
  async readPassport(actor:V2Actor,id:string,passportId:string){
    this.actor(actor);const record=z.object({record:z.unknown(),currentVersion:z.number().int().positive(),manifestCurrent:z.boolean(),explanations:z.array(z.object({groupId:Id,value:z.unknown()}).strict()).max(100)}).strict().parse(await this.repository.call(actor,'read_passport',Id.parse(id),{passportId:Id.parse(passportId)},null));
    const p=this.passportScope(record.record,actor,id);
    const explanations=record.explanations.map(e=>({groupId:e.groupId,value:validateLoadingExplanation(p,e.groupId,e.value)}));
    return {schemaVersion:'1.0' as const,data:{...loadingPassport(p),explanations},meta:{currentSessionVersion:record.currentVersion,manifestCurrent:record.manifestCurrent,isCurrent:record.currentVersion===p.sessionVersion&&record.manifestCurrent}};
  }
  async listPassports(actor:V2Actor,id:string){
    this.actor(actor);const rows=z.array(z.object({id:Id,sessionVersion:z.number().int().positive(),createdAt:z.string().datetime({offset:true})}).strict()).max(100).parse(await this.repository.call(actor,'list_passports',Id.parse(id),{},null));
    return {schemaVersion:'1.0' as const,data:rows};
  }
  async explanationFacts(actor:V2Actor,id:string,passportId:string,groupId:string){
    const p=await this.readPassport(actor,id,passportId);
    if(!p.meta.isCurrent)throw new V2DraftError('STALE_PASSPORT','Choose the Passport for the current session version.',409);
    try{return {schemaVersion:'1.0' as const,data:loadingExplanationFacts(p.data,Id.parse(groupId))};}
    catch(error){if(error instanceof z.ZodError)throw error;throw new V2DraftError(error instanceof Error?error.message:'INVALID_EXPLANATION_SCOPE','This group cannot be projected to the explanation contract.',422);}
  }
}
