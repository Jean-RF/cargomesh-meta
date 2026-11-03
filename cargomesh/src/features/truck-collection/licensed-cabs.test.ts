import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadImage} from '@napi-rs/canvas';
import {Box3,Mesh,Vector3} from 'three';
import bases from '../../../public/truck-cabs/bases.json';
import {inspectTruckGlb} from '../logistics-3d/truck-glb';
import {collectionTrucks} from './catalog';
import {loadLicensedCab} from './licensed-cabs';
import {buildCollectionTruck,disposeCollectionTruck,truckLayout} from './model';

test('licensed cab assets remain attributed, embedded and proportional across all five bases',async()=>{
  const bitmap=globalThis.createImageBitmap;
  const self=Object.getOwnPropertyDescriptor(globalThis,'self');
  Object.defineProperty(globalThis,'self',{configurable:true,value:globalThis});
  globalThis.createImageBitmap=(async(blob:Blob)=>loadImage(Buffer.from(await blob.arrayBuffer()))) as unknown as typeof createImageBitmap;
  const read=async(file:string)=>{const b=await readFile(new URL(`../../../public/truck-cabs/${file}`,import.meta.url));return Uint8Array.from(b).buffer;};
  try{
    assert.equal(new Set(collectionTrucks.map(t=>t.cabBase)).size,5);
    for(const [base,spec] of Object.entries(bases)){
      const buffer=await read(spec.file),data=Buffer.from(buffer),stats=inspectTruckGlb(buffer);
      assert(stats.triangles<60000&&stats.meshes<=6,base);
      assert.equal(createHash('sha256').update(data).digest('hex'),spec.sha256);
      const json=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString('utf8'));
      assert(json.images.length<=3,base);
      assert(json.nodes.some((n:{extras?:{license?:string}})=>n.extras?.license==='CC-BY-4.0'),base);
      const truck=collectionTrucks.find(t=>t.cabBase===base)!;
      const cab=await loadLicensedCab(truck,read),layout=truckLayout(truck),bounds=new Box3().setFromObject(cab.model);
      assert(bounds.max.x<=layout.cabEnd+.20,`${base}: cab crosses load-bed boundary ${bounds.max.x} > ${layout.cabEnd}`);
      assert(cab.head[1]<bounds.max.y&&cab.head[0]>bounds.min.x&&cab.head[0]<bounds.max.x,`${base}: head outside cabin`);
      const model=buildCollectionTruck(truck,false,false,cab);model.updateMatrixWorld(true);
      let triangles=0,meshes=0;
      model.traverse(n=>{if(n instanceof Mesh){triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;meshes++;}});
      assert(triangles<=200000&&meshes<=64,base);
      const wheels=model.children.filter(n=>n.name==='wheel-left'||n.name==='wheel-right');
      assert(wheels.length>=2,base);
      for(const wheel of wheels){
        const size=new Box3().setFromObject(wheel).getSize(new Vector3());
        assert(Math.abs(size.y-layout.radius*2)<.14&&Math.abs(size.x-layout.radius*2)<.14,`${base}: rear tyre rotated or resized incorrectly ${size.toArray()}`);
      }
      disposeCollectionTruck(model);
    }
    const structures=new Set<string>();
    for(const truck of collectionTrucks){
      const cab=await loadLicensedCab(truck,read),model=buildCollectionTruck(truck,false,true,cab),hash=createHash('sha256');
      model.updateMatrixWorld(true);
      model.traverse(node=>{
        if(!(node instanceof Mesh))return;
        const material=Array.isArray(node.material)?node.material[0]:node.material;
        if(!material.name.startsWith('licensed:')&&!['body','paint','glass','metal','wood','rubber'].includes(node.name))return;
        const geometry=node.geometry.clone().applyMatrix4(node.matrixWorld);
        hash.update(Buffer.from(geometry.attributes.position.array.buffer));geometry.dispose();
      });
      const signature=hash.digest('hex');assert(!structures.has(signature),`${truck.id}: repaint or driver/cargo change without a distinct vehicle structure`);structures.add(signature);
      disposeCollectionTruck(model);
    }
    assert.equal(structures.size,60);
  }finally{globalThis.createImageBitmap=bitmap;if(self)Object.defineProperty(globalThis,'self',self);else Reflect.deleteProperty(globalThis,'self');}
});
