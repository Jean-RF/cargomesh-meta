'use client';
import Link from 'next/link';
import {useMemo,useRef,useState,type ReactNode} from 'react';
import {ArrowDownToLine,ArrowRight,Box,ChevronRight,ClipboardList,ExternalLink,MapPin,Truck} from 'lucide-react';
import {CarrierKpis} from '@/features/carrier-juan/carrier-kpis';
import {dashboardFixture,dashboardScenarios,type DashboardScenario} from '@/shared/schemas/meta/loading-dashboard.fixtures';
import type {LoadingUnit} from '@/shared/schemas/meta/loading-dashboard';
import {buildLoadingDashboard,type ComparisonStatus} from './dashboard-model';
import s from './dashboard.module.css';

const statusLabel:Record<ComparisonStatus,string>={NOT_READY:'En progreso',MATCH:'Coincide',DIFFERENCE_PROPOSED:'Revisar diferencia',INSUFFICIENT_EVIDENCE:'Evidencia insuficiente',OUTDATED:'Revisión desactualizada',INCOMPATIBLE_SCOPE:'Alcance incompatible'};
const unitLabel:Record<LoadingUnit,string>={PALLET:'pallets',BOX:'cajas'};
const quantity=(v:number|null)=>v===null?'Pendiente':v.toLocaleString('es-PE');
const quantityWithUnit=(v:number|null,unit:LoadingUnit)=>v===null?'Cantidad pendiente':`${quantity(v)} ${unitLabel[unit]}`;
const time=(seconds:number)=>`${Math.floor(seconds/60)}:${(seconds%60).toFixed(1).padStart(4,'0')}`;

export function LoadingDashboardDemo(){
  const [scenario,setScenario]=useState<DashboardScenario>('open');
  const snapshot=useMemo(()=>buildLoadingDashboard(dashboardFixture(scenario)),[scenario]);
  const info=dashboardScenarios.find(v=>v.id===scenario)!;
  return <LoadingDashboardView snapshot={snapshot} synthetic before={<section className={s.scenario} aria-label="Escenario de demostración"><div><label htmlFor="scenario">Escenario de muestra</label><select id="scenario" value={scenario} onChange={e=>setScenario(e.target.value as DashboardScenario)}>{dashboardScenarios.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}</select></div><p>{info.description}</p></section>}/>;
}
export function LoadingDashboardView({snapshot,synthetic=false,before,after,evidenceContent}:{snapshot?:ReturnType<typeof buildLoadingDashboard>;synthetic?:boolean;before?:ReactNode;after?:ReactNode;evidenceContent?:ReactNode}){
  const [preferredUnit,setUnit]=useState<LoadingUnit>('PALLET'),[selectedId,setSelectedId]=useState('');
  const availableUnits=Array.from(new Set(snapshot?.rows.map(r=>r.unit)??[]));
  const unit=availableUnits.includes(preferredUnit)?preferredUnit:availableUnits[0]??preferredUnit;
  const tableRegion=useRef<HTMLDivElement>(null),[tableScrolled,setTableScrolled]=useState(false);
  const rows=snapshot?.rows.filter(r=>r.unit===unit)??[],total=snapshot?.totals.find(t=>t.unit===unit);
  const selected=rows.find(r=>r.id===selectedId)??rows[0];
  const download=()=>{
    if(!snapshot)return;
    const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download=`tetris-${snapshot.session.id}-v${snapshot.session.version}.json`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  return <main className={s.page}>
    <header className={s.header}><Link href="/" className={s.brand}><span><Truck size={22}/></span>CargoMesh</Link><nav aria-label="Área de trabajo"><span aria-current="page">Tetris</span><Link href="/truck-lab">Camiones 3D <ExternalLink size={13}/></Link></nav><span className={s.demo}>{synthetic?'Demostración local':'Sesiones de carga'}</span></header>
    <div className={s.body}>
      <div className={s.heading}><div><h1>Tetris <span>Dashboard de carga</span></h1><p>Revisa lo declarado, lo planificado y lo observado en una misma sesión.</p></div><button disabled={!snapshot} onClick={download}><ArrowDownToLine size={16}/> Descargar lectura</button></div>
      {before}
      {snapshot&&total?<>
      <section className={s.context} aria-label="Contexto de la sesión"><div><MapPin size={18}/><span><strong>{snapshot.session.facilityName}</strong><small>{snapshot.session.id} · versión {snapshot.session.version}</small></span></div><dl><div><dt>Manifiesto</dt><dd>{snapshot.manifest.id} · r{snapshot.manifest.revision}{snapshot.manifest.revision!==snapshot.session.manifestRevision?<small>Sesión vinculada a r{snapshot.session.manifestRevision}</small>:null}</dd></div><div><dt>Alcance</dt><dd className={s.scope}>{snapshot.session.scopeState==='OPEN'?'Abierto · carga en curso':'Cerrado para comparar'}</dd></div></dl></section>
      <div className={s.unitBar}><label htmlFor="unit">Unidad de lectura<select id="unit" value={unit} onChange={e=>setUnit(e.target.value as LoadingUnit)}>{availableUnits.map(u=><option key={u} value={u}>{u==='PALLET'?'Pallets':'Cajas'}</option>)}</select></label><p>{snapshot.scope==='SESSION'?'Todos los grupos de esta unidad':'Solo grupos recibidos · lectura parcial'} · Las unidades se consultan por separado.</p></div>
      <CarrierKpis variant="compact" label={`Carga en ${unitLabel[unit]}`} metrics={[
        {id:'declared',label:'Declarado',value:total.declared,unit:unitLabel[unit],tone:'blue',art:'accepted',description:`Manifiesto r${snapshot.manifest.revision}${snapshot.scope==='LOADED_GROUPS'?' · parcial':''}`},
        {id:'planned',label:'Planificado',value:total.planned,unit:unitLabel[unit],tone:'teal',art:'fleet-truck',description:snapshot.planRef?(synthetic?'Asignación del plan de muestra':'Asignación del plan'):'Sin plan disponible'},
        {id:'observed',label:'Observado',value:total.observed,unit:unitLabel[unit],tone:'indigo',art:'fleet-shield',description:snapshot.observationRef?(snapshot.session.scopeState==='OPEN'?'Progreso, sin cierre de alcance':'Lectura sujeta a evidencia'):'Sin observación disponible'},
        {id:'pending',label:'Pendientes de revisión',value:total.pendingReview,unit:'grupos',tone:'violet',art:'fleet-incidents',description:'Requieren resolver evidencia o comparar'},
      ]}/>
      <div className={s.workspace}>
        <section className={s.comparison} aria-label="Comparación de carga"><div className={s.sectionHeading}><div><h2>Carga por grupo</h2><p>{rows.length} grupos · {unitLabel[unit]}</p></div><Box size={20}/></div>
          <div className={s.scrollCue}><p id="mobile-table-hint">Desliza la tabla para ver observado y comparación.</p><button onClick={()=>{const region=tableRegion.current;if(region)region.scrollTo({left:tableScrolled?0:region.scrollWidth-region.clientWidth});}} aria-controls="cargo-table">{tableScrolled?'Volver a grupos':'Ver comparación'}<ArrowRight size={15}/></button></div>
          <div id="cargo-table" ref={tableRegion} className={s.tableScroll} onScroll={e=>setTableScrolled(e.currentTarget.scrollLeft>40)} tabIndex={0} role="region" aria-describedby="mobile-table-hint" aria-label="Tabla de carga, desplazable horizontalmente"><table><caption className={s.sr}>Cantidades en {unitLabel[unit]}. Selecciona un grupo para consultar sus fuentes.</caption><thead><tr><th scope="col">Grupo de carga</th><th scope="col">Declarado</th><th scope="col">Planificado</th><th scope="col">Observado</th><th scope="col">Comparación</th><th scope="col"><span className={s.sr}>Detalle</span></th></tr></thead><tbody>{rows.map(row=><tr key={row.id} data-selected={selected?.id===row.id}><th scope="row"><button onClick={()=>setSelectedId(row.id)} aria-pressed={selected?.id===row.id}>{row.label}<small>{row.id}</small></button></th><td>{quantity(row.declared)}</td><td>{quantity(row.planned)}</td><td>{quantity(row.observed)}</td><td><span className={s.status} data-status={row.status}>{row.status==='NOT_READY'&&row.observed===null?'Pendiente de observación':statusLabel[row.status]}</span>{row.delta!==null&&row.delta!==0?<small className={s.delta}>{row.delta>0?`${row.delta} por debajo`:`${Math.abs(row.delta)} por encima`} de lo declarado</small>:null}</td><td><button className={s.rowButton} onClick={()=>setSelectedId(row.id)} aria-label={`Ver fuentes de ${row.label}`}><ChevronRight size={17}/></button></td></tr>)}</tbody></table></div>
          <div className={s.explanation}><ClipboardList size={18}/><p>{snapshot.session.scopeState==='OPEN'?'La sesión está abierta. Los conteos muestran progreso; la diferencia se habilita al cerrar el alcance y disponer de evidencia suficiente.':'Una diferencia es una propuesta de revisión. No confirma una incidencia ni cambia una operación.'}</p></div>
        </section>
        <aside className={s.detail} aria-label="Fuentes del grupo seleccionado"><h2>Fuentes y evidencia</h2>{selected?<><h3>{selected.label}</h3><dl><div><dt>Declaración</dt><dd>{snapshot.manifest.id}<small>Revisión {snapshot.manifest.revision} · {quantityWithUnit(selected.declared,unit)}</small></dd></div><div><dt>Plan de carga</dt><dd>{selected.planIssue??snapshot.planRef}<small>{selected.planned===null?'Cantidad pendiente':`${quantityWithUnit(selected.planned,unit)} asignados`}</small></dd></div><div><dt>Observación</dt><dd>{snapshot.observationRef??'Aún no disponible'}<small>{selected.coverage==='PARTIAL'?'Cobertura parcial':selected.coverage==='COMPLETE'?'Cobertura completa':'Sin cobertura acreditada'}</small></dd></div></dl>
          <div className={s.evidence}><h3>{synthetic?'Referencias de muestra':'Referencias de evidencia'}</h3>{selected.evidence.length?<ul>{selected.evidence.map(e=><li key={e.id}><span>{e.id}</span><span>{e.timeSeconds===null?'Sin marca temporal':time(e.timeSeconds)}</span></li>)}</ul>:<p>No hay evidencia vinculada a este grupo.</p>}<p>{synthetic?'Referencias sintéticas, sin clip real conectado.':'Marcas del conteo recibido. Revisa su fuente y cobertura antes de comparar.'}</p></div>
          {selected.progressPercent!==null?<p className={s.progress}>{selected.progressPercent.toLocaleString('es-PE',{maximumFractionDigits:1})}% observado respecto de lo declarado.<small>Es progreso de conteo, no ocupación física del vehículo.</small></p>:null}
        </>:null}</aside>
      </div>
      {evidenceContent}
      </>:null}
      {after}
      <footer className={s.footer}><p>{synthetic?<><strong>Datos sintéticos.</strong> Escenarios de muestra para comprobar los estados de Tetris. <Link href="/tetris?view=sessions">Abrir sesiones operativas</Link></>:<>La comparación conserva las fuentes y sus revisiones. El Passport requiere revisión humana; no confirma una entrega. <Link href="/tetris/demo">Ver escenarios de muestra</Link></>}</p><Link href="/truck-lab">Explorar los 60 camiones <ArrowRight size={15}/></Link></footer>
    </div>
  </main>;
}
