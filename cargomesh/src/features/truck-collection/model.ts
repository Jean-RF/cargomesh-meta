import * as T from 'three';
import { buildVehicleCab } from './cab-models';
import {buildSeatedDriver} from './driver-model';
import {cargoPlacements,truckLayout} from './layout';
export {cargoPlacements,truckLayout} from './layout';
export type {CargoPlacement} from './layout';
import type {LicensedCab} from './licensed-cabs';
import { buildCoachwork } from './coachwork';
import { tankDimensions } from './vehicle-designs';
import { buildDetailedLoad,buildTransportLoad } from './cargo-models';
import { truckMarkings } from './markings';
import {addBarcodeLabel,addUnitBarcode} from './barcode-label';
import {cargoBarcode,cargoBarcodeInventory,cargoCartonCount} from './cargo-codes';
import type { VehiclePart } from './cab-models';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { type CargoKind, type CollectionTruck } from './catalog';

type Vec = readonly [number,number,number];
type Part = VehiclePart;
export function liquidFillLevel(fraction:number){
  let low=-1,high=1;
  for(let i=0;i<40;i++){
    const h=(low+high)/2,area=(Math.acos(-h)+h*Math.sqrt(1-h*h))/Math.PI;
    if(area<fraction)low=h;else high=h;
  }
  return (low+high)/2;
}

export function buildCollectionTruck(t: CollectionTruck, reveal=false, hideCargo=false, cab?:LicensedCab, separateCargo=false) {
  const l=truckLayout(t),W=t.widthM,L=t.bodyLengthM,H=t.bodyHeightM,F=l.floor,C=l.center,R=l.rear,front=l.front;
  const materials: Record<Part,T.Material>={
    paint:new T.MeshPhysicalMaterial({color:t.color,metalness:.25,roughness:.26,clearcoat:1,clearcoatRoughness:.12}),
    body:new T.MeshStandardMaterial({color:t.form==='curtain'?t.color:t.bodyColor,metalness:t.form==='tank'?.88:.32,roughness:t.form==='tank'?.22:.48}),
    metal:new T.MeshStandardMaterial({color:'#b5c1c4',metalness:.9,roughness:.29}),
    frame:new T.MeshStandardMaterial({color:'#141c22',metalness:.45,roughness:.48}),
    rubber:new T.MeshStandardMaterial({color:'#0e1113',roughness:.84}),
    glass:new T.MeshPhysicalMaterial({color:'#a9c1c6',metalness:0,roughness:.055,clearcoat:1,clearcoatRoughness:.04,transparent:true,opacity:.20,depthWrite:false,side:T.DoubleSide,forceSinglePass:true}),
    cargoGlass:new T.MeshPhysicalMaterial({color:t.cargo.kind==='bottles'?'#ffffff':'#b3d0c8',metalness:0,roughness:.10,clearcoat:1,transparent:true,opacity:t.cargo.kind==='bottles'?.88:.30,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,vertexColors:true}),
    seat:new T.MeshStandardMaterial({color:'#384249',roughness:.93}),
    wood:new T.MeshStandardMaterial({color:'#ad8859',roughness:.88}),
    load:new T.MeshPhysicalMaterial({color:t.cargo.color,metalness:['steel','coils','rebar','pipes','scrap'].includes(t.cargo.kind)?.65:['cars','excavator','tractor','machinery'].includes(t.cargo.kind)?.3:.05,roughness:t.cargo.kind==='cars'?.25:.7,clearcoat:t.cargo.kind==='cars'?.85:0}),
    strap:new T.MeshStandardMaterial({color:'#b7782a',roughness:.84}),
    lamp:new T.MeshPhysicalMaterial({color:'#dbe6e9',metalness:.1,roughness:.09,clearcoat:1}),
    red:new T.MeshStandardMaterial({color:'#b52931',emissive:'#b52931',emissiveIntensity:.12,roughness:.3}),
    amber:new T.MeshStandardMaterial({color:'#efa73f',emissive:'#efa73f',emissiveIntensity:.1,roughness:.3}),
    skin:new T.MeshPhysicalMaterial({color:t.driver.skin,roughness:.69,clearcoat:.04,clearcoatRoughness:.65}),
    uniform:new T.MeshStandardMaterial({color:t.driver.uniform,roughness:.85}),
    hair:new T.MeshPhysicalMaterial({color:'#ffffff',roughness:.83,sheen:.30,sheenRoughness:.85,sheenColor:t.driver.hair,vertexColors:true}),
    white:new T.MeshStandardMaterial({color:'#e7e9e0',roughness:.72}),
    print:new T.MeshStandardMaterial({map:truckMarkings(t),roughness:.82,side:T.DoubleSide,transparent:true,alphaTest:.30}),
    grille:new T.MeshStandardMaterial({color:'#92999c',metalness:.78,roughness:.39,alphaTest:.45,side:T.DoubleSide}),
    wrap:new T.MeshPhysicalMaterial({color:'#f9f8ef',transparent:true,opacity:.12,roughness:.21,clearcoat:.8,depthWrite:false,side:T.DoubleSide,forceSinglePass:true}),
  };
  for(const part of ['skin','uniform','load'] as const)(materials[part] as T.MeshStandardMaterial).vertexColors=true;
  if(t.cargo.kind==='plants'||t.cargo.kind==='flowers'){(materials.load as T.MeshStandardMaterial).color.set('#ffffff');materials.load.side=T.DoubleSide;}
  if(t.cargo.kind==='cable'){(materials.rubber as T.MeshStandardMaterial).color.set('#303438');(materials.rubber as T.MeshStandardMaterial).roughness=.64;}
  if(t.cargo.kind==='drums'){(materials.load as T.MeshStandardMaterial).metalness=.48;(materials.load as T.MeshStandardMaterial).roughness=.34;}
  if(t.cargo.kind==='meat'||t.id==='cm-gravel-halfpipe')(materials.metal as T.MeshStandardMaterial).roughness=.55;
  if(t.id==='cm-market-awning')materials.strap.side=T.DoubleSide;
  const pieces=new Map<Part,T.BufferGeometry[]>();
  const printedBarcodes:string[]=[];
  const cargoPieces=new Map<string,Map<Part,T.BufferGeometry[]>>();let activeCargo='';
  let parts=0;
  const add=(geometry:T.BufferGeometry,m:Part,p:Vec=[0,0,0],rot:Vec=[0,0,0])=>{
    if(typeof geometry.userData.cargoBarcode==='string')printedBarcodes.push(geometry.userData.cargoBarcode);
    const g=geometry.index?geometry.toNonIndexed():geometry.clone();geometry.dispose();
    if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
    if(m==='skin'||m==='uniform'||m==='load'||m==='cargoGlass'||m==='hair'){
      const color=g.attributes.color,values=new Uint8Array(g.attributes.position.count*3).fill(255);
      if(color)for(let i=0;i<color.count;i++){values[i*3]=Math.round(color.getX(i)*255);values[i*3+1]=Math.round(color.getY(i)*255);values[i*3+2]=Math.round(color.getZ(i)*255);}
      g.setAttribute('color',new T.Uint8BufferAttribute(values,3,true));
    }else g.deleteAttribute('color');
    if(m==='wood'||m==='seat'||m==='metal'){
      const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
      for(let i=0;i<p.count;i++){
        const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));
        uv.setXY(i,nx>ny&&nx>nz?p.getZ(i):p.getX(i),ny>nx&&ny>nz?p.getZ(i):p.getY(i));
      }
    }
    g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...p),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(1,1,1)));
    if(m==='load'&&t.cargo.kind==='gravel'){
      const position=g.attributes.position,uv=g.attributes.uv;
      for(let i=0;i<position.count;i++)uv.setXY(i,position.getX(i),position.getZ(i));
    }
    const pool=separateCargo&&activeCargo?(cargoPieces.get(activeCargo)??new Map<Part,T.BufferGeometry[]>()):pieces;
    if(separateCargo&&activeCargo)cargoPieces.set(activeCargo,pool);
    const bucket=pool.get(m)??[];bucket.push(g);pool.set(m,bucket);parts++;
  };
  const box=(s:Vec,p:Vec,m:Part,r=0,rot:Vec=[0,0,0])=>add(r?new RoundedBoxGeometry(...s,1,Math.min(r,...s.map(v=>v/3))):new T.BoxGeometry(...s),m,p,rot);
  const cylinder=(r:number,h:number,p:Vec,m:Part,rot:Vec=[0,0,0],segments=20)=>add(new T.CylinderGeometry(r,r,h,segments),m,p,rot);
  const sphere=(s:Vec,p:Vec,m:Part)=>{const g=new T.SphereGeometry(1,12,8);g.scale(...s);add(g,m,p);};
  const bar=(a:Vec,b:Vec,r:number,m:Part)=>{
    const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);
    const g=new T.CylinderGeometry(r,r,delta.length(),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));add(g,m,start.add(end).multiplyScalar(.5).toArray() as [number,number,number]);
  };
  const ring=(r:number,tube:number,p:Vec,m:Part,rot:Vec=[0,0,0])=>add(new T.TorusGeometry(r,tube,6,32),m,p,rot);
  let unitIndex=0;
  const labelPlate=(p:Vec,s:Vec,carton=0)=>addBarcodeLabel(add,cargoBarcode(t.id,unitIndex,carton),Math.min(.24,s[0]),Math.min(.10,s[1]),[p[0],p[1],p[2]+s[2]/2+.0005]);

  const decks=t.form==='lowbed'?
    [{x:l.start+l.neck/2,length:l.neck,y:F+l.bridgeLift},{x:l.cargoCenter,length:l.innerLength,y:F},{x:R-l.rearDeck/2,length:l.rearDeck,y:F+l.bridgeLift}]:
    t.id==='cm-steel-extendable'?[{x:(l.start+C-1.05)/2,length:L/2-1.05,y:F},{x:(C+1.05+R)/2,length:L/2-1.05,y:F}]:[{x:C,length:L,y:F}];
  const deckAt=(x:number)=>t.form==='lowbed'?(x<l.cargoStart||x>l.cargoEnd?F+l.bridgeLift:F):F;
  // Structural rails follow the low-bed step instead of cutting through its floor.
  for(const side of [-1,1]){
    if(t.form==='lowbed'){
      box([l.start-front-.225,.18,.11],[(front+.225+l.start)/2,l.radius*1.48,side*W*.19],'frame');
      for(const deck of decks)box([deck.length,.18,.11],[deck.x,deck.y-.21,side*W*.19],'frame');
    }else box([t.lengthM-.55,.18,.11],[-.05,l.radius*1.48,side*W*.19],'frame');
    box([L*.62,.08,.09],[C,t.form==='lowbed'?F-.20:l.radius*1.45,side*(W/2-.04)],'metal');
    for(let n=0;n<3;n++)box([.08,t.form==='lowbed'?.28:.44,.08],[C-L*.22+n*L*.22,t.form==='lowbed'?F-.36:l.radius*1.55,side*(W/2-.1)],'frame');
    const tankX=t.size==='large'?l.cabEnd-.65:l.cabEnd+.48,tankZ=side*(W/2-.32),tankR=t.size==='small'?.16:.24;
    cylinder(tankR,t.size==='small'?.65:1.0,[tankX,l.radius*1.42,tankZ],'metal',[0,0,Math.PI/2],32);
    for(const offset of [-.23,.23])ring(tankR+.008,.014,[tankX+offset,l.radius*1.42,tankZ],'frame',[0,Math.PI/2,0]);
    cylinder(.045,.025,[tankX-.16,l.radius*1.42+tankR,tankZ],'frame');
  }
  for(let x=front+.5;x<R-.2;x+=.85)box([.1,.13,W*.6],[x,t.form==='lowbed'&&x>l.cargoStart&&x<l.cargoEnd?F-.20:l.radius*1.5,0],'frame');
  box([.16,.17,W*.91],[R-.06,l.radius*.92,0],'metal');
  box([.12,.22,W*.84],[R+.035,deckAt(R)-.22,0],'frame');
  for(const side of [-1,1]){
    box([.04,.13,.27],[R+.104,deckAt(R)-.21,side*(W*.32)],'red',.025);
    box([.045,.13,.1],[R+.108,deckAt(R)-.21,side*(W*.32+.19)],'amber',.018);
  }
  const rearAxles=t.axles-1;
  const axles=[front+t.design.frontAxle,...Array.from({length:rearAxles},(_,i)=>R-1.0-(rearAxles-1-i)*(t.size==='small'?1.0:1.19))];
  if(t.size==='large'){
    const drive=t.driveAxles,trail=t.axles-1-drive;
    axles.splice(1,axles.length-1,...Array.from({length:drive},(_,i)=>Math.max(l.cabEnd+.30,front+4.55)+i*1.18),...Array.from({length:trail},(_,i)=>R-1.0-(trail-1-i)*1.19));
  }
  axles.forEach((x,axle)=>{
    cylinder(.065,W*.79,[x,l.radius,0],'frame',[Math.PI/2,0,0],12);
    sphere([.19,.15,.19],[x,l.radius,0],'frame');
    if(cab&&axle===0)return;
    for(const side of [-1,1]){
      const z=side*(W/2-.16),tyreW=t.size==='small'?.20:t.size==='medium'?.23:.26;
      if(!cab){
      const profile=[[.55,-.43],[.70,-.54],[.87,-.51],[.96,-.40],[1,-.29],[1,.29],[.96,.40],[.87,.51],[.70,.54],[.55,.43],[.55,-.43]].map(([r,d])=>new T.Vector2(r*l.radius,d*tyreW));
      const tyre=(tz:number)=>{
        add(new T.LatheGeometry(profile,40),'rubber',[x,l.radius,tz],[Math.PI/2,0,0]);
        for(let tread=0;tread<42;tread++){
          const a=tread*Math.PI*2/42;
          for(const lane of [-1,1])box([.029,.004,tyreW*.23],[x+Math.sin(a)*(l.radius+.002),l.radius+Math.cos(a)*(l.radius+.002),tz+lane*tyreW*.25],'rubber',0,[0,lane*.12,-a]);
        }
      };
      tyre(z);if(axle>0)tyre(z-side*tyreW*1.12);
      const rim=new T.Shape();rim.absarc(0,0,l.radius*.54,0,Math.PI*2,false);
      for(let vent=0;vent<8;vent++){const a=vent*Math.PI/4,hole=new T.Path();hole.absarc(Math.sin(a)*l.radius*.41,Math.cos(a)*l.radius*.41,l.radius*.065,0,Math.PI*2,true);rim.holes.push(hole);}
      add(new T.ExtrudeGeometry(rim,{depth:.022,bevelEnabled:false,curveSegments:6}),'metal',[x,l.radius,z+side*(tyreW/2-.027)],side===1?[0,0,0]:[0,Math.PI,0]);
      const rimProfile=[[.54,-.48],[.59,-.43],[.60,-.34],[.59,.36],[.58,.47],[.54,.49],[.52,.40]].map(([r,d])=>new T.Vector2(r*l.radius,d*tyreW));
      add(new T.LatheGeometry(rimProfile,48),'metal',[x,l.radius,z],[Math.PI/2,0,0]);
      cylinder(l.radius*.23,tyreW+.07,[x,l.radius,z],'frame',[Math.PI/2,0,0],20);
      for(let bolt=0;bolt<10;bolt++){
        const a=bolt*Math.PI/5;
        cylinder(.018,.035,[x+Math.sin(a)*l.radius*.33,l.radius+Math.cos(a)*l.radius*.33,z+side*(tyreW/2+.016)],'metal',[Math.PI/2,0,0],6);
      }
      }
      add(new T.CylinderGeometry(l.radius+.08,l.radius+.08,tyreW+.12,32,1,true,Math.PI/2,Math.PI),'frame',[x,l.radius,z],[Math.PI/2,0,0]);
      add(new T.TorusGeometry(l.radius+.06,.022,6,28,Math.PI),'frame',[x,l.radius,z+side*(tyreW/2+.035)]);
      box([.055,l.radius*.56,tyreW+.1],[x+l.radius+.09,l.radius*.65,z],'rubber');
      for(let spring=0;spring<3;spring++)box([.68-spring*.1,.025,.12],[x,l.radius+.17+spring*.025,side*W*.19],'frame');
      bar([x-.25,l.radius+.13,side*W*.19],[x+.1,l.radius+.49,side*W*.19],.035,'metal');
    }
    if(axle===0)cylinder(.055,.7,[x+.25,l.radius+.14,0],'metal',[0,0,Math.PI/2],12);
  });

  const cabGeometry=cab?{head:cab.head,anatomy:buildSeatedDriver(t,cab.head,add),bounds:{min:[front,0,-W*.7] as Vec,max:[l.cabEnd,t.design.roof,W*.7] as Vec},architecture:t.design.architecture}:buildVehicleCab(t,front,l.radius,add);

  // Load bed in actual metres, with longitudinal planks and tie-down rings.
  if(t.id==='cm-coil-well'){
    for(const side of [-1,1])box([L,.12,.30],[C,F,side*W*.42],'metal');
  }
  if(t.form!=='silo'&&t.form!=='hopper'&&t.id!=='cm-gravel-halfpipe'){
    for(const deck of decks){
      box([deck.length,.12,W-.04],[deck.x,deck.y-.06,0],'frame');
      const wooden=['flatbed','dropside','rack'].includes(t.form)&&!['bottles','glass','panels','coils'].includes(t.cargo.kind);
      for(let plank=0;plank<10;plank++)box([deck.length-.04,.035,(W-.16)/10-.009],[deck.x,deck.y+.018,-(W-.16)/2+(plank+.5)*(W-.16)/10],wooden?'wood':'metal');
    }
  }
  for(const side of [-1,1]){
    for(const deck of decks)box([deck.length,.11,.08],[deck.x,deck.y-.025,side*(W/2-.025)],'body');
    if(t.id!=='cm-gravel-halfpipe')for(let anchor=0;anchor<5;anchor++){const x=l.start+.3+anchor*(L-.6)/4;ring(.035,.009,[x,deckAt(x)+.08,side*(W/2-.035)],'metal',[0,Math.PI/2,0]);}
    for(let marker=0;marker<5;marker++){const x=l.start+.35+marker*(L-.7)/4;box([.12,.055,.02],[x,deckAt(x)-.04,side*(W/2+.018)],'amber',.015);}
  }
  if(buildCoachwork(t,l,reveal,add)){
    // Enclosed, tipping and tank bodies supply their own fabricated section.
  }else if(['dropside','rack','flatbed','service','transporter'].includes(t.form)){
    const sideHeight=t.form==='dropside'?.43:t.id==='cm-cable-service'?.28:t.form==='service'?.7:t.form==='rack'?1.3:.09;
    for(const side of [-1,1]){
      if(t.form==='dropside'||t.form==='service')box([L,sideHeight,.06],[C,F+sideHeight/2,side*(W/2-.05)],'body',.02);
      for(let post=0;post<5;post++)box([.07,sideHeight,.07],[l.start+.15+post*(L-.3)/4,F+sideHeight/2,side*(W/2-.06)],'metal');
      if(t.form==='rack')for(let rail=0;rail<3;rail++)box([L,.045,.045],[C,F+.3+rail*.46,side*(W/2-.06)],'metal');
    }
    box([.08,Math.min(sideHeight,1.1),W-.1],[l.start+.05,F+Math.min(sideHeight,1.1)/2,0],'body');
    if(t.form==='service'&&t.id!=='cm-cable-service')for(const side of [-1,1])for(let drawer=0;drawer<4;drawer++){
      box([L/4-.08,.28,.035],[l.start+(drawer+.5)*L/4,F+.43,side*(W/2+.004)],'paint',.02);
      box([.22,.025,.025],[l.start+(drawer+.5)*L/4,F+.48,side*(W/2+.03)],'metal');
    }
  }else if(t.form==='mixer'){
    const profile=[[.32,-L*.38],[.62,-L*.29],[1,-L*.15],[1,L*.13],[.7,L*.3],[.3,L*.39]].map(([r,y])=>new T.Vector2(r,y));
    add(new T.LatheGeometry(profile,40),'body',[C,F+1.13,0],[0,0,Math.PI/2-.17]);
    for(const x of [-.7,.7]){box([.2,.75,1.5],[C+x,F+.33,0],'frame');ring(1.01,.04,[C+x,F+1.13-x*.17,0],'paint',[0,Math.PI/2,-.17]);}
    box([1.3,.12,.55],[R-.03,F+.42,0],'metal',.03,[0,0,-.25]);
    box([.65,.5,.9],[R-.35,F+1.35,0],'body',.06);
  }else if(t.form==='container'){
    if(t.cargo.kind!=='containers')for(const side of [-1,1]){
      box([L,1.28,.07],[C,F+.64,side*(W/2-.06)],'body');
      for(let rib=0;rib<10;rib++)box([.07,1.28,.07],[l.start+.2+rib*(L-.4)/9,F+.64,side*(W/2+.005)],'frame');
    }
    for(const side of [-1,1])box([L,.12,.1],[C,F+.15,side*W*.34],'metal');
  }

  if(t.size==='large'){
    const kingpin=(axles[1]+axles[t.driveAxles])/2-.12,couplingFloor=deckAt(l.start);
    for(const side of [-1,1])box([kingpin-l.start+.32,.16,.16],[(l.start+kingpin)/2,couplingFloor-.12,side*W*.27],'frame',.025);
    box([.75,.18,W*.46],[kingpin,couplingFloor-.29,0],'frame',.025);
    cylinder(.30,.09,[kingpin,couplingFloor-.20,0],'frame',[0,0,0],32);
    cylinder(.065,.26,[kingpin,couplingFloor-.16,0],'metal');
  }

  // Model-specific equipment gives every design its own physical silhouette and use.
  const id=t.id;
  if(id.includes('lift')){box([.12,1.0,W-.18],[R+.12,F+.38,0],'metal');for(const s of [-1,1])bar([R,F-.3,s*W*.32],[R+.14,F+.8,s*W*.32],.045,'frame');}
  if(id.includes('gas'))for(const side of [-1,1])for(let separator=0;separator<5;separator++)box([.04,1.35,.045],[l.start+.1+separator*(L-.2)/4,F+.68,side*(W/2-.02)],'body');
  if(id.includes('overcab')){const top=Math.max(t.design.roof+.24,F+1.88);for(const x of [front+t.design.nose+.4,l.start+.3,R-.3]){for(const s of [-1,1])bar([x,F,s*W*.39],[x,top,s*W*.39],.035,'metal');box([.08,.07,W*.85],[x,top,0],'metal');}for(const s of [-1,1])box([t.lengthM-1.3,.07,.07],[(front+R)/2+.3,top,s*W*.39],'metal');}
  if(id.includes('crane')||id.includes('knuckle')){
    const a:Vec=[l.start+.50,F+.48,0],k:Vec=[l.start+.24,F+1.92,0],tip:Vec=[l.start+.86,F+1.25,0],end:Vec=[l.start+.56,F+.90,0];
    const arm=(a:Vec,b:Vec,width:number,depth:number)=>{
      const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),nx=-dy/length*width/2,ny=dx/length*width/2;
      const s=new T.Shape();s.moveTo(a[0]+nx,a[1]+ny);s.lineTo(b[0]+nx*.65,b[1]+ny*.65);s.lineTo(b[0]-nx*.65,b[1]-ny*.65);s.lineTo(a[0]-nx,a[1]-ny);s.closePath();
      add(new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.025,bevelThickness:.018,bevelSegments:2}),'paint',[0,0,-depth/2]);
    };
    box([.67,.15,W*.70],[a[0],F+.06,0],'frame',.03);cylinder(.29,.25,[a[0],F+.23,0],'frame');
    for(let bolt=0;bolt<10;bolt++){const angle=bolt*Math.PI/5;cylinder(.018,.035,[a[0]+Math.sin(angle)*.24,F+.37,Math.cos(angle)*.24],'metal',[0,0,0],6);}
    arm(a,k,.30,.28);arm(k,tip,.25,.24);arm(tip,end,.18,.17);
    for(const side of [-1,1]){
      box([.20,.26,.018],[a[0]-.03,F+.65,side*.18],'frame',.02);
      for(const p of [k,tip])for(let bolt=0;bolt<6;bolt++){const angle=bolt*Math.PI/3;cylinder(.012,.02,[p[0]+Math.cos(angle)*.07,p[1]+Math.sin(angle)*.07,side*.21],'metal',[Math.PI/2,0,0],6);}
      add(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(a[0]+.14,F+.42,side*.23),new T.Vector3(k[0]-.11,k[1]-.11,side*.24),new T.Vector3(k[0]+.02,k[1]+.13,side*.24),new T.Vector3(tip[0]+.10,tip[1]+.08,side*.18)]),18,.009,5),'rubber');
      box([.15,.23,.14],[a[0]+.30,F+.27,side*.28],'frame',.015);
    }
    for(const p of [a,k,tip]){
      cylinder(.095,.37,p,'frame',[Math.PI/2,0,0],24);
      for(const s of [-1,1])cylinder(.053,.02,[p[0],p[1],s*.20],'metal',[Math.PI/2,0,0],12);
    }
    const piston=(p:Vec,q:Vec)=>{const middle=new T.Vector3(...p).lerp(new T.Vector3(...q),.58).toArray() as [number,number,number];bar(p,middle,.055,'frame');bar(middle,q,.031,'metal');};
    piston([a[0]+.18,F+.48,.19],[k[0]+.20,k[1]-.15,.19]);piston([k[0]-.10,k[1]-.43,-.18],[tip[0]-.28,tip[1]+.04,-.18]);
    add(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(a[0]-.12,F+.35,.20),new T.Vector3(k[0]-.18,k[1]-.05,.20),new T.Vector3(k[0]+.08,k[1]+.20,.20),new T.Vector3(tip[0],tip[1]+.12,.20)]),32,.014,6),'rubber');
    cylinder(.045,.19,[end[0],end[1]-.08,0],'metal');add(new T.TorusGeometry(.105,.026,7,24,Math.PI*1.65),'metal',[end[0]+.025,end[1]-.25,0],[0,0,-Math.PI*.10]);
    for(const s of [-1,1]){
      box([.30,.19,W*.45],[a[0],F-.16,s*W*.23],'frame',.02);cylinder(.065,.43,[a[0],F-.35,s*W*.43],'metal');box([.31,.07,.26],[a[0],F-.58,s*W*.43],'frame',.025);
      box([.30,.20,.16],[a[0]-.18,F+.15,s*.36],'paint',.025);for(let lever=0;lever<4;lever++)bar([a[0]-.28+lever*.06,F+.24,s*.37],[a[0]-.30+lever*.06,F+.37,s*.39],.009,'metal');
    }
  }
  if(id.includes('forest')||id.includes('bolster'))for(let post=0;post<4;post++){const x=l.start+.4+post*(L-.8)/3;box([.14,.12,W],[x,F+.08,0],'paint');for(const s of [-1,1])box([.1,1.65,.1],[x,F+.89,s*(W/2-.08)],'paint');}
  if(id.includes('auto-doubledeck')){
    box([L-.5,.12,W-.18],[C,F+1.75,0],'metal');
    for(const side of [-1,1]){
      const z=side*(W/2-.08);
      box([L-.5,.20,.09],[C,F+1.65,z],'body');
      for(const x of [l.start+.3,C,R-.3]){
        box([.12,1.87,.10],[x,F+.935,z],'body');
        box([.28,.25,.025],[x,F+1.58,z+side*.065],'metal');
        for(const dy of [-.075,.075])cylinder(.018,.028,[x,F+1.58+dy,z+side*.09],'frame',[Math.PI/2,0,0],6);
      }
      for(const x of [l.start+.3,C])bar([x,F+.15,z],[x+L/2-.3,F+1.58,z],.035,'frame');
      bar([C-.35,F+.12,z],[C+.15,F+1.30,z],.065,'frame');
      bar([C+.15,F+1.30,z],[C+.30,F+1.70,z],.035,'metal');
      for(const level of [0,1.75]){
        box([1.4,.09,.52],[R-.90,F+level+.12,side*W*.29],'metal',.012);
        cylinder(.07,.57,[R-.23,F+level+.10,side*W*.29],'frame',[Math.PI/2,0,0]);
        for(let tread=0;tread<9;tread++)box([.035,.025,.48],[R-1.53+tread*.15,F+level+.18,side*W*.29],'frame');
      }
    }
    for(const load of cargoPlacements(t))for(const end of [-1,1])for(const side of [-1,1]){
      const x=load.position[0]+end*t.cargo.unitM[0]*.30,z=side*t.cargo.unitM[1]*.40,y=load.position[1]-t.cargo.unitM[2]/2;
      box([.25,.075,.20],[x+end*.28,y+.05,z],'rubber',.018);
      bar([x-.20,y+.04,z],[x,y+.28,z],.014,'strap');bar([x,y+.28,z],[x+.20,y+.04,z],.014,'strap');
    }
  }
  if(id.includes('recovery'))for(const s of [-1,1]){
    box([1.05,.13,.52],[R+.3,F+.25,s*W*.3],'body',.02,[0,0,.35]);
    for(let tread=0;tread<7;tread++)box([.05,.025,.5],[R-.14+tread*.13,F+.12+tread*.045,s*W*.3],'frame');
  }
  if(id.includes('swap-body'))for(const x of [l.start+.7,R-.7])for(const s of [-1,1])box([.12,.6,.12],[x,F-.36,s*W*.42],'metal');
  if(id.includes('skip'))for(const s of [-1,1]){
    bar([l.start+.7,F-.15,s*W*.43],[C,F+1.9,s*W*.43],.09,'paint');bar([C,F+1.9,s*W*.43],[R-.3,F+1.1,s*W*.43],.025,'frame');
  }
  if(id.includes('rolloff')){bar([l.start+.2,F-.15,0],[l.start+.4,F+1.6,0],.12,'paint');bar([l.start+.4,F+1.6,0],[l.start+.85,F+1.6,0],.09,'paint');}
  if(t.form==='dropside')for(const side of [-1,1])for(let gate=0;gate<3;gate++){
    const x=l.start+(gate+.5)*L/3;
    box([L/3-.06,.32,.035],[x,F+.22,side*(W/2+.004)],'body',.018);
    for(const end of [-1,1]){box([.07,.055,.07],[x+end*(L/6-.10),F+.07,side*(W/2+.02)],'metal');box([.05,.14,.04],[x+end*(L/6-.07),F+.38,side*(W/2+.04)],'frame');}
  }
  if(id.includes('gas'))for(const side of [-1,1])for(let n=0;n<18;n++){
    const x=l.start+.12+n*(L-.24)/17;bar([x,F+.10,side*W*.48],[x,F+1.5,side*W*.48],.012,'metal');
    if(n%3===0)bar([x,F+1.5,side*W*.48],[x,F+1.65,0],.02,'frame');
  }
  if(id==='cm-nursery-bed')for(let n=0;n<4;n++){
    const x=l.start+.2+n*(L-.4)/3;for(const side of [-1,1])bar([x,F,side*W*.45],[x,F+1.8,side*W*.36],.026,'metal');bar([x,F+1.8,-W*.36],[x,F+1.8,W*.36],.026,'metal');
    for(const side of [-1,1])box([.11,.16,.08],[x,F+.13,side*W*.45],'metal',.004);
  }
  if(id==='cm-nursery-bed')for(const side of [-1,1])bar([l.start+.2,F+1.8,side*W*.36],[R-.2,F+1.8,side*W*.36],.023,'metal');
  if(id==='cm-cable-service')for(const load of cargoPlacements(t)){
    const x=load.position[0],cy=F+Math.min(t.cargo.unitM[0],t.cargo.unitM[2])*.485;
    for(const side of [-1,1]){
      box([.16,cy-F,.055],[x,F+(cy-F)/2,side*.43],'metal',.006);
      box([.38,.055,.12],[x,F+.04,side*.43],'frame',.005);
      bar([x,F+.05,side*.43],[x+.20,cy-.08,side*.43],.018,'metal');
      box([.075,.075,.10],[x,cy,side*.43],'frame',.005);
    }
    bar([x,cy,-.48],[x,cy,.48],.028,'metal');
  }
  if(t.form==='container')for(const x of [l.start+.14,R-.14])for(const side of [-1,1]){
    box([.24,.15,.22],[x,F+.15,side*W*.43],'frame');cylinder(.035,.09,[x,F+.25,side*W*.43],'metal');bar([x,F+.12,side*W*.43],[x+.20,F+.12,side*W*.43],.02,'metal');
  }
  if(id.includes('walking-floor'))for(let plank=0;plank<16;plank++)box([L-.15,.025,.055],[C,F+.05,-W*.43+plank*W*.86/15],'metal');
  if(id.includes('aero')||id.includes('mega'))for(const s of [-1,1])box([L*.69,.63,.06],[C,F-.38,s*W*.47],'paint',.04);
  if(id==='cm-pharma-multitemp')box([.015,H-.07,W-.12],[C,F+H/2,0],'white');
  if(id==='cm-meat-rail')for(const s of [-1,1])bar([l.start+.2,F+H-.15,s*W*.22],[R-.2,F+H-.15,s*W*.22],.03,'metal');
  if(id==='cm-water-bowser')for(const s of [-1,1]){bar([R+.12,F+.07,0],[R+.12,F+.07,s*W*.53],.035,'metal');cylinder(.055,.1,[R+.12,F+.02,s*W*.53],'metal');}
  if(id==='cm-coil-well')for(const load of cargoPlacements(t)){
    const x=load.position[0];
    for(const side of [-1,1]){
      const z=side*t.cargo.unitM[1]*.43;
      bar([x-.82,F+.34,z],[x,F-.12,z],.065,'paint');bar([x,F-.12,z],[x+.82,F+.34,z],.065,'paint');
      for(const end of [-1,1])box([.36,.08,.22],[x+end*.48,F+.095,z],'wood',.015,[0,0,end*.50]);
      for(const end of [-1,1]){box([.17,.47,.12],[x+end*.82,F+.17,side*W*.43],'paint',.02);ring(.06,.016,[x+end*.82,F+.43,side*W*.43],'metal',[0,Math.PI/2,0]);}
    }
    for(const end of [-1,1])box([.15,.12,W*.89],[x+end*.82,F+.32,0],'frame');
  }
  if(id==='cm-pipe-wedge')for(const x of [C-L*.3,C+L*.3])for(const s of [-1,1])bar([x,F+.05,s*W*.43],[x,F+.65,s*W*.25],.055,'frame');
  if(id==='cm-sand-threeway')for(const s of [-1,1])for(const x of [l.start+.3,R-.3])cylinder(.055,.17,[x,F,s*W*.44],'metal',[Math.PI/2,0,0]);
  if(id==='cm-steel-extendable')for(const side of [-1,1]){
    box([L*.56,.27,.24],[C-L*.10,F-.17,side*W*.20],'frame',.02);box([L*.48,.20,.16],[C+L*.16,F-.14,side*W*.20],'metal',.015);
    for(const x of [C-1.16,C+1.16]){box([.18,.34,.35],[x,F-.15,side*W*.20],'paint',.025);cylinder(.035,.42,[x,F-.15,side*W*.20],'metal',[Math.PI/2,0,0],10);}
    for(let hole=0;hole<9;hole++)cylinder(.024,.012,[C-1.0+hole*.25,F-.14,side*(W*.20+.09)],'frame',[Math.PI/2,0,0],12);
    box([.37,.08,.13],[C+.63,F+.015,side*W*.20],'metal',.015);
  }
  if(t.form==='lowbed'){
    // Each transport task has its own permanent frame, independent of the loaded machine.
    for(const side of [-1,1]){
      const web=new T.Shape();web.moveTo(l.start,F+.48);web.lineTo(l.cargoStart,F+.48);web.lineTo(l.cargoStart+.28,F-.05);web.lineTo(l.start+.45,F-.05);web.closePath();
      add(new T.ExtrudeGeometry(web,{depth:.065,bevelEnabled:false}),'body',[0,0,side*W*.32]);
      box([l.rearDeck-.12,.12,.12],[R-l.rearDeck/2,F+.33,side*W*.36],'frame');
      box([l.innerLength,.28,.10],[l.cargoCenter,F-.15,side*(W/2-.06)],'body');
      for(const x of [l.cargoStart+.22,l.cargoCenter,l.cargoEnd-.22]){
        box([.18,.10,.14],[x,F-.02,side*(W/2-.04)],'metal',.012);
        ring(.055,.013,[x,F+.05,side*(W/2-.07)],'metal',[0,Math.PI/2,0]);
      }
      const stepX=l.cargoStart-.32;
      for(let step=0;step<2;step++)box([.26,.035,.15],[stepX,F+.13+step*.21,side*(W/2+.015)],'metal');
      bar([stepX-.12,F+.12,side*(W/2-.03)],[stepX-.12,F+.57,side*(W/2-.03)],.022,'frame');
    }
    if(id==='cm-excavator-lowbed'){
      for(const side of [-1,1]){
        box([l.innerLength-.12,.07,.51],[l.cargoCenter,F+.055,side*W*.29],'wood');
        for(let n=0;n<4;n++){const x=l.cargoStart+.4+n*(l.innerLength-.8)/3;box([.29,.10,.26],[x,F-.01,side*W*.46],'paint',.02);bar([x,F-.1,side*W*.34],[x,F-.1,side*W*.47],.035,'metal');}
        box([.18,1.48,.55],[R-.15,F+1.15,side*W*.29],'body',.025,[0,0,-.08]);
        for(let n=0;n<9;n++)box([.055,.04,.51],[R-.24+n*.012,F+.56+n*.145,side*W*.29],'metal');
        bar([R-.45,F+.38,side*W*.29],[R-.17,F+1.25,side*W*.29],.045,'frame');
      }
    }else if(id==='cm-tractor-stepdeck'){
      box([l.neck-.08,.06,W-.17],[l.start+l.neck/2,F+.56,0],'wood');
      for(const side of [-1,1]){
        for(const x of [l.cargoStart+.25,l.cargoEnd-.25])box([.35,.13,.43],[x,F+.09,side*W*.31],'wood',.025,[0,0,.15]);
        box([1.7,.11,.53],[R-.82,F+.56,side*W*.30],'metal',.025);
        for(let n=0;n<10;n++)box([.08,.045,.51],[R-1.58+n*.16,F+.635,side*W*.30],'frame');
        box([.07,.76,.07],[l.start+.13,F+.91,side*W*.45],'metal');
      }
      box([.08,.06,W*.90],[l.start+.13,F+1.25,0],'metal');
    }else if(id==='cm-transformer-modular'){
      for(let n=0;n<5;n++){
        const x=l.cargoStart+.35+n*(l.innerLength-.70)/4;box([.25,.15,W-.12],[x,F+.08,0],'paint',.02);
        for(const side of [-1,1]){box([.32,.24,.21],[x,F+.20,side*W*.44],'frame',.025);cylinder(.07,.27,[x,F+.42,side*W*.44],'metal');box([.21,.06,.24],[x,F+.58,side*W*.44],'paint',.02);}
      }
      box([1.10,.63,W*.73],[R-1.0,F+.82,0],'body',.06);for(let n=0;n<7;n++)box([.03,.03,W*.55],[R-.95,F+.66+n*.055,0],'frame');
    }else if(id==='cm-boat-cradle'){
      for(const x of [l.cargoStart+.8,l.cargoCenter,l.cargoEnd-.8]){
        box([.24,.15,W*.89],[x,F+.09,0],'frame');
        for(const side of [-1,1]){
          bar([x,F+.15,side*W*.39],[x,F+.65,side*W*.22],.065,'paint');
          box([.48,.16,.31],[x,F+.70,side*W*.22],'rubber',.04,[side*.36,0,0]);
          bar([x,F+.15,side*W*.39],[x+.27,F+.58,side*W*.22],.033,'metal');
        }
      }
      for(const side of [-1,1])box([l.innerLength-.25,.10,.16],[l.cargoCenter,F+.13,side*.15],'wood');
      box([.45,.38,.45],[l.start+.35,F+.74,0],'frame',.045);cylinder(.16,.38,[l.start+.35,F+.89,0],'metal',[Math.PI/2,0,0]);
    }
  }

  const pallet=(x:number,y:number,z:number,a=1.2,b=.8)=>{
    for(const end of [-1,0,1])for(const side of [-1,0,1])box([.145,.078,.1],[x+end*(a/2-.09),y+.06,z+side*(b/2-.08)],'wood');
    for(let plank=0;plank<5;plank++)box([a,.022,b/5-.015],[x,y+.133,z-b/2+(plank+.5)*b/5],'wood');
    for(const side of [-1,0,1])box([a,.022,.1],[x,y+.013,z+side*(b/2-.07)],'wood');
  };
  const straps=(x:number,y:number,z:number,a:number,b:number,c:number)=>{
    for(const offset of [-.27,.27]){
      const sx=x+offset*a;
      box([.035,.014,b+.025],[sx,y+c+.013,z],'strap');
      for(const s of [-1,1])box([.035,c,.016],[sx,y+c/2,z+s*(b/2+.013)],'strap');
      const rz=z+b/2+.024,ry=y+Math.min(c*.35,.30);
      box([.065,.115,.027],[sx,ry,rz],'metal',.008);box([.027,.059,.035],[sx,ry+.014,rz+.014],'frame',.005);
      bar([sx-.025,ry-.025,rz+.02],[sx+.025,ry+.047,rz+.052],.007,'metal');
    }
  };
  const isBulk=['gravel','sand','grain','silage','scrap'].includes(t.cargo.kind);
  const tankLoad=t.form==='tank'||t.form==='silo'||t.form==='mixer';
  if(!hideCargo&&(isBulk||tankLoad)){
    if(tankLoad){const tank=tankDimensions(t);addBarcodeLabel(add,cargoBarcode(t.id,0),.24,.10,[C,F+tank.ry+.105,tank.rx+.003]);}
    else if(t.form==='box')addBarcodeLabel(add,cargoBarcode(t.id,0),.24,.10,[l.start+.101,F+H-.25,0],[0,Math.PI/2,0]);
    else{const wall=t.size==='small'?.5:t.size==='medium'?1.2:1.9;addBarcodeLabel(add,cargoBarcode(t.id,0),.24,.10,[C,F+wall-.08,W/2-.06]);}
  }
  activeCargo=`${t.id}-load-1`;
  if(hideCargo){
    // Structural comparison keeps coachwork and fixed equipment, with goods omitted.
  }else if(isBulk){
    const [a,b,h]=t.cargo.unitM;
    const shaped=t.form==='tipper'||t.form==='hopper',wall=t.size==='small'?.50:t.size==='medium'?1.2:1.9;
    const half=t.id==='cm-gravel-halfpipe',fill=h*.70;
    const usableHalfWidth=(y:number)=>half?(W/2-.125)*Math.sqrt(Math.max(0,1-Math.pow((y-wall)/(wall-.065),2))):t.size==='small'?Math.min(b/2,W/2-.10):Math.min(b/2,W*.34+(W*.16-.06)*y/wall-.06);
    if(shaped){
      const section=new T.Shape();
      if(half){
        const alpha=Math.asin((wall-fill)/(wall-.065));
        for(let n=0;n<=40;n++){const angle=Math.PI+alpha+n*(Math.PI-2*alpha)/40,z=(W/2-.125)*Math.cos(angle),y=wall+(wall-.065)*Math.sin(angle);if(n)section.lineTo(z,y);else section.moveTo(z,y);}
      }else{
        section.moveTo(-usableHalfWidth(.065),.065);section.lineTo(-usableHalfWidth(fill),fill);section.lineTo(usableHalfWidth(fill),fill);section.lineTo(usableHalfWidth(.065),.065);
      }
      section.closePath();add(new T.ExtrudeGeometry(section,{depth:a,bevelEnabled:false}),'load',[C-a/2,F,0],[0,Math.PI/2,0]);
    }else box([a,h*.58,b],[C,F+h*.29,0],'load',.07);
    const pile:number[]=[],pileUv:number[]=[],pileColors:number[]=[],pileIndices:number[]=[],cols=48,rows=18;
    const heapHeight=(u:number,v:number)=>fill+h*Math.sin(u*Math.PI)*Math.sin(v*Math.PI)*(.15+.025*Math.sin(u*17+v*21)*Math.sin(u*31-v*11));
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
      const u=i/cols,v=j/rows;
      const noise=Math.sin(i*2.3+j*6.1)*Math.sin(i*7.3-j*2.7);
      const py=heapHeight(u,v),spread=shaped?Math.min(b/2,usableHalfWidth(py)-.035):b*.49;
      pile.push(C+(u-.5)*a,F+py,(v-.5)*spread*2);pileUv.push(u*a,v*b);
      const shade=.87+.10*(noise+1)/2;pileColors.push(shade,shade,shade);
    }
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const k=j*(cols+1)+i;pileIndices.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2);}
    const heap=new T.BufferGeometry();heap.setAttribute('position',new T.Float32BufferAttribute(pile,3));heap.setAttribute('uv',new T.Float32BufferAttribute(pileUv,2));heap.setAttribute('color',new T.Float32BufferAttribute(pileColors,3));heap.setIndex(pileIndices);heap.computeVertexNormals();add(heap,'load');
    for(let stone=0;stone<180;stone++){
      const u=((stone*73)%179)/179,v=((stone*47)%173)/173;
      const r=t.cargo.kind==='scrap'?.09:t.cargo.kind==='gravel'?.014+.019*((stone*37)%101)/100:.012;
      const y=heapHeight(u,v)+r*.20,spread=shaped?Math.max(.04,usableHalfWidth(y)-r-.03)*2:b*.85;
      if(t.cargo.kind==='scrap')box([r*1.4,.009,r*.75],[C+(u-.5)*(a-r*2),F+y,(v-.5)*spread],'load',0,[u*2,stone*.9,v*2]);
      else add(new T.DodecahedronGeometry(r,0),'load',[C+(u-.5)*(a-r*2),F+y,(v-.5)*spread],[u*2,stone*.9,v*2]);
    }
  }else if(tankLoad){
    // Opaque shells hide the contents normally. Inspection shows a separate volume, never exterior cargo.
    if(reveal){
      materials.body.transparent=true;(materials.body as T.MeshStandardMaterial).opacity=.2;materials.body.depthWrite=false;
      const tank=tankDimensions(t),rx=tank.rx-.025,ry=tank.ry-.025,length=tank.length-.05;
      if(t.cargo.liquidLitres){
        const fraction=t.cargo.liquidLitres/(Math.PI*rx*ry*length*1000),height=liquidFillLevel(Math.min(.98,fraction)),alpha=Math.asin(height);
        const section=new T.Shape();
        for(let p=0;p<=64;p++){const a=Math.PI-alpha+p*(Math.PI+2*alpha)/64,x=rx*Math.cos(a),y=ry*Math.sin(a);if(p===0)section.moveTo(x,y);else section.lineTo(x,y);}section.closePath();
        add(new T.ExtrudeGeometry(section,{depth:length,bevelEnabled:false}),'load',[C-length/2,F+ry+.105,0],[0,Math.PI/2,0]);
      }else{
        const volume=new T.CylinderGeometry(1,1,length,40);volume.scale(ry*.65,1,rx*.9);add(volume,'load',[C,F+ry*.74,0],[0,0,Math.PI/2]);
      }
    }
  }else cargoPlacements(t).forEach((placement,i)=>{
    activeCargo=placement.id;
    unitIndex=i;
    const [x,y,z]=placement.position,[a,b,c]=placement.size,k:CargoKind=t.cargo.kind,bottom=y-c/2;
    if(!['cartons','medicine'].includes(k)||cargoCartonCount(t))addUnitBarcode(add,t,placement);
    if(buildTransportLoad(k,[a,b,c],[x,bottom,z],i,{add,box,cylinder,bar,ring}))return;
    if(['cartons','medicine','textiles','cement','tiles','bricks','produce','fish','bakery'].includes(k)){
      const hasPallet=a===1.2&&b===.8,baseHeight=hasPallet?.144:0;
      if(hasPallet)pallet(x,bottom,z);
      const layers=hasPallet?(k==='bricks'?8:k==='tiles'?8:k==='cement'?5:['produce','bakery','fish'].includes(k)?3:2):1;
      const columns=hasPallet?(k==='bricks'?5:2):1,rows=hasPallet?(k==='bricks'?6:k!=='tiles'?2:1):1;
      for(let iy=0;iy<layers;iy++)for(let ix=0;ix<columns;ix++)for(let iz=0;iz<rows;iz++){
        const w=a/columns-.018,d=b/rows-.018,h=(c-baseHeight)/layers-.014;
        const pos:[number,number,number]=[x+(ix-(columns-1)/2)*a/columns,bottom+baseHeight+(iy+.5)*(c-baseHeight)/layers,z+(iz-(rows-1)/2)*b/rows];
        if(['produce','fish','bakery'].includes(k)){
          const [cx,cy,cz]=pos,base=cy-h/2,cratePart=k==='fish'?'load':'frame';
          box([w,.012,d],[cx,base+.006,cz],'frame');
          for(const side of [-1,1]){
            for(const yy of [.20,.64,.94])box([w,.018,.015],[cx,base+h*yy,cz+side*(d/2-.008)],cratePart);
            for(const yy of [.20,.64,.94])box([.015,.018,d],[cx+side*(w/2-.008),base+h*yy,cz],cratePart);
            for(const zz of [-.46,0,.46])box([.015,h,.014],[cx+side*(w/2-.008),cy,cz+zz*d],cratePart);
            for(let rib=0;rib<5;rib++)box([.014,h,.014],[cx+(rib-2)*w*.21,cy,cz+side*(d/2-.008)],cratePart);
          }
          if(k==='produce'&&t.id==='cm-market-awning')for(let head=0;head<4;head++){
            const r=Math.min(w*.21,d*.22,h*.36),g=new T.SphereGeometry(r,12,8),p=g.attributes.position,colors:number[]=[];
            for(let v=0;v<p.count;v++){const px=p.getX(v),py=p.getY(v),pz=p.getZ(v),ruffle=1+.035*Math.sin(Math.atan2(pz,px)*7+py*70);p.setXYZ(v,px*ruffle,py*.92,pz*ruffle);const shade=.75+.22*(py/r+1)/2;colors.push(shade*.92,shade,shade*.70);}
            g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();add(g,'load',[cx+(head%2-.5)*w*.45,base+.025+r,cz+(Math.floor(head/2)-.5)*d*.44]);
          }
          if(k==='produce'&&t.id!=='cm-market-awning')for(let f=0;f<(!hasPallet||iy===layers-1?18:8);f++){
            const r=Math.min(w/10,d/8,.043),upper=(!hasPallet||iy===layers-1)&&f>=6,fx=cx+(upper?((f-6)%4-1.5)*w*.23:(f%4-1.5)*w*.23),fz=cz+(upper?(Math.floor((f-6)/4)-1)*d*.29:(Math.floor(f/4)-.5)*d*.34),fy=base+.02+r+(upper?r*1.65:0);
            const fruit=new T.SphereGeometry(r,upper?12:8,upper?8:4),p=fruit.attributes.position,n=fruit.attributes.normal,color:number[]=[],tint=.86+.14*((f*7+i)%11)/10;
            for(let v=0;v<p.count;v++){
              const q=1+.025*Math.sin(p.getX(v)*230+p.getZ(v)*90);p.setXYZ(v,p.getX(v)*q,p.getY(v)*.94*q,p.getZ(v)*q);
              const normal=new T.Vector3(p.getX(v),p.getY(v)/(.94*.94),p.getZ(v)).normalize();n.setXYZ(v,normal.x,normal.y,normal.z);
              color.push(...(normal.y>.94?[.24,.30,.08]:[tint,tint*.94,tint*.82]));
            }
            fruit.setAttribute('color',new T.Float32BufferAttribute(color,3));add(fruit,'load',[fx,fy,fz]);
          }
          if(k==='fish')for(let f=0;f<3;f++){
            const fx=cx+(f%2-.5)*w*.12,fz=cz+(f-1)*d*.23,fy=base+h*.46,fl=w*.73,rad=Math.min(h*.24,d*.12);
            const shape=[[.02,-.50],[.35,-.39],[.82,-.22],[1,0],[.68,.27],[.14,.40],[.04,.50]].map(([r,q])=>new T.Vector2(r*rad,q*fl));
            const fish=new T.LatheGeometry(shape,12);fish.scale(1,1,.60);add(fish,'metal',[fx,fy,fz],[0,0,Math.PI/2]);
            const tail=new T.Shape();tail.moveTo(-fl*.40,0);tail.lineTo(-fl*.49,rad*1.1);tail.lineTo(-fl*.46,0);tail.lineTo(-fl*.49,-rad*1.1);tail.closePath();add(new T.ShapeGeometry(tail),'metal',[fx,fy+.005,fz],[Math.PI/2,0,0]);
            sphere([.005,.003,.005],[fx+fl*.31,fy+rad*.48,fz+rad*.15],'frame');
          }
          if(k==='bakery')for(let loaf=0;loaf<4;loaf++){
            const bx=cx+(loaf%2-.5)*w*.43,bz=cz+(Math.floor(loaf/2)-.5)*d*.43;
            sphere([w*.18,h*.25,d*.18],[bx,base+h*.36,bz],'load');
            for(let cut=0;cut<3;cut++)bar([bx-w*.07+cut*w*.07,base+h*.59,bz-d*.08],[bx-w*.04+cut*w*.07,base+h*.60,bz+d*.08],.002,'wood');
          }
        }else if(k==='bricks'&&iy===layers-1){
          const brick=new T.Shape();brick.moveTo(-w/2,-d/2);brick.lineTo(w/2,-d/2);brick.lineTo(w/2,d/2);brick.lineTo(-w/2,d/2);brick.closePath();
          for(const offset of [-w*.23,w*.23]){const hole=new T.Path();hole.moveTo(offset-w*.12,-d*.24);hole.lineTo(offset-w*.12,d*.24);hole.lineTo(offset+w*.12,d*.24);hole.lineTo(offset+w*.12,-d*.24);hole.closePath();brick.holes.push(hole);}
          add(new T.ExtrudeGeometry(brick,{depth:h,bevelEnabled:false}),'load',[pos[0],pos[1]-h/2,pos[2]],[-Math.PI/2,0,0]);
        }else box([w,h,d],pos,'load',k==='cement'?.045:['bricks','cartons','medicine','textiles'].includes(k)?0:.003);
        if(k==='tiles'){
          for(const side of [-1,1])box([w-.025,.006,.002],[pos[0],pos[1],pos[2]+side*(d/2+.001)],'white',0);
        }
        if(k==='cartons'||k==='medicine'){
          box([w*.08,.003,d-.004],[pos[0],pos[1]+h/2+.002,pos[2]],'strap');
          for(const end of [-1,1])box([w*.08,h*.24,.003],[pos[0],pos[1]+h*.38,pos[2]+end*(d/2+.002)],'strap');
          labelPlate([pos[0]+w*.11,pos[1],pos[2]+d/2+.004],[w*.45,h*.43,.002],hasPallet?1+iy*columns*rows+ix*rows+iz:0);
          for(const end of [-1,1])box([.002,.001,d*.92],[pos[0]+end*w*.43,pos[1]+h/2+.001,pos[2]],'wood');
        }
      }
      if(hasPallet){
        straps(x,bottom+.144,z,a,b,c-.144);
        if(['cartons','medicine','textiles'].includes(k)){
          for(const side of [-1,1]){
            box([a-.004,c-.16,.003],[x,bottom+.144+(c-.16)/2,z+side*(b/2-.004)],'wrap');
            for(let band=0;band<5;band++)box([a-.004,.008,.003],[x,bottom+.20+band*(c-.23)/5,z+side*(b/2-.002)],'wrap');
          }
        }
      }
    }else if(k==='cylinders'){
      const radius=Math.min(a,b)/2-.02;cylinder(radius,c-.08,[x,y-.01,z],'load',[0,0,0],28);
      for(const offset of [-.3,.3])ring(radius+.008,.012,[x,y+offset*c,z],'metal',[Math.PI/2,0,0]);
      sphere([radius,.1,radius],[x,bottom+c-.08,z],'load');cylinder(.035,.1,[x,bottom+c-.01,z],'metal');ring(.07,.012,[x,bottom+c+.02,z],'frame',[Math.PI/2,0,0]);
    }else if(k==='logs'||k==='rebar'||k==='steel'){
      if(k==='steel')for(let plank=0;plank<6;plank++)box([a,c/3-.008,b/2-.012],[x,bottom+(Math.floor(plank/2)+.5)*c/3,z+(plank%2-.5)*b/2],'load');
      else {
        const rows=k==='logs'?1:3,rad=Math.min(b/rows,c/rows)/2*.93;
        for(let yy=0;yy<rows;yy++)for(let zz=0;zz<rows;zz++){
          const py=bottom+(yy+.5)*c/rows,pz=z+(zz-(rows-1)/2)*b/rows;
          cylinder(rad,a,[x,py,pz],k==='logs'?'wood':'load',[0,0,Math.PI/2],k==='logs'?16:12);if(k==='logs')for(const end of [-1,1])for(const radius of [rad*.4,rad*.72])ring(radius,.006,[x+end*(a/2+.002),py,pz],'load',[0,Math.PI/2,0]);
        }
      }
      straps(x,bottom,z,a,b,c);
    }else if(k==='coils'||k==='paper'||k==='tires'){
      const radius=Math.min(a,c)/2;
      if(k==='tires')ring(radius*.72,radius*.27,[x,y,z],'rubber');
      else{
        cylinder(radius*.88,b*.85,[x,y,z],'load',[Math.PI/2,0,0],32);
        for(const s of [-1,1]){cylinder(radius,.04,[x,y,z+s*b*.46],'metal',[Math.PI/2,0,0],32);ring(radius*.29,radius*.1,[x,y,z+s*b*.5],'frame');for(let winding=0;winding<5;winding++)ring(radius*(.36+winding*.13),.012,[x,y,z+s*b*.49],'metal');}
        box([a*.8,.12,b],[x,bottom+.04,z],'wood');
      }
    }else if(k==='cars'||k==='excavator'||k==='tractor'){
      buildDetailedLoad(k,[a,b,c],[x,bottom,z],{add,box,cylinder,bar,ring});
    }else if(k==='containers'){
      for(const s of [-1,1])if(!reveal||separateCargo||s===-1){box([a,c,.07],[x,y,z+s*(b/2-.035)],'load');for(let rib=0;rib<50;rib++)box([.035,c-.12,.025],[x-a/2+.1+rib*(a-.2)/49,y,z+s*(b/2+.008)],'frame');}
      if(!reveal||separateCargo)box([a,.07,b],[x,bottom+c-.035,z],'load');for(const end of [-1,1])box([.07,c,b],[x+end*(a/2-.035),y,z],'load');
      for(const end of [-1,1])for(const s of [-1,1])box([.14,.14,.14],[x+end*a*.49,bottom+.07,z+s*b*.47],'metal');
    }else if(k==='boat'){
      const shape=new T.Shape();shape.moveTo(-a*.5,0);shape.quadraticCurveTo(-a*.35,-c*.37,a*.3,-c*.26);shape.lineTo(a*.48,0);shape.closePath();
      add(new T.ExtrudeGeometry(shape,{depth:b*.82,bevelEnabled:true,bevelSize:.08,bevelThickness:.08,bevelSegments:3}),'white',[x,bottom+c*.4,z-b*.41]);
      box([a*.34,c*.3,b*.7],[x+a*.06,bottom+c*.58,z],'glass',.1);box([a*.4,.09,b*.77],[x+a*.06,bottom+c*.77,z],'white',.04);
      for(const s of [-1,1])bar([x-a*.35,bottom+c*.45,z+s*b*.4],[x+a*.34,bottom+c*.45,z+s*b*.4],.022,'metal');straps(x,bottom,z,a,b,c*.4);
    }else{
      box([a,k==='transformer'?c*.73:c,k==='transformer'?b*.80:b],[x,k==='transformer'?bottom+c*.365:y,z],'load',k==='furniture'?.08:.035);
      if(k==='transformer'){
        for(let fin=0;fin<18;fin++)for(const s of [-1,1])box([.05,c*.61,b*.10],[x-a*.44+fin*a*.88/17,bottom+c*.37,z+s*b*.45],'metal');
        for(let insulator=0;insulator<3;insulator++){const ix=x+(insulator-1)*a*.27;cylinder(.07,c*.23,[ix,bottom+c*.855,z],'white');for(let disc=0;disc<5;disc++)cylinder(.14,.025,[ix,bottom+c*(.77+disc*.045),z],'white');}
      }else if(k==='appliances'){
        ring(Math.min(a,c)*.25,.025,[x,y,z+b/2+.015],'frame');box([a*.8,.1,.025],[x,bottom+c-.13,z+b/2+.015],'metal');
      }else if(k==='machinery'||k==='tools')for(let grille=0;grille<10;grille++)box([a*.6,.025,.02],[x,bottom+.16+grille*c*.065,z+b/2+.02],'frame');
      else if(k==='furniture')straps(x,bottom,z,a,b,c);
    }
    if(i===0&&['cartons','medicine','appliances','tools'].includes(k))box([.09,.12,.009],[x,y,z+b/2+.025],'white');
  });
  const group=new T.Group();group.name=t.model;
  if(cab){
    group.add(cab.model);
    cab.model.updateMatrixWorld(true);
    for(const x of axles.slice(1))for(const side of [-1,1]){
      const wheel=cab.model.getObjectByName(side===1?'wheel-left':'wheel-right');
      if(!wheel)throw new Error(`Missing source wheel: ${cab.base}`);
      const copies=t.size==='small'?1:2;
      for(let lane=0;lane<copies;lane++){
        const copy=wheel.clone(true);wheel.getWorldQuaternion(copy.quaternion);wheel.getWorldScale(copy.scale);
        copy.position.set(x,l.radius,side*(W/2-.14-lane*.25));
        group.add(copy);
      }
    }
  }
  const used=new Set<Part>();
  const mergeParts=(pool:Map<Part,T.BufferGeometry[]>,parent:T.Group)=>{for(const [part,geometries] of pool){
    const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
    if(!merged)throw new Error(`Cannot merge ${t.id}: ${part}`);
    const indexed=mergeVertices(merged);merged.dispose();
    const mesh=new T.Mesh(indexed,materials[part]);mesh.name=part;mesh.castShadow=!['glass','cargoGlass','wrap','print'].includes(part);mesh.receiveShadow=!['glass','cargoGlass'].includes(part);parent.add(mesh);used.add(part);
  }};
  mergeParts(pieces,group);
  for(const [id,pool] of cargoPieces){const unit=new T.Group();unit.name=id;unit.userData.factoryCargo=true;unit.userData.barcodes=cargoBarcodeInventory(t).filter(item=>item.unitId===id);mergeParts(pool,unit);group.add(unit);}
  for(const part of Object.keys(materials) as Part[])if(!used.has(part))materials[part].dispose();
  group.userData={designId:t.id,source:t.source,units:'metres',cargoCount:t.cargo.count,cargoBarcodes:hideCargo?[]:cargoBarcodeInventory(t),printedBarcodes,barcodeStandard:'CODE128',driverId:t.driver.id,parts,reveal,hideCargo,cabGeometry,realismVersion:cab?9:5,cabBase:cab?.base};
  return group;
}

export function disposeCollectionTruck(group:T.Group){
  const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();
  group.traverse(node=>{if(node instanceof T.Mesh){geometries.add(node.geometry);(Array.isArray(node.material)?node.material:[node.material]).forEach(m=>{if(node.name==='print'&&m instanceof T.MeshStandardMaterial)m.map?.dispose();materials.add(m);});}});
  for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();
}
