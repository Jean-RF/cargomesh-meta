import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Box3,Group,Mesh,Vector3} from 'three';
import {collectionTrucks} from './catalog';
import {factoryLoadingPlan,factoryLoadingPose,incompleteFactoryPlan,type FactoryLoadingPlan} from './factory-loading';
import {buildCollectionTruck,cargoPlacements,disposeCollectionTruck} from './model';
import {buildFactoryScene,animateFactoryScene} from './factory-scene';

test('all 60 trucks have a complete and incomplete result with truthful remaining quantities',()=>{
  for(const truck of collectionTrucks){
    const complete=factoryLoadingPlan(truck)!,plan=incompleteFactoryPlan(complete),last=plan.units.at(-1)!;
    assert.equal(complete.scenario,'complete');assert.equal(complete.stopAt,complete.duration);
    assert.equal(plan.units,complete.units);assert.equal(plan.size,complete.size);
    const initial=factoryLoadingPose(plan,0),stopped=factoryLoadingPose(plan,plan.stopAt),end=factoryLoadingPose(plan,plan.duration);
    assert.equal(initial.departureX,0);assert.equal(initial.loadedKg,0);assert.equal(end.finished,true);
    assert(end.loadedKg<truck.cargo.count*truck.cargo.unitKg);assert.equal(end.loadedKg,stopped.loadedKg);assert.equal(end.departureX,-plan.exitDistance);assert.equal(end.transferring,false);
    assert.equal(factoryLoadingPose(complete,complete.duration).loadedKg,truck.cargo.count*truck.cargo.unitKg);
    if(plan.flow){assert.equal(end.fillFraction,.75);assert.equal(end.loaded,0);assert.equal(end.loadedKg,Math.round(truck.cargo.count*truck.cargo.unitKg*.75*1000)/1000);}
    else{
      assert.equal(end.loaded,truck.cargo.count-1);assert.deepEqual(end.positions.at(-1),last.source);
      assert.equal(factoryLoadingPose(plan,plan.stopAt-.00000001).currentIndex,plan.units.length-1);
      for(let i=0;i<plan.units.length-1;i++)assert.deepEqual(end.positions[i],[plan.units[i].target[0]-plan.exitDistance,plan.units[i].target[1],plan.units[i].target[2]]);
    }
    for(const time of [plan.stopAt,plan.stopAt+4,plan.departureAt,plan.departureAt+4,plan.duration]){
      const pose=factoryLoadingPose(plan,time);assert(!pose.phase.includes('Carga completa'));assert(pose.carrier.every(Number.isFinite));
      assert.equal(pose.loadedKg,stopped.loadedKg);if(time<=plan.departureAt)assert.equal(pose.departureX,0);
      if(time>=plan.departureAt)assert.equal(pose.clearFraction,1);
    }
    assert.deepEqual(factoryLoadingPose(plan,0),initial,'seeking back must reset the omission, equipment and departure');
    assert.equal(factoryLoadingPose(plan,NaN).time,0);assert.equal(factoryLoadingPose(plan,plan.duration-.00000001).finished,true);
  }
});

test('incomplete native scenes leave the omitted product behind and move truck, fixtures and loaded products together',()=>{
  for(const truck of collectionTrucks){
    const plan=incompleteFactoryPlan(factoryLoadingPlan(truck)!),model=buildCollectionTruck(truck,true,false,undefined,true),cell=buildFactoryScene(truck,plan,model);
    const initial=factoryLoadingPose(plan,0);animateFactoryScene(cell,initial);
    const start=cell.goods.map(g=>g.position.toArray());
    const end=factoryLoadingPose(plan,plan.duration);animateFactoryScene(cell,end);cell.root.updateMatrixWorld(true);model.updateMatrixWorld(true);
    assert.equal(model.position.x,end.departureX);assert.equal(cell.vehicleFixtures.position.x,end.departureX);
    if(plan.flow){
      assert.equal(cell.stream.visible,false);assert.equal(cell.connection.rotation.x,Math.PI/2);
      if(plan.litres)assert(Math.abs(cell.fillCap!.userData.volumeLitres-plan.litres*.75)<1e-6);
    }else{
      assert.deepEqual(cell.goods.at(-1)!.position.toArray(),plan.units.at(-1)!.source);
      cell.goods.forEach((g,i)=>{assert.deepEqual(g.position.toArray(),end.positions[i]);assert.deepEqual(g.scale.toArray(),[1,1,1]);});
    }
    if(plan.method==='rear'){assert.equal(cell.doors[0].rotation.y,-Math.PI/2);assert(cell.beams.every(b=>b.scale.x>0));}
    if(plan.method==='ramp'){
      assert(Math.abs(cell.ramp.rotation.z)<1e-8);const stationary=cell.ramp.position.toArray(),length=cell.ramp.scale.x;
      animateFactoryScene(cell,factoryLoadingPose(plan,plan.departureAt));assert.deepEqual(cell.ramp.position.toArray(),stationary);assert.equal(cell.ramp.scale.x,length);
    }
    animateFactoryScene(cell,initial);assert.equal(model.position.x,0);assert.equal(cell.vehicleFixtures.position.x,0);assert.deepEqual(cell.goods.map(g=>g.position.toArray()),start);assert(cell.doors.every(d=>d.rotation.y===0));
    disposeCollectionTruck(model);cell.dispose();
  }
});

test('articulated wrist keeps fixed links and the gripper on the exact cargo attachment while seeking',()=>{
  for(const id of ['cm-medical-van','cm-aero-dryvan']){
    const truck=collectionTrucks.find(t=>t.id===id)!,plan=factoryLoadingPlan(truck)!,model=buildCollectionTruck(truck,true,false,undefined,true),cell=buildFactoryScene(truck,plan,model),unit=plan.units[0],angles=new Set<string>();
    for(const move of unit.moves)for(const fraction of [0,.25,.5,.75,1]){
      const pose=factoryLoadingPose(plan,move.start+(move.end-move.start)*fraction);animateFactoryScene(cell,pose);cell.root.updateMatrixWorld(true);
      const elbow=new Vector3(cell.linkLength,0,0).applyMatrix4(cell.arms[0].matrixWorld),tip=new Vector3(cell.linkLength,0,0).applyMatrix4(cell.arms[1].matrixWorld),expected=new Vector3(pose.carrier[0],pose.carrier[1]+plan.size[2]/2+.115,pose.carrier[2]);
      assert(elbow.distanceTo(cell.arms[1].getWorldPosition(new Vector3()))<1e-8);assert(tip.distanceTo(expected)<1e-8);
      assert(cell.arms.every(arm=>arm.scale.equals(new Vector3(1,1,1))));angles.add(cell.arms[0].rotation.y.toFixed(4));
    }
    assert(angles.size>5,'wrist articulates through the transfer instead of remaining rigid');
    const pose=factoryLoadingPose(plan,(unit.graspAt+unit.settleAt)/2);animateFactoryScene(cell,pose);const first=cell.arms.map(a=>[...a.position.toArray(),a.rotation.y]);animateFactoryScene(cell,factoryLoadingPose(plan,plan.duration));animateFactoryScene(cell,pose);assert.deepEqual(cell.arms.map(a=>[...a.position.toArray(),a.rotation.y]),first);
    disposeCollectionTruck(model);cell.dispose();
  }
});

test('mechanical details and factory fixtures have a bounded cost for all four loading methods',()=>{
  for(const id of ['cm-medical-van','cm-coil-well','cm-auto-doubledeck','cm-mini-bowser']){
    const truck=collectionTrucks.find(t=>t.id===id)!,plan=factoryLoadingPlan(truck)!,model=buildCollectionTruck(truck,true,false,undefined,true),cell=buildFactoryScene(truck,plan,model),cargo=new Set<Mesh>();
    cell.goods.forEach(g=>g.traverse(n=>{if(n instanceof Mesh)cargo.add(n);}));let triangles=0,meshes=0;
    cell.root.traverse(n=>{if(!(n instanceof Mesh)||cargo.has(n))return;meshes++;triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;for(const value of n.geometry.attributes.position.array)assert(Number.isFinite(value));});
    assert(triangles>2000&&triangles<45000,`${id}: ${triangles} fixture triangles`);assert(meshes<60,`${id}: ${meshes} fixture meshes`);assert(cell.root.getObjectByName('Factory sign'));assert(cell.root.getObjectByName('Factory glass'));
    disposeCollectionTruck(model);cell.dispose();
  }
});

test('all 60 vehicles use their own cargo, quantity, dimensions, weight and loading method',()=>{
  const methods=new Set<string>(),kinds=new Set<string>();
  for(const truck of collectionTrucks){
    const plan=factoryLoadingPlan(truck);assert(plan,truck.id);methods.add(plan.method);kinds.add(truck.cargo.kind);
    assert.equal(plan.product,truck.cargo.label);assert.deepEqual(plan.size,truck.cargo.unitM);assert.equal(plan.unitKg,truck.cargo.unitKg);assert.equal(plan.units.length,truck.cargo.count);
    assert.equal(plan.litres,truck.cargo.liquidLitres??null);
    assert.deepEqual(new Set(plan.units.map(u=>u.id)),new Set(cargoPlacements(truck).map(u=>u.id)));
    const initial=factoryLoadingPose(plan,0),end=factoryLoadingPose(plan,plan.duration);
    assert.equal(initial.loaded,0);assert.equal(initial.loadedKg,0);assert.equal(end.loaded,truck.cargo.count);assert.equal(end.loadedKg,Math.round(truck.cargo.count*truck.cargo.unitKg*1000)/1000);
    assert.deepEqual(end.positions,plan.units.map(u=>u.target));
    if(plan.flow){
      const half=factoryLoadingPose(plan,(plan.units[0].graspAt+plan.units[0].settleAt)/2);
      assert.equal(half.fillFraction,.5);assert.equal(half.loadedKg,Math.round(truck.cargo.unitKg*.5*1000)/1000);assert.equal(half.loaded,0);
    }else for(let i=0;i<plan.units.length;i++){
      const u:FactoryLoadingPlan['units'][number]=plan.units[i];assert.equal(factoryLoadingPose(plan,u.releaseAt-.001).loaded,i);assert.equal(factoryLoadingPose(plan,u.releaseAt).loaded,i+1);
    }
  }
  assert.equal(methods.size,4);assert(kinds.size>35);
  assert.equal(factoryLoadingPlan(collectionTrucks.find(t=>t.id==='cm-coil-well')!)!.method,'crane');
  assert.equal(factoryLoadingPlan(collectionTrucks.find(t=>t.id==='cm-tractor-stepdeck')!)!.method,'ramp');
  assert.equal(factoryLoadingPlan(collectionTrucks.find(t=>t.id==='cm-food-stainless')!)!.flow,'liquid');
});

test('discrete cargo never intersects another unit along the metric path or crosses a closed body',()=>{
  for(const truck of collectionTrucks){
    const plan=factoryLoadingPlan(truck)!;if(plan.flow)continue;
    const [a,b,c]=plan.size,extents=[a,c,b];let previous=0;
    for(let time=0;time<=plan.duration+.12;time+=.12){
      const pose=factoryLoadingPose(plan,time);assert.equal(pose.positions.length,plan.units.length);assert(pose.loaded>=previous);previous=pose.loaded;
      assert.equal(pose.loadedKg,Math.round(pose.loaded*plan.unitKg*1000)/1000);
      for(let i=0;i<pose.positions.length;i++){
        const p=pose.positions[i];assert(p.every(Number.isFinite));
        if(plan.method==='rear'&&p[0]-a/2<plan.rear&&p[0]+a/2>plan.front){
          assert(p[0]-a/2>=plan.front-1e-6,`${truck.id}: front wall`);
          assert(Math.abs(p[2])+b/2<=plan.innerWidth/2+1e-6,`${truck.id}: side wall`);
          assert(p[1]-c/2>=plan.floor-1e-6,`${truck.id}: deck`);
          assert(p[1]+c/2+.18<=plan.floor+plan.openingHeight+1e-6,`${truck.id}: opening`);
        }
        for(let j=i+1;j<pose.positions.length;j++)assert(p.some((v,axis)=>Math.abs(v-pose.positions[j][axis])>=extents[axis]-.00001),`${plan.truckId}: units ${i}/${j} intersect at ${time}`);
      }
    }
  }
});

test('backward seek resets stock and counters, and midpoint interpolation is continuous',()=>{
  const plan=factoryLoadingPlan(collectionTrucks[1])!,u=plan.units[0],move=u.moves.find(m=>m.label==='Entrar en el camión')!;
  const midpoint=factoryLoadingPose(plan,(move.start+move.end)/2);
  assert.deepEqual(midpoint.carrier,move.from.map((v,i)=>(v+move.to[i])/2));assert.deepEqual(midpoint.positions[0],midpoint.carrier);
  assert.equal(factoryLoadingPose(plan,plan.duration+100).loaded,8);
  assert.equal(factoryLoadingPose(plan,plan.duration-.00000001).finished,true);
  const reset=factoryLoadingPose(plan,0);assert.equal(reset.loaded,0);assert.deepEqual(reset.positions,plan.units.map(u=>u.source));
  assert.equal(factoryLoadingPose(plan,u.releaseAt).loaded,1);assert.equal(factoryLoadingPose(plan,u.graspAt-.001).loaded,0);
  assert.equal(factoryLoadingPose(plan,-1).time,0);assert.equal(factoryLoadingPose(plan,NaN).loaded,0);assert.equal(factoryLoadingPose(plan,Infinity).loaded,0);
});

test('invalid dimensions, mass or quantities cannot start a loading sequence',()=>{
  const truck=collectionTrucks[1];
  for(const bad of [{...truck,payloadKg:1},{...truck,widthM:NaN},{...truck,cargo:{...truck.cargo,unitM:[0,.4,.4] as const}},{...truck,cargo:{...truck.cargo,count:2.5}},{...truck,cargo:{...truck.cargo,unitM:[.6,.4,3] as const}}])assert.equal(factoryLoadingPlan(bad),null);
  const tank=collectionTrucks.find(t=>t.id==='cm-water-bowser')!;
  for(const liquidLitres of [0,-1,NaN,Infinity,1000000])assert.equal(factoryLoadingPlan({...tank,cargo:{...tank.cargo,liquidLitres}}),null);
});

test('factory reuses each native cargo mesh and never scales a rigid product',()=>{
  for(const truck of collectionTrucks){
    const plan=factoryLoadingPlan(truck)!,model=buildCollectionTruck(truck,true,false,undefined,true);
    const native=plan.units.map(u=>model.getObjectByName(u.id));assert(native.every(u=>u instanceof Group),truck.id);
    const originals=native.map(u=>new Box3().setFromObject(u!));
    const cell=buildFactoryScene(truck,plan,model);assert.deepEqual(cell.goods,native);
    for(const time of [0,plan.duration/2,plan.duration,0]){
      const pose=factoryLoadingPose(plan,time);animateFactoryScene(cell,pose);cell.root.updateMatrixWorld(true);
      if(!plan.flow)cell.goods.forEach((group,i)=>{
        assert.deepEqual(group.scale.toArray(),[1,1,1]);
        if(plan.method!=='ramp'||time===plan.duration||time===0){
          const size=new Box3().setFromObject(group).getSize(new Vector3()),before=originals[i].getSize(new Vector3());assert(size.distanceTo(before)<.00001,`${truck.id}: product resized`);
        }
      });
      if(plan.litres&&pose.fillFraction>0)assert(Math.abs(cell.fillCap!.userData.volumeLitres-plan.litres*pose.fillFraction)<1e-6,truck.id);
    }
    let cargoTriangles=0;cell.goods.forEach(group=>group.traverse(n=>{if(n instanceof Mesh)cargoTriangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;}));assert(cargoTriangles>0);
    disposeCollectionTruck(model);cell.dispose();
  }
});

// Independent checks against the actual support geometry and the two ramp planes.
test('rolling loads retain support through ramp/deck transitions without resizing',()=>{
  for(const truck of collectionTrucks.filter(t=>['cars','tractor','excavator'].includes(t.cargo.kind))){
    const plan=factoryLoadingPlan(truck)!;
    for(const unit of plan.units){
      const climb=unit.moves.find(m=>m.label==='Subir por las rampas')!,advance=unit.moves.find(m=>m.label==='Avanzar sobre la plataforma')!;
      for(let time=climb.start;time<unit.settleAt;time+=.075){
        const pose=factoryLoadingPose(plan,time),[x,y]=pose.positions[pose.currentIndex],theta=pose.pitch;
        const gaps=plan.supports.map(s=>{
          const localY=s.centerY-plan.size[2]/2,wx=x+s.x*Math.cos(theta)-localY*Math.sin(theta),wy=y+s.x*Math.sin(theta)+localY*Math.cos(theta);
          // Sample each tyre's lower semicircle against the piecewise road, independent of the analytic solver.
          let min=Infinity;
          for(let angle=0;angle<=Math.PI;angle+=Math.PI/800){
            const px=wx+s.radius*Math.cos(angle),py=wy-s.radius*Math.sin(angle);
            const j=unit.road!.findIndex((p,j)=>j>0&&px>=unit.road![j-1][0]&&px<=p[0]);if(j<1)continue;
            const [x0,y0]=unit.road![j-1],[x1,y1]=unit.road![j],surface=y0+(y1-y0)*(px-x0)/(x1-x0);min=Math.min(min,py-surface);
          }
          return min;
        });
        assert(gaps.every(g=>g>=-.00001),`${truck.id}: support penetrated road at ${time}`);
        if(plan.supports.length===2)assert(gaps.every(g=>g<.002),`${truck.id}: floating wheel at ${time}: ${gaps}`);
        else assert(Math.min(...gaps)<.003,`${truck.id}: tracks have no support`);
      }
      const crest=factoryLoadingPose(plan,advance.start);
      assert(Math.abs(crest.pitch)<.0001,`${truck.id}: pitch not flat after rear support clears crest`);
      assert.equal(crest.loaded,plan.units.indexOf(unit));
    }
  }
});

test('car carrier staging stays compact without scaling or overlapping parked vehicles',()=>{
  const truck=collectionTrucks.find(t=>t.id==='cm-auto-doubledeck')!,plan=factoryLoadingPlan(truck)!;
  assert.equal(new Set(plan.units.map(u=>u.source[0])).size,1);
  assert(Math.max(...plan.units.map(u=>u.source[0]))+plan.size[0]/2-plan.rear<plan.rampLength+plan.size[0]+1.01);
  for(let i=1;i<plan.units.length;i++)assert(plan.units[i].source[2]-plan.units[i-1].source[2]>plan.size[1]);
});
