// Original tileable fibre normals; no external imagery or pixel edits.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createCanvas} from '@napi-rs/canvas';
const size=256,canvas=createCanvas(size,size),ctx=canvas.getContext('2d'),image=ctx.createImageData(size,size);
const height=(x,y)=>Math.sin(Math.PI*2*(x/8+.25*Math.sin(y*Math.PI*2/size)))+.18*Math.sin(x*Math.PI+y*Math.PI/128);
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(height(x,y)-height(x+1,y))*.65,dy=(height(x,y)-height(x,y+1))*.65,length=Math.hypot(dx,dy,1);
  const normal=[dx/length,dy/length,1/length];assert(Math.abs(Math.hypot(...normal)-1)<1e-6);
  const offset=(y*size+x)*4;for(let k=0;k<3;k++)image.data[offset+k]=Math.round((normal[k]*.5+.5)*255);image.data[offset+3]=255;
}
ctx.putImageData(image,0,0);
const file='hair-normal.png',bytes=canvas.toBuffer('image/png');assert(bytes.length>1000);
await writeFile(`public/truck-materials/${file}`,bytes);
const path='public/truck-materials/generated-assets.json',manifest=JSON.parse(await readFile(path,'utf8'));
manifest.files=manifest.files.filter(item=>item.file!==file);
manifest.files.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),source:'Original deterministic prepare-driver-hair.mjs, 256px tileable fibre normal map'});
await writeFile(path,JSON.stringify(manifest,null,2)+'\n');
console.log('HAIR_NORMAL_OK',bytes.length);
