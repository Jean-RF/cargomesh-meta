import {Euler,PlaneGeometry,Vector3} from 'three';
import type {AddVehiclePart} from './cab-models';
import type {CollectionTruck} from './catalog';
import type {CargoPlacement} from './layout';
import {barcodeBars} from './barcode';
import {markingAtlas} from './markings';

type Vec=readonly[number,number,number];
export function addBarcodeLabel(add:AddVehiclePart,value:string,width:number,height:number,position:Vec,rotation:Vec=[0,0,0],surface?:{radius:number;taper?:number}){
  const {modules,bars}=barcodeBars(value);
  const plane=(w:number,h:number,x=0,y=0,z=0)=>{
    const g=new PlaneGeometry(w,h,surface?Math.max(2,Math.ceil(w/.008)):1,1);g.translate(x,y,z);
    if(surface){const p=g.attributes.position;for(let i=0;i<p.count;i++){const angle=p.getX(i)/surface.radius,r=surface.radius+p.getY(i)*(surface.taper??0);p.setXYZ(i,r*Math.sin(angle),p.getY(i),r*Math.cos(angle)-surface.radius+z);}g.computeVertexNormals();}
    return g;
  };
  const background=plane(width,height);background.userData.cargoBarcode=value;add(background,'white',position,rotation);
  for(const bar of bars){
    const geometry=plane(bar.width*width/modules,height*.60,(bar.x+bar.width/2-modules/2)*width/modules,height*.12,.00025),uv=geometry.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,(markingAtlas.inkX+.5)/markingAtlas.width,1-(markingAtlas.inkY+.5)/markingAtlas.height);
    add(geometry,'print',position,rotation);
  }
  const digitHeight=height*.20,digitWidth=digitHeight*markingAtlas.digitWidth/markingAtlas.digitHeight;
  for(let i=0;i<value.length;i++){
    const geometry=plane(digitWidth,digitHeight,(i-(value.length-1)/2)*digitWidth,height*-.34,.00025),uv=geometry.attributes.uv,digit=Number(value[i]);
    for(let j=0;j<uv.count;j++)uv.setXY(j,(markingAtlas.digitX+(digit+uv.getX(j))*markingAtlas.digitWidth)/markingAtlas.width,1-(markingAtlas.digitY+(1-uv.getY(j))*markingAtlas.digitHeight)/markingAtlas.height);
    add(geometry,'print',position,rotation);
  }
}

/** Labels sit on the package, skid or machine body instead of the cargo envelope's empty corners. */
export function addUnitBarcode(add:AddVehiclePart,t:CollectionTruck,p:CargoPlacement){
  const [x,y,z]=p.position,[a,b,c]=p.size,bottom=y-c/2,k=t.cargo.kind;
  let position:Vec=[x,bottom+Math.min(c*.40,.40),z+b/2-.008],rotation:Vec=[0,0,0],width=Math.min(.24,a*.42),height=Math.min(.10,c*.48),surface:{radius:number;taper?:number}|undefined;
  if(a===1.2&&b===.8&&['cartons','medicine','textiles','cement','tiles','bricks','produce','fish','bakery'].includes(k))position=[x,bottom+.075,z+b/2+.001];
  if(k==='plants'){const potRadius=Math.min(a,b)*.34,taper=potRadius*.28/(c*.28-.025),radius=potRadius*.68+c*.15*taper;position=[x,bottom+c*.15,z+radius+.001];surface={radius,taper};width=.10;height=.06;}
  if(k==='flowers'){position=[x,bottom+.10,z+b/2-.014];width=.16;height=.05;}
  if(k==='cylinders'){const radius=Math.min(a,b)/2-.02;position=[x,bottom+c*.48,z+radius+.001];surface={radius};width=.10;height=.06;}
  if(k==='drums'){const radius=Math.min(a,b)*.475;position=[x,bottom+c*.50,z+radius+.001];surface={radius};width=.16;height=.08;}
  if(k==='coils'||k==='paper')position=[x,bottom+c*.26,z+b*.49+.002];
  if(k==='cable')position=[x,bottom+Math.min(a,c)*.27,z+b/2-.029];
  if(k==='tires'){position=[x,bottom+c*.19,z+Math.min(b/2,c*.13)+.003];width=.16;height=.06;}
  if(k==='cars'){position=[x-a*.08,bottom+c*.37,z+b*.469+.003];width=.18;height=.07;}
  if(k==='tractor'){position=[x-a*.23,bottom+c*.38,z+b*.215+.003];width=.20;height=.08;}
  if(k==='excavator')position=[x+a*.20,bottom+c*.40,z+b*.39+.005];
  if(k==='boat')position=[x,bottom+c*.28,z+b*.41+.001];
  if(k==='transformer'||k==='containers'){position=[x+a/2+.002,bottom+c*.42,z];rotation=[0,Math.PI/2,0];}
  if(k==='glass'||k==='panels'){
    const side=z<0?-1:1,lean=-side*Math.asin(Math.min(.12,b*.65)/c);
    position=new Vector3(a*.32,-c*.27,side*.045).applyEuler(new Euler(lean,0,0)).add(new Vector3(x,y,z)).toArray();rotation=[lean,side<0?Math.PI:0,0];width=.07;height=.055;
  }
  addBarcodeLabel(add,p.barcode,width,height,position,rotation,surface);
}
