import type {Group} from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {inspectTruckGlb,maxTruckModelBytes} from '../logistics-3d/truck-glb';

export async function exportCollectionGlb(model:Group):Promise<ArrayBuffer>{
  const exporter=new GLTFExporter();
  let data=await exporter.parseAsync(model,{binary:true,onlyVisible:true,maxTextureSize:2048});
  // Browser PNG encoders can exceed the import budget even when the Node export fits.
  if(data instanceof ArrayBuffer&&data.byteLength>maxTruckModelBytes)
    data=await exporter.parseAsync(model,{binary:true,onlyVisible:true,maxTextureSize:1024});
  if(!(data instanceof ArrayBuffer))throw new Error('GLB_EXPORT_FAILED');
  inspectTruckGlb(data);
  return data;
}
