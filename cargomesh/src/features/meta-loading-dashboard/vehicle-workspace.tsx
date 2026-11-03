'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Box,ChevronRight,Container,Eye,Factory,Search,Truck} from 'lucide-react';
import {CarrierKpis} from '@/features/carrier-juan/carrier-kpis';
import type {ViewAngle} from '@/features/truck-collection/viewer';
import {factoryLoadingPlan} from '@/features/truck-collection/factory-loading';
import {cargoBarcodeInventory} from '@/features/truck-collection/cargo-codes';
import {BarcodeSymbol} from '@/features/truck-collection/barcode-symbol';
import {contractPrice,filterTetrisFleet,tetrisFleet,truckLoadGroups,truckWeightSummary,vehicleCategories,type VehicleCategory,type WeightFilter,type FleetSort} from './vehicle-dashboard-model';
import shell from './dashboard.module.css';
import s from './vehicle-workspace.module.css';
const Viewer=dynamic(()=>import('@/features/truck-collection/viewer'),{ssr:false,loading:()=> <p className={s.loading} role="status">Cargando el visor 3D…</p>});
const FactoryPlayer=dynamic(()=>import('@/features/truck-collection/factory-player'),{ssr:false,loading:()=> <p className={s.loading} role="status">Preparando la fábrica…</p>});
const ignoreExporter=()=>{};
const number=(value:number)=>value.toLocaleString('es-PE',{maximumFractionDigits:1});
const tonnes=(kg:number)=>`${(kg/1000).toLocaleString('es-PE',{maximumFractionDigits:2})} t`;

export function TetrisVehicleWorkspace({initialTruckId='',embedded=false}:{initialTruckId?:string;embedded?:boolean}){
  const [selectedId,setSelectedId]=useState(initialTruckId),[query,setQuery]=useState(''),[category,setCategory]=useState<VehicleCategory|'all'>('all'),[weight,setWeight]=useState<WeightFilter>('all'),[sort,setSort]=useState<FleetSort>('capacity');
  const [groupId,setGroupId]=useState(''),[reveal,setReveal]=useState(true),[view,setView]=useState<ViewAngle>('iso');
  const [factoryMode,setFactoryMode]=useState(false);
  const [showCodes,setShowCodes]=useState(false);
  const heading=useRef<HTMLHeadingElement>(null),search=useRef<HTMLInputElement>(null);
  const selected=tetrisFleet.find(v=>v.truck.id===selectedId),truck=selected?.truck;
  const groups=useMemo(()=>truck?truckLoadGroups(truck):[],[truck]);
  const factoryPlan=useMemo(()=>truck?factoryLoadingPlan(truck):null,[truck]);
  const barcodeInventory=useMemo(()=>truck?cargoBarcodeInventory(truck):[],[truck]);
  const activeGroup=groups.find(g=>g.id===groupId);
  const allMatches=useMemo(()=>filterTetrisFleet({query,weight,sort}),[query,weight,sort]);
  const matches=category==='all'?allMatches:allMatches.filter(v=>v.category===category);
  const summary=truck?truckWeightSummary(truck):null;
  useEffect(()=>{const pop=()=>{setSelectedId(new URL(window.location.href).searchParams.get('truck')??'');setGroupId('');setReveal(true);setView('iso');setFactoryMode(false);};window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);},[]);
  useEffect(()=>{if(selectedId)heading.current?.focus();},[selectedId]);
  function choose(id:string){setSelectedId(id);setGroupId('');setReveal(true);setView('iso');setFactoryMode(false);setShowCodes(false);const url=new URL(window.location.href);id?url.searchParams.set('truck',id):url.searchParams.delete('truck');window.history.pushState(null,'',url);}
  function reset(){setQuery('');setCategory('all');setWeight('all');search.current?.focus();}
  const Surface=embedded?'section':'main';
  return <Surface className={`${shell.page} ${s.page} ${embedded?s.embedded:''}`}>
    {embedded?<div className={s.embeddedHeader}><Link href="/tetris?view=sessions">Sesiones y Passport</Link><span>Demostración</span></div>:<header className={`${shell.header} ${s.header}`}><Link href="/" className={shell.brand}><span><Truck size={22}/></span>CargoMesh</Link><nav aria-label="Área de trabajo"><span aria-current="page">Tetris</span><Link href="/tetris?view=sessions">Sesiones y Passport</Link><Link href="/truck-lab" className={s.labLink}>Camiones 3D</Link></nav><span className={s.demo}>Demostración</span></header>}
    <div className={s.body}>
    {truck&&selected&&summary?<>
      <button className={s.back} onClick={()=>choose('')}><ArrowLeft size={16}/> Volver a los camiones</button>
      <div className={s.title}><div><h1 ref={heading} tabIndex={-1}>{truck.type}</h1><p>{truck.model} · {truck.plate} · {vehicleCategories.find(c=>c.id===selected.category)!.label}</p></div><span className={s.planState}>Plan de carga</span></div>
      <section className={`${s.detail} ${factoryMode?s.factoryDetail:''}`} aria-label="Vehículo y distribución de carga">
        <div className={s.visual}>
          {factoryPlan?<div className={s.factoryToggle}><button aria-pressed={factoryMode} onClick={()=>{setFactoryMode(value=>!value);setGroupId('');}}>{factoryMode?<ArrowLeft size={16}/>:<Factory size={17}/>} {factoryMode?'Volver al plan 3D':'Animar carga en fábrica'}</button></div>:null}
          {factoryMode&&factoryPlan?<FactoryPlayer key={truck.id} truck={truck} plan={factoryPlan}/>:<>
          <div className={s.stage}><Viewer key={truck.id} truck={truck} reveal={reveal} compare={false} view={view} onReady={ignoreExporter} loadLabels={groups} selectedLoad={activeGroup?.id} onSelectLoad={setGroupId}/><span className={s.hint}>Arrastra para girar · rueda para acercar</span></div>
          <div className={s.views} aria-label="Controles del modelo 3D">{([['iso','Perspectiva'],['side','Lateral'],['top','Superior']] as const).map(([id,label])=><button key={id} aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}<button aria-pressed={reveal} onClick={()=>setReveal(!reveal)}><Eye size={15}/>{reveal?'Cerrar carrocería':'Ver la carga'}</button></div>
          </>}
        </div>
        {!factoryMode?<aside className={s.assignment} aria-label="Conductor y contrato"><div className={s.driver}><span className={s.driverPhoto} title="Retrato de stock para la demostración" aria-hidden="true">{truck.driver.name.split(' ').slice(0,2).map(part=>part[0]).join('')}{/* eslint-disable-next-line @next/next/no-img-element */}<img key={truck.driver.id} src={selected.portraitSrc} alt="" width={64} height={64} onError={event=>{event.currentTarget.style.display='none';}}/></span><div><span>Conductor</span><strong>{truck.driver.name}</strong><small>{truck.driver.years} años de experiencia</small></div></div>
          <div className={s.contract}><span>Contrato por viaje</span><strong>{contractPrice(selected.contract.amount)}</strong><small>{selected.contract.reference} · PEN</small></div>
          <dl><div><dt>Carga útil máxima</dt><dd>{tonnes(truck.payloadKg)}</dd></div><div><dt>Longitud de caja</dt><dd>{number(truck.bodyLengthM)} m</dd></div><div><dt>Ancho</dt><dd>{number(truck.widthM)} m</dd></div><div><dt>Altura de caja</dt><dd>{number(truck.bodyHeightM)} m</dd></div><div><dt>Base</dt><dd>{truck.depot}</dd></div></dl>
          <div className={s.capacity}><span>Capacidad de peso <strong>{number(summary.percent)}%</strong></span><meter min={0} max={truck.payloadKg} value={summary.assignedKg} aria-label="Peso asignado respecto de la carga útil"/><p>{number(summary.assignedKg)} de {number(truck.payloadKg)} kg asignados.</p></div>
        </aside>:null}
      </section>
      <div className={s.metrics}><CarrierKpis variant="compact" label="Resumen del vehículo seleccionado" metrics={[
        {id:'assigned',label:'Peso asignado',value:summary.assignedKg,unit:'kg',tone:'teal',art:'accepted',description:'Distribución del plan de carga'},
        {id:'remaining',label:'Capacidad restante',value:summary.remainingKg,unit:'kg',tone:'blue',art:'fleet-truck',description:'Carga útil menos peso asignado'},
        {id:'groups',label:'Grupos de carga',value:groups.length,unit:'grupos',tone:'indigo',art:'fleet-shield',description:'Seleccionables en el camión'},
        {id:'units',label:'Unidades del plan',value:truck.cargo.count,unit:truck.cargo.label.startsWith('pallets')?'pallets':'unidades',tone:'violet',art:'fleet-incidents',description:truck.cargo.label},
      ]}/></div>
      <section className={s.loads} aria-labelledby="load-title"><div className={s.sectionHeading}><div><h2 id="load-title">Distribución de la carga</h2><p>Selecciona un grupo para resaltarlo en el camión. El porcentaje corresponde a su carga útil por peso.</p></div><Box size={20}/></div>
        <p className={s.tableHint} id="vehicle-load-scroll-hint">Desliza la tabla para ver peso, carga útil y estado.<ArrowRight size={16}/></p>
        <div className={s.tableScroll} role="region" aria-label="Grupos del plan de carga" aria-describedby="vehicle-load-scroll-hint" tabIndex={0}><table><caption className={s.sr}>Carga asignada al vehículo {truck.plate}. Las cantidades no son un conteo observado.</caption><thead><tr><th>Grupo</th><th>Mercancía</th><th>Cantidad</th><th>Peso</th><th>Carga útil</th><th>Estado</th></tr></thead><tbody>{groups.map(g=><tr key={g.id} data-selected={activeGroup?.id===g.id}><th scope="row"><button onClick={()=>setGroupId(g.id)} aria-pressed={activeGroup?.id===g.id} data-load-group={g.id}>{g.label}<ChevronRight size={15}/></button></th><td>{truck.cargo.label}</td><td>{number(g.quantity)}</td><td>{number(g.weightKg)} kg</td><td>{number(g.sharePercent)}%</td><td><span className={s.planState}>Asignado al plan</span></td></tr>)}</tbody></table></div>
        <details key={truck.id} className={s.codes} onToggle={event=>setShowCodes(event.currentTarget.open)}><summary>Ver códigos de {truck.cargo.count} {truck.cargo.count===1?'unidad':'unidades'}</summary>{showCodes?<><p>Cada unidad conserva su identificador. Las cajas de los pallets de cartones y fármacos llevan códigos propios.</p><ul>{barcodeInventory.map(item=><li key={item.id}><strong>{item.label}</strong><BarcodeSymbol value={item.barcode}/></li>)}</ul></>:null}</details>
        <p className={s.note}>La visualización representa el plan. Los conteos observados, la comparación y el Passport se consultan en <Link href="/tetris?view=sessions">sesiones de carga</Link>.</p>
      </section>
    </>:<>
      <div className={s.title}><div><h1>Tetris</h1><p>Elige un camión y revisa su carga en 3D.</p></div><span className={s.total}>{tetrisFleet.length} vehículos</span></div>
      {selectedId?<p role="alert" className={s.error}>No encontramos ese vehículo. Elige uno del catálogo.</p>:null}
      <div className={s.filters}><label className={s.search}><Search size={18}/><span className={s.sr}>Buscar camión, placa o conductor</span><input ref={search} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Modelo, placa o conductor…" type="search"/></label><label>Carga útil<select aria-label="Carga útil" value={weight} onChange={e=>setWeight(e.target.value as WeightFilter)}><option value="all">Todos los pesos</option><option value="light">Hasta 3,5 t</option><option value="medium">Más de 3,5 hasta 12 t</option><option value="heavy">Más de 12 t</option></select></label><label>Ordenar por<select aria-label="Ordenar por" value={sort} onChange={e=>setSort(e.target.value as FleetSort)}><option value="capacity">Menor capacidad</option><option value="price">Menor precio</option><option value="name">Nombre del vehículo</option></select></label></div>
      <div className={s.categories} aria-label="Categoría de camión"><button aria-pressed={category==='all'} onClick={()=>setCategory('all')}>Todos <span>{allMatches.length}</span></button>{vehicleCategories.map(c=><button key={c.id} aria-pressed={category===c.id} onClick={()=>setCategory(c.id)}>{c.label}<span>{allMatches.filter(v=>v.category===c.id).length}</span></button>)}</div>
      <div className={s.result}><p role="status">{matches.length} vehículos{weight==='all'?'':' con la capacidad elegida'}</p>{query||category!=='all'||weight!=='all'?<button onClick={reset}>Limpiar filtros</button>:null}</div>
      {!matches.length?<div className={s.empty}><h2>No hay camiones con esos filtros</h2><p>Prueba otro peso, categoría o nombre de conductor.</p><button onClick={reset}>Ver todos los camiones</button></div>:vehicleCategories.map(c=>{
        const vehicles=matches.filter(v=>v.category===c.id);return vehicles.length?<section className={s.category} key={c.id} aria-label={c.label}><h2>{c.label}<span>{vehicles.length}</span></h2><div className={s.columns} aria-hidden="true"><span>Vehículo</span><span>Carga útil</span><span>Conductor</span><span>Contrato por viaje</span><span/></div><ul>{vehicles.map(({truck:t,contract,thumbnailSrc})=><li key={t.id} data-vehicle-id={t.id}><div className={s.identity}><span className={s.truckThumbnail} aria-hidden="true"><Container size={23} style={{color:t.color}}/>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={thumbnailSrc} alt="" width={360} height={225} loading="lazy" decoding="async" onError={event=>{event.currentTarget.style.display='none';}}/></span><div><strong>{t.type}</strong><small>{t.model} · {t.plate}</small></div></div><div className={s.cell}><span>Carga útil</span><strong>{tonnes(t.payloadKg)}</strong><small>{t.colorName}</small></div><div className={s.cell}><span>Conductor</span><strong>{t.driver.name}</strong><small>{t.driver.years} años de experiencia</small></div><div className={`${s.cell} ${s.price}`}><span>Contrato por viaje</span><strong>{contractPrice(contract.amount)}</strong><small>Por viaje</small></div><button className={s.open} onClick={()=>choose(t.id)} aria-label={`Ver carga 3D de ${t.type}`}>Ver carga 3D<ArrowRight size={15}/></button></li>)}</ul></section>:null;
      })}
    </>}
    <footer className={s.footer}><span>Tetris · Planificación visual de carga</span><a href="/truck-cabs/LICENSE.md">Créditos y licencias 3D</a><Link href="/tetris?view=sessions">Abrir sesiones y Passport <ArrowRight size={15}/></Link></footer>
    </div>
  </Surface>;
}
