import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {buildDetailedLoad,buildTransportLoad} from './cargo-models';
import {collectionTrucks} from './catalog';

for(const kind of ['cars','excavator','tractor','flowers','plants','bottles','glass','panels','cable','drums','ibc','lumber','pipes','tools','meat'] as const)test(`${kind}: detailed visible parts remain inside the declared cargo envelope`,()=>{
  const truck=collectionTrucks.find(t=>t.cargo.kind===kind)!,[a,w,h]=truck.cargo.unitM;
  const group=new T.Group(),material=new T.MeshBasicMaterial();
  const add:Parameters<typeof buildDetailedLoad>[3]['add']=(g,part,p=[0,0,0],rotation=[0,0,0])=>{const m=new T.Mesh(g,material);m.name=part;m.position.set(...p);m.rotation.set(...rotation);group.add(m);};
  const builder:Parameters<typeof buildDetailedLoad>[3]={
    add,
    box:(s,p,m,r=0,rot=[0,0,0])=>add(r?new RoundedBoxGeometry(...s,1,Math.min(r,...s.map(v=>v/3))):new T.BoxGeometry(...s),m,p,rot),
    cylinder:(r,length,p,m,rot=[0,0,0],segments=20)=>add(new T.CylinderGeometry(r,r,length,segments),m,p,rot),
    ring:(r,tube,p,m,rot=[0,0,0])=>add(new T.TorusGeometry(r,tube,6,32),m,p,rot),
    bar:(p,q,r,m)=>{const start=new T.Vector3(...p),end=new T.Vector3(...q),d=end.clone().sub(start),g=new T.CylinderGeometry(r,r,d.length(),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));add(g,m,start.add(end).multiplyScalar(.5).toArray() as [number,number,number]);},
  };
  if(kind==='cars'||kind==='excavator'||kind==='tractor')buildDetailedLoad(kind,truck.cargo.unitM,[0,0,0],builder);
  else assert.equal(buildTransportLoad(kind,truck.cargo.unitM,[0,0,0],0,builder),true);
  const bounds=new T.Box3().setFromObject(group),epsilon=.012;
  assert.ok(bounds.min.x>=-a/2-epsilon&&bounds.max.x<=a/2+epsilon,`${kind}: longitudinal envelope`);
  assert.ok(bounds.min.z>=-w/2-epsilon&&bounds.max.z<=w/2+epsilon,`${kind}: transverse envelope`);
  assert.ok(bounds.min.y>=-epsilon&&bounds.max.y<=h+epsilon,`${kind}: height/floor envelope`);
  group.updateMatrixWorld(true);
  if(kind==='ibc')assert.equal(new T.Raycaster(new T.Vector3(-a/2-.10,.075,0),new T.Vector3(1,0,0),0,a+.20).intersectObject(group).length,0,'forklift opening must remain hollow');
  if(kind==='pipes'){
    const pipe=group.children.find(n=>n.name==='load')!,box=new T.Box3().setFromObject(pipe),center=box.getCenter(new T.Vector3());
    const inner=new T.Raycaster(center,new T.Vector3(0,1,0)).intersectObject(pipe)[0];
    const outer=new T.Raycaster(center.clone().add(new T.Vector3(0,w,0)),new T.Vector3(0,-1,0)).intersectObject(pipe)[0];
    assert(inner&&outer&&outer.point.y-inner.point.y>.002,'pipe must have distinct bore and outside surfaces');
  }
  group.traverse(o=>{if(o instanceof T.Mesh){for(const n of o.geometry.attributes.position.array)assert.ok(Number.isFinite(n));o.geometry.dispose();}});material.dispose();
});
