import {CanvasTexture,RepeatWrapping,SRGBColorSpace} from 'three';

/** Shared concrete and industrial signage; no texture allocation during playback. */
export function factorySurfaces(){
  if(typeof document==='undefined')return {concrete:null,signs:null};
  const floor=document.createElement('canvas');floor.width=floor.height=512;
  const c=floor.getContext('2d');if(!c)return {concrete:null,signs:null};
  const pixels=c.createImageData(512,512);let seed=1827;
  for(let i=0;i<pixels.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=(seed>>>24)/255,v=180+n*22;pixels.data.set([v-4,v,v+1,255],i);}
  c.putImageData(pixels,0,0);
  for(let i=0;i<140;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;c.fillStyle='rgba(61,76,79,.025)';c.beginPath();c.ellipse(seed%512,(seed>>>10)%512,3+seed%25,1+(seed>>>7)%12,seed,0,Math.PI*2);c.fill();}
  const concrete=new CanvasTexture(floor);concrete.colorSpace=SRGBColorSpace;concrete.wrapS=concrete.wrapT=RepeatWrapping;concrete.anisotropy=4;
  const board=document.createElement('canvas');board.width=1024;board.height=512;const p=board.getContext('2d')!;
  const labels=[['CARGOMESH','OPERACIONES · MUELLE 01'],['01','CÉLULA DE CARGA'],['SALIDA  →','MANTENER PASO LIBRE'],['R-01','MANIPULADOR AUTOMÁTICO'],['ZONA ROBOT','ACCESO RESTRINGIDO'],['ESTACIÓN DE CONTROL','PARADA DE EMERGENCIA'],['EMBALAJE','ÚTILES Y ENVASES VACÍOS'],['SERVICIOS','AIRE · ENERGÍA · DATOS']];
  labels.forEach(([title,subtitle],i)=>{const x=i%2*512,y=Math.floor(i/2)*128;p.fillStyle=i===4?'#e9bd53':'#e9efed';p.fillRect(x,y,512,128);p.fillStyle='#173e48';p.font=`700 ${i===1?64:33}px sans-serif`;p.fillText(title,x+22,y+62,468);p.font='18px sans-serif';p.fillText(subtitle,x+24,y+103,465);});
  const signs=new CanvasTexture(board);signs.colorSpace=SRGBColorSpace;signs.anisotropy=4;
  return {concrete,signs};
}
