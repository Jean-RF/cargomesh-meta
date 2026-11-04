'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {Component,useEffect,useRef,useState,type ReactNode} from 'react';
import {packCargo,packingGroupsFromManifest,PackingInputSchema,type PackingInput,type PackingPlan} from '@/shared/meta/cargo-packing';
import {loadingApi,loadingErrorMessage} from './operation-api';
import s from './packing-planner.module.css';
const Scene=dynamic(()=>import('./packing-scene'),{ssr:false,loading:()=> <p>Cargando la vista 3D…</p>});
const colors=['#19bca8','#f0b86b','#6b9fee','#d680b9','#85b870'];
const demo: PackingInput={vehicle:{lengthCm:420,widthCm:210,heightCm:210,maxPayloadKg:3500},groups:[{
 id:'demo-boxes',label:'Cajas de muestra',unit:'BOX',quantity:12,lengthCm:80,widthCm:60,heightCm:70,weightKg:40,rotate:false}]};
class SceneBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<p role="status">No se pudo abrir WebGL. El plano 2D y las cantidades siguen disponibles.</p>:this.props.children;}
}
export function PackingPlanner(){
 const [input,setInput]=useState<PackingInput>(structuredClone(demo)),[plan,setPlan]=useState<PackingPlan|null>(null);
 const [basis,setBasis]=useState(''),[confirmed,setConfirmed]=useState(false),[source,setSource]=useState('DEMO · datos sintéticos editables');
 const [requestId,setRequestId]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [pendingManifest,setPendingManifest]=useState<NonNullable<Awaited<ReturnType<typeof loadingApi.planningManifest>>>|null>(null);
 const [unitChoices,setUnitChoices]=useState<Record<string,'BOX'|'PALLET'|undefined>>({});
 const [show3D,setShow3D]=useState(false);const revision=useRef(0),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;const q=new URLSearchParams(window.location.search).get('request');if(q)setRequestId(q);return()=>{mounted.current=false;revision.current++;};},[]);
 const stale=!!plan&&basis!==JSON.stringify(input);
 function change(next:PackingInput){revision.current++;setInput(next);setConfirmed(false);setError('');}
 async function load(){
  const token=++revision.current;setBusy(true);setError('');
  try{const manifest=await loadingApi.planningManifest(requestId);if(!manifest)throw Error('CONFIRMED_MANIFEST_REQUIRED');
   if(!mounted.current||token!==revision.current)return;
   let groups:PackingInput['groups'];
   try{groups=packingGroupsFromManifest(manifest);}catch(e){if(e instanceof Error&&e.message==='UNIT_MAPPING_REQUIRED'){
    setPendingManifest(manifest);setUnitChoices({});setPlan(null);setConfirmed(false);return;}throw e;}
   const next={...input,groups};PackingInputSchema.parse(next);setInput(next);setPlan(null);setConfirmed(false);
   setPendingManifest(null);
   setSource(`Manifiesto confirmado · r${manifest.revision} · ${manifest.id}`);
  }catch(e){if(mounted.current&&token===revision.current)setError(e instanceof Error&&e.message==='CONFIRMED_MANIFEST_REQUIRED'?'Confirma el manifiesto del pedido antes de planificar.':
   e instanceof Error&&e.name==='ZodError'?'El manifiesto necesita unidades BOX/PALLET, cantidades, peso y dimensiones válidos para esta vista (máximo 200 unidades). No se estimarán datos faltantes.':loadingErrorMessage(e));}
  finally{if(mounted.current)setBusy(false);}
 }
 function groupEdit(index:number,key:keyof PackingInput['groups'][number],value:string|number|boolean){
  change({...input,groups:input.groups.map((g,i)=>i===index?{...g,[key]:value}:g)});
 }
 return <main className={s.page}><header className={s.hero}><div><span>TETRIS CARGOMESH</span><h1>De los datos al espacio real.</h1><p>Prueba el acomodo en el piso del vehículo con medidas confirmadas. La visualización representa un plan; no una carga observada.</p></div><Link href="/tetris?view=sessions">Sesiones y Passport →</Link></header>
  <section className={s.panel}><h2>1. Elige la carga</h2><p className={s.source}>{source}</p>
   <div className={s.load}><label>ID del pedido con manifiesto confirmado<input value={requestId} onChange={e=>{revision.current++;setRequestId(e.target.value);}} placeholder="UUID del pedido"/></label><button type="button" disabled={busy||!requestId} onClick={()=>void load()}>{busy?'Consultando…':'Cargar manifiesto'}</button><Link href="/clients/freight-request/new">Crear o revisar pedido</Link></div>
   <p>El manifiesto se consulta con tu sesión. Los adjuntos y las propuestas de IA no son un manifiesto confirmado.</p>
   {pendingManifest?<fieldset><legend>Confirma la unidad de cada grupo del manifiesto r{pendingManifest.revision}</legend><p>La descripción del empaque no permite asumir si estamos contando cajas o pallets.</p>
    {pendingManifest.declaration.groupBindings.map(b=><label key={b.groupId}>{pendingManifest.declaration.cargoSpecification.units[b.sourceUnitIndex].packageType}<select value={unitChoices[b.groupId]??''} onChange={e=>setUnitChoices(v=>({...v,[b.groupId]:e.target.value as 'BOX'|'PALLET'|undefined}))}><option value="">Selecciona una unidad</option><option value="BOX">Cajas</option><option value="PALLET">Pallets</option></select></label>)}
    <button type="button" disabled={pendingManifest.declaration.groupBindings.some(b=>!unitChoices[b.groupId])} onClick={()=>{try{
     const next={...input,groups:packingGroupsFromManifest(pendingManifest,unitChoices)};PackingInputSchema.parse(next);change(next);setPlan(null);
     setSource(`Manifiesto confirmado · r${pendingManifest.revision} · ${pendingManifest.id}`);setPendingManifest(null);
    }catch{setError('Revisa las unidades, peso y dimensiones del manifiesto. No se usarán medidas estimadas.');}}}>Usar estas unidades para el ensayo</button>
   </fieldset>:null}
   {!pendingManifest?<fieldset disabled={busy||source.startsWith('Manifiesto')}><legend>{source.startsWith('Manifiesto')?'Datos del manifiesto (solo lectura)':'Datos de muestra editables (cm y kg por unidad)'}</legend>
    {input.groups.map((g,i)=><div className={s.group} key={g.id}><strong>{g.label}</strong>
     <label>Unidad<select value={g.unit} onChange={e=>groupEdit(i,'unit',e.target.value)}><option>BOX</option><option>PALLET</option></select></label>
     {(['quantity','lengthCm','widthCm','heightCm','weightKg'] as const).map((key,k)=><label key={key}>{['Cantidad','Largo (cm)','Ancho (cm)','Alto (cm)','Peso (kg)'][k]}<input type="number" min="0.01" step={key==='quantity'?1:'any'} value={g[key]} onChange={e=>groupEdit(i,key,Number(e.target.value))}/></label>)}
    </div>)}
   </fieldset>:null}
   <button type="button" disabled={busy} onClick={()=>{change(structuredClone(demo));setSource('DEMO · datos sintéticos editables');setPlan(null);setPendingManifest(null);}}>Volver a datos de muestra</button>
  </section>
  <form className={s.panel} onSubmit={e=>{e.preventDefault();if(!confirmed||busy||pendingManifest)return;try{setPlan(packCargo(input));setBasis(JSON.stringify(input));setError('');}catch{setError('Revisa los datos: valores positivos, máximo 200 unidades y grupos BOX/PALLET.');}}}>
   <h2>2. Confirma el espacio disponible</h2><p>Usa dimensiones internas útiles y capacidad de carga útil. El catálogo visual de camiones no acredita estas medidas.</p>
   <div className={s.grid}>{(['lengthCm','widthCm','heightCm','maxPayloadKg'] as const).map((key,i)=><label key={key}>{['Largo interno (cm)','Ancho interno (cm)','Alto interno (cm)','Carga útil máxima (kg)'][i]}<input required type="number" min="0.01" step="any" value={input.vehicle[key]} onChange={e=>change({...input,vehicle:{...input.vehicle,[key]:Number(e.target.value)}})}/></label>)}</div>
   {input.groups.map((g,i)=><label className={s.check} key={g.id}><input type="checkbox" checked={g.rotate} onChange={e=>groupEdit(i,'rotate',e.target.checked)}/> Permitir giro horizontal de 90° · {g.label} (no voltea ni apila)</label>)}
   <label className={s.check}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Revisé los datos de carga y las dimensiones del vehículo para este ensayo.</label>
   <button disabled={!confirmed||busy||!!pendingManifest}>Calcular acomodo</button>
  </form>
  {error?<p className={s.error} role="alert">{error}</p>:null}
  {plan?<section className={s.panel} aria-label="Resultado del acomodo"><h2>3. Revisa el plan</h2>{stale?<p className={s.error} role="alert">Los datos cambiaron. Este plan es anterior; confirma y calcula nuevamente.</p>:null}
   <div className={s.metrics}><div><strong>{plan.placements.length}</strong>unidades acomodadas</div><div><strong>{plan.unplaced.length}</strong>sin acomodar</div><div><strong>{plan.loadedWeightKg.toLocaleString('es-PE')} kg</strong>peso planificado</div><div><strong>{plan.floorUsagePercent.toFixed(1)}%</strong>piso ocupado</div><div><strong>{plan.volumeUsagePercent.toFixed(1)}%</strong>volumen ocupado</div></div>
   <p>Una sola capa, sin apilar. Arrastra la vista 3D o usa las flechas para girar. El plano 2D conserva las medidas.</p>
   <button type="button" onClick={()=>setShow3D(v=>!v)}>{show3D?'Ocultar vista 3D':'Abrir vista 3D'}</button>
   {show3D?<SceneBoundary><Scene plan={plan}/></SceneBoundary>:null}
   <svg className={s.floor} viewBox={`-20 -25 ${plan.vehicle.lengthCm+40} ${plan.vehicle.widthCm+50}`} role="img" aria-label="Plano superior del piso del vehículo, con unidades sin solapamientos">
    <rect width={plan.vehicle.lengthCm} height={plan.vehicle.widthCm} fill="#e4eeed" stroke="#285b57" strokeWidth="2"/>
    {plan.placements.map((p,i)=><g key={p.id}><rect x={p.x} y={p.y} width={p.lengthCm} height={p.widthCm} fill={colors[plan.counts.findIndex(g=>g.groupId===p.groupId)%colors.length]} stroke="#153b3b" strokeWidth="1"/><text x={p.x+p.lengthCm/2} y={p.y+p.widthCm/2} textAnchor="middle" dominantBaseline="central" fontSize={Math.min(12,p.lengthCm/3,p.widthCm/3)} fill="#102e32">{i+1}</text><title>{`${p.label} · unidad ${p.index+1} · ${p.lengthCm} × ${p.widthCm} × ${p.heightCm} cm`}</title></g>)}
    <text x="0" y="-9" fontSize="10">{plan.vehicle.lengthCm} × {plan.vehicle.widthCm} cm · piso</text>
   </svg>
   <div className={s.table}><table><caption>Cantidades planificadas por grupo; no son unidades observadas</caption><thead><tr><th>Grupo</th><th>Unidad</th><th>Solicitado</th><th>Acomodado</th><th>Pendiente</th></tr></thead><tbody>{plan.counts.map(g=><tr key={g.groupId}><th>{g.label}</th><td>{g.unit}</td><td>{g.requested}</td><td>{g.planned}</td><td>{g.requested-g.planned}</td></tr>)}</tbody></table></div>
   {plan.unplaced.length?<details><summary>Por qué quedaron unidades pendientes</summary><ul>{plan.unplaced.map(p=><li key={`${p.groupId}:${p.index}`}>Grupo {p.groupId} · unidad {p.index+1}: {{HEIGHT:'supera la altura',PAYLOAD:'supera el peso útil restante',FLOOR_SPACE:'sin posición disponible en esta heurística de piso'}[p.reason]}.</li>)}</ul></details>:null}
   <p className={s.hint}>Heurística determinística FLOOR_BOTTOM_LEFT_V1; no garantiza el óptimo. No verifica ejes, centro de gravedad, resistencia del piso, amarres, incompatibilidades de mercancías ni secuencia de descarga. No reserva capacidad ni autoriza transporte. El plan es temporal y no cambia el manifiesto, la sesión ni el Passport.</p>
  </section>:null}
 </main>;
}
