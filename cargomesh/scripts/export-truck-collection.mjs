// Run: node --import tsx scripts/export-truck-collection.mjs <output-directory>
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { collectionTrucks } from '../src/features/truck-collection/catalog.ts';
import { buildCollectionTruck, disposeCollectionTruck } from '../src/features/truck-collection/model.ts';
import { inspectTruckGlb } from '../src/features/logistics-3d/truck-glb.ts';
import { Texture } from 'three';
import { Canvas, Image, ImageData, createCanvas, loadImage } from '@napi-rs/canvas';
import { applyCollectionTextures, configureCollectionTexture, materialFiles } from '../src/features/truck-collection/materials.ts';
import {loadLicensedCab} from '../src/features/truck-collection/licensed-cabs.ts';
import {readFile} from 'node:fs/promises';
import {exportCollectionGlb} from '../src/features/truck-collection/export-glb.ts';

globalThis.HTMLImageElement=Image;globalThis.HTMLCanvasElement=Canvas;globalThis.ImageData=ImageData;
globalThis.self=globalThis;
globalThis.createImageBitmap=async blob=>loadImage(Buffer.from(await blob.arrayBuffer()));
globalThis.document={createElement:(tag)=>{assert.equal(tag,'canvas');return createCanvas(1,1);}};
const textures=Object.fromEntries(await Promise.all(materialFiles.map(async([key,file])=>[key,configureCollectionTexture(new Texture(await loadImage(path.resolve('public/truck-materials',file))),key)])));

// Same browser FileReader shim as the existing logistics exporter; no remote input.
globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result=`data:${blob.type};base64,${Buffer.from(result).toString('base64')}`;this.onloadend?.();});}
};
assert.ok(process.argv[2],'Provide the output directory; generated models stay outside the source tree.');
const out=path.resolve(process.argv[2]);
await mkdir(out,{recursive:true});
const models=[];
for(const truck of collectionTrucks){
  const model=buildCollectionTruck(truck,false,false,await loadLicensedCab(truck,async file=>{
    const bytes=await readFile(path.resolve('public/truck-cabs',file));return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  }));
  applyCollectionTextures(model,truck,textures);
  try{
    const data=await exportCollectionGlb(model);
    const stats=inspectTruckGlb(data);assert.ok(stats.triangles>0);
    await writeFile(path.join(out,`${truck.id}.glb`),Buffer.from(data));
    models.push({...truck,file:`${truck.id}.glb`,sha256:createHash('sha256').update(Buffer.from(data)).digest('hex'),...stats});
  }catch(error){throw new Error(`${truck.id}: ${error.message}`,{cause:error});}finally{disposeCollectionTruck(model);}
}
assert.equal(models.length,60);assert.equal(new Set(models.map(m=>m.sha256)).size,60);
const report={createdAt:new Date().toISOString(),source:'SYNTHETIC_DESIGN_WITH_LICENSED_CABS',units:'metres',realismVersion:9,cabSource:'CARLA Simulator CC BY 4.0; Isuzu FFR by mekanismo CC BY 4.0; conversion Valdrada / M. K. Turkcan; adaptation CargoMesh/Juan',driverSource:'Blender Studio Human Base Meshes 1.4.1 / Dan Ulrich / CC0-1.0',textureLicense:'CC BY 4.0 cab atlases + CC0-1.0 + original project artwork',textureSource:'https://polyhaven.com/license',models,packagingReferences:[
  'https://www.epal-pallets.org/eu-en/load-carriers/epal-euro-pallet',
  'https://www.schuetz-id.info/en/info-id-spezifikationen/en-a126q0ch?cid=8ky1',
]};
await writeFile(path.join(out,'catalog.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({models:models.length,output:out,totalBytes:models.reduce((s,m)=>s+m.bytes,0),maxTriangles:Math.max(...models.map(m=>m.triangles)),maxMeshes:Math.max(...models.map(m=>m.meshes))}));
