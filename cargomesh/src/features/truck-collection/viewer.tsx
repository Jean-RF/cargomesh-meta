'use client';
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { buildCollectionTruck, cargoPlacements, disposeCollectionTruck } from './model';
import { collectionTrucks, type CollectionTruck } from './catalog';
import { applyCollectionTextures, loadCollectionTextures } from './materials';
import {loadLicensedCab} from './licensed-cabs';
import {StudioEffects} from './studio-effects';
import {exportCollectionGlb} from './export-glb';
import {LoadAnnotations,type TruckLoadLabel} from './load-annotations';
import labelsStyle from './load-annotations.module.css';
import {factorySurfaces} from './factory-surfaces';
import {buildFactoryScene,animateFactoryScene,type FactoryScene} from './factory-scene';
import {factoryLoadingPose,type FactoryLoadingPlan,type FactoryLoadingPose} from './factory-loading';
import {cameraKeyDirection,moveFactoryCamera,type CameraMove,type FactoryCameraCommand} from './camera-navigation';
export type ViewAngle='iso'|'side'|'front'|'rear'|'top'|'cargo'|'cab'|'driver';
export type FactoryPlayback={plan:FactoryLoadingPlan;playing:boolean;speed:number;seek:{time:number;revision:number};onProgress:(pose:FactoryLoadingPose)=>void;cameraCommand?:FactoryCameraCommand};
type Props={truck:CollectionTruck;reveal:boolean;compare:boolean;view:ViewAngle;onReady:(exporter:(()=>Promise<void>)|null)=>void;loadLabels?:readonly TruckLoadLabel[];selectedLoad?:string;onSelectLoad?:(id:string)=>void;factory?:FactoryPlayback};

class ViewerBoundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div role="alert" style={{padding:32}}>No se pudo iniciar el visor 3D. Activa la aceleración gráfica y recarga la página.</div>:this.props.children;}
}
function GarageBox({size,at,color,metal=0,glow=false,shadow=false}:{size:[number,number,number];at:[number,number,number];color:string;metal?:number;glow?:boolean;shadow?:boolean}){
  return <mesh position={at} castShadow={shadow} receiveShadow>
    <boxGeometry args={size}/><meshStandardMaterial color={color} metalness={metal} roughness={metal?.48:.83} emissive={glow?color:'#000000'} emissiveIntensity={glow?.85:0}/>
  </mesh>;
}

function GarageEquipment({length,wallZ}:{length:number;wallZ:number}){
  const {invalidate}=useThree();
  const root=useRef<T.Group>(null);
  useEffect(()=>{
    const group=root.current!;
    const loader=new GLTFLoader();
    let active=true;
    const dispose=(model:T.Group)=>{
      const textures=new Set<T.Texture>();
      model.traverse(node=>{
        if(node instanceof T.Mesh)for(const material of [node.material].flat()){
          for(const value of Object.values(material))if(value instanceof T.Texture)textures.add(value);
        }
      });
      disposeCollectionTruck(model);
      for(const texture of textures)texture.dispose();
    };
    const models:T.Group[]=[];
    for(const name of ['metal-tool-chest','old-tyre']){
      void loader.loadAsync(`/truck-materials/garage-${name}.glb`).then(({scene:model})=>{
        if(!active){dispose(model);return;}
        model.traverse(node=>{if(node instanceof T.Mesh){node.castShadow=true;node.receiveShadow=true;}});
        if(name==='old-tyre')model.rotation.x=-Math.PI/2;
        const bounds=new T.Box3().setFromObject(model);
        const center=bounds.getCenter(new T.Vector3());
        model.position.sub(center.setY(bounds.min.y));
        const item=new T.Group();
        item.name=name;
        item.add(model);
        if(name==='metal-tool-chest'){
          item.position.set(length/2+3.06,1.047,wallZ+.72);
          group.add(item);
        }else{
          const tyreHeight=bounds.max.y-bounds.min.y;
          for(let level=0;level<3;level++){
            const tyre=level===0?item:item.clone();
            tyre.position.set(-length/2-.86+level*.015,tyreHeight*level,wallZ+1.55);
            tyre.rotation.y=level*.18;
            group.add(tyre);
          }
        }
        models.push(model);
        invalidate();
      }).catch(()=>{ /* The garage remains usable while a decorative model is unavailable. */ });
    }
    return()=>{active=false;group.clear();for(const model of models)dispose(model);};
  },[invalidate,length,wallZ]);
  return <group ref={root}/>;
}

function WarehouseBackdrop({length,width}:{length:number;width:number}){
  const {invalidate}=useThree();
  const floorMaterial=useRef<T.MeshStandardMaterial>(null);
  const [workshopSigns,setWorkshopSigns]=useState<T.CanvasTexture|null>(null);
  useEffect(()=>{
    const material=floorMaterial.current;
    if(!material)return;
    const surfaces=factorySurfaces(invalidate);
    for(const texture of [surfaces.concrete,surfaces.normal,surfaces.roughness])texture?.repeat.set(40,40);
    material.map=surfaces.concrete;
    material.normalMap=surfaces.normal;
    material.roughnessMap=surfaces.roughness;
    material.needsUpdate=true;
    const sign=document.createElement('canvas');sign.width=768;sign.height=192;
    const ctx=sign.getContext('2d');
    let graphic:T.CanvasTexture|null=null;
    if(ctx){
      ctx.fillStyle='#1c3038';ctx.fillRect(0,0,768,192);
      ctx.fillStyle='#e9b94d';ctx.fillRect(0,0,15,192);ctx.fillRect(14,149,740,2);
      ctx.fillStyle='#f5f1df';ctx.font='700 69px sans-serif';ctx.fillText('GARAJE',44,97);
      ctx.fillStyle='#b7cbd0';ctx.font='27px sans-serif';ctx.fillText('CARGOMESH  /  SERVICIO DE FLOTA',48,135);
      ctx.fillStyle='#e9b94d';ctx.font='700 90px sans-serif';ctx.fillText('01',608,109);
      graphic=new T.CanvasTexture(sign);graphic.colorSpace=T.SRGBColorSpace;
      setWorkshopSigns(graphic);
    }
    return()=>{for(const texture of Object.values(surfaces))texture?.dispose();graphic?.dispose();};
  },[invalidate]);
  const wallZ=-width/2-3.5,span=length+10,depth=-wallZ*2,halfLength=span/2,height=5.15;
  const doorWidth=width+1.35;
  const bays=Array.from({length:Math.floor(span/3)},(_,i)=>i*3-halfLength);
  const compressorBay=bays.filter((_,i)=>i%2===1).reduce((closest,x)=>
    Math.abs(x+3.5)<Math.abs(closest+3.5)?x:closest,bays[1]);
  const overhead=useRef<T.Group>(null);
  useFrame(({camera})=>{
    if(overhead.current)overhead.current.visible=camera.position.y<height;
  });
  return <group name="Enclosed truck garage">
    <GarageEquipment length={length} wallZ={wallZ}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.006,0]} receiveShadow>
      <planeGeometry args={[80,80]}/><meshStandardMaterial ref={floorMaterial} color="#d0d7d9" normalScale={[.42,.42]} roughness={.96}/>
    </mesh>
    <mesh position={[0,height/2,wallZ]} receiveShadow>
      <planeGeometry args={[span,height]}/><meshStandardMaterial color="#b7c4c7" roughness={.88}/>
    </mesh>
    {/* Interior faces let the orbit camera see through the near wall and roof. */}
    <mesh position={[0,height,0]} rotation={[Math.PI/2,0,0]}>
      <planeGeometry args={[span,depth]}/><meshStandardMaterial color="#83959d" roughness={.78}/>
    </mesh>
    <group ref={overhead}>
      {bays.map(x=><GarageBox key={x} size={[.14,.15,depth-.12]} at={[x,4.96,0]} color="#46565c" metal={.45}/>)}
    </group>
    <mesh position={[0,height/2,-wallZ]} rotation={[0,Math.PI,0]}>
      <planeGeometry args={[span,height]}/><meshStandardMaterial color="#829498" roughness={.86}/>
    </mesh>
    {[-1,1].map(side=><group key={side} position={[side*halfLength,0,0]} rotation={[0,-side*Math.PI/2,0]}>
      <mesh position={[0,height/2,0]}><planeGeometry args={[depth,height]}/><meshStandardMaterial color="#a4b1b5" roughness={.86}/></mesh>
      <mesh position={[0,2.05,.008]}><planeGeometry args={[doorWidth,4.1]}/><meshStandardMaterial color="#677d85" metalness={.35} roughness={.53}/></mesh>
      {Array.from({length:18},(_,row)=><mesh key={row} position={[0,.15+row*.22,.011]}>
        <planeGeometry args={[width+1.30,.026]}/><meshStandardMaterial color="#394b53"/>
      </mesh>)}
      {[-1,1].map(edge=><group key={edge} position={[edge*(doorWidth/2+.06),0,0]}>
        <GarageBox size={[.125,4.14,.09]} at={[0,2.07,.052]} color="#32464e" metal={.5}/>
        <GarageBox size={[.125,1.04,.092]} at={[0,.52,.061]} color="#d4a331"/>
        <GarageBox size={[.21,.77,.22]} at={[edge*.25,.385,.36]} color="#d4a331" shadow/>
        {[.31,.54].map(y=><GarageBox key={y} size={[.214,.095,.224]} at={[edge*.25,y,.36]} color="#3a3932"/>)}
      </group>)}
      <GarageBox size={[doorWidth+.36,.21,.28]} at={[0,4.14,.14]} color="#344a54" metal={.43}/>
      <GarageBox size={[.24,.24,.28]} at={[doorWidth/2+.24,4.13,.13]} color="#657780" metal={.40}/>
      <GarageBox size={[.024,2.8,.03]} at={[doorWidth/2+.43,2.78,.07]} color="#748083" metal={.4}/>
      <GarageBox size={[.19,.31,.09]} at={[doorWidth/2+.43,1.41,.078]} color="#3b4648" metal={.3}/>
      <GarageBox size={[.067,.057,.04]} at={[doorWidth/2+.43,1.43,.132]} color="#a63c31"/>
      <GarageBox size={[.055,.036,.03]} at={[doorWidth/2+.43,1.35,.125]} color="#7a9762"/>
      <mesh position={[0,4.62,.013]}>
        <planeGeometry args={[2.45,.61]}/><meshStandardMaterial map={workshopSigns} color={workshopSigns?'#ffffff':'#344a54'} roughness={.85}/>
      </mesh>
    </group>)}
    <group position={[halfLength-1.65,0,wallZ+.70]}>
      <mesh position={[0,.49,0]} receiveShadow><boxGeometry args={[1.9,.98,.64]}/><meshStandardMaterial color="#335b61" metalness={.28}/></mesh>
      <mesh position={[0,1.01,0]}><boxGeometry args={[2.0,.07,.71]}/><meshStandardMaterial color="#49565a" metalness={.55}/></mesh>
      {[.25,.48,.71,.87].map(y=><mesh key={y} position={[0,y,.325]}><boxGeometry args={[.67,.036,.045]}/><meshStandardMaterial color="#a4b3b9" metalness={.60}/></mesh>)}
      <mesh position={[0,1.55,-.26]}><boxGeometry args={[1.86,.96,.065]}/><meshStandardMaterial color="#293a41"/></mesh>
      {[-.54,-.29,.16,.50].map((x,i)=><mesh key={x} position={[x,1.54,-.218]} rotation={[0,0,i%2===0?.22:-.25]}><boxGeometry args={[.055,.36,.035]}/><meshStandardMaterial color={i%2===0?'#91a4aa':'#d1a647'} metalness={.4}/></mesh>)}
      <mesh position={[1.23,.63,.11]}><cylinderGeometry args={[.11,.11,.53,16]}/><meshStandardMaterial color="#a43532"/></mesh>
      <mesh position={[1.23,.92,.11]}><boxGeometry args={[.13,.05,.07]}/><meshStandardMaterial color="#303a3e"/></mesh>
    </group>
    <group position={[compressorBay+1.5,0,wallZ+.73]}>
      <mesh position={[0,.27,0]} rotation={[0,0,Math.PI/2]} castShadow receiveShadow>
        <capsuleGeometry args={[.22,.66,5,14]}/><meshStandardMaterial color="#2d6d73" metalness={.33} roughness={.55}/>
      </mesh>
      {[-.31,.31].map(x=><group key={x}>
        <GarageBox size={[.16,.11,.28]} at={[x,.055,0]} color="#303a3c"/>
        <mesh position={[x,.115,.21]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.105,.105,.065,14]}/><meshStandardMaterial color="#34393a"/></mesh>
      </group>)}
      <GarageBox size={[.45,.25,.34]} at={[-.09,.60,0]} color="#48545a" metal={.45} shadow/>
      <GarageBox size={[.065,.06,.055]} at={[.13,.62,.18]} color="#b84432"/>
      <mesh position={[.62,1.75,-.51]}>
        <torusGeometry args={[.175,.036,7,22]}/><meshStandardMaterial color="#202a2f" roughness={.93}/>
      </mesh>
      <GarageBox size={[.065,.43,.05]} at={[.79,1.51,-.49]} color="#27343b"/>
      <GarageBox size={[.58,.24,.025]} at={[.63,2.13,-.54]} color="#d0a640"/>
    </group>
    <GarageBox size={[span,.045,.05]} at={[0,2.94,wallZ+.16]} color="#6e8790" metal={.5}/>
    <mesh position={[0,4.34,wallZ+.22]} rotation={[0,0,Math.PI/2]}>
      <cylinderGeometry args={[.12,.12,span-.25,12]}/><meshStandardMaterial color="#849095" roughness={.51} metalness={.52}/>
    </mesh>
    {bays.map(x=><mesh key={x} position={[x+.28,4.34,wallZ+.22]} rotation={[0,0,Math.PI/2]}>
      <cylinderGeometry args={[.137,.137,.046,12]}/><meshStandardMaterial color="#4b5e66" roughness={.55} metalness={.46}/>
    </mesh>)}
    <group position={[length/2+.80,0,0]}>
      <GarageBox size={[.19,.014,width+.94]} at={[0,0,0]} color="#4b5353" metal={.55}/>
      {Array.from({length:16},(_,i)=><GarageBox key={i} size={[.145,.005,.026]} at={[0,.008,(i-7.5)*(width+.80)/16]} color="#1d2526"/>)}
    </group>
    <mesh position={[0,.42,wallZ+.035]} receiveShadow><boxGeometry args={[span,.84,.075]}/><meshStandardMaterial color="#667478" roughness={.93}/></mesh>
    <mesh position={[0,4.75,wallZ+.15]}><boxGeometry args={[span,.20,.32]}/><meshStandardMaterial color="#3e4f56" metalness={.45} roughness={.45}/></mesh>
    <mesh position={[0,3.22,wallZ+.095]}><boxGeometry args={[span,.08,.09]}/><meshStandardMaterial color="#28636b"/></mesh>
    {bays.map((x,i)=><group key={x} position={[x,0,wallZ]}>
      <mesh position={[0,2.5,.08]}><boxGeometry args={[.15,5,.22]}/><meshStandardMaterial color="#46565c"/></mesh>
      <GarageBox size={[.08,.28,.075]} at={[0,4.70,.84]} color="#53646a" metal={.40}/>
      <GarageBox size={[.085,.075,1.45]} at={[0,4.53,1.45]} color="#40535a" metal={.45}/>
      <GarageBox size={[.075,.021,1.36]} at={[0,4.481,1.45]} color="#e8f3ee" glow/>
      <mesh position={[1.48,4.49,.76]}><boxGeometry args={[1.45,.06,.16]}/><meshStandardMaterial color="#e7f2ec" emissive="#c8ded5" emissiveIntensity={.9}/></mesh>
      <mesh position={[1.5,3.82,.025]}><planeGeometry args={[2.56,.82]}/><meshStandardMaterial color="#46565c"/></mesh>
      {[-.80,0,.80].map(offset=><mesh key={offset} position={[1.5+offset,3.82,.03]}><planeGeometry args={[.76,.72]}/><meshStandardMaterial color="#aac8d2" emissive="#68868e" emissiveIntensity={.28}/></mesh>)}
      {i%2===0&&<group position={[1.5,0,.46]}>
        {[-.98,.98].map(side=><mesh key={side} position={[side,1.26,0]} castShadow><boxGeometry args={[.09,2.52,.67]}/><meshStandardMaterial color="#31515a"/></mesh>)}
        {[.35,1.19,2.02].map(y=><group key={y} position={[0,y,0]}>
          <mesh castShadow><boxGeometry args={[2,.085,.68]}/><meshStandardMaterial color="#2c737b"/></mesh>
          {[-.55,.52].map((offset,j)=>{
            const height=j===0?.38:.52;
            return <group key={offset} position={[offset,.065,0]}>
              <mesh position={[0,.021,0]}><boxGeometry args={[.79,.04,.59]}/><meshStandardMaterial color="#66533d"/></mesh>
              <mesh position={[0,.04+height/2,0]} castShadow><boxGeometry args={[.74,height,.52]}/><meshStandardMaterial color={j===0?'#a77d54':'#b6a282'} roughness={.94}/></mesh>
              <mesh position={[0,height+.041,0]}><boxGeometry args={[.078,.003,.526]}/><meshStandardMaterial color="#b0986e"/></mesh>
              <mesh position={[.16,height*.57,.262]}><planeGeometry args={[.16,.085]}/><meshStandardMaterial color="#efede1"/></mesh>
              {[-.04,-.02,.004,.013,.038].map(mark=><mesh key={mark} position={[.16+mark,height*.57,.263]}><planeGeometry args={[.006,.044]}/><meshStandardMaterial color="#414847"/></mesh>)}
            </group>;
          })}
        </group>)}
      </group>}
    </group>)}
    {[-1,1].map(side=><group key={side}>
      <mesh position={[0,-.003,side*(width/2+1.65)]} rotation={[-Math.PI/2,0,0]}>
        <planeGeometry args={[span-.06,.022]}/><meshStandardMaterial color="#4b5557" roughness={1}/>
      </mesh>
      <mesh position={[side*(halfLength-1.42),-.002,0]} rotation={[-Math.PI/2,0,0]}>
        <planeGeometry args={[.020,depth-.06]}/><meshStandardMaterial color="#4b5557" roughness={1}/>
      </mesh>
    </group>)}
    {[-1,1].map(side=><mesh key={side} position={[0,.001,side*(width/2+.76)]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[length+2,.075]}/><meshStandardMaterial color="#d4af4e"/>
    </mesh>)}
  </group>;
}

function Scene({truck,reveal,compare,view,onReady,onError,onLoading,factory,loadLabels}:Props & {onError:(message:string)=>void;onLoading:(loading:boolean)=>void}){
  const {gl,scene,camera,size,invalidate}=useThree();
  const warehouse=!!loadLabels&&!factory;
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
    const previous=scene.environment,previousFog=scene.fog;scene.environment=env.texture;scene.environmentIntensity=isFactory?.75:warehouse?.57:.9;scene.fog=new T.Fog('#bfc6c9',25,65);
    let cancelled=false,hdrEnv:T.WebGLRenderTarget|null=null;
    room.dispose();invalidate();
    new RGBELoader().loadAsync(warehouse?'/truck-materials/garage-interior.hdr':'/truck-materials/studio-small-09.hdr').then(texture=>{
      if(cancelled){texture.dispose();return;}
      hdrEnv=pmrem.fromEquirectangular(texture);texture.dispose();scene.environment=hdrEnv.texture;
      gl.domElement.dataset.lighting='hdr';invalidate();
    }).catch(()=>{gl.domElement.dataset.lighting='room-fallback';});
    return()=>{cancelled=true;scene.environment=previous;scene.fog=previousFog;env.dispose();hdrEnv?.dispose();pmrem.dispose();};
  },[gl,scene,invalidate,isFactory,warehouse]);
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
    const cell=factoryPlan?buildFactoryScene(truck,factoryPlan,model,invalidate):null;
    gl.localClippingEnabled=!!cell;
    if(cell){factoryActors.current=cell;animateFactoryScene(cell,factoryLoadingPose(factoryPlan!,factoryTime.current));scene.add(cell.root);cell.root.updateMatrixWorld(true);}
    const disposeCell=()=>{if(cell){scene.remove(cell.root);cell.dispose();factoryActors.current=null;gl.localClippingEnabled=false;for(const key of Object.keys(gl.domElement.dataset))if(key.startsWith('factory'))delete gl.domElement.dataset[key];}};
    cleanup=()=>{scene.remove(model);disposeCollectionTruck(model);disposeCell();};
    const geometry=new T.BufferGeometry().setFromPoints([new T.Vector3(-truck.lengthM/2,.012,truck.widthM/2+.75),new T.Vector3(truck.lengthM/2,.012,truck.widthM/2+.75)]);
    const ruler=new T.LineSegments(geometry,new T.LineBasicMaterial({color:'#829698'}));if(!warehouse)scene.add(ruler);
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
  },[truck,reveal,compare,scene,gl,invalidate,onReady,onError,onLoading,factoryPlan,warehouse]);
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
    if(view==='driver'){
      const [x,y,z]=model.userData.cabGeometry.head;
      bounds.set(new T.Vector3(x-.46,y-.49,z-.25),new T.Vector3(x+.13,y+.15,z+.25));
    }
    if(view==='cargo'&&!truck.cargo.liquidLitres){
      bounds.makeEmpty();
      for(const item of cargoPlacements(truck)){const [a,b,c]=item.size,[x,y,z]=item.position;bounds.expandByPoint(new T.Vector3(x-a/2,y-c/2,z-b/2));bounds.expandByPoint(new T.Vector3(x+a/2,y+c/2,z+b/2));}
    }
    const center=bounds.getCenter(new T.Vector3()),span=bounds.getSize(new T.Vector3());
    const directions:Record<ViewAngle,T.Vector3>={iso:new T.Vector3(-1,.28,1.35),side:new T.Vector3(0,.04,1),front:new T.Vector3(-1,.06,0),rear:new T.Vector3(1,.10,0),top:new T.Vector3(-.001,1,.001),cargo:new T.Vector3(-.8,.34,1.4),cab:new T.Vector3(-1,.10,1.75),driver:new T.Vector3(.31,.12,1.4)};
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
    const c=controls.current;if(c){c.target.copy(center);c.minDistance=cell?1.2:Math.max(span.x,span.y)*.35;c.maxDistance=cell&&factoryPlan?.method==='rear'?Math.max(55,distance*2):distance*2;c.update();if(cell)c.saveState();}
    gl.domElement.dataset.view=view;
    invalidate();
  },[assembly,truck,reveal,compare,view,size.width,size.height,scene,camera,gl,invalidate,factoryPlan]);
  return <><ambientLight intensity={factoryPlan?.16:.07}/><hemisphereLight args={['#e4eff3','#8c8e89',factoryPlan?.34:.20]}/>
    <directionalLight position={[-7,12,8]} intensity={factoryPlan?1.8:2.2} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-camera-far={50} shadow-radius={3} shadow-bias={-.00015} shadow-normalBias={.018}/>
    {warehouse?<pointLight position={[-truck.lengthM*.37,3.7,1.5]} intensity={12} distance={8} color="#fff4e8"/>:null}
    <directionalLight position={[5,8,-10]} intensity={.45} color="#d8e8ef"/>
    {warehouse?<WarehouseBackdrop length={truck.lengthM} width={truck.widthM}/>:<mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[200,200]}/><shadowMaterial transparent opacity={.28}/></mesh>}
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
