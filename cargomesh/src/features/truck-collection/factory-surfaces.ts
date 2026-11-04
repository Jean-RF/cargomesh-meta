import {CanvasTexture,RepeatWrapping,SRGBColorSpace,TextureLoader} from 'three';

export function factorySurfaces(invalidate?:()=>void){
  if(typeof document==='undefined')return {concrete:null,normal:null,roughness:null,signs:null};
  // Concrete Floor 02 by Rob Tuytel, Poly Haven (CC0).
  const loader=new TextureLoader();
  const maps=['Diffuse','nor_gl','Rough'].map(channel=>{
    const texture=loader.load(`/truck-materials/dispatch-concrete-${channel}.jpg`,invalidate);
    texture.wrapS=texture.wrapT=RepeatWrapping;
    texture.anisotropy=4;
    return texture;
  });
  const [concrete,normal,roughness]=maps;
  concrete.colorSpace=SRGBColorSpace;
  const board=document.createElement('canvas');board.width=1024;board.height=512;const p=board.getContext('2d')!;
  const labels=[['CARGOMESH','OPERACIONES · MUELLE 01'],['01','CÉLULA DE CARGA'],['SALIDA  →','MANTENER PASO LIBRE'],['R-01','MANIPULADOR AUTOMÁTICO'],['ZONA ROBOT','ACCESO RESTRINGIDO'],['ESTACIÓN DE CONTROL','PARADA DE EMERGENCIA'],['EMBALAJE','ÚTILES Y ENVASES VACÍOS'],['SERVICIOS','AIRE · ENERGÍA · DATOS']];
  labels.forEach(([title,subtitle],i)=>{const x=i%2*512,y=Math.floor(i/2)*128;p.fillStyle=i===4?'#e9bd53':'#e9efed';p.fillRect(x,y,512,128);p.fillStyle='#173e48';p.font=`700 ${i===1?64:33}px sans-serif`;p.fillText(title,x+22,y+62,468);p.font='18px sans-serif';p.fillText(subtitle,x+24,y+103,465);});
  const signs=new CanvasTexture(board);signs.colorSpace=SRGBColorSpace;signs.anisotropy=4;
  return {concrete,normal,roughness,signs};
}
