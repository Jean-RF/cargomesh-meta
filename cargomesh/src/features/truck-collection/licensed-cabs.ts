import {Group,Mesh,MeshStandardMaterial} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {inspectTruckGlb} from '../logistics-3d/truck-glb';
import {cabBaseSpec,cabScale,type CabBase} from './cab-bases';
import type {CollectionTruck} from './catalog';
const cache=new Map<CabBase,Promise<Group>>();
export type LicensedCab={model:Group;head:readonly[number,number,number];base:CabBase};
export async function loadLicensedCab(truck:CollectionTruck,read?:((file:string)=>Promise<ArrayBuffer>)):Promise<LicensedCab>{
  const base=truck.cabBase,spec=cabBaseSpec(base);
  if(!cache.has(base))cache.set(base,(async()=>{
    let buffer:ArrayBuffer;
    if(read)buffer=await read(spec.file);
    else{const response=await fetch(`/truck-cabs/${spec.file}`);if(!response.ok)throw new Error('No se pudo cargar la cabina. Recarga para reintentar.');buffer=await response.arrayBuffer();}
    inspectTruckGlb(buffer);
    return (await new GLTFLoader().parseAsync(buffer,'')).scene;
  })().catch(error=>{cache.delete(base);throw error;}));
  const model=(await cache.get(base)!).clone(true),scale=cabScale(truck.widthM,base),front=-truck.lengthM/2;
  const materials=new Map<MeshStandardMaterial,MeshStandardMaterial>();
  model.traverse(node=>{
    if(!(node instanceof Mesh))return;
    node.geometry=node.geometry.clone();
    const clone=(m:MeshStandardMaterial)=>{
      if(!materials.has(m)){
        const copy=m.clone();
        if(copy.map)copy.map.userData.mimeType='image/jpeg';
        if(copy.normalMap)copy.normalMap.userData.mimeType='image/png';
        if(m.name==='licensed:paint')copy.color.set(truck.color);
        if(m.transparent){copy.depthWrite=false;copy.opacity=.20;}
        materials.set(m,copy);
      }
      return materials.get(m)!;
    };
    node.material=Array.isArray(node.material)?node.material.map(clone):clone(node.material as MeshStandardMaterial);
    node.castShadow=!(Array.isArray(node.material)?node.material:[node.material]).some(m=>m.transparent);node.receiveShadow=true;
  });
  model.scale.setScalar(scale);model.position.x=front;
  const [x,y,z]=spec.head;
  model.userData.base=base;
  // Scale the seat position while retaining an adult's seated torso height.
  return {model,head:[front+x*scale,(y-.62)*scale+.62,z*scale],base};
}
