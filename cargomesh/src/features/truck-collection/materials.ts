import { Mesh, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, Texture, TextureLoader, type Group } from 'three';
import type { CollectionTruck } from './catalog';
export const materialFiles=[
  ['woodColor','wood_planks-color.jpg'],['woodNormal','wood_planks-normal.jpg'],['woodRough','wood_planks-rough.jpg'],
  ['metalColor','metal_plate-color.jpg'],['metalNormal','metal_plate-normal.jpg'],['metalRough','metal_plate-rough.jpg'],
  ['seatColor','brown_leather-color.jpg'],['seatNormal','brown_leather-normal.jpg'],['seatRough','brown_leather-rough.jpg'],
  ['fabricNormal','fabric-normal.png'],
  ['cardboardNormal','cardboard-normal.png'],
  ['skinNormal','skin-normal.png'],
  ['hairNormal','hair-normal.png'],
  ['paintNormal','paint-normal.png'],['paintRough','paint-rough.png'],
  ['grilleColor','grille-color.png'],
  ['gravelColor','gravel-color.jpg'],['gravelNormal','gravel-normal.png'],
] as const;
type Key=typeof materialFiles[number][0];
export type CollectionTextures=Record<Key,Texture>;
export function configureCollectionTexture(texture:Texture,key:Key){
  texture.wrapS=texture.wrapT=RepeatWrapping;texture.anisotropy=4;
  if(key.endsWith('Color'))texture.colorSpace=SRGBColorSpace;
  if(key.startsWith('gravel'))texture.repeat.setScalar(1/2.3);
  texture.needsUpdate=true;return texture;
}
let pending:Promise<CollectionTextures>|undefined;
export function loadCollectionTextures(){
  return pending??=Promise.all(materialFiles.map(async([key,file])=>[key,configureCollectionTexture(await new TextureLoader().loadAsync(`/truck-materials/${file}`),key)]))
    .then(entries=>Object.fromEntries(entries) as CollectionTextures).catch(error=>{pending=undefined;throw error;});
}
export function applyCollectionTextures(model:Group,truck:CollectionTruck,textures:CollectionTextures){
  model.traverse(node=>{
    if(!(node instanceof Mesh)||!(node.material instanceof MeshStandardMaterial))return;
    const m=node.material;
    if(node.name==='wood'){
      m.color.set('#e2d4bd');m.map=textures.woodColor;m.normalMap=textures.woodNormal;m.roughnessMap=textures.woodRough;m.normalScale.set(.32,.32);
    }else if(node.name==='seat'){
      m.color.set('#686e73');m.map=textures.seatColor;m.normalMap=textures.seatNormal;m.roughnessMap=textures.seatRough;m.normalScale.set(.24,.24);
    }else if(node.name==='metal'){
      if(truck.id==='cm-gravel-halfpipe'){m.normalMap=null;m.roughnessMap=null;m.color.set('#7f888c');m.roughness=.58;}
      else{m.normalMap=textures.metalNormal;m.roughnessMap=textures.metalRough;m.normalScale.set(.045,.045);}
    }else if(node.name==='body'&&truck.form==='tank'){
      m.normalMap=textures.metalNormal;m.normalScale.set(.022,.022);
    }else if(node.name==='load'&&['lumber','logs'].includes(truck.cargo.kind)){
      m.map=textures.woodColor;m.normalMap=textures.woodNormal;m.normalScale.set(.25,.25);
    }else if(node.name==='load'&&['cartons','medicine','paper','cement','textiles'].includes(truck.cargo.kind)){
      m.normalMap=textures.cardboardNormal;m.roughness=.88;m.normalScale.set(.25,.25);
    }else if(node.name==='load'&&truck.cargo.kind==='gravel'){
      m.color.set('#ffffff');m.map=textures.gravelColor;m.normalMap=textures.gravelNormal;m.normalScale.set(.60,.60);m.roughness=.95;
    }else if(node.name==='load'&&['sand','grain','silage'].includes(truck.cargo.kind)){
      m.normalMap=textures.paintNormal;m.roughness=.95;m.normalScale.set(.65,.65);
    }else if(node.name==='load'&&['cars','excavator','tractor','machinery','tools'].includes(truck.cargo.kind)){
      m.normalMap=textures.paintNormal;m.normalScale.set(.05,.05);m.roughness=truck.cargo.kind==='cars'?.25:.46;
    }else if(node.name==='skin'){
      m.normalMap=textures.skinNormal;m.normalScale.set(.07,.07);m.roughness=.69;
    }else if(node.name==='uniform'||node.name==='strap'){
      m.normalMap=textures.fabricNormal;m.normalScale.set(.28,.28);m.roughness=.92;
    }else if(node.name==='hair'){
      m.normalMap=textures.hairNormal;m.normalScale.set(.26,.26);m.roughness=.83;
    }else if(node.name==='rubber'){
      m.normalMap=textures.paintNormal;m.normalScale.set(.18,.18);m.roughness=truck.cargo.kind==='cable'?.64:.90;
    }else if(node.name==='paint'){
      m.normalMap=textures.paintNormal;m.normalScale.set(.045,.045);m.roughnessMap=textures.paintRough;m.roughness=.65;
    }else if(node.name==='body'){
      m.normalMap=truck.form==='curtain'?textures.fabricNormal:textures.paintNormal;m.normalScale.set(.11,.11);
    }else if(node.name==='grille'){
      m.map=textures.grilleColor;
    }
    m.needsUpdate=true;
  });
  model.userData.materialSource='Poly Haven CC0 + original microdetail';
}
