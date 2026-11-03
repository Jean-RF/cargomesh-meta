import 'server-only';
import {createV2ServerSupabaseClient} from '@/server/db/supabase/v2';
import {V2DraftError} from '../freight-requests/application/draft-service';
import type {LoadingOperationRepository} from './operation-service';

export type LoadingRpcClient={rpc(name:string,args:Record<string,unknown>):PromiseLike<{data:unknown;error:{code?:string;message:string}|null}>};
export function loadingRpcError(error:{code?:string;message:string}):never{
  if(['PGRST202','42883','42P01'].includes(error.code??''))throw new V2DraftError('LOADING_NOT_INSTALLED','Loading sessions are not installed in this environment.',503);
  const status:Record<string,number>={PT400:400,PT401:401,PT403:403,PT404:404,PT409:409,PT422:422,PT503:503};
  if(status[error.code??''])throw new V2DraftError(/^[A-Z][A-Z0-9_]+$/.test(error.message)?error.message:'LOADING_COMMAND_FAILED','Reload the authorized session and review its current state.',status[error.code??'']);
  throw new Error('LOADING_DATABASE_ERROR');
}
export function createLoadingOperationRepository(db:LoadingRpcClient):LoadingOperationRepository{
  return {async call(actor,action,sessionId,value,key,page={limit:20,offset:0}){
    const {data,error}=await db.rpc('meta_loading_sessions_v1',{p_organization_id:actor.organizationId,p_member_id:actor.memberId,p_action:action,p_session_id:sessionId,p_value:value,p_key:key,p_limit:page.limit,p_offset:page.offset});
    if(error)loadingRpcError(error);return data;
  }};
}
export async function loadingOperationRepository(){
  const db=await createV2ServerSupabaseClient();
  // Narrow RPC bridge until the reviewed migration is installed and native types are regenerated.
  return createLoadingOperationRepository(db as unknown as LoadingRpcClient);
}
