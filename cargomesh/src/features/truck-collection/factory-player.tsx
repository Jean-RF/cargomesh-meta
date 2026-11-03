'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Activity,ArrowDown,ArrowLeft,ArrowRight,ArrowUp,Check,CircleCheck,Clock3,Focus,Keyboard,Move,Pause,Play,RotateCcw,ScanLine,StepForward,TriangleAlert} from 'lucide-react';
import Viewer from './viewer';
import {factoryLoadingPose,factoryMethodLabel,incompleteFactoryPlan,type FactoryLoadingPlan,type FactoryLoadingPose,type FactoryScenario} from './factory-loading';
import type {CollectionTruck} from './catalog';
import type {FactoryCameraCommand} from './camera-navigation';
import {BarcodeSymbol} from './barcode-symbol';
import s from './factory-player.module.css';
const number=(n:number,digits=2)=>n.toLocaleString('es-PE',{maximumFractionDigits:digits});
const metres=(n:number)=>`${n.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})} m`;
const timestamp=(n:number)=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;

export default function FactoryPlayer({truck,plan:basePlan}:{truck:CollectionTruck;plan:FactoryLoadingPlan}){
  const [scenario,setScenario]=useState<FactoryScenario>('complete');
  const plan=useMemo(()=>scenario==='incomplete'?incompleteFactoryPlan(basePlan):basePlan,[basePlan,scenario]);
  const [playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[ready,setReady]=useState(false),[reduced,setReduced]=useState(false);
  const [seek,setSeek]=useState({time:0,revision:0}),[pose,setPose]=useState(()=>factoryLoadingPose(plan,0));
  const [cameraCommand,setCameraCommand]=useState<FactoryCameraCommand>();
  const root=useRef<HTMLElement>(null),heading=useRef<HTMLHeadingElement>(null);
  const receiveReady=useCallback((exporter:(()=>Promise<void>)|null)=>setReady(exporter!==null),[]);
  const receiveProgress=useCallback((next:FactoryLoadingPose)=>{setPose(next);if(next.finished)setPlaying(false);},[]);
  useEffect(()=>{
    heading.current?.focus({preventScroll:true});
    const media=window.matchMedia('(prefers-reduced-motion: reduce)'),change=()=>{setReduced(media.matches);if(media.matches)setPlaying(false);};change();media.addEventListener('change',change);
    const visibility=()=>{if(document.hidden)setPlaying(false);};document.addEventListener('visibilitychange',visibility);
    const observer=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)setPlaying(false);});if(root.current)observer.observe(root.current);
    return()=>{media.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility);observer.disconnect();};
  },[]);
  function jump(time:number){setPlaying(false);setSeek(previous=>({time,revision:previous.revision+1}));setPose(factoryLoadingPose(plan,time));}
  function chooseScenario(value:FactoryScenario){
    if(value===scenario)return;
    setPlaying(false);setReady(false);setScenario(value);setSeek(previous=>({time:0,revision:previous.revision+1}));setPose(factoryLoadingPose(value==='incomplete'?incompleteFactoryPlan(basePlan):basePlan,0));
  }
  const target=plan.units[pose.currentIndex].target,total=plan.units.length,volume=pose.loaded*plan.size[0]*plan.size[1]*plan.size[2];
  const unit=plan.unitLabel,plural=unit==='unidad'?'unidades':unit==='IBC'?'IBC':unit==='macetón'?'macetones':unit==='cajón'?'cajones':unit==='bidón'?'bidones':unit==='panel'?'paneles':unit==='contenedor'?'contenedores':unit==='tractor'?'tractores':`${unit}s`;
  const progress=plan.flow?`${number(pose.fillFraction*100,1)}% de llenado`:`${pose.loaded} de ${total} ${plural} colocados`;
  const incomplete=scenario==='incomplete',interrupted=incomplete&&pose.time>=plan.stopAt;
  const milestones=plan.units.filter((_,i)=>!incomplete||plan.flow||i<total-1).map(u=>u.releaseAt).filter(t=>t<=plan.stopAt);
  const nextStep=Math.min(plan.duration,...[...milestones,plan.stopAt,plan.departureAt,plan.duration].filter(t=>t>pose.time+.001));
  const fraction=pose.time/plan.duration,status=!ready?'Preparando escena':pose.finished?incomplete?'Salida con pendientes':'Carga completa':playing?'En reproducción':pose.time>0?'En pausa':'Lista para iniciar';
  return <section ref={root} className={s.player} aria-labelledby="factory-title" data-factory-player data-scenario={scenario} data-state={pose.finished?incomplete?'incomplete':'complete':playing?'playing':'paused'} data-method={plan.method}>
    <header className={s.header}>
      <div><h2 id="factory-title" ref={heading} tabIndex={-1}>Carga en fábrica</h2><p className={s.product}>{plan.product}</p><p className={s.method}>{factoryMethodLabel[plan.method]} <span aria-hidden="true">·</span> Escala 1:1</p></div>
      <span className={s.status}>{pose.finished?incomplete?<TriangleAlert size={14} aria-hidden="true"/>:<Check size={14} aria-hidden="true"/>:<span className={s.statusDot} aria-hidden="true"/>}{status}</span>
    </header>
    <fieldset className={s.scenarios}><legend>Escenario de carga</legend><div>{([['complete','Carga completa','Todos los productos se cargan.'],['incomplete','Salida con pendientes',plan.flow?'Se interrumpe el llenado al 75%.':'La última unidad queda en la fábrica.']] as const).map(([value,label,description])=><label key={value} data-selected={scenario===value}><input type="radio" name="factory-scenario" value={value} checked={scenario===value} onChange={()=>chooseScenario(value)}/><span><strong>{label}</strong><small>{description}</small></span></label>)}</div></fieldset>
    <div className={s.stage}><Viewer truck={truck} reveal compare={false} view="iso" onReady={receiveReady} factory={{plan,playing:playing&&ready&&!reduced,speed,seek,onProgress:receiveProgress,cameraCommand}}/></div>
    <div className={s.navigation} role="group" aria-label="Mover la cámara">
      <div className={s.cameraIntro}><strong><Move size={16} aria-hidden="true"/>Explorar escena</strong><span>Arrastra para girar · rueda o pellizco para acercar</span></div>
      <div className={s.cameraButtons}>
        {([['forward','Adelante',ArrowUp],['back','Atrás',ArrowDown],['left','Izquierda',ArrowLeft],['right','Derecha',ArrowRight]] as const).map(([direction,label,Icon])=><button key={direction} disabled={!ready} type="button" title={label} onClick={()=>setCameraCommand(previous=>({direction,revision:(previous?.revision??0)+1}))} aria-label={`Mover cámara ${label.toLowerCase()}`}><Icon size={17} aria-hidden="true"/></button>)}
        <button className={s.resetView} disabled={!ready} type="button" title="Restablecer vista" onClick={()=>setCameraCommand(previous=>({direction:'reset',revision:(previous?.revision??0)+1}))}><Focus size={16} aria-hidden="true"/>Restablecer vista</button>
      </div>
      <p id="factory-camera-help"><Keyboard size={14} aria-hidden="true"/>Haz clic en la escena y usa WASD o las flechas. Botón derecho o dos dedos para desplazar.</p>
    </div>
    <div className={s.transport}>
      <div className={s.controls}>
        {reduced?<button className={s.primary} disabled={!ready} onClick={()=>jump(pose.finished?0:plan.flow&&!incomplete?Math.min(plan.duration,pose.time+plan.duration/4):nextStep)}>{pose.finished?<RotateCcw size={18} aria-hidden="true"/>:<StepForward size={18} aria-hidden="true"/>}{pose.finished?'Volver al inicio':'Siguiente paso'}</button>:<button className={s.primary} disabled={!ready} onClick={()=>{if(pose.finished){jump(0);setPlaying(true);}else setPlaying(value=>!value);}}><span className={s.playIcon} key={playing?'pause':pose.finished?'replay':'play'}>{playing?<Pause size={18} aria-hidden="true"/>:pose.finished?<RotateCcw size={18} aria-hidden="true"/>:<Play size={18} aria-hidden="true"/>}</span>{playing?'Pausar':pose.finished?'Repetir carga':pose.time>0?'Continuar carga':'Iniciar carga'}</button>}
        <button disabled={!ready} onClick={()=>jump(0)}><RotateCcw size={16} aria-hidden="true"/>Reiniciar</button>
        {!reduced?<button className={s.speed} disabled={!ready} onClick={()=>setSpeed(value=>value===1?2:1)} aria-label={`Velocidad ${speed}×`} aria-pressed={speed===2}>{speed}×</button>:null}
      </div>
      <div className={s.time}><Clock3 size={16} aria-hidden="true"/><span>{timestamp(pose.time)}<small> / {timestamp(plan.duration)}</small></span><span className={s.timeLabel}>Tiempo de simulación</span></div>
    </div>
    <div className={s.timeline}>
      <div className={s.timelineHeading}><label htmlFor="factory-time">Avance de carga</label><span title="Porcentaje del tiempo de simulación">{Math.round(fraction*100)}<small>% del tiempo</small></span></div>
      <div className={s.scrubber}>
        <div className={s.track} aria-hidden="true"><div className={s.fill} style={{transform:`scaleX(${fraction})`}}/></div>
        <input id="factory-time" aria-label="Avance de carga" type="range" min={0} max={plan.duration} step="any" value={pose.time} disabled={!ready} onChange={event=>jump(Number(event.target.value))} aria-valuetext={`${timestamp(pose.time)} de ${timestamp(plan.duration)}; ${progress}`}/>
        {!plan.flow?<div className={s.marks} aria-hidden="true">{milestones.map(t=><i key={t} data-passed={pose.time>=t} style={{left:`${t/plan.duration*100}%`}}/>)}</div>:null}
      </div>
      <div className={s.phase} role="status" data-interrupted={interrupted}>{interrupted?<TriangleAlert size={17} aria-hidden="true"/>:pose.finished?<CircleCheck size={17} aria-hidden="true"/>:<Activity size={17} aria-hidden="true"/>}<span>{!ready?'Preparando la fábrica…':pose.phase}</span><small>{plan.flow?progress:`${unit} ${pose.currentIndex+1} de ${total}${interrupted?' · pendiente':''}`}</small></div>
      {!plan.flow?<p className={s.trackHint}>Cada marca indica una unidad depositada.</p>:null}
    </div>
    {interrupted?<div className={`${s.complete} ${s.incomplete}`}><TriangleAlert size={30} aria-hidden="true"/><div><h3>{pose.finished?'Camión salió con carga pendiente':'Carga interrumpida'}</h3><p>{plan.flow?`${number(pose.fillFraction*100)}% transferido · ${number(total*plan.unitKg-pose.loadedKg)} kg pendientes${plan.litres?` (${number(plan.litres*(1-pose.fillFraction))} L)`:''}.`:`${pose.loaded} de ${total} ${plural} cargados. La unidad ${total}, código ${plan.units[total-1].barcode}, queda en la fábrica (${number(plan.unitKg)} kg).`}</p></div></div>:pose.finished?<div className={s.complete}><CircleCheck className={s.completeIcon} size={32} aria-hidden="true"/><div><h3>Carga lista en el camión</h3><p>{plan.flow?`${number(pose.loadedKg)} kg transferidos`:`${total} ${plural} colocados · ${number(pose.loadedKg)} kg`}. Puedes explorar la escena o repetir la simulación.</p></div></div>:null}
    {reduced?<p className={s.note}>Movimiento reducido: avanza por pasos o utiliza el deslizador.</p>:null}
    <dl className={s.progress}>
      <div><dt>{plan.flow?'Llenado':'Dentro del camión'}</dt><dd data-factory-count><span key={pose.loaded} className={s.loadedValue}>{plan.flow?number(pose.fillFraction*100,1):pose.loaded}</span> <small>{plan.flow?'%':`/ ${total} ${plural}`}</small></dd></div>
      <div><dt>{plan.flow?'Peso pendiente':'Pendientes'}</dt><dd>{plan.flow?number(total*plan.unitKg-pose.loadedKg):total-pose.loaded} {plan.flow?<small>kg</small>:null}</dd></div>
      <div><dt>Peso colocado</dt><dd data-factory-weight>{number(pose.loadedKg)} <small>kg</small></dd></div>
      <div><dt>{plan.litres?'Volumen transferido':plan.flow?'Producto':'Envolvente de unidades'}</dt><dd>{plan.litres?number(plan.litres*pose.fillFraction):plan.flow?number(total*plan.unitKg):number(volume,3)} <small>{plan.litres?'L':plan.flow?'kg totales':'m³'}</small></dd></div>
    </dl>
    <div className={s.barcode}><div><strong><ScanLine size={18} aria-hidden="true"/>{plan.flow?'Código del lote':interrupted?'Unidad pendiente en fábrica':pose.finished?'Última unidad colocada':'Unidad en manipulación'}</strong><span>{plan.flow?plan.product:`${unit} ${pose.currentIndex+1} de ${total} · ${plan.product}`}</span><small>Carrocería en corte para ver la carga.</small></div><BarcodeSymbol value={plan.units[pose.currentIndex].barcode}/></div>
    <dl className={s.measures}><div><dt>{plan.flow?'Envolvente de carga':unit} · largo × ancho × alto</dt><dd>{plan.size.map(metres).join(' × ')}</dd></div><div><dt>Peso por {unit}</dt><dd>{number(plan.unitKg)} kg</dd></div><div><dt>Zona útil · largo × ancho</dt><dd>{metres(plan.innerLength)} × {metres(plan.innerWidth)}</dd></div><div><dt>{plan.method==='rear'?'Altura libre de acceso':plan.method==='ramp'?'Longitud de las rampas':'Altura de referencia del modelo'}</dt><dd>{metres(plan.method==='ramp'?plan.rampLength:plan.method==='rear'?plan.openingHeight:truck.bodyHeightM)}</dd></div></dl>
    {!plan.flow?<p className={s.destination}>Centro de destino · {unit} {pose.currentIndex+1}: X {metres(target[0]-plan.front)} · Y {metres(target[1]-plan.floor)} · Z {metres(target[2]+plan.innerWidth/2)}. Origen: frente de la zona útil, piso y costado izquierdo.</p>:null}
    <p className={s.note}>{plan.flow?'El peso aumenta durante la transferencia.':'El contador aumenta al depositar e inmovilizar cada unidad. Los productos conservan su tamaño.'} Esta simulación no registra una observación ni cambia la sesión de carga.</p>
  </section>;
}
