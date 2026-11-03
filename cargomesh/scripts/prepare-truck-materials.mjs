// Original deterministic microdetail; no external image or font files.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createCanvas} from '@napi-rs/canvas';
const size=256;
for(const kind of ['fabric','cardboard','skin','paint']){
  const canvas=createCanvas(size,size),ctx=canvas.getContext('2d'),data=ctx.createImageData(size,size),heights=new Float32Array(size*size);
  let seed=713;
  const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const grain=noise()-.5;
    heights[y*size+x]=kind==='fabric'?.4*Math.sin(x*Math.PI/2)*Math.cos(y*Math.PI/2)+grain*.12:kind==='cardboard'?grain*.35+.08*Math.sin(y*.85):kind==='skin'?grain*.35:grain*.18;
  }
  for(const channel of ['normal','rough']){
    if(channel==='rough'&&kind!=='paint')continue;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const i=(y*size+x)*4,h=heights[y*size+x];
      if(channel==='normal'){
        data.data[i]=128+(h-heights[y*size+(x+1)%size])*55;
        data.data[i+1]=128+(h-heights[((y+1)%size)*size+x])*55;data.data[i+2]=254;
      }else{const rough=kind==='skin'?178:kind==='paint'?100:kind==='rubber'?220:235;data.data[i]=data.data[i+1]=data.data[i+2]=rough+h*30;}
      data.data[i+3]=255;
    }
    ctx.putImageData(data,0,0);const bytes=canvas.toBuffer('image/png');assert.ok(bytes.length>1000);
    await writeFile(`public/truck-materials/${kind}-${channel}.png`,bytes);
  }
}
console.log('5 original microdetail maps generated at 256×256');
const grille=createCanvas(512,512),g=grille.getContext('2d');
g.fillStyle='#a6a8aa';g.fillRect(0,0,512,512);g.globalCompositeOperation='destination-out';
for(let row=0;row<24;row++)for(let col=0;col<24;col++){
  const x=col*24+(row%2)*12,y=row*22;g.beginPath();
  for(let i=0;i<6;i++){const a=i*Math.PI/3;g.lineTo(x+10*Math.cos(a),y+8*Math.sin(a));}g.closePath();g.fill();
}
await writeFile('public/truck-materials/grille-color.png',grille.toBuffer('image/png'));
const files=[];
for(const name of ['fabric-normal.png','cardboard-normal.png','skin-normal.png','paint-normal.png','paint-rough.png','grille-color.png']){
  const bytes=await readFile(`public/truck-materials/${name}`);files.push({file:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
await writeFile('public/truck-materials/generated-assets.json',JSON.stringify({source:'Original project artwork, deterministic prepare-truck-materials.mjs',license:'MIT (repository license)',resolution:{microdetail:256,grille:512},files},null,2)+'\n');
await import('./prepare-driver-hair.mjs');
