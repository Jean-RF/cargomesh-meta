'use client';
import {useEffect,useState} from 'react';
import {Canvas,useThree} from '@react-three/fiber';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {disposeTruckAsset} from '../logistics-3d/load-truck-glb';
import {inspectTruckGlb} from '../logistics-3d/truck-glb';
import s from './gallery.module.css';
import {StudioEffects} from './studio-effects';

type View='iso'|'front'|'side'|'cab';
function Scene({view,onError,onReady}:{view:View;onError:(s:string)=>void;onReady:(ready:boolean)=>void}){
  const {gl,scene,camera,size,invalidate}=useThree(),[model,setModel]=useState<T.Group|null>(null);
  useEffect(()=>{
    let stopped=false,asset:T.Group|undefined,environment:T.WebGLRenderTarget|undefined;
    const pmrem=new T.PMREMGenerator(gl);
    (async()=>{
      const response=await fetch('/truck-reference/hgv.glb');
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const buffer=await response.arrayBuffer();inspectTruckGlb(buffer);
      const gltf=await new GLTFLoader().parseAsync(buffer,'');
      asset=gltf.scene;
      if(stopped){disposeTruckAsset(asset);return;}
      asset.traverse(node=>{
        if(!(node instanceof T.Mesh))return;
        node.castShadow=node.receiveShadow=true;
        for(const m of (Array.isArray(node.material)?node.material:[node.material]))if(m.transparent){m.depthWrite=false;node.castShadow=false;}
      });
      const hdr=await new HDRLoader().loadAsync('/truck-materials/studio-small-09.hdr');
      if(stopped){hdr.dispose();return;}
      environment=pmrem.fromEquirectangular(hdr);hdr.dispose();scene.environment=environment.texture;scene.environmentIntensity=.75;
      setModel(asset);onReady(true);invalidate();
    })().catch(error=>{if(!stopped)onError(`No se pudo cargar el prototipo: ${error.message}`);});
    return()=>{stopped=true;scene.environment=null;environment?.dispose();pmrem.dispose();if(asset)disposeTruckAsset(asset);};
  },[gl,invalidate,onError,onReady,scene]);
  useEffect(()=>{
    if(!model)return;
    const bounds=new T.Box3().setFromObject(model);
    if(view==='cab'){bounds.max.x=bounds.min.x+2.8;bounds.min.y=.65;}
    const center=bounds.getCenter(new T.Vector3()),span=bounds.getSize(new T.Vector3());
    const direction=new T.Vector3(...(view==='front'?[-1,.04,0]:view==='side'?[0,.04,1]:view==='cab'?[-1,.13,1.6]:[-1,.22,1.35]) as [number,number,number]).normalize();
    const right=new T.Vector3().crossVectors(direction,new T.Vector3(0,1,0)).normalize(),up=new T.Vector3().crossVectors(right,direction).normalize(),tan=Math.tan(T.MathUtils.degToRad(32/2));
    let distance=0;
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const c=new T.Vector3(x,y,z).sub(center);distance=Math.max(distance,Math.abs(c.dot(right))/(tan*(size.width/size.height)*.85)+c.dot(direction),Math.abs(c.dot(up))/(tan*.85)+c.dot(direction));}
    camera.position.copy(direction.multiplyScalar(distance).add(center));camera.lookAt(center);
    // OrbitControls targets the current crop, including close cab inspection.
    const redraw=()=>invalidate();
    const controls=new OrbitControls(camera,gl.domElement);controls.target.copy(center);controls.enablePan=false;controls.minDistance=Math.max(span.x,span.y)*.25;controls.maxDistance=distance*2;controls.maxPolarAngle=Math.PI/2-.015;controls.addEventListener('change',redraw);controls.update();
    Object.assign(gl.domElement.dataset,{state:'ready',model:'carla-hgv-reference',view});invalidate();
    return()=>{controls.removeEventListener('change',redraw);controls.dispose();};
  },[model,view,camera,gl,invalidate,size]);
  return <>{model?<primitive object={model} dispose={null}/>:null}<hemisphereLight args={['#eff5fa','#666f72',.35]}/><directionalLight position={[-7,10,8]} intensity={2.2} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-camera-far={35} shadow-normalBias={.015}/><mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[100,100]}/><shadowMaterial transparent opacity={.3}/></mesh></>;
}
export default function ReferenceViewer(){
  const [view,setView]=useState<View>('iso'),[error,setError]=useState(''),[ready,setReady]=useState(false);
  return <section className={s.model}>
    <div className={s.stage} style={{height:'clamp(340px,66vh,720px)'}}>
      <Canvas aria-label="Prototipo de camión rígido" fallback={<p role="alert">El visor necesita aceleración gráfica.</p>} shadows={{type:T.PCFShadowMap}} dpr={[1,1.5]} frameloop="demand" camera={{fov:32,near:.1,far:150}} gl={{antialias:true}} onCreated={({gl})=>{gl.toneMapping=T.ACESFilmicToneMapping;gl.toneMappingExposure=1;gl.setClearColor('#d7dcde');}}><Scene view={view} onError={setError} onReady={setReady}/><StudioEffects/></Canvas>
      {ready?<span className={s.drag}>Arrastra para girar · rueda para acercar</span>:!error?<span className={s.drag} role="status">Cargando camión y materiales…</span>:null}
    </div>
    <div className={s.toolbar}><div className={s.views} aria-label="Ángulo de cámara">{([['iso','Perspectiva'],['side','Lateral'],['front','Frente'],['cab','Detalle de cabina']] as const).map(([id,label])=><button key={id} type="button" disabled={!ready} onClick={()=>setView(id)} aria-pressed={view===id}>{label}</button>)}</div><a href="/truck-reference/hgv.glb" download="cargomesh-camion-prototipo.glb">Descargar GLB</a></div>
    {error?<p role="alert" className={s.error}>{error}</p>:null}
  </section>;
}
