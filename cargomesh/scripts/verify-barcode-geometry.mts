import {createCanvas} from '@napi-rs/canvas';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {collectionTrucks} from '../src/features/truck-collection/catalog.ts';
import {cargoBarcodeInventory} from '../src/features/truck-collection/cargo-codes.ts';
import {addBarcodeLabel} from '../src/features/truck-collection/barcode-label.ts';
const out=process.argv[2];assert(out,'Provide an output directory outside the source tree.');await mkdir(out,{recursive:true});const records=[];
for(const truck of collectionTrucks)for(const item of cargoBarcodeInventory(truck)){
 const canvas=createCanvas(440,128),c=canvas.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,440,128);c.fillStyle='#111';
 addBarcodeLabel((g,part)=>{
  const uv=g.attributes.uv,positions=g.attributes.position;
  if(part==='print'&&[...Array(uv.count).keys()].every(i=>uv.getX(i)===uv.getX(0)&&uv.getY(i)===uv.getY(0))){
   const xs=Array.from({length:positions.count},(_,i)=>positions.getX(i)),ys=Array.from({length:positions.count},(_,i)=>positions.getY(i));
   const left=Math.round((Math.min(...xs)+.11)/.22*440),right=Math.round((Math.max(...xs)+.11)/.22*440),top=Math.round((.04-Math.max(...ys))/.08*128),bottom=Math.round((.04-Math.min(...ys))/.08*128);c.fillRect(left,top,right-left,bottom-top);
  }g.dispose();
 },item.barcode,.22,.08,[0,0,0]);
 const bytes=canvas.toBuffer('image/png');await writeFile(out+'/'+item.barcode+'.png',bytes);records.push({...item,truckId:truck.id,sha256:createHash('sha256').update(bytes).digest('hex')});
}
assert.equal(new Set(records.map(r=>r.barcode)).size,records.length);assert(records.length>0);await writeFile(out+'/manifest.json',JSON.stringify(records,null,2));console.log(JSON.stringify({labels:records.length,unique:new Set(records.map(r=>r.barcode)).size,out}));
