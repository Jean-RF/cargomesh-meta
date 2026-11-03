import { CanvasTexture, Color, PlaneGeometry, SRGBColorSpace } from 'three';
import type { CollectionTruck } from './catalog';
import type { AddVehiclePart } from './cab-models';
export const markingAtlas={width:1024,height:576,inkX:8,inkY:536,digitX:32,digitY:520,digitWidth:32,digitHeight:48};

export function truckMarkings(t:CollectionTruck){
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=markingAtlas.width;canvas.height=markingAtlas.height;
  const c=canvas.getContext('2d');if(!c)return null;
  c.fillStyle='#f4f2e9';c.fillRect(0,0,1024,256);c.fillStyle='#18272d';
  const text=(s:string,x:number,y:number,size:number)=>{c.font=`600 ${size}px sans-serif`;c.fillText(s,x,y);};
  text('CARGOMESH  /  MUESTRA',20,39,25);text(t.id.toUpperCase(),20,72,16);
  text(t.cargo.label.slice(0,31),20,110,18);text(`${t.cargo.count} uds.  |  ${t.plate}`,20,141,19);
  text('MANIPULAR CON CUIDADO',20,174,16);
  text('↑↑',439,225,42);
  text(t.plate,548,142,66);text('PE  •  COLECCIÓN DE DISEÑO',554,184,16);
  const color=new Color(t.color);c.fillStyle=color.r+color.g+color.b>1.4?'#17282e':'#e1e8e8';
  text(`CM ${t.driver.id.slice(-3)}`,42,359,59);text(t.model,42,402,21);
  text('CARGOMESH',555,341,36);text(`${t.payloadKg.toLocaleString('es-PE')} kg`,555,381,32);text('CAPACIDAD DE MUESTRA',555,418,17);
  c.fillStyle='#111111';c.fillRect(0,528,16,16);c.font='32px monospace';c.textAlign='center';
  for(let digit=0;digit<10;digit++)c.fillText(String(digit),markingAtlas.digitX+digit*markingAtlas.digitWidth+16,558);
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=4;
  return texture;
}

/** Four print regions share one draw call and are embedded in exported GLBs. */
export function addMarking(add:AddVehiclePart,tile:number,width:number,height:number,p:readonly[number,number,number],rot:readonly[number,number,number]=[0,0,0]){
  const g=new PlaneGeometry(width,height),uv=g.attributes.uv,col=tile%2,row=Math.floor(tile/2);
  for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)+col)/2,1-((1-uv.getY(i)+row)*256)/markingAtlas.height);
  add(g,'print',p,rot);
}
