'use client';
import {useEffect,useRef,useState} from 'react';
import type {z} from 'zod';
import {Button,Dialog,Input} from '@/components/ui';
import {Clock3,History,Search,Sparkles} from 'lucide-react';
import {useLocale} from '@/features/i18n/locale-provider';
import type {QuoteHistorySchema,QuoteSearchResponseSchema} from '@/shared/schemas/v2/quote-automation';
import {readSimilarRequests} from './quote-api';
import s from './shipper-portal.module.css';
import compactStyles from './commercial-workspace.module.css';
type Result=z.infer<typeof QuoteSearchResponseSchema>['data'];
export function QuoteSearchPanel({requestId,canSearch,busy,onSearch,onNova,compact=false,pickupAt}:{requestId:string;canSearch:boolean;busy:boolean;onSearch:(deadline:string)=>Promise<Result>;onNova:()=>void;compact?:boolean;pickupAt?:string}){
 const {t,localeTag}=useLocale();const [deadline,setDeadline]=useState(''),[consent,setConsent]=useState(false),[result,setResult]=useState<Result|null>(null);
 const [open,setOpen]=useState(false),[historyOpen,setHistoryOpen]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState('');const inFlight=useRef(false);
 const [history,setHistory]=useState<z.infer<typeof QuoteHistorySchema>|null>(null),[historyError,setHistoryError]=useState(false);
 useEffect(()=>{const controller=new AbortController();setHistory(null);setHistoryError(false);
  void readSimilarRequests(requestId,controller.signal).then(rows=>{if(!controller.signal.aborted)setHistory(rows);}).catch(()=>{if(!controller.signal.aborted)setHistoryError(true);});return()=>controller.abort();
 },[requestId]);
 const localDate=(value:string)=>{const date=new Date(value);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);};
 const pickupPassed=Boolean(pickupAt&&Date.parse(pickupAt)<=Date.now());
 async function search(){if(!canSearch||!consent||!deadline||busy||inFlight.current)return;const end=Date.parse(deadline);
  if(!Number.isFinite(end)||end<=Date.now()||pickupAt&&end>Date.parse(pickupAt)){setError(t('Elige un plazo futuro anterior al recojo.','Choose a future deadline before pickup.'));return;}
  inFlight.current=true;setPending(true);setError('');try{setResult(await onSearch(new Date(end).toISOString()));setOpen(false);setConsent(false);}
  catch(caught){setError(caught instanceof Error?caught.message:t('No se pudo solicitar ofertas. Reintenta.','Could not request offers. Retry.'));}
  finally{inFlight.current=false;setPending(false);}}
 if(compact)return <div className={compactStyles.workspace}>
  <section className={compactStyles.searchBar} aria-label={t('Buscar ofertas','Find offers')}>
   <div className={compactStyles.searchIdentity}><span className={compactStyles.searchIcon}><Search size={19}/></span><div><h2>{t('Ofertas de transporte','Transport offers')}</h2><p>{pickupPassed?t('Actualiza la fecha de recojo para solicitar ofertas.','Update the pickup date to request offers.'):t('Solicita cotizaciones y compara las respuestas.','Request quotes and compare responses.')}</p></div></div>
   <div className={compactStyles.searchActions}><Button variant="ghost" size="compact" disabled={busy||pending} onClick={onNova}><Sparkles size={15}/>{t('Consultar con Nova','Ask Nova')}</Button>
    <Button variant="secondary" size="compact" disabled={pending} onClick={()=>setHistoryOpen(true)}><History size={15}/>{t('Casos similares','Similar shipments')}</Button>
    {canSearch&&<Button className={compactStyles.primary} size="compact" disabled={busy||pending||pickupPassed} onClick={()=>{setError('');setOpen(true);}}><Search size={15}/>{t('Buscar ofertas','Find offers')}</Button>}
   </div>
  </section>
  {result&&<div className={compactStyles.result} role="status"><strong>{result.outcomes.filter(row=>row.status==='OFFERED').length} {t('ofertas recibidas','offers received')}</strong>
   {result.outcomes.some(row=>row.status==='AWAITING_CARRIER')&&<span><Clock3 size={12}/> {result.outcomes.filter(row=>row.status==='AWAITING_CARRIER').length} {t('esperando respuesta','awaiting response')}</span>}
   {result.unresolvedServices+result.outcomes.filter(row=>row.status==='REQUIRES_REVIEW').length>0&&<span>{result.unresolvedServices+result.outcomes.filter(row=>row.status==='REQUIRES_REVIEW').length} {t('requieren revisión','require review')}</span>}
   {result.rankingNotice&&<p>{t('La comparación estará disponible al actualizar la política de evaluación.','Comparison will be available once the evaluation policy is updated.')}</p>}
   {!result.outcomes.length&&<p>{t('No hay servicios confirmados para estas condiciones. Revisa la ruta y la carga.','No confirmed services match these conditions. Review the route and cargo.')}</p>}
  </div>}
  <Dialog open={open} title={t('Solicitar ofertas','Request quotes')} description={t('Define hasta cuándo recibir respuestas de los transportistas.','Choose how long carriers have to respond.')} closeLabel={t('Cerrar','Close')} className={compactStyles.dialog} closeDisabled={pending||busy} onClose={()=>setOpen(false)}
   footer={<><Button variant="secondary" disabled={pending||busy} onClick={()=>setOpen(false)}>{t('Cancelar','Cancel')}</Button><Button disabled={!canSearch||busy||pending||!deadline||!consent||pickupPassed} isLoading={pending} onClick={()=>void search()}>{t('Solicitar ofertas','Request quotes')}</Button></>}>
   <div className={compactStyles.form}><Input type="datetime-local" label={t('Responder antes de (hora local)','Respond by (local time)')} value={deadline} min={localDate(new Date().toISOString())} max={pickupAt?localDate(pickupAt):undefined} disabled={pending||busy} onChange={event=>{setDeadline(event.target.value);setConsent(false);setError('');}}/>
    <label className={compactStyles.consent}><input type="checkbox" checked={consent} disabled={pending||busy} onChange={event=>setConsent(event.target.checked)}/><span>{t('Confirmo los datos del envío y autorizo solicitar cotizaciones.','I confirm the shipment details and authorize requesting quotes.')}</span></label>
    <p>{t('Esta acción no reserva transporte.','This does not book transport.')}</p>{error&&<p role="alert" className={compactStyles.error}>{error}</p>}
   </div>
  </Dialog>
  <Dialog open={historyOpen} title={t('Envíos similares','Similar shipments')} description={t('Referencias de tu empresa; los precios y la disponibilidad se deben revalidar.','Company references; prices and availability need revalidation.')} closeLabel={t('Cerrar','Close')} className={compactStyles.dialog} onClose={()=>setHistoryOpen(false)}>
   <div className={compactStyles.history}>{historyError?<p role="status">{t('No se pudo consultar el historial.','History could not be loaded.')}</p>:history===null?<p role="status">{t('Cargando historial…','Loading history…')}</p>:!history.length?<p>{t('Todavía no hay envíos similares.','No similar shipments yet.')}</p>:history.map(row=><article key={row.requestId}><strong>{row.reference}</strong><p>{row.totalWeightKg.toLocaleString(localeTag)} kg · {row.totalVolumeM3.toLocaleString(localeTag)} m³</p>{row.quotedPrices.length>0&&<small>{t('Cotizaciones históricas','Historical quotes')}: {row.quotedPrices.map(price=>`USD ${price.amount.toLocaleString(localeTag,{minimumFractionDigits:2})}`).join(' · ')}</small>}</article>)}</div>
  </Dialog>
 </div>;
 return <section className={s.panel} aria-label={t('Cotización','Quotation')}>
  <header className={s.panelHeader}><h2>{t('Buscar ofertas de transporte','Find transport offers')}</h2></header>
  <p>{t('Se revisan cobertura, carga y disponibilidad. Verás hasta tres opciones para comparar.','Coverage, cargo and availability are checked. Compare up to three options.')}</p>
  <Button variant="secondary" disabled={busy} onClick={onNova}>{t('Consultar con Nova','Discuss with Nova')}</Button>
  {error&&<p className={compactStyles.error} role="alert">{error}</p>}
  {canSearch?<><Input type="datetime-local" label={t('Recibir respuestas hasta (hora local)','Response deadline (local time)')} value={deadline} onChange={e=>{setDeadline(e.target.value);setConsent(false);}} disabled={busy}/>
   <label><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/> {t('Confirmo el pedido y autorizo solicitar ofertas.','I confirm the request and authorize requesting quotes.')}</label>
   <div className={s.heroActions}><Button disabled={busy||!consent||!deadline} isLoading={busy} onClick={()=>void search()}>{t('Buscar ofertas','Find offers')}</Button></div></>:null}
  {result?<p role="status">{t('Servicios revisados','Services reviewed')}: {result.evaluatedServices} · {t('Ofertas recibidas','Offers received')}: {result.outcomes.filter(o=>o.status==='OFFERED').length} · {t('Pendientes de Carrier','Awaiting carrier')}: {result.outcomes.filter(o=>o.status==='AWAITING_CARRIER').length} · {t('Requieren revisión','Require review')}: {result.unresolvedServices+result.outcomes.filter(o=>o.status==='REQUIRES_REVIEW').length}
   {result.rankingNotice?` · ${t('Ranking pendiente de política vigente.','Ranking awaits a current scoring policy.')}`:''}
   {result.outcomes.length===0?` · ${t('No hay servicios confirmados para estas condiciones. Revisa la factibilidad antes de continuar.','No confirmed services match these conditions. Review serviceability before continuing.')}`:''}</p>:null}
  <details><summary>{t('Casos similares de mi empresa','Similar cases from my company')}</summary>
   {historyError?<p role="status">{t('No se pudo consultar el historial. No hay una estimación disponible.','History could not be read. No estimate is available.')}</p>:history===null?<p>{t('Consultando historial…','Reading history…')}</p>:history.length===0?<p>{t('Todavía no hay casos similares; Nova no estimará un precio histórico.','No similar cases yet; Nova will not estimate a historical price.')}</p>:<ul>{history.map(row=><li key={row.requestId}>{row.reference} · {row.totalWeightKg} kg · {row.totalVolumeM3} m³{row.quotedPrices.length?` · ${t('Precios históricos','Historical prices')}: ${row.quotedPrices.map(p=>`USD ${p.amount.toFixed(2)}`).join(', ')}`:` · ${t('Sin precio registrado','No recorded price')}`}</li>)}</ul>}
   {history?.some(row=>row.quotedPrices.length)?<small>{t('Referencias históricas; se deben volver a validar precio y disponibilidad.','Historical references; price and availability must be revalidated.')}</small>:null}
  </details>
 </section>;
}
