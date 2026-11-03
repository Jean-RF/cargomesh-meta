import 'server-only';
import {LoadingDashboardSourceSchema} from '@/shared/schemas/meta/loading-dashboard';
import {buildLoadingDashboard} from '@/shared/meta/loading-dashboard';

export type LoadingDashboardActor={organizationId:string;facilityIds:readonly string[]};
export interface LoadingDashboardRepository{
  /** Implementations must filter by the trusted organization and session before returning data. */
  readSource(organizationId:string,sessionId:string):Promise<unknown|null>;
}
/** Actor comes from server authentication. There is no public endpoint or privileged fallback here. */
export async function readLoadingDashboard(actor:LoadingDashboardActor,sessionId:string,repository:LoadingDashboardRepository){
  if(!actor.organizationId||!sessionId||!actor.facilityIds.length)return {status:403 as const,error:'FORBIDDEN' as const};
  const input=await repository.readSource(actor.organizationId,sessionId);
  if(input===null)return {status:404 as const,error:'NOT_FOUND' as const};
  const parsed=LoadingDashboardSourceSchema.safeParse(input);
  if(!parsed.success)return {status:422 as const,error:'INVALID_DASHBOARD_SOURCE' as const};
  const s=parsed.data;
  if(s.session.organizationId!==actor.organizationId||s.session.id!==sessionId||!actor.facilityIds.includes(s.session.facilityId))return {status:404 as const,error:'NOT_FOUND' as const};
  if(s.source!=='CONNECTED')return {status:422 as const,error:'FIXTURE_NOT_ALLOWED' as const};
  return {status:200 as const,snapshot:buildLoadingDashboard(s)};
}
