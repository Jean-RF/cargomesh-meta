'use client';
import {useEffect,useRef,useState} from 'react';
import {Button,Dialog,Input,Select} from '@/components/ui';
import {useIntakeSession} from '@/features/v2-intake/intake-session';
import {cargoGroups} from '@/features/v2-intake/cargo-groups';
import {reviewedPackingGroups} from './packing-list-model';
import {PackingListReviewSchema,type PackingListReview} from '@/shared/schemas/meta/packing-list';
import {workspaceFetch} from '@/features/workspace-mode/workspace-fetch';
import type {WorkspaceSwitchDetail} from '@/features/workspace-demo/switch-guard';

/** A PDF analysis is a reviewable proposal. Existing groups change only through explicit target selection. */
export function PackingListImportDialog(){
 const session=useIntakeSession(),{t}=session;const [open,setOpen]=useState(false),[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[review,setReview]=useState<PackingListReview|null>(null),[confirmed,setConfirmed]=useState(false),[targets,setTargets]=useState<string[]>([]);
 const fingerprint=JSON.stringify([session.request?.id,session.draft]),current=useRef(fingerprint);current.current=fingerprint;
 const captured=useRef(''),generation=useRef(0),locked=useRef(false),abort=useRef<AbortController|null>(null);
 useEffect(()=>{const show=()=>setOpen(true);window.addEventListener('cargomesh:packing-list',show);return()=>{window.removeEventListener('cargomesh:packing-list',show);abort.current?.abort();};},[]);
 useEffect(()=>{const change=(event:Event)=>{if(locked.current){event.preventDefault();const detail=(event as CustomEvent<WorkspaceSwitchDetail>).detail;if(detail)detail.blockedReason=t('Espera a que termine el análisis del PDF.','Wait for PDF analysis to finish.');}else{setReview(null);setFile(null);setConfirmed(false);setOpen(false);}};window.addEventListener('cargomesh:before-workspace-switch',change);return()=>window.removeEventListener('cargomesh:before-workspace-switch',change);},[t]);
 const stale=!!review&&captured.current!==fingerprint;
 const intakeBusy=['creating','revising','reading','evaluating'].includes(session.submitPhase)||session.media.busy||session.media.recording||session.media.requestingMic;
 async function analyze(){if(!file||locked.current||intakeBusy)return;locked.current=true;setBusy(true);setError('');setReview(null);setConfirmed(false);captured.current=current.current;const seq=++generation.current;abort.current=new AbortController();
  try{const body=new FormData();body.set('file',file);body.set('inputRevision',String(seq));body.set('language',session.locale==='es'?'es':'en');const reply=await workspaceFetch('/api/v2/meta/documents/packing-list/prepare',{method:'POST',credentials:'same-origin',body,signal:abort.current.signal});const raw=await reply.json();if(!reply.ok)throw Error(raw.error?.message??'Packing list analysis failed');const result=PackingListReviewSchema.parse(raw);if(captured.current!==current.current||result.inputRevision!==seq)throw Error(t('El borrador cambió; vuelve a analizar el documento.','The draft changed; analyze the document again.'));setReview(result);setTargets(result.groups.map(()=> 'new'));}
  catch(e){if(!(e instanceof Error&&e.name==='AbortError'))setError(e instanceof Error?e.message:t('No se pudo analizar.','Analysis failed.'));}finally{locked.current=false;setBusy(false);}
 }
 function apply(){if(!review||stale||!confirmed||busy||intakeBusy)return;let result:ReturnType<typeof reviewedPackingGroups>;
  try{result=reviewedPackingGroups(session.draft,!!session.request,review,targets);}catch{setError(t('Revisa los grupos de destino: deben ser distintos y este PDF no debe duplicar grupos ya incorporados.','Review target groups: choose distinct groups and avoid duplicating previously imported PDF groups.'));return;}
  session.updateCargoGroups(result);if(!session.draft.packaging&&result[0]?.unitPackageType)session.update('packaging',result[0].unitPackageType);
  if(!session.draft.cargoDescription){const description=review.groups.map(g=>g.proposal.fields.find(f=>f.field==='cargoDescription')?.value).filter(v=>typeof v==='string').join('; ');if(description)session.update('cargoDescription',description);}
  setReview(null);setOpen(false);session.setStep(2);session.setMaxVisited(old=>Math.max(old,2) as 1|2|3|4);
 }
 return <Dialog open={open} title={t('Preparar carga desde packing list','Prepare cargo from packing list')} description={t('Meta propone datos del PDF. Revisa cada grupo antes de aplicarlos; no crea ni confirma el pedido.','Meta proposes PDF data. Review each group before applying; this does not create or confirm a request.')} closeLabel={t('Cerrar','Close')} closeDisabled={busy} onClose={()=>setOpen(false)} footer={<><Button variant="secondary" disabled={busy} onClick={()=>setOpen(false)}>{t('Cancelar','Cancel')}</Button>{review?<Button disabled={busy||stale||!confirmed||intakeBusy} onClick={apply}>{t('Aplicar grupos revisados','Apply reviewed groups')}</Button>:<Button disabled={!file||busy||intakeBusy} isLoading={busy} onClick={()=>void analyze()}>{t('Analizar PDF con Meta','Analyze PDF with Meta')}</Button>}</>}>
  <Input type="file" accept="application/pdf,.pdf" label={t('Packing list PDF (máx. 4 MiB)','Packing list PDF (max. 4 MiB)')} disabled={busy} onChange={e=>{const value=e.target.files?.[0]??null;setError('');setReview(null);if(value&&(value.type!=='application/pdf'||value.size>4194304||value.size===0)){setFile(null);setError(t('Selecciona un PDF de hasta 4 MiB.','Choose a PDF up to 4 MiB.'));}else setFile(value);}}/>
  <p>{t('Se enviará a Meta el texto extraído al pulsar Analizar. No se guarda el archivo en la biblioteca; puedes adjuntarlo al expediente después de guardar el borrador.','Pressing Analyze sends extracted text to Meta. The file is not saved in the library; attach it to the dossier after saving the draft.')}</p>
  {error&&<p role="alert">{error}</p>}{stale&&<p role="alert">{t('El borrador cambió. Vuelve a analizar antes de aplicar.','The draft changed. Analyze again before applying.')}</p>}
  {review&&<><p>{review.pages} {t('páginas','pages')} · {review.groups.length} {t('grupos','groups')}</p>{review.groups.map((row,index)=><fieldset key={index}><legend>{row.label}</legend><Select label={t('Aplicar a','Apply to')} value={targets[index]} onChange={e=>{setTargets(old=>old.map((v,i)=>i===index?e.target.value:v));setConfirmed(false);}}><option value="new">{t('Nuevo grupo','New group')}</option>{cargoGroups(session.draft).map((g,i)=><option key={g.id} value={g.id}>{t('Grupo existente','Existing group')} {i+1} · {g.unitPackageType||'—'}</option>)}</Select><ul>{row.proposal.fields.map(field=><li key={field.field}><strong>{field.field}: {String(field.value)}</strong><br/><q>{field.provenance.quote}</q></li>)}</ul></fieldset>)}
   {review.missing.length>0&&<p>{t('Datos pendientes','Missing data')}: {review.missing.join(', ')}</p>}
   <p role="status">{t('Revisión de contenido: datos extraídos con pendientes. Cumplimiento normativo y autenticidad: no evaluados. La revisión del carrier es independiente.','Content review: extracted data with possible missing fields. Regulatory compliance and authenticity: not assessed. Carrier review is separate.')}</p>
   <label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{t('Revisé las cantidades, unidades, medidas y los grupos de destino.','I reviewed quantities, units, dimensions and target groups.')}</label></>}
 </Dialog>;
}
