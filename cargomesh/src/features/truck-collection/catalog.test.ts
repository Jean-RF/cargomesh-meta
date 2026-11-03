import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { Box3, Mesh, Raycaster, Vector3, type MeshStandardMaterial } from 'three';
import { collectionTrucks, cargoMassKg } from './catalog';
import { buildCollectionTruck, cargoPlacements, disposeCollectionTruck, liquidFillLevel, truckLayout } from './model';
import { buildVehicleCab } from './cab-models';
import {buildSeatedDriver} from './driver-model';
import { tankDimensions } from './vehicle-designs';

test('driver eyes remain visible in front of the skin sockets',()=>{
  for(const truck of collectionTrucks){
    const serial=Number(truck.driver.id.slice(-3)),width=.94+(serial%7)*.018,height=.96+(serial%5)*.017;
    const meshes:Mesh[]=[];
    buildSeatedDriver(truck,[0,1.7,0],(geometry,part,at,rotation)=>{
      const mesh=new Mesh(geometry);mesh.name=part;if(at)mesh.position.fromArray(at);if(rotation)mesh.rotation.set(...rotation);mesh.updateMatrixWorld();meshes.push(mesh);
    });
    try{
      for(const side of [-1,1]){
        const ray=new Raycaster(new Vector3(-.25,1.7+.019*height,side*.032*width),new Vector3(1,0,0),0,.30);
        const whites=ray.intersectObjects(meshes.filter(m=>m.name==='white')),skin=ray.intersectObjects(meshes.filter(m=>m.name==='skin'));
        assert(whites.length&&(!skin.length||whites[0].distance<skin[0].distance),`${truck.driver.id}: eye buried behind skin`);
      }
    }finally{for(const m of meshes){m.geometry.dispose();(m.material as MeshStandardMaterial).dispose();}}
  }
});

test('drivers have a shoulder belt crossing the front of the torso',()=>{
  const meshes:Mesh[]=[];
  buildSeatedDriver(collectionTrucks[0],[0,1.7,0],(geometry,part,at,rotation)=>{
    const mesh=new Mesh(geometry);mesh.name=part;if(at)mesh.position.fromArray(at);if(rotation)mesh.rotation.set(...rotation);mesh.updateMatrixWorld();meshes.push(mesh);
  });
  try{
    const ray=new Raycaster(new Vector3(-.30,1.7-.46,-.01),new Vector3(1,0,0),0,.25);
    assert(ray.intersectObjects(meshes.filter(m=>m.name==='rubber')).length,'missing shoulder belt across the chest');
  }finally{for(const m of meshes){m.geometry.dispose();(m.material as MeshStandardMaterial).dispose();}}
});

test('hair and folded clothing retain valid surface normals',()=>{
  for(const truck of [collectionTrucks[1],collectionTrucks[2]])buildSeatedDriver(truck,[0,1.7,0],(geometry,part)=>{
    try{
      if(part==='hair'||part==='uniform'){
        const normal=geometry.attributes.normal;assert(normal);
        for(let i=0;i<normal.count;i++)assert(Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i))>.8,`${truck.id}: invalid ${part} surface normal`);
      }
    }finally{geometry.dispose();}
  });
});

test('long trailers keep a compact clearance behind their licensed cab',()=>{
  for(const truck of collectionTrucks.filter(t=>t.size==='large')){
    const layout=truckLayout(truck),clearance=layout.start-layout.cabEnd;
    assert(clearance>=.35&&clearance<=.85,`${truck.id}: ${clearance.toFixed(2)}m cab-to-trailer gap`);
  }
});

test('the coil carrier has a continuous floor between its cradles and side walkways',()=>{
  const truck=collectionTrucks.find(t=>t.id==='cm-coil-well')!,layout=truckLayout(truck);
  for(const reveal of [false,true]){
    const model=buildCollectionTruck(truck,reveal,true);model.updateMatrixWorld(true);
    try{
      for(const fraction of [.04,.24,.48,.76,.96])for(const z of [-.65,0,.65]){
        const x=layout.start+truck.bodyLengthM*fraction;
        const ray=new Raycaster(new Vector3(x,layout.floor+.10,z),new Vector3(0,-1,0),0,.16);
        assert(ray.intersectObject(model).some(hit=>hit.point.y>=layout.floor-.025),`missing coil-carrier floor at ${fraction}, ${z}, reveal=${reveal}`);
      }
    }finally{disposeCollectionTruck(model);}
  }
});

test('60 new display designs have a 20/20/20 split and distinct types, names, colors and drivers',()=>{
  assert.equal(collectionTrucks.length,60);
  for(const size of ['small','medium','large'])assert.equal(collectionTrucks.filter(t=>t.size===size).length,20);
  for(const values of [collectionTrucks.map(t=>t.id),collectionTrucks.map(t=>t.model),collectionTrucks.map(t=>t.type),collectionTrucks.map(t=>t.color),collectionTrucks.map(t=>t.driver.id),collectionTrucks.map(t=>t.driver.name),collectionTrucks.map(t=>t.plate)])assert.equal(new Set(values).size,60);
  for(const t of collectionTrucks){assert.equal(t.source,'SYNTHETIC_DESIGN');assert.ok(t.driver.years>=2);assert.ok(cargoMassKg(t)>0&&cargoMassKg(t)<=t.payloadKg);}
});

test('every counted load fits its bed in metres without overlap or hidden scaling',()=>{
  for(const t of collectionTrucks){
    const l=truckLayout(t),items=cargoPlacements(t);assert.equal(items.length,t.cargo.count);
    for(const item of items){const [x,y,z]=item.position,[a,b,c]=item.size;
      assert.ok(x-a/2>=l.cargoStart-.001&&x+a/2<=l.cargoEnd+.001,`${t.id}: length`);
      assert.ok(Math.abs(z)+b/2<=l.innerWidth/2+.001,`${t.id}: width`);
      assert.ok(y-c/2>=l.floor-.001,`${t.id}: floor`);
      assert.ok(y+c/2<=l.floor+(t.id==='cm-auto-doubledeck'?3.3:t.bodyHeightM)+.001,`${t.id}: height`);
    }
    for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++)assert.ok(items[i].position.some((p,k)=>{const axis=[0,2,1][k];return Math.abs(p-items[j].position[k])>=(items[i].size[axis]+items[j].size[axis])/2-.001;}),`${t.id}: overlapping cargo ${i}/${j}`);
  }
});

test('all sixty assemblies have distinct finite geometry, a visible driver and bounded draw calls',()=>{
  const signatures=new Set<string>();
  for(const t of collectionTrucks){
    const model=buildCollectionTruck(t),hash=createHash('sha256');let triangles=0,meshes=0,disposals=0;
    model.traverse(node=>{if(!(node instanceof Mesh))return;meshes++;const g=node.geometry;
      triangles+=(g.index?.count??g.attributes.position.count)/3;
      for(const attribute of ['position','normal'])for(const value of g.attributes[attribute].array)assert.ok(Number.isFinite(value),`${t.id}: ${attribute}`);
      hash.update(Buffer.from(g.attributes.position.array.buffer));
      g.addEventListener('dispose',()=>disposals++);
    });
    const bounds=new Box3().setFromObject(model);
    assert.ok(bounds.min.y>-.1&&bounds.max.y>=t.design.roof-.1,t.id);
    assert.ok(bounds.max.x-bounds.min.x>=t.lengthM,t.id);
    // Keep the downstream GLB importer's 200k limit; anatomy is offset by simpler hidden bevels.
    assert.ok(triangles>3000&&triangles<=200000,`${t.id}: ${triangles} triangles`);
    assert.ok(meshes<=20);assert.ok(model.getObjectByName('skin'));assert.ok(model.getObjectByName('uniform'));
    assert.equal(model.userData.cabGeometry.anatomy.pose,'seated-steering');
    assert.match(model.userData.cabGeometry.anatomy.source,/Dan Ulrich \/ CC0-1.0/);
    assert.equal(model.userData.driverId,t.driver.id);assert.equal(model.userData.cargoCount,t.cargo.count);
    signatures.add(hash.digest('hex'));disposeCollectionTruck(model);assert.equal(disposals,meshes);
  }
  assert.equal(signatures.size,60,'A repaint alone is not a new geometry');
});

test('anatomical hands reach both sides of the steering wheel in three cab families',()=>{
  for(const id of ['cm-courier-van','cm-regional-shutter','cm-iso-container']){
    const t=collectionTrucks.find(t=>t.id===id)!,m=buildCollectionTruck(t),[x,y,z]=m.userData.cabGeometry.head;
    const p=(m.getObjectByName('skin') as Mesh).geometry.attributes.position;
    for(const side of [-1,1]){
      let touches=0;
      for(let i=0;i<p.count;i++)if(Math.hypot(p.getX(i)-(x-.40),p.getY(i)-(y-.40),p.getZ(i)-(z+side*.145))<.09)touches++;
      assert.ok(touches>20,`${id}: hand ${side} misses steering wheel`);
    }
    disposeCollectionTruck(m);
  }
});

test('driver seats have an interior floor below the pedals in three cab families',()=>{
  for(const id of ['cm-courier-van','cm-regional-shutter','cm-iso-container']){
    const t=collectionTrucks.find(t=>t.id===id)!,m=buildCollectionTruck(t),[x,y,z]=m.userData.cabGeometry.head;
    m.updateMatrixWorld(true);
    const ray=new Raycaster(new Vector3(x-.43,y-1.10,z+.10),new Vector3(0,-1,0),0,.14);
    assert.ok(ray.intersectObject(m.getObjectByName('frame')!).length,`${id}: unsupported driver's footwell`);
    disposeCollectionTruck(m);
  }
});

test('posing never stretches skin triangles from the hands toward the legs',()=>{
  const t=collectionTrucks.find(t=>t.id==='cm-regional-shutter')!,m=buildCollectionTruck(t);
  const g=(m.getObjectByName('skin') as Mesh).geometry,p=g.attributes.position,index=g.index!;
  let longest=0;
  for(let i=0;i<index.count;i+=3)for(let edge=0;edge<3;edge++){
    const a=index.getX(i+edge),b=index.getX(i+(edge+1)%3);
    longest=Math.max(longest,Math.hypot(p.getX(a)-p.getX(b),p.getY(a)-p.getY(b),p.getZ(a)-p.getZ(b)));
  }
  disposeCollectionTruck(m);assert.ok(longest<.12,`anatomical skin edge stretched to ${longest} metres`);
});

test('outer toes follow the seated legs even when the head is low in a short cab',()=>{
  const truck=collectionTrucks.find(t=>t.id==='cm-orchard-dropside')!;let lowest=Infinity;
  buildSeatedDriver(truck,[0,1.4,0],(geometry,part,at,rotation)=>{
    const mesh=new Mesh(geometry);if(at)mesh.position.fromArray(at);if(rotation)mesh.rotation.set(...rotation);mesh.updateMatrixWorld();
    if(part==='frame')for(let i=0;i<(geometry.index?.count??geometry.attributes.position.count);i++){
      const index=geometry.index?.getX(i)??i;
      lowest=Math.min(lowest,new Vector3().fromBufferAttribute(geometry.attributes.position,index).applyMatrix4(mesh.matrixWorld).y);
    }
    (mesh.material as MeshStandardMaterial).dispose();
    geometry.dispose();
  });
  assert(lowest>.15,`unposed toe below the pedal area: ${lowest}`);
});

test('each declared parcel retains one unique shipping label',()=>{
  const t=collectionTrucks.find(t=>t.id==='cm-courier-van')!,m=buildCollectionTruck(t);
  assert.equal(m.userData.printedBarcodes.length,t.cargo.count);
  assert.equal(new Set(m.userData.printedBarcodes).size,t.cargo.count);
  assert.deepEqual(m.userData.printedBarcodes,cargoPlacements(t).map(p=>p.barcode));
  disposeCollectionTruck(m);
});

test('inspection opens enclosed walls and preserves the declared load and driver',()=>{
  for(const id of ['cm-courier-van','cm-ibc-carrier','cm-mini-bowser','cm-iso-container']){
    const t=collectionTrucks.find(t=>t.id===id)!,closed=buildCollectionTruck(t),open=buildCollectionTruck(t,true);
    assert.equal(open.userData.cargoCount,closed.userData.cargoCount);assert.equal(open.userData.driverId,closed.userData.driverId);
    if(t.form==='tank')assert.equal(((open.getObjectByName('body') as Mesh).material as MeshStandardMaterial).transparent,true);
    disposeCollectionTruck(closed);disposeCollectionTruck(open);
  }
});

test('liquid cross-section solves volume fraction rather than using a decorative fill level',()=>{
  for(const fraction of [.05,.2,.5,.8,.95]){
    const h=liquidFillLevel(fraction),area=(Math.acos(-h)+h*Math.sqrt(1-h*h))/Math.PI;
    assert.ok(Math.abs(area-fraction)<1e-8);
  }
  for(const t of collectionTrucks.filter(t=>t.cargo.liquidLitres)){
    const tank=tankDimensions(t),rx=tank.rx-.025,ry=tank.ry-.025;
    assert.ok(t.cargo.liquidLitres!<Math.PI*rx*ry*(tank.length-.05)*1000,t.id);
  }
});

test('all sixty faces remain visible through side glazing with seats and sleepers behind them',()=>{
  for(const t of collectionTrucks){
    const model=buildCollectionTruck(t);model.updateMatrixWorld(true);
    const skin=model.getObjectByName('skin') as Mesh,paint=model.getObjectByName('paint') as Mesh,seat=model.getObjectByName('seat') as Mesh;
    const [x,y]=model.userData.cabGeometry.head;
    for(const offset of [.035,-.025]){
      const ray=new Raycaster(new Vector3(x,y+offset,t.widthM+1),new Vector3(0,0,-1));
      const face=ray.intersectObject(skin),shell=ray.intersectObject(paint),interior=ray.intersectObject(seat);
      assert.ok(face.length,`${t.id}: head must intersect the sightline`);
      assert.ok(!shell.length||shell[0].distance>face[0].distance,`${t.id}: paint hides face`);
      assert.ok(!interior.length||interior[0].distance>face[0].distance,`${t.id}: sleeper hides face`);
    }
    disposeCollectionTruck(model);
  }
});

test('legacy cab geometry stays distinct and the collection selects multiple licensed bases per size',()=>{
  const hashes=new Set<string>();
  for(const size of ['small','medium','large'])assert.ok(new Set(collectionTrucks.filter(t=>t.size===size).map(t=>t.cabBase)).size>=2);
  for(const t of collectionTrucks){
    const hash=createHash('sha256'),l=truckLayout(t);
    buildVehicleCab(t,0,l.radius,(g,part,p,rot)=>{
      if(['paint','frame','glass','metal'].includes(part)){
        hash.update(Buffer.from(g.attributes.position.array.buffer));hash.update(JSON.stringify([p,rot]));
      }
      g.dispose();
    });
    hashes.add(hash.digest('hex'));
  }
  assert.equal(hashes.size,60);
});

test('neutral comparison removes merchandise while retaining body, cab and the assigned person',()=>{
  for(const id of ['cm-courier-van','cm-gravel-halfpipe','cm-fuel-multicell','cm-iso-container']){
    const t=collectionTrucks.find(t=>t.id===id)!,model=buildCollectionTruck(t,false,true);
    assert.equal(model.getObjectByName('load'),undefined,id);
    for(const part of ['paint','frame','skin','uniform'])assert.ok(model.getObjectByName(part),`${id}: ${part}`);
    assert.equal(model.userData.driverId,t.driver.id);assert.equal(model.userData.hideCargo,true);disposeCollectionTruck(model);
  }
});

test('loose loads follow the curved or tapered body instead of intersecting its lower sidewalls',()=>{
  for(const id of ['cm-landscape-tipper','cm-gravel-halfpipe','cm-sand-threeway','cm-skip-loader','cm-grain-hopper']){
    const t=collectionTrucks.find(t=>t.id===id)!,model=buildCollectionTruck(t),load=model.getObjectByName('load') as Mesh,l=truckLayout(t);
    const p=load.geometry.attributes.position,wall=t.size==='small'?.50:t.size==='medium'?1.2:1.9;
    for(let i=0;i<p.count;i++){
      const y=p.getY(i)-l.floor,z=Math.abs(p.getZ(i));
      assert.ok(y>=.025&&y<wall,`${id}: vertical containment`);
      const limit=id==='cm-gravel-halfpipe'?(t.widthM/2-.06)*Math.sqrt(Math.max(0,1-Math.pow((y-wall)/wall,2))):t.size==='small'?t.widthM/2-.075:t.widthM*.34+(t.widthM*.16-.06)*y/wall;
      assert.ok(z<limit-.01,`${id}: bulk intersects sidewall`);
    }
    disposeCollectionTruck(model);
  }
});

test('closed rear portals block the door seam and the shoulder below the crowned roof',()=>{
  for(const id of ['cm-courier-van','cm-urban-curtain','cm-regional-shutter','cm-aero-dryvan']){
    const t=collectionTrucks.find(t=>t.id===id)!,model=buildCollectionTruck(t),l=truckLayout(t);
    model.updateMatrixWorld(true);
    for(const [y,z] of [[l.floor+t.bodyHeightM*.45,0],[l.floor+t.bodyHeightM-.035,.08]]){
      const ray=new Raycaster(new Vector3(l.rear+.35,y,z),new Vector3(-1,0,0),0,.50);
      const hits=ray.intersectObject(model).filter(hit=>['body','rubber','metal'].includes(hit.object.name));
      assert(hits.length,`${id}: daylight through closed rear at ${y}, ${z}`);
    }
    disposeCollectionTruck(model);
  }
});

test('every sheet package has a padded bearing surface on the unloaded carrier',()=>{
  for(const id of ['cm-glass-stand','cm-panel-a-frame']){
    const t=collectionTrucks.find(t=>t.id===id)!,model=buildCollectionTruck(t,false,true),l=truckLayout(t);
    model.updateMatrixWorld(true);
    for(const item of cargoPlacements(t)){
      const ray=new Raycaster(new Vector3(item.position[0],l.floor+.20,item.position[2]),new Vector3(0,-1,0),0,.12);
      assert(ray.intersectObject(model.getObjectByName('rubber')!).length,`${id}: unsupported package ${item.id}`);
    }
    disposeCollectionTruck(model);
  }
});

test('the folded crane and its hook stay outside all five ceramic pallet volumes',()=>{
  const t=collectionTrucks.find(t=>t.id==='cm-tile-knuckle')!,model=buildCollectionTruck(t,false,true),point=new Vector3();
  const volumes=cargoPlacements(t).map(item=>new Box3(new Vector3(item.position[0]-item.size[0]/2+.01,item.position[1]-item.size[2]/2+.18,item.position[2]-item.size[1]/2+.01),new Vector3(item.position[0]+item.size[0]/2-.01,item.position[1]+item.size[2]/2-.01,item.position[2]+item.size[1]/2-.01)));
  for(const part of ['paint','metal']){
    const p=(model.getObjectByName(part) as Mesh).geometry.attributes.position;
    for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i);assert(!volumes.some(v=>v.containsPoint(point)),`fixed ${part} invades ceramic load`);}
  }
  disposeCollectionTruck(model);
});

test('low beds reserve their axle bridge and their neck, without consuming the counted load',()=>{
  for(const t of collectionTrucks.filter(t=>t.form==='lowbed')){
    const l=truckLayout(t),trailer=t.axles-1-t.driveAxles;
    const firstAxle=l.rear-1-(trailer-1)*1.19;
    const lastDrive=Math.max(l.cabEnd+.30,l.front+4.55)+(t.driveAxles-1)*1.18;
    assert(l.cargoStart>lastDrive+l.radius+.12,`${t.id}: lowered floor overlaps the tractor tyres`);
    assert.ok(l.cargoEnd<=firstAxle-l.radius-.075,`${t.id}: low deck overlaps tyre envelope`);
    assert.ok(l.floor+l.bridgeLift-.12>=l.radius*2+.02,`${t.id}: axle bridge intersects tyre crown`);
    const items=cargoPlacements(t);assert.equal(items.length,t.cargo.count);
    for(const item of items){assert.ok(item.position[0]-item.size[0]/2>=l.cargoStart);assert.ok(item.position[0]+item.size[0]/2<=l.cargoEnd);}
  }
});

test('low-bed floors remain closed with chassis members below the usable surface',()=>{
  for(const truck of collectionTrucks.filter(t=>t.form==='lowbed')){
    const layout=truckLayout(truck),model=buildCollectionTruck(truck,true,true);model.updateMatrixWorld(true);
    try{
      for(const fraction of [.12,.37,.63,.88])for(const z of [-.35,0,.35]){
        const x=layout.cargoStart+layout.innerLength*fraction;
        const ray=new Raycaster(new Vector3(x,layout.floor+.20,z),new Vector3(0,-1,0),0,.22);
        const hit=ray.intersectObject(model)[0];
        assert(hit,`${truck.id}: open low-bed floor`);
        assert(hit.point.y<=layout.floor+.18,`${truck.id}: chassis protrudes above the deck`);
      }
    }finally{disposeCollectionTruck(model);}
  }
});

test('the crowned bonnet nose is closed above the grille in the rejected front sightlines',()=>{
  for(const [id,y] of [['cm-coil-well',1.905],['cm-courier-van',1.065]] as const){
    const t=collectionTrucks.find(t=>t.id===id)!,model=buildCollectionTruck(t);model.updateMatrixWorld(true);
    const ray=new Raycaster(new Vector3(truckLayout(t).front-.3,y,0),new Vector3(1,0,0));
    const hits=ray.intersectObject(model.getObjectByName('paint')!);
    assert.ok(hits.length&&hits[0].distance<.5,`${id}: visible opening under the bonnet crown`);disposeCollectionTruck(model);
  }
  const t=collectionTrucks.find(t=>t.id==='cm-courier-van')!,model=buildCollectionTruck(t);model.updateMatrixWorld(true);
  const corner=new Raycaster(new Vector3(truckLayout(t).front+.045,.77,1.05),new Vector3(0,0,-1),0,.5);
  assert.ok(corner.intersectObject(model.getObjectByName('paint')!).length,'courier: missing side transition between raked nose and bonnet');disposeCollectionTruck(model);
});
