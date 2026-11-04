import {z} from 'zod';
import {PassportExplanationCommandSchema,PassportExplanationReplySchema,PassportExplanationListSchema,type PassportExplanationCommand} from '@/shared/schemas/meta/passport-explanation';
import {workspaceFetch} from '@/features/workspace-mode/workspace-fetch';
import {FacilityV2Schema} from '@/shared/schemas/v2/facilities';
import {FreightRequestV2ResponseSchema} from '@/shared/schemas/v2/freight-request';
import {LoadingBundleSchema,LoadingManifestProjectionSchema,LoadingPassportRecordSchema,LoadingSessionSchema,type OpenLoadingSession} from '@/shared/schemas/meta/loading-operation';
import {loadingPassport,validateLoadingExplanation} from '@/shared/meta/loading-operation';

const base='/api/v2/meta/loading-sessions',Id=z.string().uuid();
const PassportSource=LoadingPassportRecordSchema.innerType().strip().pipe(LoadingPassportRecordSchema);
export class LoadingApiError extends Error{constructor(readonly code:string,readonly status:number){super(code);}}
const messages:Record<string,string>={
 UNAUTHORIZED:'Inicia sesión para consultar las sesiones de tu organización.',FORBIDDEN:'Tu usuario no puede realizar esta acción.',
 FORBIDDEN_ORIGIN:'Abre Tetris desde el mismo sitio e inténtalo de nuevo.',
 MANIFESTS_NOT_INSTALLED:'El servicio de manifiestos aún no está conectado en este entorno.',LOADING_NOT_INSTALLED:'Las sesiones aún no están instaladas en este entorno.',
 CONFIRMED_MANIFEST_REQUIRED:'Revisa y confirma el manifiesto de esta solicitud antes de abrir la sesión.',
 STALE_MANIFEST:'El manifiesto cambió. Recarga y revisa la declaración vigente.',STALE_LOADING_SESSION:'Otra persona o proceso actualizó la sesión. Recarga antes de guardar.',
 ACTIVE_SESSION_EXISTS:'Ya existe una sesión abierta para esta solicitud, sede y manifiesto. Ábrela desde la lista.',
 INCOMPATIBLE_UNIT:'La observación utiliza otra unidad. Selecciona una observación compatible.',OBSERVATION_ALREADY_ASSIGNED:'Esa observación ya está vinculada a otro grupo.',
 STALE_OBSERVATION:'Hay un intento más reciente. Recarga y revisa sus resultados.',SESSION_SCOPE_OPEN:'Cierra el alcance para generar el Passport.',
 STALE_PASSPORT:'El Passport cambió. Recarga la versión vigente; se conserva la comparación anterior.',
 FORBIDDEN_WORKFLOW:'Tu usuario puede consultar este Passport, pero no generar explicaciones.',
 PASSPORT_EXPLANATIONS_NOT_INSTALLED:'La explicación del Passport todavía no está instalada en este entorno.',
 NOT_CONFIGURED:'La explicación no está configurada. La comparación sigue disponible.',
 PERSISTENCE_UNAVAILABLE:'No se pudo confirmar el guardado. Recupera el mismo intento antes de generar otro.',
 EXPLANATION_RETRY_REQUIRED:'Hay un intento anterior. Consulta su estado antes de iniciar otro.',
 IDEMPOTENCY_CONFLICT:'La referencia pertenece a otra operación. Recarga el Passport.',
 NETWORK_ERROR:'No se pudo conectar. Reintenta la misma acción; conserva su referencia de guardado.',
};
export const loadingErrorMessage=(e:unknown)=>e instanceof LoadingApiError?(messages[e.code]??`No se pudo completar la acción (${e.code}). Recarga y vuelve a revisar.`):'La respuesta no es válida. Recarga la sesión antes de continuar.';

export function createLoadingApi(fetcher:typeof fetch=workspaceFetch){
 async function json(path:string,body?:unknown,key?:string,signal?:AbortSignal){
  let response:Response;
  try{response=await fetcher(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',...(signal?{signal}:{}),headers:{Accept:'application/json',...(body===undefined?{}:{'Content-Type':'application/json','Idempotency-Key':Id.parse(key)})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
  catch{throw new LoadingApiError('NETWORK_ERROR',0);}
  const raw:unknown=await response.json().catch(()=>null);
  if(!response.ok){const e=z.object({error:z.object({code:z.string()})}).safeParse(raw);throw new LoadingApiError(e.success?e.data.error.code:`HTTP_${response.status}`,response.status);}
  return raw;
 }
 const bundle=(raw:unknown)=>z.object({data:LoadingBundleSchema}).parse(raw).data;
 return {
  async list(offset=0){return z.object({data:z.array(LoadingSessionSchema).max(20),meta:z.object({nextOffset:z.number().int().nullable(),canOperate:z.boolean()})}).parse(await json(`${base}?limit=20&offset=${offset}`));},
  async read(id:string){const b=bundle(await json(`${base}/${Id.parse(id)}`));if(b.session.id!==id)throw new Error('SESSION_SCOPE_MISMATCH');return b;},
  async open(value:OpenLoadingSession,key:string){const b=bundle(await json(base,value,key));if(b.session.requestId!==value.requestId||b.session.manifest.id!==value.manifestId||b.session.facilityId!==value.facilityId)throw new Error('SESSION_SCOPE_MISMATCH');return b;},
  async change(id:string,action:'close'|'observation-selections',value:unknown,key:string){const b=bundle(await json(`${base}/${Id.parse(id)}/${action}`,value,key));if(b.session.id!==id)throw new Error('SESSION_SCOPE_MISMATCH');return b;},
  async requests(offset=0){return z.object({data:z.array(FreightRequestV2ResponseSchema.shape.data),meta:z.object({nextOffset:z.number().int().nullable()})}).parse(await json(`/api/v2/freight/requests?limit=100&offset=${offset}`));},
  async request(id:string){const item=FreightRequestV2ResponseSchema.parse(await json(`/api/v2/freight/requests/${Id.parse(id)}`)).data;if(item.id!==id)throw new Error('REQUEST_SCOPE_MISMATCH');return item;},
  async facilities(offset=0){return z.object({data:z.array(FacilityV2Schema),meta:z.object({nextOffset:z.number().int().nullable()})}).parse(await json(`/api/v2/facilities?limit=100&offset=${offset}`));},
  async manifest(requestId:string){const r=z.object({data:LoadingManifestProjectionSchema.nullable()}).parse(await json(`/api/v2/freight/requests/${Id.parse(requestId)}/declared-manifests/current`));if(r.data&&r.data.declaration.source.requestId!==requestId)throw new Error('MANIFEST_SCOPE_MISMATCH');return r.data;},
  async planningManifest(requestId:string){
   const r=z.object({data:LoadingManifestProjectionSchema.nullable(),meta:z.object({currentRequestDraftVersion:z.number().int().positive(),matchesCurrentRequest:z.boolean().nullable()})}).parse(await json(`/api/v2/freight/requests/${Id.parse(requestId)}/declared-manifests/current`));
   if(r.data&&r.data.declaration.source.requestId!==requestId)throw new Error('MANIFEST_SCOPE_MISMATCH');
   if(r.data&&(r.meta.matchesCurrentRequest!==true||r.data.declaration.source.requestDraftVersion!==r.meta.currentRequestDraftVersion))throw new LoadingApiError('STALE_MANIFEST',409);
   return r.data;
  },
  async createPassport(id:string,version:number,key:string){const r=z.object({data:PassportSource}).parse(await json(`${base}/${Id.parse(id)}/passports`,{expectedVersion:version},key));if(r.data.sessionId!==id)throw new Error('PASSPORT_SCOPE_MISMATCH');return r.data;},
  async passports(id:string){return z.object({data:z.array(z.object({id:Id,sessionVersion:z.number().int().positive(),createdAt:z.string().datetime({offset:true})})).max(100)}).parse(await json(`${base}/${Id.parse(id)}/passports`)).data;},
  async explanationAttempts(id:string,passportId:string,signal?:AbortSignal){
   const result=PassportExplanationListSchema.parse(await json(`${base}/${Id.parse(id)}/passports/${Id.parse(passportId)}/explanations`,undefined,undefined,signal));
   if(result.data.sessionId!==id||result.data.passportId!==passportId)throw new Error('PASSPORT_SCOPE_MISMATCH');
   return result.data.attempts;
  },
  async explain(id:string,passportId:string,input:PassportExplanationCommand,key:string,signal?:AbortSignal){
   const command=PassportExplanationCommandSchema.parse(input);
   const result=PassportExplanationReplySchema.parse(await json(`${base}/${Id.parse(id)}/passports/${Id.parse(passportId)}/explanations`,command,key,signal));
   if(result.data.sessionId!==id||result.data.passportId!==passportId||result.data.groupId!==input.groupId||
     result.data.attempt&&result.data.attempt.groupId!==input.groupId||
     result.data.explanation&&result.data.explanation.reconciliationVersion!==input.expectedVersion)throw new Error('PASSPORT_SCOPE_MISMATCH');
   return result;
  },
  async passport(id:string,passportId:string){
   const r=z.object({data:z.object({explanations:z.array(z.object({groupId:Id,value:z.unknown()})).max(100)}).passthrough(),meta:z.object({currentSessionVersion:z.number().int().positive(),manifestCurrent:z.boolean(),isCurrent:z.boolean()})}).parse(await json(`${base}/${Id.parse(id)}/passports/${Id.parse(passportId)}`));
   const p=PassportSource.parse(r.data);
   if(p.sessionId!==id||p.id!==passportId)throw new Error('PASSPORT_SCOPE_MISMATCH');
   return {data:{...loadingPassport(p),explanations:r.data.explanations.map(e=>({groupId:e.groupId,value:validateLoadingExplanation(p,e.groupId,e.value)}))},meta:r.meta};
  },
 };
}
export const loadingApi=createLoadingApi();
