import 'server-only';
import {readMetaProposalConfig, type MetaEnvironment} from './config';
import {dockmindWorkerSettingsFromEnv,dockmindCallbackSecretFromEnv} from '@/server/modules/analysis-jobs/config';

/** Local configuration only. Never probes endpoints, prints values or certifies inference/deployment. */
export function inspectTetrisReadiness(env:MetaEnvironment,options:{localOnly?:boolean}={}){
 const checks:Array<{component:string;status:'CONFIGURED'|'NOT_CONFIGURED'}>=[];
 const check=(component:string,read:()=>unknown)=>{try{checks.push({component,status:read()?'CONFIGURED':'NOT_CONFIGURED'});}catch{checks.push({component,status:'NOT_CONFIGURED'});}};
 check('Meta text/photo/explanation',()=>readMetaProposalConfig(env));
 check('DockMind worker transport',()=>dockmindWorkerSettingsFromEnv({...env}));
 check('DockMind callback signature',()=>dockmindCallbackSecretFromEnv({...env}));
 check('Supabase server access',()=>env.NEXT_PUBLIC_SUPABASE_URL?.trim()&&env.SUPABASE_SERVICE_ROLE_KEY?.trim());
 if(options.localOnly)check('Local-only isolation',()=>{
  const url=new URL(env.NEXT_PUBLIC_SUPABASE_URL??'');
  return env.DOCKMIND_WORKER_MODE==='LOCAL_LOOPBACK'&&env.NODE_ENV!=='production'&&!env.VERCEL&&url.protocol==='http:'&&url.hostname==='127.0.0.1'&&!!url.port&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash;
 });
 return {schemaVersion:'1.0' as const,status:checks.every(c=>c.status==='CONFIGURED')?'READY_FOR_INTEGRATION_TEST' as const:'CONFIGURATION_INCOMPLETE' as const,
  checks,liveRequestMade:false,providerVerified:false,workerVerified:false,databaseVerified:false,commercialWrites:0};
}
