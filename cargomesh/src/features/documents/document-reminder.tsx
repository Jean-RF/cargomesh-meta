'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {WorkspaceLink as Link} from '@/features/workspace-mode/workspace-link';
import {workspaceHref} from '@/features/workspace-mode/paths';
import {workspaceFetch} from '@/features/workspace-mode/workspace-fetch';
import {useLocale} from '@/features/i18n/locale-provider';
import {DocumentReadinessSchema,type DocumentReadiness} from '@/shared/schemas/meta/document-readiness';
/** One reminder per organization/status in this browser session. Recheck on return, never on every chat message. */
export function DocumentReminder({enabled=true}:{enabled?:boolean}){
 const {t}=useLocale(),pathname=usePathname();const [status,setStatus]=useState<DocumentReadiness|null>(null),[dismissed,setDismissed]=useState(false);
 useEffect(()=>{if(!enabled){setStatus(null);return;}let active=true,controller:AbortController|null=null;
  const read=async()=>{controller?.abort();const attempt=new AbortController();controller=attempt;try{const reply=await workspaceFetch('/api/v2/meta/documents/readiness',{signal:attempt.signal,credentials:'same-origin',cache:'no-store'});if(!reply.ok)throw Error();const value=DocumentReadinessSchema.parse(await reply.json());if(active&&!attempt.signal.aborted){setStatus(value);try{setDismissed(sessionStorage.getItem(`cm-doc-reminder:${value.organizationId}:${value.companyProfile}`)==='dismissed');}catch{setDismissed(false);}}}catch{if(active&&!attempt.signal.aborted)setStatus(null);}};
  void read();window.addEventListener('focus',read);window.addEventListener('cargomesh:documents-changed',read);return()=>{active=false;controller?.abort();window.removeEventListener('focus',read);window.removeEventListener('cargomesh:documents-changed',read);};
 },[enabled,pathname]);
 if(!status||dismissed||status.companyProfile==='AVAILABLE'||status.companyProfile==='UNKNOWN')return null;
 const message=status.companyProfile==='EXPIRED'?t('Actualiza el perfil empresarial vencido en tu biblioteca.','Update the expired company profile in your library.'):status.companyProfile==='INCOMPLETE'?t('Tu perfil empresarial tiene una carga o fecha pendiente.','Your company profile has an incomplete upload or date.'):t('Aún no tienes un perfil empresarial en tu biblioteca. Súbelo una vez para reutilizarlo.','Your library has no company profile yet. Upload it once to reuse it.');
 return <aside role="status" style={{padding:'0.75rem',border:'1px solid #ded8f7',borderRadius:12,background:'#faf8ff',fontSize:13}}><p>{message} {t('Puedes continuar preparando la solicitud.','You can continue preparing your request.')}</p><Link href={workspaceHref('/organization?tab=documents',pathname??'')}>{t('Ir a Documentos','Go to Documents')} →</Link>{' '}<button type="button" onClick={()=>{setDismissed(true);try{sessionStorage.setItem(`cm-doc-reminder:${status.organizationId}:${status.companyProfile}`,'dismissed');}catch{}}}>{t('Recordado, continuar','Got it, continue')}</button></aside>;
}
