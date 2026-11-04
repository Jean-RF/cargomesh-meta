import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {CollectionTruck} from './catalog';
import {cargoPlacements,truckLayout,disposeCollectionTruck,liquidFillLevel} from './model';
import {tankDimensions} from './vehicle-designs';
import type {FactoryLoadingPlan,FactoryLoadingPose,FactoryPoint} from './factory-loading';
import {factorySurfaces} from './factory-surfaces';

type Ink='steel'|'dark'|'wall'|'floor'|'yellow'|'teal'|'body'|'red'|'wood'|'glass'|'light'|'sign'|'door';
const inks={steel:'#9babad',dark:'#24353d',wall:'#d6dfdc',floor:'#b9c1bf',yellow:'#dfb347',teal:'#087f86',body:'#e7e9e4',red:'#ba443d',wood:'#a48760',glass:'#9bbfc9',light:'#fff2ce',sign:'#ffffff',door:'#e7e9e4'};
export function buildFactoryScene(truck:CollectionTruck,plan:FactoryLoadingPlan,model:T.Group,invalidate?:()=>void){
  const root=new T.Group();root.name='Factory loading cell';
  const vehicleFixtures=new T.Group(),connection=new T.Group();root.add(vehicleFixtures,connection);
  const doors=[new T.Group(),new T.Group()];vehicleFixtures.add(...doors);
  const surfaces=factorySurfaces(invalidate);
  const materials=new Map<Ink,T.MeshStandardMaterial>(),buckets=new Map<T.Group,Map<Ink,T.BufferGeometry[]>>();
  const add=(parent:T.Group,ink:Ink,geometry:T.BufferGeometry,at:FactoryPoint,rotation:FactoryPoint=[0,0,0])=>{
    const g=geometry.index?geometry.toNonIndexed():geometry.clone();geometry.dispose();
    g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...at),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(1,1,1)));
    if(ink==='floor'){const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/2,Math.abs(n.getY(i))>.5?p.getZ(i)/2:p.getY(i)/2);}
    const pool=buckets.get(parent)??new Map<Ink,T.BufferGeometry[]>(),parts=pool.get(ink)??[];parts.push(g);pool.set(ink,parts);buckets.set(parent,pool);
  };
  const box=(parent:T.Group,ink:Ink,size:FactoryPoint,at:FactoryPoint)=>add(parent,ink,new T.BoxGeometry(...size),at);
  const cylinder=(parent:T.Group,ink:Ink,radius:number,height:number,at:FactoryPoint,rotation:FactoryPoint=[0,0,0])=>add(parent,ink,new T.CylinderGeometry(radius,radius,height,16),at,rotation);
  const bar=(parent:T.Group,ink:Ink,from:FactoryPoint,to:FactoryPoint,radius:number)=>{
    const start=new T.Vector3(...from),end=new T.Vector3(...to),delta=end.clone().sub(start),g=new T.CylinderGeometry(radius,radius,delta.length(),10);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));add(parent,ink,g,start.add(end).multiplyScalar(.5).toArray());
  };
  const sign=(parent:T.Group,tile:number,width:number,at:FactoryPoint,rotation:FactoryPoint=[0,0,0])=>{
    const g=new T.PlaneGeometry(width,width/4),uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(tile%2+uv.getX(i))/2,1-(Math.floor(tile/2)+1-uv.getY(i))/4);add(parent,'sign',g,at,rotation);
  };
  const F=plan.floor,R=plan.rear,W=truck.widthM,[a,b,c]=plan.size,l=truckLayout(truck);
  const placements=cargoPlacements(truck),goods=plan.units.map(unit=>{
    const group=model.getObjectByName(unit.id);
    if(!(group instanceof T.Group))throw Error(`No se encontró la mercancía ${unit.id}.`);
    const anchor=placements.find(p=>p.id===unit.id)!.position;
    if(!plan.flow)group.traverse(node=>{if(node instanceof T.Mesh)node.geometry.translate(-anchor[0],-anchor[1],-anchor[2]);});
    group.removeFromParent();root.add(group);return group;
  });
  const cargoBounds=new T.Box3().makeEmpty();
  for(const unit of plan.units){const [x,y,z]=unit.source;cargoBounds.expandByPoint(new T.Vector3(x-a/2,y-c/2,z-b/2));cargoBounds.expandByPoint(new T.Vector3(x+a/2,y+c/2,z+b/2));}
  const farX=plan.method==='rear'?plan.baseX+Math.max(1.8,(plan.baseX-plan.front)/5+.55):Math.max(R+3,cargoBounds.max.x+1);
  const minX=Math.min(l.front-1.2,cargoBounds.min.x-1),backZ=-W/2-1.5;
  const farZ=Math.max(W/2+2,cargoBounds.max.z+1),wallY=Math.max(F+4.0,plan.method==='crane'?plan.highY+c/2+1.5:F+4);
  const apron=plan.scenario==='incomplete'?plan.exitDistance:0;
  const hallStart=minX-Math.max(apron,plan.method==='rear'?15:0);
  const hallEnd=farX+(plan.method==='rear'?16:0);
  const garageDepth=Math.max(9,truck.lengthM+2);
  const hallFront=farZ+(plan.method==='rear'?10+garageDepth:1);
  box(root,'floor',[hallEnd-hallStart,.08,hallFront-backZ+1],[(hallStart+hallEnd)/2,-.045,(hallFront+backZ-1)/2]);
  if(plan.method==='rear'){
    box(root,'floor',[farX-R-1.35,F,farZ-backZ],[(R+.35+farX-1)/2,F/2,(farZ+backZ)/2]);
    box(root,'floor',[1,F,farZ-backZ-1.5],[farX-.5,F/2,(backZ+farZ-1.5)/2]);
    for(let step=0;step<6;step++){
      const height=F*(6-step)/6,z=farZ-1.5+(step+.5)*.25;
      box(root,'floor',[1,height,.25],[farX-.5,height/2,z]);box(root,'dark',[.91,.015,.045],[farX-.5,height+.008,z+.095]);
    }
    for(const x of [farX-.95,farX-.05]){
      for(const [z,y] of [[farZ-1.46,F],[farZ-.10,F/6]])bar(root,'yellow',[x,y,z],[x,y+.91,z],.022);
      bar(root,'yellow',[x,F+.91,farZ-1.46],[x,F/6+.91,farZ-.10],.022);
    }
    box(root,'steel',[.48,.035,W-.18],[R+.20,F-.0175,0]);
  }else if(plan.method==='crane'){
    box(root,'floor',[farX-minX,F,farZ-W/2-1],[(minX+farX)/2,F/2,(farZ+W/2+1)/2]);
  }
  const wallEnd=plan.method==='ramp'?R+3:farX;
  box(root,'wall',[wallEnd-minX,wallY-1.45,.10],[(minX+wallEnd)/2,(wallY-1.45)/2,backZ-.10]);
  box(root,'wall',[wallEnd-minX,.35,.10],[(minX+wallEnd)/2,wallY-.175,backZ-.10]);
  box(root,'dark',[wallEnd-minX,.24,.13],[(minX+wallEnd)/2,.12,backZ-.025]);
  box(root,'teal',[wallEnd-minX,.11,.035],[(minX+wallEnd)/2,1.05,backZ-.025]);
  box(root,'glass',[wallEnd-minX,1.10,.018],[(minX+wallEnd)/2,wallY-.90,backZ-.09]);
  for(let x=minX+.3;x<wallEnd;x+=1.5){
    box(root,'dark',[.15,wallY,.12],[x,wallY/2,backZ]);
    for(const dx of [-.09,.09])box(root,'steel',[.045,wallY,.22],[x+dx,wallY/2,backZ]);
    box(root,'steel',[.42,.05,.40],[x,.025,backZ]);
    for(const dx of [-.14,.14])for(const dz of [-.14,.14])cylinder(root,'dark',.018,.014,[x+dx,.058,backZ+dz]);
    box(root,'steel',[.045,1.10,.04],[x,wallY-.90,backZ-.025]);
    box(root,'dark',[.10,.10,1.35],[x,wallY-.08,backZ+.63]);
    bar(root,'steel',[x,wallY-.75,backZ],[x,wallY-.08,backZ+1.2],.026);
  }
  box(root,'dark',[wallEnd-minX,.14,.9],[(minX+wallEnd)/2,wallY,backZ+.35]);
  for(let x=minX+.5;x<wallEnd;x+=2){
    box(root,'dark',[1.2,.07,.22],[x,wallY-.40,backZ+.65]);
    box(root,'light',[1.12,.015,.16],[x,wallY-.445,backZ+.65]);
    box(root,'steel',[.025,.30,.025],[x,wallY-.23,backZ+.65]);
  }
  // Fixtures stay behind the truck or outside the stock/transfer lanes.
  for(let x=minX+1;x<wallEnd;x+=3){
    box(root,'dark',[.012,.003,farZ-backZ+1.6],[x,.001,(farZ+backZ)/2]);
    cylinder(root,'steel',.095,Math.min(2.8,wallEnd-x),[x+Math.min(2.8,wallEnd-x)/2,wallY-.63,backZ+.17],[0,0,Math.PI/2]);
    box(root,'steel',[.045,.22,.34],[x,wallY-.73,backZ+.12]);
  }
  for(let z=backZ+1;z<farZ;z+=3)box(root,'dark',[farX-minX,.003,.012],[(minX+farX)/2,.001,z]);
  if(plan.method==='rear'){
    // Leave the front of the cell open so the vehicle and transfer remain visible.
    const serviceDepth=1.7, rackZ=backZ+.48;
    const beamY=wallY+.32;
    // Adjacent bays surround the active cell without changing its camera framing.
    for(const [start,end] of [[hallStart,minX],[wallEnd,hallEnd]]){
      const length=end-start,center=(start+end)/2;
      box(root,'wall',[length,wallY,.14],[center,wallY/2,backZ-.13]);
      box(root,'dark',[length,.14,.12],[center,beamY,backZ]);
      for(const x of [center-3.5,center+3.5]){
        box(root,'dark',[3.3,3.1,.14],[x,1.55,backZ-.02]);
        box(root,'steel',[3.08,2.86,.085],[x,1.52,backZ+.045]);
        for(let y=.26;y<2.9;y+=.16)box(root,'dark',[3.06,.013,.018],[x,y,backZ+.097]);
        for(const side of [-1,1]){
          box(root,'dark',[.18,wallY,.24],[x+side*1.9,wallY/2,backZ+.02]);
          cylinder(root,'yellow',.083,.93,[x+side*1.68,.465,backZ+.75]);
          box(root,'yellow',[.085,.008,3.7],[x+side*1.68,.006,backZ+2.6]);
        }
      }
    }
    for(const x of [hallStart+.35,minX+.38,wallEnd-.38,hallEnd-.35]){
      const depth=farZ-backZ+3.25;
      box(root,'dark',[.18,.18,depth],[x,beamY,backZ+depth/2]);
      bar(root,'steel',[x,wallY-.69,backZ],[x,beamY,backZ+1.65],.038);
    }
    for(const z of [backZ+.95,backZ+3.4,farZ+1.9]){
      box(root,'steel',[hallEnd-hallStart,.105,.12],[(hallStart+hallEnd)/2,beamY,z]);
      for(let x=hallStart+1;x<hallEnd-.8;x+=3.2){
        box(root,'dark',[1.6,.065,.18],[x,beamY-.19,z]);
        box(root,'light',[1.51,.014,.13],[x,beamY-.228,z]);
      }
    }
    for(const x of [hallStart+.35,hallEnd-.35]){
      const z=farZ+2.95;
      box(root,'dark',[.18,beamY,.20],[x,beamY/2,z]);
      box(root,'steel',[.32,.045,.34],[x,.022,z]);
      box(root,'yellow',[.23,.52,.26],[x,.26,z]);
      bar(root,'steel',[x,beamY-.68,z],[x,beamY,z-.8],.034);
    }
    const walkway=farZ+2.2;
    for(const z of [walkway,walkway+1.35])box(root,'yellow',[hallEnd-hallStart-1,.008,.065],[(hallStart+hallEnd)/2,.009,z]);
    for(let x=hallStart+1;x<hallEnd-1;x+=4.6)for(let i=0;i<5;i++){
      box(root,'body',[.29,.008,1.16],[x+i*.43,.010,walkway+.675]);
    }

    // Marshalling lane and vehicle bays sit beyond the pedestrian corridor.
    const garageStart=hallFront-garageDepth,laneZ=farZ+7;
    for(let x=hallStart+1.4;x<hallEnd-1.4;x+=2.7){
      box(root,'body',[1.14,.007,.085],[x,.007,laneZ]);
    }
    const garageWidth=Math.max(4.45,W+1.65),garageHeight=Math.max(4.5,F+truck.bodyHeightM+.75);
    const garageCount=3,garageLeft=hallStart+.75;
    const garageSpan=garageCount*garageWidth,garageCenter=garageLeft+garageSpan/2,garageZ=garageStart+garageDepth/2;
    box(root,'wall',[garageSpan,garageHeight,.18],[garageCenter,garageHeight/2,hallFront-.11]);
    box(root,'dark',[garageSpan,.72,.11],[garageCenter,.36,hallFront-.015]);
    box(root,'teal',[garageSpan,.12,.075],[garageCenter,garageHeight-.32,hallFront-.012]);
    box(root,'steel',[garageSpan+.24,.20,garageDepth],[garageCenter,garageHeight,garageZ]);
    for(let i=0;i<=garageCount;i++){
      const x=garageLeft+i*garageWidth;
      box(root,'wall',[.15,garageHeight,garageDepth-.16],[x,garageHeight/2,garageZ]);
      box(root,'dark',[.16,garageHeight,.09],[x,garageHeight/2,hallFront-.015]);
      if(i===garageCount)break;
      const center=x+garageWidth/2,doorHeight=garageHeight-.48;
      box(root,'dark',[garageWidth-.15,garageHeight,.19],[center,garageHeight/2,garageStart+.06]);
      box(root,'steel',[garageWidth-.43,doorHeight,.09],[center,doorHeight/2,garageStart-.055]);
      for(let y=.22;y<doorHeight-.11;y+=.23)box(root,'dark',[garageWidth-.45,.017,.016],[center,y,garageStart-.106]);
      box(root,'light',[.76,.09,.14],[center,garageHeight-.23,garageStart-.065]);
      box(root,'yellow',[garageWidth-.45,.007,.11],[center,.009,garageStart-.46]);
      for(const side of [-1,1])cylinder(root,'yellow',.078,.84,[center+side*(garageWidth/2-.18),.42,garageStart-.48]);
      box(root,'teal',[1.35,.88,.52],[center+garageWidth*.23,.44,hallFront-.46]);
      box(root,'steel',[1.4,.065,.56],[center+garageWidth*.23,.912,hallFront-.46]);
      box(root,'light',[1.5,.055,.16],[center,garageHeight-.16,garageZ]);
    }
    // Stock buffer on the warehouse side, outside the active transfer cell.
    for(let x=farX+2.2;x<hallEnd-1.4;x+=3.2){
      const z=backZ+5.5;
      for(const dx of [-1.34,1.34])for(const dz of [-.51,.51]){
        box(root,'dark',[.095,3.30,.095],[x+dx,1.65,z+dz]);
      }
      for(const y of [.22,1.43,2.64]){
        box(root,'steel',[2.64,.06,1.08],[x,y,z]);
        box(root,'teal',[2.72,.12,.07],[x,y-.035,z+.54]);
        for(const dx of [-.64,.64]){
          box(root,'wood',[1.10,.11,.84],[x+dx,y+.09,z]);
          box(root,'body',[.94,.60,.75],[x+dx,y+.44,z]);
          box(root,'dark',[.19,.09,.006],[x+dx+.24,y+.48,z+.377]);
        }
      }
    }

    for(let x=minX+.42;x<wallEnd-.8;x+=2.25){
      box(root,'dark',[.16,.16,serviceDepth],[x,wallY-.03,backZ+serviceDepth/2]);
      bar(root,'steel',[x,wallY-.90,backZ],[x,wallY-.10,backZ+serviceDepth],.028);
    }
    box(root,'steel',[wallEnd-minX,.075,.11],[(minX+wallEnd)/2,wallY-.04,backZ+serviceDepth]);
    for(let x=minX+.35;x<R-.25;x+=.52)box(root,'yellow',[.28,.008,.06],[x,.008,W/2+.55]);
    for(const x of [R+.43,R+.78]){
      for(let z=-W/2+.04;z<W/2;z+=.22)add(root,'yellow',new T.BoxGeometry(.14,.006,.042),[x,F+.005,z],[0,-Math.PI/4,0]);
    }
    for(let x=minX+.9;x<R-.9;x+=1.55){
      for(const dx of [-.64,.64])for(const dz of [-.27,.27]){
        box(root,'dark',[.065,2.35,.055],[x+dx,1.175,rackZ+dz]);
        box(root,'steel',[.13,.025,.14],[x+dx,.015,rackZ+dz]);
      }
      for(const y of [.40,1.15,1.9]){
        box(root,'steel',[1.28,.055,.59],[x,y,rackZ]);
        for(const dz of [-.29,.29])box(root,'teal',[1.30,.105,.042],[x,y-.04,rackZ+dz]);
        for(const dx of [-.39,0,.39]){
          const height=dx===0?.31:.24;
          box(root,'wood',[.34,height,.42],[x+dx,y+.03+height/2,rackZ]);
          box(root,'body',[.115,.07,.004],[x+dx,y+.13,rackZ+.212]);
          box(root,'dark',[.060,.024,.004],[x+dx,y+.13,rackZ+.215]);
        }
      }
    }
  }
  const benchX=minX+1.15,benchZ=farZ-.55,benchFloor=plan.method==='crane'?F:0;
  box(root,'wood',[1.60,.08,.64],[benchX,benchFloor+.93,benchZ]);
  for(const dx of [-.67,.67])for(const dz of [-.23,.23])box(root,'dark',[.055,.89,.055],[benchX+dx,benchFloor+.445,benchZ+dz]);
  box(root,'steel',[1.44,.04,.54],[benchX,benchFloor+.25,benchZ]);
  for(let i=0;i<3;i++)box(root,'teal',[.30,.18,.22],[benchX-.48+i*.43,benchFloor+1.06,benchZ]);
  cylinder(root,'body',.09,.22,[benchX+.63,benchFloor+1.08,benchZ]);
  box(root,'dark',[1.60,.44,.035],[benchX,benchFloor+1.20,benchZ-.32]);
  sign(root,6,1.40,[benchX,benchFloor+1.20,benchZ-.30]);
  for(let level=0;level<3;level++){
    const px=benchX+2.0,y=benchFloor+.065+level*.145;
    for(const dx of [-.46,0,.46])box(root,'wood',[.15,.11,.77],[px+dx,y,benchZ]);
    for(let board=0;board<5;board++)box(root,'wood',[1.18,.026,.12],[px,y+.066,benchZ+(board-2)*.15]);
  }
  const serviceX=wallEnd-.75,serviceFloor=plan.method==='rear'?F:0;
  box(root,'body',[.80,1.25,.24],[serviceX,serviceFloor+.625,backZ+.20]);
  box(root,'dark',[.008,1.12,.012],[serviceX,serviceFloor+.625,backZ+.328]);
  for(let i=0;i<8;i++)box(root,'dark',[.26,.015,.012],[serviceX-.20,serviceFloor+.18+i*.045,backZ+.328]);
  box(root,'steel',[.025,.13,.04],[serviceX+.25,serviceFloor+.65,backZ+.34]);
  bar(root,'steel',[serviceX-.14,serviceFloor+1.25,backZ+.22],[serviceX-.14,wallY-.72,backZ+.22],.018);
  sign(root,7,.74,[serviceX,serviceFloor+1.04,backZ+.33]);
  sign(root,0,2.7,[minX+3.2,wallY-.95,backZ+.012]);
  sign(root,1,1.15,[Math.min(R+.85,wallEnd-2),wallY-2,backZ+.012]);
  sign(root,2,1.0,[minX+.75,2.05,backZ+.012]);
  if(plan.method==='rear'){
    for(const side of [-1,1]){
      box(root,'dark',[.10,.42,.22],[R+.30,F-.28,side*(W/2+.12)]);
      cylinder(root,'yellow',.075,.74,[R+.62,F+.37,side*(W/2+.55)]);
      cylinder(root,'dark',.079,.12,[R+.62,F+.42,side*(W/2+.55)]);
    }
    for(let z=-plan.stockWidth/2;z<=plan.stockWidth/2;z+=.38)box(root,'yellow',[.065,.006,.18],[R+.77,F+.004,z]);
    const jackX=wallEnd-1.5,jackZ=backZ+.88;
    for(const side of [-1,1]){
      box(root,'yellow',[.88,.055,.12],[jackX-.25,F+.11,jackZ+side*.20]);
      cylinder(root,'dark',.068,.055,[jackX-.60,F+.07,jackZ+side*.20],[Math.PI/2,0,0]);
    }
    box(root,'yellow',[.22,.24,.48],[jackX+.20,F+.20,jackZ]);
    bar(root,'dark',[jackX+.25,F+.24,jackZ],[jackX+.48,F+1.0,jackZ],.035);
    box(root,'dark',[.07,.06,.38],[jackX+.48,F+1.0,jackZ]);
    sign(root,4,.65,[plan.baseX,F+.33,plan.stockWidth/2+.53],[0,Math.PI/2,0]);
    for(const dx of [-.88,-.22])box(root,'teal',[.045,.15,plan.stockWidth+.25],[plan.baseX+dx,F+.15,0]);
    for(let z=-plan.stockWidth/2;z<plan.stockWidth/2;z+=.13)cylinder(root,'steel',.052,.62,[plan.baseX-.55,F+.16,z],[0,0,Math.PI/2]);
    for(const z of [-plan.stockWidth/2,plan.stockWidth/2])box(root,'dark',[.58,.12,.055],[plan.baseX-.55,F+.06,z]);
    box(root,'dark',[.20,.17,.26],[plan.baseX-.55,F+.13,plan.stockWidth/2+.22]);
  }
  for(const x of [wallEnd-1,wallEnd-2.5]){
    for(const dx of [-.55,.55])box(root,'teal',[.06,2.5,.07],[x,1.25,backZ+.45+dx*.5]);
    for(const h of [.25,1.05,1.85])box(root,'steel',[1.15,.045,.50],[x,h,backZ+.45]);
  }
  const panelX=R+1.5,panelZ=plan.method==='crane'?farZ-.5:W/2+1.1;
  const panelFloor=plan.method==='rear'||plan.method==='crane'?F:0;
  box(root,'wall',[.55,.85,.52],[panelX,panelFloor+.425,panelZ]);
  box(root,'dark',[.035,.30,.32],[panelX-.28,panelFloor+.62,panelZ]);
  box(root,'teal',[.04,.19,.23],[panelX-.305,panelFloor+.65,panelZ]);
  cylinder(root,'red',.035,.045,[panelX-.31,panelFloor+.37,panelZ],[0,0,Math.PI/2]);
  sign(root,5,.48,[panelX-.306,panelFloor+.80,panelZ],[0,-Math.PI/2,0]);
  for(const y of [.18,.23,.28])box(root,'dark',[.02,.008,.24],[panelX-.283,panelFloor+y,panelZ]);
  for(const z of [-.09,0,.09])cylinder(root,z===0?'red':'teal',.016,.035,[panelX-.32,panelFloor+.45,panelZ+z],[0,0,Math.PI/2]);
  const cross=new T.Group(),housing=new T.Group(),head=new T.Group(),jaws=[new T.Group(),new T.Group()],arms=[new T.Group(),new T.Group()];root.add(cross,housing,head,...arms);head.add(...jaws);
  const clearance=plan.innerWidth/2-Math.max(...plan.units.map(u=>Math.abs(u.target[2]))),linkLength=Math.min(.44,Math.max(.16,(clearance-.07)/.63));
  arms.forEach((arm,i)=>arm.name=`Robot ${i?'forearm':'shoulder link'}`);head.name='Robot gripper';
  if(plan.method==='rear'){
    for(const side of [-1,1]){
      const doorWidth=W/2-.075,height=plan.openingHeight;
      const door=doors[side===-1?0:1];door.position.set(R,F,side*(W/2-.045));
      box(door,'door',[doorWidth,height,.055],[doorWidth/2,height/2,0]);
      box(vehicleFixtures,'steel',[.075,height+.06,.055],[R,F+height/2,side*(W/2-.045)]);
      for(const y of [.15,height/2,height-.15])cylinder(vehicleFixtures,'steel',.026,.12,[R+.025,F+y,side*(W/2-.045)]);
    }
    box(vehicleFixtures,'steel',[.075,.08,W-.05],[R,F+plan.openingHeight+.04,0]);
    const columnHeight=Math.max(truck.bodyHeightM+.3,plan.highY-F+c/2+.4),housingLength=Math.max(1.4,(plan.baseX-plan.front)/5+.30);
    for(const side of [-1,1]){
      const z=side*(plan.stockWidth/2+.40);
      box(root,'dark',[.24,columnHeight,.24],[plan.baseX,F+columnHeight/2,z]);
      box(root,'steel',[.07,columnHeight-.1,.045],[plan.baseX-.14,F+columnHeight/2,z]);
      box(root,'yellow',[.62,.07,.62],[plan.baseX,F+.035,z]);
      cylinder(root,'teal',.13,.28,[plan.baseX,F+columnHeight+.07,z]);
      box(root,'body',[.19,columnHeight-.16,.12],[plan.baseX+.04,F+columnHeight/2,z+.13]);
      cylinder(root,'steel',.021,columnHeight-.12,[plan.baseX-.145,F+columnHeight/2,z]);
      for(const dx of [-.22,.22])for(const dz of [-.22,.22])cylinder(root,'steel',.024,.025,[plan.baseX+dx,F+.087,z+dz]);
      box(cross,'body',[.38,.32,.36],[plan.baseX,-.02,z]);
      box(cross,'teal',[.12,.19,.39],[plan.baseX+.20,0,z]);
      for(const dz of [-.13,.13])cylinder(cross,'dark',.045,.035,[plan.baseX-.205,0,z+dz],[0,0,Math.PI/2]);
    }
    for(const side of [-1,1]){
      const z=side*(plan.stockWidth/2+.40);
      // Vertical cable guide and guarded servo housing sit behind the transfer envelope.
      for(let y=.22;y<columnHeight-.12;y+=.095)box(root,'dark',[.056,.064,.115],[plan.baseX+.19,F+y,z]);
      box(root,'dark',[.24,.37,.23],[plan.baseX+.19,F+columnHeight-.29,z]);
      cylinder(root,'steel',.093,.08,[plan.baseX+.36,F+columnHeight-.29,z],[0,0,Math.PI/2]);
      for(let i=0;i<6;i++){
        const angle=i*Math.PI/3;
        cylinder(root,'dark',.009,.018,[plan.baseX+.405,F+columnHeight-.29+.067*Math.sin(angle),z+.067*Math.cos(angle)],[0,0,Math.PI/2]);
      }
      const loom=new T.CatmullRomCurve3([
        new T.Vector3(plan.baseX+.40,F+columnHeight-.36,z),
        new T.Vector3(plan.baseX+.46,F+columnHeight-.57,z),
        new T.Vector3(plan.baseX+.31,F+columnHeight-.68,z),
        new T.Vector3(plan.baseX+.215,F+columnHeight-.63,z),
      ]);
      add(root,'dark',new T.TubeGeometry(loom,12,.017,6,false),[0,0,0]);
      for(const dy of [.13,.33,.53])box(cross,'steel',[.072,.04,.13],[plan.baseX+.22,dy-.23,z]);
      for(let i=0;i<6;i++)box(root,'steel',[.023,.013,.15],[plan.baseX+.315,F+columnHeight-.43+i*.045,z]);
    }
    box(cross,'teal',[.24,.19,plan.stockWidth+1.0],[plan.baseX,0,0]);
    box(cross,'steel',[.27,.045,plan.stockWidth+.95],[plan.baseX,-.04,0]);
    box(housing,'teal',[housingLength,.24,.25],[housingLength/2,0,0]);
    box(housing,'body',[housingLength*.75,.09,.27],[housingLength*.52,.155,0]);
    box(housing,'dark',[housingLength*.82,.028,.036],[housingLength*.50,.205,.073]);
    for(let i=0;i<8;i++){
      box(housing,'steel',[.025,.037,.05],[housingLength*(.17+i*.092),.205,.073]);
    }
    sign(housing,3,Math.min(housingLength*.6,.85),[housingLength*.55,.025,.127]);
    for(let i=0;i<7;i++)box(housing,'dark',[.025,.07,.008],[housingLength*.70+i*.045,0,.129]);
    box(head,'steel',[Math.min(a*.8,.65),.075,b+.15],[0,c/2+.05,0]);
    cylinder(head,'dark',.035,.11,[0,c/2+.10,0]);
    cylinder(head,'body',.075,.06,[0,c/2+.115,0]);
    cylinder(head,'teal',.064,.015,[0,c/2+.152,0]);
    cylinder(head,'steel',.014,b+.16,[0,c/2+.025,0],[Math.PI/2,0,0]);
    for(const dx of [-.12,.12])for(const dz of [-1,1]){
      cylinder(head,'dark',.013,.011,[dx,c/2+.092,dz*(b/2-.025)]);
    }
    box(head,'dark',[.08,.035,.065],[Math.min(a*.32,.22),c/2+.12,.025]);
    cylinder(head,'glass',.015,.012,[Math.min(a*.32,.22)+.045,c/2+.12,.025],[0,0,Math.PI/2]);
    for(const arm of arms){
      const profile=new T.Shape();profile.moveTo(0,-.075);profile.lineTo(linkLength-.05,-.052);profile.quadraticCurveTo(linkLength+.045,0,linkLength-.05,.052);profile.lineTo(0,.075);profile.quadraticCurveTo(-.09,0,0,-.075);
      const casting=new T.ExtrudeGeometry(profile,{depth:.060,bevelEnabled:true,bevelSize:.006,bevelThickness:.005,bevelSegments:1,curveSegments:10});casting.translate(0,0,-.03);add(arm,'body',casting,[0,0,0],[Math.PI/2,0,0]);
      cylinder(arm,'dark',.071,.083,[0,0,0]);cylinder(arm,'teal',.060,.012,[0,.048,0]);
      for(let i=0;i<6;i++){const angle=i*Math.PI/3;cylinder(arm,'steel',.008,.008,[Math.cos(angle)*.048,.058,Math.sin(angle)*.048]);}
      box(arm,'teal',[linkLength*.56,.015,.060],[linkLength*.49,.040,0]);
      cylinder(arm,'steel',.034,.019,[linkLength-.019,.035,0]);
      cylinder(arm,'dark',.015,.022,[linkLength-.019,.045,0]);
      const harness=new T.CatmullRomCurve3([
        new T.Vector3(.035,.061,.048),
        new T.Vector3(linkLength*.38,.066,.060),
        new T.Vector3(linkLength*.76,.058,.048),
        new T.Vector3(linkLength-.020,.055,.023),
      ]);
      add(arm,'dark',new T.TubeGeometry(harness,10,.008,6,false),[0,0,0]);
      for(const x of [linkLength*.35,linkLength*.65])box(arm,'steel',[.016,.014,.028],[x,.061,.051]);
      bar(arm,'dark',[.04,.044,.055],[linkLength-.045,.044,.043],.007);
      add(arm,'dark',new T.TorusGeometry(.043,.007,6,16,Math.PI),[.02,.048,.015],[Math.PI/2,0,0]);
    }
    for(const jaw of jaws){
      box(jaw,'steel',[Math.min(a*.65,.50),Math.min(c*.48,.18),.030],[0,c/2-.065,0]);
      box(jaw,'dark',[Math.min(a*.58,.46),Math.min(c*.40,.15),.005],[0,c/2-.065,jaw===jaws[0]?.0175:-.0175]);
      box(jaw,'teal',[Math.min(a*.32,.22),.035,.065],[0,c/2+.015,0]);
      for(const dx of [-1,1])cylinder(jaw,'steel',.009,.012,[dx*Math.min(a*.23,.17),c/2-.04,0],[Math.PI/2,0,0]);
    }
  }
  const craneTop=plan.highY+c/2+1.2,craneStart=Math.min(l.start-.5,cargoBounds.min.x-.8),craneEnd=Math.max(R+.6,cargoBounds.max.x+.8);
  if(plan.method==='crane'){
    for(const x of [craneStart,craneEnd]){
      for(const z of [backZ+.4,farZ-.4]){
        box(root,'teal',[.26,craneTop,.30],[x,craneTop/2,z]);box(root,'yellow',[.7,.10,.7],[x,.05,z]);
      }
      box(root,'dark',[.16,.30,farZ-backZ-.8],[x,craneTop,(backZ+farZ)/2]);
    }
    for(const z of [backZ+.4,farZ-.4])box(root,'steel',[craneEnd-craneStart,.22,.15],[(craneEnd+craneStart)/2,craneTop,z]);
    box(cross,'yellow',[.35,.24,farZ-backZ-.75],[0,craneTop+.14,(backZ+farZ)/2]);
    box(housing,'teal',[.65,.30,.6],[0,craneTop-.12,0]);
    box(head,'yellow',[a*.62,.12,Math.max(b*.7,.35)],[0,c/2+.35,0]);
    for(const dx of [-1,1])for(const dz of [-1,1])bar(head,'dark',[dx*a*.30,c/2+.30,dz*b*.33],[dx*a*.43,c*.38,dz*b*.43],.012);
  }
  const ramp=new T.Group(),stepRamp=new T.Group(),shuttle=new T.Group();root.add(ramp,stepRamp,shuttle);
  if(plan.method==='ramp'){
    for(const part of truck.form==='lowbed'?[ramp,stepRamp]:[ramp])for(const side of [-1,1]){
      box(part,'steel',[1,.065,.46],[0,0,side*Math.min(b*.36,.82)]);
      for(let tread=0;tread<44;tread++)box(part,'dark',[.009,.075,.45],[tread/43-.5,0,side*Math.min(b*.36,.82)]);
    }
    const stagingX=plan.units[0].source[0],stagingWidth=cargoBounds.max.z-cargoBounds.min.z+.8;
    box(root,'floor',[a+1.2,.04,stagingWidth],[stagingX,.02,(cargoBounds.max.z+cargoBounds.min.z)/2]);
    for(const x of [stagingX-a*.38,stagingX+a*.38])box(root,'dark',[.045,.015,stagingWidth],[x,.032,(cargoBounds.max.z+cargoBounds.min.z)/2]);
    box(shuttle,'steel',[a,.05,b+.20],[0,-.025,0]);
    for(const side of [-1,1])box(shuttle,'teal',[a,.06,.07],[0,-.04,side*(b/2+.10)]);
  }
  const stream=new T.Group();root.add(stream);
  let fillCap:T.Mesh|null=null,fillPlane:T.Plane|null=null;
  let particles:T.InstancedMesh|null=null;
  let fluid:{rx:number;ry:number;length:number;centerY:number;maxFraction:number}|null=null;
  const pileBounds=new T.Box3().setFromObject(goods[0]),pileAnchor=pileBounds.getCenter(new T.Vector3());pileAnchor.y=pileBounds.min.y;
  if(plan.flow){
    const inletY=truck.form==='tank'||truck.form==='silo'||truck.form==='mixer'?l.floor+tankDimensions(truck).ry*2+.20:Math.max(l.floor+truck.bodyHeightM+.3,pileBounds.max.y+.7);
    const x=l.center,z=0,pumpX=l.center+1,pumpZ=W/2+1.2;
    if(plan.flow==='bulk'){
      model.traverse(node=>{if(node instanceof T.Mesh&&node.name==='body'){const m=node.material as T.MeshStandardMaterial;m.transparent=true;m.opacity=.28;m.depthWrite=false;}});
      for(const dx of [-.7,.7])for(const dz of [-.65,.65])box(root,'steel',[.10,inletY+1,.10],[x+dx,(inletY+1)/2,z+dz]);
      add(root,'teal',new T.CylinderGeometry(.95,.16,1.0,4,1,true),[x,inletY+.65,z],[0,Math.PI/4,0]);
      box(root,'teal',[1.4,.45,1.3],[x,inletY+1.37,z]);
      const material=new T.MeshStandardMaterial({color:truck.cargo.color,roughness:.90});
      particles=new T.InstancedMesh(new T.DodecahedronGeometry(truck.cargo.kind==='scrap'?.055:.025,0),material,48);stream.add(particles);
      stream.position.set(x,inletY/2,z);
    }else{
      box(root,'teal',[1.05,.55,.75],[pumpX,.34,pumpZ]);
      cylinder(root,'steel',.18,.65,[pumpX,.74,pumpZ]);
      cylinder(root,'red',.14,.025,[pumpX,.87,pumpZ+.20],[Math.PI/2,0,0]);
      const pivotZ=W/2+.45;
      const path=new T.CatmullRomCurve3([new T.Vector3(pumpX,.65,pumpZ),new T.Vector3(pumpX,.65,W/2+.5),new T.Vector3(x,inletY+.30,pivotZ)]);
      add(root,'dark',new T.TubeGeometry(path,32,.065,10,false),[0,0,0]);
      connection.position.set(x,inletY+.30,pivotZ);
      const nozzle=new T.CatmullRomCurve3([new T.Vector3(),new T.Vector3(0,.08,-pivotZ*.5),new T.Vector3(0,0,-pivotZ),new T.Vector3(0,-.45,-pivotZ)]);
      add(connection,'dark',new T.TubeGeometry(nozzle,24,.065,10,false),[0,0,0]);
      cylinder(connection,'steel',.12,.13,[0,-.43,-pivotZ]);
      if(plan.flow==='liquid'){
        const tank=tankDimensions(truck),rx=tank.rx-.025,ry=tank.ry-.025,length=tank.length-.05;
        fluid={rx,ry,length,centerY:l.floor+ry+.105,maxFraction:Math.min(.98,plan.litres!/(Math.PI*rx*ry*length*1000))};
        fillPlane=new T.Plane(new T.Vector3(0,-1,0),0);
        goods[0].traverse(node=>{if(node instanceof T.Mesh){const material=node.material as T.MeshStandardMaterial;material.clippingPlanes=[fillPlane!];material.side=T.DoubleSide;}});
        fillCap=new T.Mesh(new T.PlaneGeometry(length,1),new T.MeshStandardMaterial({color:truck.cargo.color,roughness:.30,metalness:.05,side:T.DoubleSide}));
        fillCap.rotation.x=-Math.PI/2;fillCap.position.x=l.center;root.add(fillCap);
      }
    }
    stream.userData.inletY=inletY;
  }
  for(const [parent,pool] of buckets)for(const [ink,parts] of pool){
    const geometry=mergeGeometries(parts);parts.forEach(p=>p.dispose());if(!geometry)throw Error('No se pudo construir la fábrica.');
    let material=materials.get(ink);
    if(!material){material=new T.MeshStandardMaterial({color:ink==='door'?truck.bodyColor:inks[ink],roughness:ink==='steel'?.32:ink==='body'?.45:.84,metalness:ink==='steel'?.70:.04});
      if(ink==='floor'){material.map=surfaces.concrete;material.normalMap=surfaces.normal;material.normalScale.setScalar(.55);material.roughnessMap=surfaces.roughness;material.roughness=1;}
      if(ink==='sign'){material.map=surfaces.signs;material.side=T.DoubleSide;material.roughness=.70;}
      if(ink==='glass'){material.transparent=true;material.opacity=.48;material.depthWrite=false;material.roughness=.18;material.metalness=.15;material.side=T.DoubleSide;}
      if(ink==='light'){material.emissive.set('#fff2cf');material.emissiveIntensity=1.5;}
      materials.set(ink,material);}
    const mesh=new T.Mesh(geometry,material);mesh.name=`Factory ${ink}`;mesh.castShadow=ink!=='glass'&&ink!=='light'&&ink!=='sign';mesh.receiveShadow=true;parent.add(mesh);
  }
  const stageLength=(plan.baseX-plan.front)/5+.12;
  const beams=plan.method==='rear'?Array.from({length:5},(_,i)=>{const mesh=new T.Mesh(new T.BoxGeometry(stageLength,.105-i*.009,.14-i*.015),materials.get(i%2?'steel':'dark'));root.add(mesh);mesh.castShadow=true;return mesh;}):[];
  const collars=beams.map((_,i)=>{const mesh=new T.Mesh(new T.BoxGeometry(.045,.125-i*.009,.17-i*.015),materials.get('teal'));root.add(mesh);mesh.castShadow=true;return mesh;});
  const cable=plan.method==='crane'?new T.Mesh(new T.CylinderGeometry(.012,.012,1,8),materials.get('dark')):null;if(cable)root.add(cable);
  const frameBounds=new T.Box3(new T.Vector3(minX,0,backZ-.2),new T.Vector3(farX,plan.method==='crane'?craneTop+.6:plan.flow?Math.max(wallY,stream.userData.inletY+1.7):wallY+.25,farZ+.2));
  root.userData.factoryDetail={robot:plan.method==='rear'?'telescopic-gantry-articulated-wrist':plan.method,surfaces:'shared-concrete-signage',version:2};
  return {root,model,vehicleFixtures,doors,connection,goods,head,jaws,beams,collars,arms,linkLength,stageLength,cross,housing,ramp,stepRamp,shuttle,cable,craneTop,plan,frameBounds,fillPlane,fillCap,fluid,pileAnchor,pileBounds,stream,particles,truck,dispose(){disposeCollectionTruck(root);for(const texture of Object.values(surfaces))texture?.dispose();}};
}
export type FactoryScene=ReturnType<typeof buildFactoryScene>;
export function animateFactoryScene(scene:FactoryScene,pose:FactoryLoadingPose){
  const {plan}=scene,[,b,c]=plan.size;
  scene.model.position.x=pose.departureX;scene.vehicleFixtures.position.x=pose.departureX;
  scene.doors.forEach((door,i)=>{door.rotation.y=(i===0?-1:1)*Math.PI/2*T.MathUtils.clamp((pose.clearFraction-.70)/.30,0,1);});
  scene.connection.rotation.x=pose.clearFraction*Math.PI/2;
  if(plan.flow){
    const amount=pose.fillFraction,goods=scene.goods[0];goods.visible=amount>0;
    if(scene.fluid){
      const {rx,ry,length,centerY,maxFraction}=scene.fluid,h=liquidFillLevel(amount*maxFraction),level=centerY+ry*h;
      scene.fillPlane!.constant=level;scene.fillCap!.visible=amount>0;scene.fillCap!.position.y=level+.001;scene.fillCap!.scale.y=2*rx*Math.sqrt(Math.max(0,1-h*h));
      goods.position.x=pose.departureX;scene.fillCap!.position.x=truckLayout(scene.truck).center+pose.departureX;
      scene.fillCap!.userData.volumeLitres=Math.PI*rx*ry*length*1000*maxFraction*amount;
    }else{
      const scale=Math.cbrt(amount);goods.scale.setScalar(scale);goods.position.copy(scene.pileAnchor).multiplyScalar(1-scale);
      goods.position.x+=pose.departureX;
      const top=scene.pileAnchor.y+(scene.pileBounds.max.y-scene.pileAnchor.y)*scale,inlet=scene.stream.userData.inletY;
      scene.stream.position.y=top;
      if(scene.particles){
        const matrix=new T.Matrix4();for(let i=0;i<scene.particles.count;i++){
          const fall=(i/scene.particles.count+pose.time*.85)%1;
          matrix.makeRotationFromEuler(new T.Euler(i*.71+pose.time,i*.23,i*.49));matrix.setPosition(Math.sin(i*17)*.065,(1-fall)*(inlet-top),Math.cos(i*13)*.065);scene.particles.setMatrixAt(i,matrix);
        }scene.particles.instanceMatrix.needsUpdate=true;
      }
    }
    scene.stream.visible=pose.transferring;
    return;
  }
  scene.goods.forEach((group,i)=>{group.position.fromArray(pose.positions[i]);group.rotation.z=plan.method==='ramp'&&i===pose.currentIndex?pose.pitch:0;});
  if(plan.method==='ramp'){
    const unit=plan.units[pose.currentIndex],road=unit.road!;
    const segment=(mesh:T.Group,from:readonly[number,number],to:readonly[number,number])=>{
      const angle=Math.atan2(to[1]-from[1],to[0]-from[0]);mesh.scale.x=Math.hypot(to[0]-from[0],to[1]-from[1]);mesh.rotation.z=angle;mesh.position.set((from[0]+to[0])/2,(from[1]+to[1])/2-.0375/Math.cos(angle),0);
    };
    segment(scene.ramp,road[road.length-3],road[road.length-2]);
    if(pose.clearFraction>0){
      const length=scene.ramp.scale.x,angle=scene.ramp.rotation.z*(1-pose.clearFraction),end=road[road.length-2];
      scene.ramp.rotation.z=angle;scene.ramp.position.set(end[0]-length*Math.cos(angle)/2,end[1]-length*Math.sin(angle)/2-.0375/Math.cos(angle),0);
    }
    if(scene.truck.form==='lowbed'){segment(scene.stepRamp,road[1],road[2]);scene.stepRamp.position.x+=pose.departureX;}
    scene.shuttle.position.set(unit.source[0],.04,pose.time<unit.graspAt||pose.phase==='Transferir a la rampa'?pose.carrier[2]:0);
    return;
  }
  scene.head.position.fromArray(pose.carrier);
  if(plan.method==='crane'){
    scene.cross.position.x=pose.carrier[0];scene.housing.position.set(pose.carrier[0],0,pose.carrier[2]);
    const bottom=pose.carrier[1]+c/2+.42,length=Math.max(.05,scene.craneTop-bottom);
    scene.cable!.scale.y=length;scene.cable!.position.set(pose.carrier[0],(scene.craneTop+bottom)/2,pose.carrier[2]);
    return;
  }
  scene.jaws.forEach((jaw,i)=>{jaw.position.z=(i===0?-1:1)*(b/2+.0175+pose.gripOpen*.08);});
  const ratio=T.MathUtils.clamp((pose.carrier[0]-plan.front)/(plan.baseX-plan.front),0,1),reach=scene.linkLength*(1.56+.22*ratio+.05*pose.gripOpen-.24*T.MathUtils.smoothstep(pose.carrier[0],plan.rear+plan.size[0]/2+.25,plan.baseX-1.05));
  const y=pose.carrier[1]+c/2+.115,shoulderX=pose.carrier[0]+reach,elbowX=pose.carrier[0]+reach/2,elbowZ=pose.carrier[2]+Math.sqrt(scene.linkLength**2-(reach/2)**2),part=(plan.baseX-shoulderX)/5;
  scene.cross.position.y=y;scene.housing.position.set(plan.baseX,y,pose.carrier[2]);
  scene.beams.forEach((beam,i)=>{beam.position.set(plan.baseX-(i+1)*part+scene.stageLength/2,y,pose.carrier[2]);});
  scene.collars.forEach((collar,i)=>collar.position.set(plan.baseX-(i+1)*part,y,pose.carrier[2]));
  scene.arms[0].position.set(shoulderX,y,pose.carrier[2]);scene.arms[0].rotation.y=Math.atan2(pose.carrier[2]-elbowZ,elbowX-shoulderX);
  scene.arms[1].position.set(elbowX,y,elbowZ);scene.arms[1].rotation.y=Math.atan2(elbowZ-pose.carrier[2],pose.carrier[0]-elbowX);
}
