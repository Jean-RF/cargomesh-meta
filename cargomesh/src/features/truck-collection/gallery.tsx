'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Box, Check, ChevronLeft, ChevronRight, Download, Eye, Maximize, RotateCcw, Search, Truck, UserRound } from 'lucide-react';
import { cargoMassKg, cargoWidthM, collectionTrucks, sizeLabels, type TruckSize } from './catalog';
import type { ViewAngle } from './viewer';
import s from './gallery.module.css';
const Viewer=dynamic(()=>import('./viewer'),{ssr:false,loading:()=> <div className={s.loading} role="status">Preparando el modelo 3D…</div>});
const number=(n:number)=>n.toLocaleString('es-PE',{maximumFractionDigits:3});
const angles:readonly [ViewAngle,string][]=[['iso','Perspectiva'],['side','Lateral'],['front','Frente'],['rear','Trasera'],['top','Superior'],['cab','Detalle de cabina'],['cargo','Detalle de carga']];

export function TruckCollectionGallery(){
  const [selectedId,setSelectedId]=useState(collectionTrucks[0].id),[size,setSize]=useState<TruckSize|'all'>('all'),[query,setQuery]=useState('');
  const [reveal,setReveal]=useState(false),[view,setView]=useState<ViewAngle>('iso'),[exporter,setExporter]=useState<(()=>Promise<void>)|null>(null),[exporting,setExporting]=useState(false),[error,setError]=useState('');
  const [compare,setCompare]=useState(false);
  const receiveExporter=useCallback((next:(()=>Promise<void>)|null)=>setExporter(()=>next),[]);
  const selected=collectionTrucks.find(t=>t.id===selectedId)!;
  const matches=useMemo(()=>collectionTrucks.filter(t=>(size==='all'||t.size===size)&&`${t.type} ${t.model} ${t.colorName} ${t.driver.name} ${t.cargo.label}`.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es'))),[size,query]);
  const index=matches.findIndex(t=>t.id===selectedId);
  useEffect(()=>{const id=window.location.hash.slice(1);if(collectionTrucks.some(t=>t.id===id))setSelectedId(id);},[]);
  const select=(id:string)=>{setSelectedId(id);setError('');setView('iso');window.history.replaceState(null,'',`#${id}`);};
  const changeSize=(next:TruckSize|'all')=>{setSize(next);setQuery('');select(collectionTrucks.find(t=>next==='all'||t.size===next)!.id);};
  const exportModel=async()=>{if(!exporter)return;setExporting(true);setError('');try{await exporter();}catch{setError('No se pudo exportar el modelo. Inténtalo de nuevo.');}finally{setExporting(false);}};
  return <main className={s.page}>
    <header className={s.header}><Link href="/" className={s.brand}><span><Truck size={23}/></span>CargoMesh <small>Estudio de vehículos</small></Link><Link href="/vehicle-designs"><ArrowLeft size={15}/> Catálogo anterior</Link></header>
    <div className={s.intro}><div><h1>Colección de camiones</h1><p>60 vehículos de muestra. Carrocerías distintas, cargas a escala y una persona al volante de cada modelo.</p><p><Link href="/truck-lab/reference">Comparar con el primer prototipo</Link></p></div><span className={s.sample}><span/> Colección de muestra</span></div>
    <nav className={s.tabs} aria-label="Tamaño de camión">{([['all','Todos',60],['small','Pequeños',20],['medium','Medianos',20],['large','Grandes',20]] as const).map(([id,label,count])=><button key={id} type="button" aria-pressed={size===id} onClick={()=>changeSize(id)}>{label}<span>{count}</span></button>)}</nav>
    <label className={s.mobileSelect}>Seleccionar modelo<select value={selectedId} onChange={event=>select(event.target.value)}>{collectionTrucks.filter(t=>size==='all'||t.size===size).map(t=><option key={t.id} value={t.id}>{t.model} · {t.type}</option>)}</select></label>
    <div className={s.layout}>
      <section className={s.model} aria-label="Camión seleccionado">
        <div className={s.modelHeading}><div><h2>{selected.type}</h2><div className={s.modelCode}><span style={{backgroundColor:selected.color}}/>{selected.model} <span className={s.category}>{sizeLabels[selected.size]}</span></div></div><div className={s.stepper}><button aria-label="Camión anterior" onClick={()=>select(matches[(Math.max(index,0)-1+matches.length)%matches.length].id)} disabled={!matches.length}><ChevronLeft size={20}/></button><button aria-label="Camión siguiente" onClick={()=>select(matches[(index+1+matches.length)%matches.length].id)} disabled={!matches.length}><ChevronRight size={20}/></button></div></div>
        <div className={s.stage}><Viewer truck={selected} reveal={reveal} compare={compare} view={view} onReady={receiveExporter}/><span className={s.drag}><Maximize size={13}/> Arrastra para girar · rueda para acercar</span><span className={s.scale}>{compare?'Sin pintura ni mercancía · escala común':`${number(selected.lengthM)} m de largo`}</span></div>
        <div className={s.toolbar}><div className={s.views} aria-label="Ángulo de cámara">{angles.map(([id,label])=><button key={id} type="button" aria-pressed={view===id} onClick={()=>{setView(id);if(id==='cargo'){setReveal(true);setCompare(false);}}}>{label}</button>)}</div><button type="button" className={s.reveal} aria-pressed={compare} onClick={()=>{setCompare(!compare);setReveal(false);setView('iso');}}>Comparar formas</button><button type="button" className={s.reveal} aria-pressed={reveal} onClick={()=>{setReveal(!reveal);setCompare(false);}}><Eye size={16}/>{reveal?'Cerrar carrocería':'Inspeccionar carga'}</button></div>
        <div className={s.loadHeading}><div><Box size={18}/><h3>Carga de este modelo</h3></div><span>{number(cargoMassKg(selected))} kg</span></div>
        <div className={s.loadFacts}><p><strong>{selected.cargo.count} {selected.cargo.count===1?'unidad':'unidades'}</strong> · {selected.cargo.label}</p>{selected.cargo.liquidLitres?<p>{number(selected.cargo.liquidLitres)} L de muestra en depósito cerrado · nivel calculado por volumen.</p>:<p>{selected.cargo.unitM.map(n=>number(n)).join(' × ')} m por unidad · {number(selected.cargo.unitKg)} kg por unidad</p>}</div>
        <p className={s.disclosure}>Medidas del conjunto de carga, incluido su embalaje. Cuando se usan pallets, su huella es de 1,20 × 0,80 m. La vista de inspección retira paneles para mostrar el interior.</p>
        <div className={s.details}>
          <section><h3>Ficha del vehículo</h3><dl><div><dt>Identificador</dt><dd>{selected.plate}</dd></div><div><dt>Largo × ancho</dt><dd>{number(selected.lengthM)} × {number(selected.widthM)} m</dd></div><div><dt>Caja útil de referencia</dt><dd>{number(selected.bodyLengthM-.24)} × {number(cargoWidthM(selected))} m</dd></div><div><dt>Ejes / potencia de muestra</dt><dd>{selected.axles} / {selected.powerKw} kW</dd></div><div><dt>Límite de carga de muestra</dt><dd>{number(selected.payloadKg)} kg</dd></div><div><dt>Color / año de diseño</dt><dd><i style={{backgroundColor:selected.color}}/>{selected.colorName} / {selected.year}</dd></div></dl></section>
          <section className={s.driver}><h3>Persona al volante</h3><div className={s.driverName}><span style={{backgroundColor:selected.driver.uniform}}><UserRound size={22}/></span><div><strong>{selected.driver.name}</strong><p>{selected.driver.id}</p></div></div><dl><div><dt>Experiencia de muestra</dt><dd>{selected.driver.years} años</dd></div><div><dt>Base de referencia</dt><dd>{selected.depot}</dd></div></dl><p className={s.disclosure}>Conductor ficticio, también representado dentro de la cabina. No es un registro de personal.</p></section>
        </div>
        <div className={s.export}><p>Modelo completo en metros, editable en Blender.</p><button type="button" disabled={!exporter||exporting} onClick={exportModel}><Download size={16}/>{exporting?'Exportando…':'Descargar GLB'}</button></div>{error?<p role="alert" className={s.error}>{error}</p>:null}
      </section>
      <aside className={s.catalog} aria-label="Elegir entre los 60 camiones"><label className={s.search}><Search size={18}/><span className={s.sr}>Buscar camión, carga o conductor</span><input type="search" placeholder="Modelo, carga o conductor…" value={query} onChange={e=>setQuery(e.target.value)}/></label><p className={s.result} role="status">{matches.length} modelos {size==='all'?'en la colección':sizeLabels[size].toLocaleLowerCase('es')}</p>
        {matches.length?<ul className={s.list}>{matches.map(t=><li key={t.id}><button type="button" data-truck-id={t.id} aria-pressed={selectedId===t.id} onClick={()=>select(t.id)}><span className={s.swatch} style={{backgroundColor:t.color}}><Truck size={23}/></span><span><small>{t.model}</small><strong>{t.type}</strong><em>{t.colorName} · {number(cargoMassKg(t))} kg</em></span>{t.id===selectedId?<Check size={17}/>:<ArrowRight size={15}/>}</button></li>)}</ul>:<div className={s.empty}><h3>Sin coincidencias</h3><p>Prueba con otro modelo, color o nombre.</p><button onClick={()=>setQuery('')}><RotateCcw size={15}/>Limpiar búsqueda</button></div>}
      </aside>
    </div>
    <footer className={s.footer}><p>Configuraciones y datos sintéticos para exploración visual. Cabinas de CARLA Simulator y mekanismo, conversión de Valdrada/M. K. Turkcan, adaptadas para CargoMesh. <a href="/truck-cabs/LICENSE.md">Fuentes, licencia CC BY 4.0 y cambios</a>. No acreditan capacidad homologada ni disponibilidad operativa.</p><p>Referencias de embalaje: <a href="https://www.epal-pallets.org/eu-en/load-carriers/epal-euro-pallet" target="_blank" rel="noreferrer">EPAL Euro</a> · <a href="https://www.schuetz-id.info/en/info-id-spezifikationen/en-a126q0ch?cid=8ky1" target="_blank" rel="noreferrer">SCHÜTZ ECOBULK 1000 L</a>.</p></footer>
  </main>;
}
