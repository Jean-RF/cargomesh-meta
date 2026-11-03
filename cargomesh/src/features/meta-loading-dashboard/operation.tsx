'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,FileDown,Plus,RefreshCw} from 'lucide-react';
import {OpenLoadingSessionSchema,type LoadingBundle,type LoadingSession} from '@/shared/schemas/meta/loading-operation';
import {loadingComparison} from '@/shared/meta/loading-operation';
import {LoadingDashboardView} from './dashboard';
import {loadingApi,loadingErrorMessage} from './operation-api';
import {readLoadingSessionView} from './operation-read';
import {DockMindEvidencePanel} from '@/features/meta-dockmind/evidence-panel';
import s from './operation.module.css';
import {PassportExplanations} from './passport-explanations';

type Manifest=NonNullable<Awaited<ReturnType<typeof loadingApi.manifest>>>;
type Passport=Awaited<ReturnType<typeof loadingApi.passport>>;
type Request=Awaited<ReturnType<typeof loadingApi.requests>>['data'][number];
type Facility=Awaited<ReturnType<typeof loadingApi.facilities>>['data'][number];
const date=(v:string)=>new Date(v).toLocaleString('es-PE');
const state=(v:string)=>v==='OPEN'?'Abierta':'Cerrada';
const status:Record<string,string>={NOT_READY:'En progreso',MATCH:'Coincide',DIFFERENCE_PROPOSED:'Revisar diferencia',INSUFFICIENT_EVIDENCE:'Evidencia insuficiente',OUTDATED:'Desactualizado',INCOMPATIBLE_SCOPE:'Alcance incompatible'};
const qty=(n:number|null)=>n===null?'Pendiente':n.toLocaleString('es-PE');

export function LoadingOperation(){
 const [rows,setRows]=useState<LoadingSession[]>([]),[offset,setOffset]=useState(0),[next,setNext]=useState<number|null>(null),[canOperate,setCanOperate]=useState(false);
 const [bundle,setBundle]=useState<LoadingBundle|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [creating,setCreating]=useState(false),[requests,setRequests]=useState<Request[]>([]),[facilities,setFacilities]=useState<Facility[]>([]),[moreRequests,setMoreRequests]=useState<number|null>(null),[moreFacilities,setMoreFacilities]=useState<number|null>(null);
 const [requestId,setRequestId]=useState(''),[facilityId,setFacilityId]=useState(''),[mode,setMode]=useState('VERIFICATION'),[manifest,setManifest]=useState<Manifest|null>(null),[units,setUnits]=useState<Record<string,string>>({}),[manifestBusy,setManifestBusy]=useState(false);
 const [groupId,setGroupId]=useState(''),[observationId,setObservationId]=useState(''),[coverage,setCoverage]=useState('PARTIAL'),[reason,setReason]=useState('');
 const [passports,setPassports]=useState<Awaited<ReturnType<typeof loadingApi.passports>>>([]),[passport,setPassport]=useState<Passport|null>(null);
 const intent=useRef<{signature:string;key:string}|null>(null),readEpoch=useRef(0),mounted=useRef(true);
 function key(value:unknown){const signature=JSON.stringify(value);if(intent.current?.signature!==signature)intent.current={signature,key:crypto.randomUUID()};return intent.current.key;}
 async function run(work:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await work();}catch(e){setError(loadingErrorMessage(e));}finally{setBusy(false);}}
 async function list(page=0){const r=await loadingApi.list(page);setRows(r.data);setCanOperate(r.meta.canOperate);setNext(r.meta.nextOffset);setOffset(page);}
 async function read(id:string){
  const epoch=++readEpoch.current,url=new URL(window.location.href);
  const selectedPassport=url.searchParams.get('session')===id?url.searchParams.get('passport'):null;
  const {bundle:b,passports:p,passport:restored}=await readLoadingSessionView(loadingApi,id,selectedPassport);
  if(!mounted.current||epoch!==readEpoch.current)return;
  setBundle(b);setPassports(p);setPassport(restored);setCreating(false);setGroupId(b.session.groups[0].id);setObservationId('');setReason('');setCoverage('PARTIAL');
  url.searchParams.set('session',id);url.searchParams.set('view','sessions');if(!selectedPassport)url.searchParams.delete('passport');window.history.replaceState(null,'',url);
 }
 async function selectPassport(sessionId:string,id:string){
  const epoch=++readEpoch.current,p=await loadingApi.passport(sessionId,id);
  if(!mounted.current||epoch!==readEpoch.current)return;
  setPassport(p);const url=new URL(window.location.href);url.searchParams.set('session',sessionId);url.searchParams.set('passport',id);window.history.replaceState(null,'',url);
 }
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;readEpoch.current++;};},[]);
 useEffect(()=>{let active=true;void (async()=>{try{
  const r=await loadingApi.list();if(!active)return;setRows(r.data);setCanOperate(r.meta.canOperate);setNext(r.meta.nextOffset);
  const id=new URL(window.location.href).searchParams.get('session');if(id&&active)await read(id);
 }catch(e){if(active)setError(loadingErrorMessage(e));}finally{if(active)setBusy(false);}})();return()=>{active=false;};},[]);
 useEffect(()=>{let active=true;setManifest(null);setUnits({});if(!requestId)return;
  setManifestBusy(true);void loadingApi.manifest(requestId).then(m=>{if(active){setManifest(m);if(!m)setNotice('Esta solicitud aún no tiene un manifiesto confirmado. Confírmalo en el formulario de carga.');}}).catch(e=>{if(active)setError(loadingErrorMessage(e));}).finally(()=>{if(active)setManifestBusy(false);});
  return()=>{active=false;};
 },[requestId]);
 async function catalog(){const [r,f]=await Promise.all([loadingApi.requests(),loadingApi.facilities()]);setRequests(r.data);setFacilities(f.data);setMoreRequests(r.meta.nextOffset);setMoreFacilities(f.meta.nextOffset);setCreating(true);}
 async function open(){
  if(!manifest)return;
  const value=OpenLoadingSessionSchema.parse({requestId,facilityId,mode,manifestId:manifest.id,manifestRevision:manifest.revision,groups:manifest.declaration.groupBindings.map(g=>({groupId:g.groupId,unit:units[g.groupId]}))});
  const b=await loadingApi.open(value,key({action:'open',value}));intent.current=null;await read(b.session.id);await list();setNotice('Sesión abierta. El manifiesto y las unidades quedaron registrados.');
 }
 async function change(action:'close'|'observation-selections'){
  if(!bundle)return;
  const value=action==='close'?{expectedVersion:bundle.session.version}:{expectedVersion:bundle.session.version,groupId,observationId,coverage,reason};
  await loadingApi.change(bundle.session.id,action,value,key({id:bundle.session.id,action,value}));intent.current=null;
  await read(bundle.session.id);setNotice(action==='close'?'Alcance cerrado. Puedes generar el Passport de esta versión.':'Cobertura guardada. La comparación conserva la calidad del conteo recibido.');
 }
 const session=bundle?.session,group=session?.groups.find(g=>g.id===groupId),observation=bundle?.observations.find(o=>o.id===observationId);
 const back=()=>{setBundle(null);setPassport(null);setCreating(false);const url=new URL(window.location.href);url.searchParams.delete('session');url.searchParams.delete('passport');url.searchParams.set('view','sessions');readEpoch.current++;window.history.replaceState(null,'',url);void run(()=>list(offset));};
 const before=<div className={s.operation} aria-busy={busy}>
  <Link href="/tetris" className={s.catalogLink}><ArrowLeft size={16}/> Catálogo de camiones</Link>
  <div className={s.toolbar}>{session?<button disabled={busy} onClick={back}><ArrowLeft size={16}/> Todas las sesiones</button>:<><h2>Sesiones de carga</h2><button disabled={busy||!canOperate} onClick={()=>void run(catalog)}><Plus size={16}/> Abrir sesión</button></>}
   <button disabled={busy} onClick={()=>void run(()=>session?read(session.id):list(offset))}><RefreshCw size={15}/> Recargar</button>
  </div>
  {error?<div className={s.error} role="alert"><p>{error}</p><Link href="/login?returnTo=%2Ftetris%3Fview%3Dsessions">Acceder con mi usuario</Link></div>:null}
  {notice?<p className={s.notice} role="status">{notice}</p>:null}
  {busy?<p className={s.loading} role="status">Cargando la lectura autorizada…</p>:null}
  {!session&&!creating?<>
   {!busy&&!rows.length&&!error?<div className={s.empty}><h3>Comienza con un manifiesto confirmado</h3><p>Abre una sesión para registrar el progreso de carga, revisar la evidencia y generar su Passport.</p><Link href="/clients/freight-request/new">Ir al formulario de carga</Link></div>:null}
   {rows.length?<div className={s.list}><table><caption>Sesiones de tu organización</caption><thead><tr><th>Sede y solicitud</th><th>Estado</th><th>Manifiesto</th><th>Actualizada</th><th>Lectura</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><th scope="row">{r.facilityName}<small>{r.requestId}</small></th><td>{state(r.state)}<small>{r.mode==='DEMO'?'Demostración':'Verificación'}</small></td><td>Revisión {r.manifest.revision}</td><td>{date(r.updatedAt)}</td><td><button disabled={busy} onClick={()=>void run(()=>read(r.id))}>Abrir sesión<span className={s.sr}> de {r.facilityName}, {date(r.openedAt)}</span></button></td></tr>)}</tbody></table></div>:null}
   {rows.length?<div className={s.paging}><button disabled={busy||offset===0} onClick={()=>void run(()=>list(Math.max(0,offset-20)))}>Anteriores</button><span>Desde {offset+1}</span><button disabled={busy||next===null} onClick={()=>void run(()=>list(next!))}>Siguientes</button></div>:null}
  </>:null}
  {creating?<form className={s.form} onSubmit={e=>{e.preventDefault();void run(open);}}><div className={s.sectionTitle}><h3>Abrir una sesión</h3><button type="button" disabled={busy} onClick={()=>setCreating(false)}>Volver a la lista</button></div>
   <div className={s.fields}><label>Solicitud<select required value={requestId} onChange={e=>{setError('');setNotice('');setRequestId(e.target.value);}}><option value="">Selecciona una solicitud</option>{requests.map(r=><option key={r.id} value={r.id}>{r.referenceCode} · {r.origin.label} → {r.destination.label}</option>)}</select></label>
    <label>Sede<select required value={facilityId} onChange={e=>setFacilityId(e.target.value)}><option value="">Selecciona una sede</option>{facilities.filter(f=>f.value.active).map(f=><option key={f.id} value={f.id}>{f.value.name}</option>)}</select></label>
    <label>Uso de la sesión<select value={mode} onChange={e=>setMode(e.target.value)}><option value="VERIFICATION">Verificación con captura propia</option><option value="DEMO">Demostración con datos de muestra</option></select></label></div>
   {moreRequests!==null||moreFacilities!==null?<div className={s.toolbar}>{moreRequests!==null?<button type="button" disabled={busy} onClick={()=>void run(async()=>{const r=await loadingApi.requests(moreRequests);setRequests(v=>[...v,...r.data]);setMoreRequests(r.meta.nextOffset);})}>Cargar más solicitudes</button>:null}{moreFacilities!==null?<button type="button" disabled={busy} onClick={()=>void run(async()=>{const f=await loadingApi.facilities(moreFacilities);setFacilities(v=>[...v,...f.data]);setMoreFacilities(f.meta.nextOffset);})}>Cargar más sedes</button>:null}</div>:null}
   {manifestBusy?<p role="status">Consultando el manifiesto confirmado…</p>:null}
   {manifest?<fieldset><legend>Manifiesto r{manifest.revision} · Confirma la unidad de cada grupo</legend><p>La descripción del empaque se conserva. Pallets y cajas se consultan por separado.</p>{manifest.declaration.groupBindings.map(g=>{const u=manifest.declaration.cargoSpecification.units[g.sourceUnitIndex];return <label className={s.mapping} key={g.groupId}><span>{u.packageType}<small>{qty(u.quantity)} declarados</small></span><select aria-label={`Unidad de ${u.packageType}`} required value={units[g.groupId]??''} onChange={e=>setUnits(v=>({...v,[g.groupId]:e.target.value}))}><option value="">Selecciona unidad</option><option value="PALLET">Pallets</option><option value="BOX">Cajas</option></select></label>;})}</fieldset>:null}
   <button className={s.primary} disabled={busy||manifestBusy||!manifest||!canOperate}>Abrir sesión con este manifiesto</button>
  </form>:null}
  {session?<div className={s.sessionBar}><span>{session.mode==='DEMO'?'Demostración · fuente sintética permitida':'Verificación · captura propia'} · {state(session.state)}</span><span>Actualizada {date(session.updatedAt)}</span></div>:null}
 </div>;
 const after=session&&bundle?<div className={s.operation}>
  <section className={s.review} aria-labelledby="review-title"><div className={s.sectionTitle}><div><h2 id="review-title">Revisar observación y cobertura</h2><p>Asocia un conteo a un grupo. Confirma qué parte de la carga aparece en la evidencia.</p></div><span>{bundle.observations.length} observaciones</span></div>
   {!bundle.observations.length?<p className={s.empty}>Aún no se recibió un análisis de vídeo para esta sesión. Puedes cerrar el alcance dejando la observación pendiente.</p>:<form className={s.form} onSubmit={e=>{e.preventDefault();void run(()=>change('observation-selections'));}}>
    <div className={s.fields}><label>Grupo<select value={groupId} onChange={e=>{setGroupId(e.target.value);setObservationId('');setCoverage('PARTIAL');setReason('');}}>{session.groups.map(g=><option key={g.id} value={g.id}>{g.label} · {g.unit==='PALLET'?'pallets':'cajas'}</option>)}</select></label>
     <label>Conteo recibido<select required value={observationId} onChange={e=>{setObservationId(e.target.value);setCoverage('PARTIAL');setReason('');}}><option value="">Selecciona una observación</option>{bundle.observations.filter(o=>o.unit===group?.unit&&(o.groupId===null||o.groupId===groupId)).map(o=><option key={o.id} value={o.id}>{date(o.receivedAt)} · intento {o.attempt} · {o.net} netos · {o.source==='OWN_CAPTURE'?'captura propia':'sintético'}</option>)}</select></label>
     <label>Cobertura revisada<select value={coverage} onChange={e=>setCoverage(e.target.value)}><option value="PARTIAL">Parcial: sólo parte del grupo</option><option value="COMPLETE">Completa: todo el grupo</option></select></label></div>
    {observation?<div className={s.observation}><p><strong>{observation.source==='OWN_CAPTURE'?'Captura propia':'Render sintético'}</strong> · {observation.realInference?'Inferencia real declarada por el worker':'Sin inferencia real'} · {observation.status==='OK'?'Sin alertas de conteo':'Requiere revisión'}</p><p>Entradas {qty(observation.entries)} · salidas {qty(observation.exits)} · neto {qty(observation.net)}. Job {observation.jobId}, intento {observation.attempt}.</p><p>Evidencia: {observation.evidenceId}. {observation.overlayUploaded?'Overlay registrado por el productor.':'Sin overlay registrado.'} La reproducción del clip depende de su acceso autorizado.</p>{observation.flags.length?<ul>{observation.flags.map((f,i)=><li key={i}>{f.seconds.toFixed(2)} s · {f.kind}: {f.detail}</li>)}</ul>:null}<details><summary>Consultar marcas temporales ({observation.events.length})</summary><p>{observation.timeMapping}</p><EventList observation={observation}/></details></div>:null}
    <label>Motivo y alcance de la revisión<textarea required minLength={3} maxLength={600} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Describe qué grupo y tramo cubre esta observación."/></label>
    <p>Marcar cobertura completa conserva las alertas del análisis; la diferencia requiere evidencia suficiente.</p><button className={s.primary} disabled={busy||!canOperate||!observationId||reason.trim().length<3}>Guardar cobertura revisada</button>
   </form>}
   {bundle.selections.length?<div className={s.coverage}><h3>Cobertura registrada</h3>{bundle.selections.map(v=><p key={v.groupId}><strong>{session.groups.find(g=>g.id===v.groupId)?.label}</strong> · {v.coverage==='COMPLETE'?'Completa':'Parcial'}<br/>{v.reason}<small>{date(v.selectedAt)} · {v.memberId}</small></p>)}</div>:null}
  </section>
  <section className={s.passport} aria-labelledby="passport-title"><div className={s.sectionTitle}><div><h2 id="passport-title">Passport de carga</h2><p>Guarda la comparación y sus fuentes tal como estaban en una versión cerrada.</p></div>
   {session.state==='OPEN'?<details className={s.close}><summary>Cerrar alcance</summary><p>El cierre habilita la comparación cuando la evidencia y la cobertura son suficientes. Los datos pendientes seguirán visibles.</p><button disabled={busy||!canOperate} onClick={()=>void run(()=>change('close'))}>Cerrar alcance de esta sesión</button></details>:<button className={s.primary} disabled={busy||!canOperate} onClick={()=>void run(async()=>{const value={id:session.id,version:session.version,action:'passport'};const p=await loadingApi.createPassport(session.id,session.version,key(value));intent.current=null;setPassports(await loadingApi.passports(session.id));await selectPassport(session.id,p.id);setNotice('Passport guardado. Sus fuentes quedan disponibles después de recargar.');})}>Generar Passport · v{session.version}</button>}
   </div>
   {passports.length?<label>Historial de Passport<select value={passport?.data.id??''} disabled={busy} onChange={e=>{const id=e.target.value;if(id)void run(()=>selectPassport(session.id,id));else{readEpoch.current++;setPassport(null);const url=new URL(window.location.href);url.searchParams.delete('passport');window.history.replaceState(null,'',url);}}}><option value="">Selecciona una versión</option>{passports.map(p=><option value={p.id} key={p.id}>Versión {p.sessionVersion} · {date(p.createdAt)}</option>)}</select></label>:<p>Aún no hay Passport guardados para esta sesión.</p>}
   {passport?<PassportView key={passport.data.id} value={passport} canOperate={canOperate} onSaved={async()=>{
     const updated=await loadingApi.passport(passport.data.sessionId,passport.data.id);
     setPassport(current=>current?.data.id===updated.data.id?updated:current);
   }}/>:null}
  </section>
 </div>:null;
 // DockMind (Ramón/Jean) ocupa el slot de evidencia; sus observaciones llegan a esta misma sesión.
 const evidence=session?<DockMindEvidencePanel session={session} canOperate={canOperate} onObservationRecorded={()=>void run(()=>read(session.id))}/>:null;
 return <LoadingDashboardView snapshot={bundle?loadingComparison(bundle):undefined} before={before} after={after} evidenceContent={evidence}/>;
}

function EventList({observation,prefix,revealed}:{observation:LoadingBundle['observations'][number];prefix?:string;revealed?:string}){
 const [limit,setLimit]=useState(30);
 const effectiveLimit=Math.max(limit,observation.events.findIndex(e=>e.eventId===revealed)+1);
 return <><ol className={s.events}>{observation.events.slice(0,effectiveLimit).map(e=><li key={e.eventId} id={prefix?`${prefix}-${e.eventId}`:undefined} tabIndex={prefix?-1:undefined}>{e.seconds.toFixed(2)} s · {e.direction==='IN'?'Entrada':'Salida'} · objeto {e.objectId}<small>{e.eventId}</small></li>)}</ol>{observation.events.length>effectiveLimit?<button type="button" onClick={()=>setLimit(effectiveLimit+30)}>Ver más marcas</button>:null}</>;
}
function PassportView({value,canOperate,onSaved}:{value:Passport;canOperate:boolean;onSaved:()=>Promise<void>}){
 const p=value.data;
 const [revealed,setRevealed]=useState(''),history=useRef<HTMLDetailsElement>(null);
 const prefix=`passport-${p.id}-event`;
 function revealEvent(eventId:string){
  setRevealed(eventId);if(history.current)history.current.open=true;
  requestAnimationFrame(()=>{const element=document.getElementById(`${prefix}-${eventId}`);element?.focus({preventScroll:true});element?.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
 }
 function download(){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`passport-${p.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <article className={s.document}><div className={s.sectionTitle}><div><h3>Passport · versión {p.sessionVersion}</h3><p>{value.meta.isCurrent?'Vigente al consultar':'Histórico · la sesión o el manifiesto cambió'}</p></div><button onClick={download}><FileDown size={16}/> Descargar Passport</button></div>
  <dl><div><dt>Guardado</dt><dd>{date(p.createdAt)} · {p.createdBy}</dd></div><div><dt>Referencia</dt><dd>{p.id}</dd></div><div><dt>Fuente</dt><dd>Manifiesto r{p.source.session.manifest.revision} · {p.source.session.mode==='DEMO'?'demostración':'verificación'}</dd></div></dl>
  <p className={s.tableHint}>Desliza la tabla para consultar la diferencia y el estado.</p><div className={s.list} tabIndex={0} role="region" aria-label="Comparación del Passport, desplazable horizontalmente"><table><caption>Comparación conservada en este Passport</caption><thead><tr><th>Grupo y unidad</th><th>Declarado</th><th>Observado</th><th>Diferencia</th><th>Estado</th></tr></thead><tbody>{p.comparison.rows.map(r=><tr key={r.id}><th scope="row">{r.label}<small>{r.unit==='PALLET'?'pallets':'cajas'}</small></th><td>{qty(r.declared)}</td><td>{qty(r.observed)}</td><td>{qty(r.delta)}</td><td>{status[r.status]}</td></tr>)}</tbody></table></div>
  <PassportExplanations value={value} canOperate={canOperate} onSaved={onSaved} onEvidence={revealEvent}/>
  <details ref={history}><summary>Historial y referencias de evidencia</summary><ol className={s.events}>{p.timeline.map((e,i)=><li key={i}>{date(e.at)} · {{OPENED:'Sesión abierta',OBSERVATION:'Observación recibida',COVERAGE_REVIEW:'Cobertura revisada',CLOSED:'Alcance cerrado'}[e.kind]}{'jobId'in e?<small>{e.jobId} · {e.source==='OWN_CAPTURE'?'captura propia':'sintético'}</small>:null}</li>)}</ol>{p.source.observations.map(o=><div key={o.id}><h4>Evidencia {o.evidenceId} · intento {o.attempt}</h4><p>{o.timeMapping}</p><EventList observation={o} prefix={prefix} revealed={revealed}/></div>)}</details>
 </article>;
}
