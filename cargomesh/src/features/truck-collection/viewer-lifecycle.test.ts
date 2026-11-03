import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as T from 'three';
import {collectionTrucks,type CollectionTruck} from './catalog';
import {cargoPlacements} from './layout';
import {factoryLoadingPlan,factoryLoadingPose,incompleteFactoryPlan} from './factory-loading';
import {cameraKeyDirection,moveFactoryCamera} from './camera-navigation';

// Execute the production Scene and its real effect dependency lists. Only the
// GPU/assets and React scheduler are replaced. This checks work/cancellation,
// not browser FPS, WebGL output, or aesthetic acceptance.
function sceneHarness(source=readFileSync(new URL('./viewer.tsx',import.meta.url),'utf8')){
  type Slot={value?:unknown;deps?:unknown[];cleanup?:(()=>void);effect?:(()=>void|(()=>void))};
  const slots:Slot[]=[],tasks:number[]=[];
  let cursor=0,dirty=false,frame=(_state:unknown,_delta:number)=>{},closed=false;
  const counts={build:0,dispose:0,cab:0,textures:0,hdr:0,controls:0,factory:0,factoryDispose:0,directDraw:0};
  const events={ready:[] as unknown[],loading:[] as boolean[],errors:[] as string[]};
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.05,250);
  const canvas={dataset:{} as Record<string,string>,addEventListener(){},removeEventListener(){},focus(){}};
  const gl={domElement:canvas,localClippingEnabled:false,info:{render:{triangles:123,calls:2}},render(){counts.directDraw++;}};
  const state={scene,camera,gl,size:{width:800,height:500},invalidate(){}};
  let props={truck:collectionTrucks[0],reveal:true,compare:false,view:'iso',
    onReady:(value:unknown)=>events.ready.push(value),onLoading:(value:boolean)=>events.loading.push(value),onError:(value:string)=>events.errors.push(value),factory:undefined as undefined|{
      plan:NonNullable<ReturnType<typeof factoryLoadingPlan>>;playing:boolean;speed:number;seek:{time:number;revision:number};onProgress:(p:ReturnType<typeof factoryLoadingPose>)=>void;
    }};
  const pendingCabs:Array<{truck:CollectionTruck;resolve:(cab:{model:T.Group})=>void}>=[];
  let deferCab=false;
  const react={Component:class{},
    useRef(value:unknown){const index=cursor++;return slots[index]??=( {value,current:value} as Slot);},
    useState(initial:unknown){const index=cursor++;const slot=slots[index]??={value:typeof initial==='function'?(initial as ()=>unknown)():initial};return [slot.value,(next:unknown)=>{const value=typeof next==='function'?(next as (v:unknown)=>unknown)(slot.value):next;if(!Object.is(value,slot.value)){slot.value=value;if(!closed)dirty=true;}}];},
    useEffect(effect:()=>void|(()=>void),deps:unknown[]){const index=cursor++,slot=slots[index]??={};if(!slot.deps||deps.some((v,i)=>!Object.is(v,slot.deps![i]))){slot.deps=deps;slot.effect=effect;tasks.push(index);}},
  };
  class Controls{target=new T.Vector3();minDistance=0;maxDistance=0;constructor(){counts.controls++;}addEventListener(){}removeEventListener(){}dispose(){}update(){}saveState(){}reset(){}}
  class Environment extends T.Group{dispose(){}}
  class PMREM{fromScene(){return {texture:new T.Texture(),dispose(){}};}fromEquirectangular(){return this.fromScene();}dispose(){}}
  const modules:Record<string,unknown>={
    react,three:{...T,PMREMGenerator:PMREM},'@react-three/fiber':{Canvas:()=>null,useThree:()=>state,useFrame:(fn:typeof frame)=>{frame=fn;}},
    'three/addons/controls/OrbitControls.js':{OrbitControls:Controls},'three/addons/environments/RoomEnvironment.js':{RoomEnvironment:Environment},
    'three/addons/loaders/RGBELoader.js':{RGBELoader:class{async loadAsync(){counts.hdr++;return new T.Texture();}}},
    './catalog':{collectionTrucks},'./model':{cargoPlacements,
      buildCollectionTruck(truck:CollectionTruck){counts.build++;const model=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(truck.lengthM,truck.bodyHeightM,truck.widthM),new T.MeshStandardMaterial());model.add(mesh);model.userData={printedBarcodes:[],cabGeometry:{bounds:{min:[-2,0,-1],max:[0,3,1]}}};return model;},
      disposeCollectionTruck(model:T.Group){counts.dispose++;model.traverse(n=>{if(n instanceof T.Mesh){n.geometry.dispose();for(const m of Array.isArray(n.material)?n.material:[n.material])m.dispose();}});}},
    './licensed-cabs':{loadLicensedCab:(truck:CollectionTruck)=>{counts.cab++;return deferCab?new Promise(resolve=>pendingCabs.push({truck,resolve})):Promise.resolve({model:new T.Group()});}},
    './materials':{loadCollectionTextures:async()=>{counts.textures++;return {};},applyCollectionTextures(){}},
    './factory-loading':{factoryLoadingPose},'./factory-scene':{
      buildFactoryScene(){counts.factory++;return {root:new T.Group(),frameBounds:new T.Box3(new T.Vector3(-8,0,-4),new T.Vector3(8,7,4)),dispose(){counts.factoryDispose++;}};},animateFactoryScene(){}},
    './camera-navigation':{cameraKeyDirection,moveFactoryCamera},'./studio-effects':{StudioEffects:()=>null},'./export-glb':{exportCollectionGlb:async()=>new ArrayBuffer(0)},
    './load-annotations':{LoadAnnotations:()=>null},'./load-annotations.module.css':{},
  };
  const compiled=ts.transpileModule(source+'\nexports.testScene=Scene;', {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const module={exports:{} as {testScene:(p:typeof props)=>unknown}};
  const nativeRequire=createRequire(import.meta.url);
  runInNewContext(compiled,{exports:module.exports,module,require:(name:string)=>name in modules?modules[name]:nativeRequire(name),console,window:{addEventListener(){},removeEventListener(){}},document:{hidden:false,addEventListener(){},removeEventListener(){}}});
  function render(){cursor=0;dirty=false;tasks.length=0;module.exports.testScene(props);for(const index of tasks)slots[index].cleanup?.();for(const index of tasks){const cleanup=slots[index].effect!();slots[index].cleanup=typeof cleanup==='function'?cleanup:undefined;}}
  async function settle(){for(let i=0;i<8;i++){await new Promise<void>(done=>setImmediate(done));if(!dirty)return;render();}throw Error('Scene did not settle');}
  return {counts,events,state,get props(){return props;},set deferCab(value:boolean){deferCab=value;},pendingCabs,
    async update(changes:Partial<typeof props>={},size?:{width:number;height:number}){props={...props,...changes};if(size)state.size=size;render();await settle();},
    frame(delta:number){frame({},delta);},dispose(){closed=true;for(const slot of slots)slot.cleanup?.();},
  };
}

test('camera angles and resize reuse one assembly, loader and ready exporter',async t=>{
  const h=sceneHarness();await h.update();const firstReady=h.events.ready.at(-1),model=h.state.scene.children.find(c=>c instanceof T.Group);
  const cameraPositions=new Set<string>();
  for(const view of ['side','front','rear','top','cargo','cab','iso']){
    await h.update({view});cameraPositions.add(h.state.camera.position.toArray().join(','));
    assert(h.state.camera.position.toArray().every(Number.isFinite));assert.equal(h.state.gl.domElement.dataset.view,view);
  }
  for(const width of [390,1200,600])await h.update({}, {width,height:500});
  t.diagnostic(JSON.stringify({scenario:'initial mount, seven angle changes, three resizes',counts:h.counts}));
  assert(cameraPositions.size>4);assert.equal(h.counts.build,1);assert.equal(h.counts.cab,1);assert.equal(h.counts.textures,1);assert.equal(h.counts.dispose,0);
  assert.equal(h.events.ready.length,2);assert.equal(h.events.ready.at(-1),firstReady);assert.deepEqual(h.events.loading,[true,false]);assert(h.state.scene.children.includes(model!));
  assert.equal(h.counts.directDraw,0,'only the existing compositor should draw the scene');
  h.dispose();assert.equal(h.counts.dispose,1);
});

test('real geometry changes rebuild once and a late cab cannot overwrite the selected truck',async()=>{
  const h=sceneHarness();await h.update();await h.update({reveal:false});assert.equal(h.counts.build,2);assert.equal(h.counts.dispose,1);
  h.deferCab=true;await h.update({truck:collectionTrucks[1]});await h.update({truck:collectionTrucks[2]});
  h.pendingCabs[1].resolve({model:new T.Group()});await h.update({});assert.equal(h.counts.build,3);assert.equal(h.state.gl.domElement.dataset.modelId,collectionTrucks[2].id);
  h.pendingCabs[0].resolve({model:new T.Group()});await h.update({});assert.equal(h.counts.build,3);assert.equal(h.state.gl.domElement.dataset.modelId,collectionTrucks[2].id);
  h.dispose();assert.equal(h.state.scene.children.length,0);
});

test('factory resize and camera views preserve elapsed time, scene and lighting; scenario still rebuilds',async()=>{
  const h=sceneHarness(),plan=factoryLoadingPlan(collectionTrucks[0])!;
  const factory={plan,playing:true,speed:1,seek:{time:3,revision:1},onProgress(){}};
  await h.update({factory});h.frame(.05);const elapsed=Number(h.state.gl.domElement.dataset.factoryTime);
  await h.update({view:'side'},{width:390,height:640});h.frame(0);
  assert.equal(Number(h.state.gl.domElement.dataset.factoryTime),elapsed);assert.equal(h.counts.build,1);assert.equal(h.counts.factory,1);assert.equal(h.counts.hdr,1);assert.equal(h.counts.controls,1);
  await h.update({factory:{...factory,plan:incompleteFactoryPlan(plan),playing:false,seek:{time:0,revision:2}}});h.frame(0);
  assert.equal(h.counts.build,2);assert.equal(h.counts.factoryDispose,1);assert.equal(h.counts.hdr,1);assert.equal(h.counts.controls,1);assert.equal(Number(h.state.gl.domElement.dataset.factoryTime),0);
  assert.equal(h.state.gl.domElement.dataset.factoryScenario,'incomplete');h.dispose();assert.equal(h.counts.factoryDispose,2);
});

test('compositor records the scene pass without another scene render or confusing output triangles',()=>{
  let draw=0,frame=()=>{};const cleanups:Array<()=>void>=[],gl={info:{render:{triangles:0,calls:0}},domElement:{dataset:{} as Record<string,string>},getPixelRatio:()=>1};
  class Pass{dispose(){}render(){gl.info.render={triangles:1,calls:1};}}
  class Render extends Pass{render(){draw++;gl.info.render={triangles:12345,calls:18};}}
  class AO extends Pass{updateGtaoMaterial(){}updatePdMaterial(){}setSize(){}}
  class Composer{passes:Pass[]=[];addPass(pass:Pass){this.passes.push(pass);}setPixelRatio(){}setSize(){}dispose(){}render(){for(const pass of this.passes)pass.render();}}
  const modules:Record<string,unknown>={react:{useRef:(current:unknown)=>({current}),useEffect:(effect:()=>()=>void)=>cleanups.push(effect())},
    '@react-three/fiber':{useThree:()=>({gl,scene:{},camera:{},size:{width:800,height:500},invalidate(){}}),useFrame:(callback:()=>void,priority:number)=>{assert.equal(priority,1);frame=callback;}},
    three:{HalfFloatType:1,WebGLRenderTarget:class{}},'three/addons/postprocessing/EffectComposer.js':{EffectComposer:Composer},
    'three/addons/postprocessing/RenderPass.js':{RenderPass:Render},'three/addons/postprocessing/GTAOPass.js':{GTAOPass:AO},'three/addons/postprocessing/OutputPass.js':{OutputPass:Pass}};
  const module={exports:{} as {StudioEffects:()=>void}};
  const source=readFileSync(new URL('./studio-effects.tsx',import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  runInNewContext(compiled,{module,exports:module.exports,require:(name:string)=>{assert(name in modules,name);return modules[name];}});
  module.exports.StudioEffects();frame();assert.equal(draw,1);assert.equal(gl.info.render.triangles,1);
  assert.equal(gl.domElement.dataset.triangles,'12345');assert.equal(gl.domElement.dataset.drawCalls,'18');
  frame();assert.equal(draw,2);for(const cleanup of cleanups)cleanup();
});
