'use client';
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { buildCollectionTruck, cargoPlacements, disposeCollectionTruck } from './model';
import { collectionTrucks, type CollectionTruck } from './catalog';
import { applyCollectionTextures, loadCollectionTextures } from './materials';
import {loadLicensedCab} from './licensed-cabs';
import {StudioEffects} from './studio-effects';
import {exportCollectionGlb} from './export-glb';
import {LoadAnnotations,type TruckLoadLabel} from './load-annotations';
import labelsStyle from './load-annotations.module.css';
import {buildFactoryScene,animateFactoryScene,type FactoryScene} from './factory-scene';
import {factoryLoadingPose,type FactoryLoadingPlan,type FactoryLoadingPose} from './factory-loading';
import {cameraKeyDirection,moveFactoryCamera,type CameraMove,type FactoryCameraCommand} from './camera-navigation';
export type ViewAngle='iso'|'side'|'front'|'rear'|'top'|'cargo'|'cab';
export type FactoryPlayback={plan:FactoryLoadingPlan;playing:boolean;speed:number;seek:{time:number;revision:number};onProgress:(pose:FactoryLoadingPose)=>void;cameraCommand?:FactoryCameraCommand};
type Props={truck:CollectionTruck;reveal:boolean;compare:boolean;view:ViewAngle;onReady:(exporter:(()=>Promise<void>)|null)=>void;loadLabels?:readonly TruckLoadLabel[];selectedLoad?:string;onSelectLoad?:(id:string)=>void;factory?:FactoryPlayback};

class ViewerBoundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div role="alert" style={{padding:32}}>No se pudo iniciar el visor 3D. Activa la aceleración gráfica y recarga la página.</div>:this.props.children;}
}
function Scene({truck,reveal,compare,view,onReady,onError,onLoading,factory}:Props & {onError:(message:string)=>void;onLoading:(loading:boolean)=>void}){
  const {gl,scene,camera,size,invalidate}=useThree();
  const controls=useRef<OrbitControls|null>(null);
  const cameraKeys=useRef(new Map<string,CameraMove>());
  const [assembly,setAssembly]=useState<{model:T.Group;cell:FactoryScene|null;truck:CollectionTruck;reveal:boolean;compare:boolean;plan:FactoryLoadingPlan|undefined}|null>(null);
  const factoryActors=useRef<FactoryScene|null>(null),playback=useRef(factory),factoryTime=useRef(0),lastReport=useRef({time:-1,phase:''});playback.current=factory;
  const factoryPlan=factory?.plan,seekTime=factory?.seek.time,seekRevision=factory?.seek.revision,isFactory=!!factoryPlan;
  useEffect(()=>{factoryTime.current=seekTime??0;lastReport.current.time=-1;invalidate();},[seekTime,seekRevision,invalidate]);
  useEffect(()=>{invalidate();},[factory?.playing,factory?.speed,invalidate]);
  const cameraCommand=factory?.cameraCommand;
  useEffect(()=>{
    const c=controls.current;if(!cameraCommand||!c)return;
    if(cameraCommand.direction==='reset'){cameraKeys.current.clear();c.reset();}
    else moveFactoryCamera(camera,c.target,[cameraCommand.direction],1);
    c.update();invalidate();
  },[cameraCommand,camera,invalidate]);
  useFrame((_,delta)=>{
    const actors=factoryActors.current,player=playback.current;if(!actors||!player)return;
    const c=controls.current;
    if(c&&moveFactoryCamera(camera,c.target,cameraKeys.current.values(),Math.min(delta,.05)*3)){c.update();invalidate();}
    if(player.playing)factoryTime.current=Math.min(player.plan.duration,factoryTime.current+Math.min(delta,.1)*player.speed);
    const pose=factoryLoadingPose(player.plan,factoryTime.current);animateFactoryScene(actors,pose);
    Object.assign(gl.domElement.dataset,{factoryTime:pose.time.toFixed(3),factoryLoaded:String(pose.loaded),factoryTotal:String(player.plan.units.length),factoryPhase:pose.phase,factoryBarcode:player.plan.units[pose.currentIndex].barcode,factoryBoxPosition:JSON.stringify(pose.positions[pose.currentIndex]),factoryScenario:player.plan.scenario,factoryDepartureX:String(pose.departureX),factoryFill:String(pose.fillFraction),cameraPosition:JSON.stringify(camera.position.toArray()),cameraTarget:JSON.stringify(c?.target.toArray())});
    if(Math.abs(pose.time-lastReport.current.time)>.10||pose.phase!==lastReport.current.phase||!player.playing&&pose.time!==lastReport.current.time){lastReport.current={time:pose.time,phase:pose.phase};player.onProgress(pose);}
    if(player.playing&&!pose.finished)invalidate();
  });
  useEffect(()=>{
    const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(gl),env=pmrem.fromScene(room,.03);
    const previous=scene.environment,previousFog=scene.fog;scene.environment=env.texture;scene.environmentIntensity=isFactory?.75:.9;scene.fog=new T.Fog('#bfc6c9',25,65);
    let cancelled=false,hdrEnv:T.WebGLRenderTarget|null=null;
    room.dispose();invalidate();
    new RGBELoader().loadAsync('/truck-materials/studio-small-09.hdr').then(texture=>{
      if(cancelled){texture.dispose();return;}
      hdrEnv=pmrem.fromEquirectangular(texture);texture.dispose();scene.environment=hdrEnv.texture;
      gl.domElement.dataset.lighting='hdr';invalidate();
    }).catch(()=>{gl.domElement.dataset.lighting='room-fallback';});
    return()=>{cancelled=true;scene.environment=previous;scene.fog=previousFog;env.dispose();hdrEnv?.dispose();pmrem.dispose();};
  },[gl,scene,invalidate,isFactory]);
  useEffect(()=>{
    const c=new OrbitControls(camera,gl.domElement);controls.current=c;c.enablePan=isFactory;c.screenSpacePanning=!isFactory;c.enableDamping=false;c.minPolarAngle=.03;c.maxPolarAngle=Math.PI/2-.015;
    const change=()=>invalidate();c.addEventListener('change',change);
    const canvas=gl.domElement,clear=()=>{cameraKeys.current.clear();},focus=()=>canvas.focus({preventScroll:true});
    const down=(event:KeyboardEvent)=>{const direction=cameraKeyDirection(event.code);if(!direction||event.altKey||event.ctrlKey||event.metaKey)return;event.preventDefault();cameraKeys.current.set(event.code,direction);invalidate();};
    const up=(event:KeyboardEvent)=>{if(cameraKeys.current.delete(event.code))invalidate();};
    const hidden=()=>{if(document.hidden)clear();};
    if(isFactory){canvas.addEventListener('keydown',down);canvas.addEventListener('pointerdown',focus);canvas.addEventListener('blur',clear);window.addEventListener('keyup',up);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',hidden);}
    return()=>{clear();canvas.removeEventListener('keydown',down);canvas.removeEventListener('pointerdown',focus);canvas.removeEventListener('blur',clear);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',hidden);c.removeEventListener('change',change);c.dispose();controls.current=null;};
  },[camera,gl,invalidate,isFactory]);
  useEffect(()=>{
    let cancelled=false,cleanup=()=>{};
    setAssembly(null);onReady(null);onError('');onLoading(true);gl.domElement.dataset.state='loading';
    loadLicensedCab(truck).then(cab=>{
    if(cancelled){disposeCollectionTruck(cab.model);return;}
    const model=buildCollectionTruck(truck,reveal,compare,cab,!!factoryPlan);scene.add(model);model.updateMatrixWorld(true);
    const cell=factoryPlan?buildFactoryScene(truck,factoryPlan,model):null;
    gl.localClippingEnabled=!!cell;
    if(cell){factoryActors.current=cell;animateFactoryScene(cell,factoryLoadingPose(factoryPlan!,factoryTime.current));scene.add(cell.root);cell.root.updateMatrixWorld(true);}
    const disposeCell=()=>{if(cell){scene.remove(cell.root);cell.dispose();factoryActors.current=null;gl.localClippingEnabled=false;for(const key of Object.keys(gl.domElement.dataset))if(key.startsWith('factory'))delete gl.domElement.dataset[key];}};
    cleanup=()=>{scene.remove(model);disposeCollectionTruck(model);disposeCell();};
    const geometry=new T.BufferGeometry().setFromPoints([new T.Vector3(-truck.lengthM/2,.012,truck.widthM/2+.75),new T.Vector3(truck.lengthM/2,.012,truck.widthM/2+.75)]);
    const ruler=new T.LineSegments(geometry,new T.LineBasicMaterial({color:'#829698'}));scene.add(ruler);
    cleanup=()=>{scene.remove(model,ruler);geometry.dispose();(ruler.material as T.Material).dispose();disposeCollectionTruck(model);disposeCell();};
    return loadCollectionTextures().then(textures=>{
    if(cancelled)return;
    applyCollectionTextures(model,truck,textures);
    if(cell)applyCollectionTextures(cell.root,truck,textures);
    if(compare)model.traverse(node=>{
      if(!(node instanceof T.Mesh)||['glass','rubber','frame','seat','metal'].includes(node.name))return;
      const m=node.material as T.MeshStandardMaterial;m.color.set('#a8a9a7');m.map=null;m.roughness=.65;m.metalness=.12;
      if(m.emissive)m.emissive.set('#000000');
    });
    Object.assign(gl.domElement.dataset,{modelId:truck.id,loadCount:String(compare?0:truck.cargo.count),barcodeCount:String(model.userData.printedBarcodes.length),driverId:truck.driver.id,units:'metres',state:'ready',realismVersion:'9',cabBase:truck.cabBase,materials:'pbr-atlas',comparison:String(compare),reveal:String(reveal)});
    setAssembly({model,cell,truck,reveal,compare,plan:factoryPlan});
    onLoading(false);
    onReady(async()=>{
      // Always export the complete opaque assembly, even when the viewport is cut away.
      const full=buildCollectionTruck(truck,false,false,await loadLicensedCab(truck));
      applyCollectionTextures(full,truck,textures);
      try{
        const data=await exportCollectionGlb(full);
        const url=URL.createObjectURL(new Blob([data],{type:'model/gltf-binary'})),link=document.createElement('a');
        link.href=url;link.download=`${truck.id}.glb`;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
      }finally{disposeCollectionTruck(full);}
    });
    invalidate();
    });
    }).catch(error=>{if(!cancelled){gl.domElement.dataset.state='error';onLoading(false);onError(error instanceof Error?error.message:'No se pudo preparar el camión. Recarga para reintentar.');}});
    return()=>{cancelled=true;onReady(null);delete gl.domElement.dataset.modelId;cleanup();};
  },[truck,reveal,compare,scene,gl,invalidate,onReady,onError,onLoading,factoryPlan]);
  // Framing is a camera operation. Resizing/changing angle must not reload the
  // cab or rebuild/dispose truck, cargo and factory, nor reset playback/readiness.
  useEffect(()=>{
    if(!assembly||assembly.truck!==truck||assembly.reveal!==reveal||assembly.compare!==compare||assembly.plan!==factoryPlan||size.width<=0||size.height<=0)return;
    const {model,cell}=assembly;
    const bounds=new T.Box3().setFromObject(model);
    if(cell)bounds.union(cell.frameBounds);
    if(compare){
      const peers=collectionTrucks.filter(t=>t.size===truck.size),length=Math.max(...peers.map(t=>t.lengthM))+1;
      bounds.set(new T.Vector3(-length/2,0,-1.65),new T.Vector3(length/2,truck.size==='large'?4.7:truck.size==='medium'?4:3.5,1.65));
    }
    if(view==='cab'){
      bounds.set(new T.Vector3(...model.userData.cabGeometry.bounds.min),new T.Vector3(...model.userData.cabGeometry.bounds.max));
      bounds.min.y=truck.design.roof*.34;
    }
    if(view==='cargo'&&!truck.cargo.liquidLitres){
      bounds.makeEmpty();
      for(const item of cargoPlacements(truck)){const [a,b,c]=item.size,[x,y,z]=item.position;bounds.expandByPoint(new T.Vector3(x-a/2,y-c/2,z-b/2));bounds.expandByPoint(new T.Vector3(x+a/2,y+c/2,z+b/2));}
    }
    const center=bounds.getCenter(new T.Vector3()),span=bounds.getSize(new T.Vector3());
    const directions:Record<ViewAngle,T.Vector3>={iso:new T.Vector3(-1,.28,1.35),side:new T.Vector3(0,.04,1),front:new T.Vector3(-1,.06,0),rear:new T.Vector3(1,.10,0),top:new T.Vector3(-.001,1,.001),cargo:new T.Vector3(-.8,.34,1.4),cab:new T.Vector3(-1,.10,1.75)};
    const direction=(cell?factoryPlan!.method==='ramp'?new T.Vector3(.08,.55,1.6):new T.Vector3(1,factoryPlan!.flow?1.05:.60,1.55):directions[view]).normalize(),right=new T.Vector3().crossVectors(direction,new T.Vector3(0,1,0)).normalize(),up=new T.Vector3().crossVectors(right,direction).normalize();
    const tangent=Math.tan(T.MathUtils.degToRad(32/2)),aspect=size.width/size.height;
    let distance=0;
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
      const corner=new T.Vector3(x,y,z).sub(center),depth=corner.dot(direction);
      distance=Math.max(distance,Math.abs(corner.dot(right))/(tangent*aspect*.84)+depth,Math.abs(corner.dot(up))/(tangent*.84)+depth);
    }
    camera.position.copy(direction.multiplyScalar(distance).add(center));camera.lookAt(center);
    // Narrow viewports move long vehicles beyond the studio's original fog range.
    if(scene.fog instanceof T.Fog){scene.fog.near=truck.size==='large'||cell?Math.max(25,distance+span.length()/2):25;scene.fog.far=scene.fog.near+40;}
    const c=controls.current;if(c){c.target.copy(center);c.minDistance=cell?1.2:Math.max(span.x,span.y)*.35;c.maxDistance=distance*2;c.update();if(cell)c.saveState();}
    gl.domElement.dataset.view=view;
    invalidate();
  },[assembly,truck,reveal,compare,view,size.width,size.height,scene,camera,gl,invalidate,factoryPlan]);
  return <><ambientLight intensity={factoryPlan?.16:.07}/><hemisphereLight args={['#e4eff3','#8c8e89',factoryPlan?.34:.20]}/>
    <directionalLight position={[-7,12,8]} intensity={factoryPlan?1.8:2.2} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-camera-far={50} shadow-radius={3} shadow-bias={-.00015} shadow-normalBias={.018}/>
    <directionalLight position={[5,8,-10]} intensity={.45} color="#d8e8ef"/>
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[200,200]}/><shadowMaterial transparent opacity={.28}/></mesh>
    <StudioEffects/>
  </>;
}
export default function CollectionViewer(props:Props){
  const [error,setError]=useState(''),[loading,setLoading]=useState(true);
  const labelElements=useRef(new Map<string,HTMLButtonElement>()),frame=useRef<HTMLDivElement>(null),bridge=useRef<SVGPathElement>(null),tip=useRef<SVGPathElement>(null);
  const annotated=!!props.loadLabels?.length;
  return <ViewerBoundary><div ref={frame} className={`${labelsStyle.viewer} ${annotated?labelsStyle.annotated:''}`} data-load-viewer={annotated?'true':undefined}>
    {annotated?<div className={labelsStyle.rail} role="group" aria-label="Grupos de carga en el modelo 3D"><p className={labelsStyle.railTitle}>Grupos de carga</p>{props.loadLabels!.map(label=><button type="button" key={label.id} data-load-label={label.id} disabled={loading||!!error} ref={node=>{if(node)labelElements.current.set(label.id,node);else labelElements.current.delete(label.id);}} className={labelsStyle.label} aria-pressed={props.selectedLoad===label.id} onClick={()=>props.onSelectLoad?.(label.id)} aria-label={`${label.label}: ${label.weightKg.toLocaleString('es-PE')} kg, ${label.sharePercent.toFixed(1)}% de carga útil`}><strong>{label.label}</strong><span>{label.sharePercent.toLocaleString('es-PE',{maximumFractionDigits:1})}%</span><small>{label.weightKg.toLocaleString('es-PE')} kg</small></button>)}<p className={labelsStyle.occludedHint} role="status">Grupo oculto. Gira o muestra la carga.</p></div>:null}
    <div className={labelsStyle.canvas}>
      <Canvas aria-label={`Modelo 3D de ${props.truck.type}`} shadows dpr={[1,1.5]} frameloop="demand" camera={{fov:32,near:.05,far:250}}
        gl={{antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:false}}
        onCreated={({gl})=>{gl.toneMapping=T.ACESFilmicToneMapping;gl.toneMappingExposure=.95;gl.outputColorSpace=T.SRGBColorSpace;gl.shadowMap.type=T.PCFShadowMap;gl.setClearColor('#d7dcde');if(props.factory){gl.domElement.tabIndex=0;gl.domElement.setAttribute('aria-label',`Escena de carga de ${props.truck.type}`);gl.domElement.setAttribute('aria-describedby','factory-camera-help');}}}>
        <Scene {...props} onError={setError} onLoading={setLoading}/>
        {annotated?<LoadAnnotations labels={props.loadLabels!} selected={props.selectedLoad} elements={labelElements} active={!loading&&!error} frame={frame} bridge={bridge} tip={tip}/>:null}
      </Canvas>
      {error||loading?<div role={error?'alert':'status'} style={{position:'absolute',top:16,left:16,right:16,padding:12,background:'#fff',color:'#163349',fontSize:13}}>{error||'Preparando cabina, conductor y carga…'}</div>:null}
    </div>
    {annotated?<svg className={labelsStyle.bridge} aria-hidden="true"><path ref={bridge}/><path ref={tip} className={labelsStyle.tip}/></svg>:null}
  </div></ViewerBoundary>;
}
