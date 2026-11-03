import {cabBaseSpec,cabScale} from './cab-bases';
import {cargoWidthM,type CollectionTruck} from './catalog';
import {cargoBarcode} from './cargo-codes';
type Vec=readonly[number,number,number];
export type CargoPlacement = { id: string; barcode:string; position: Vec; size: Vec };
export function truckLayout(t: CollectionTruck) {
  const radius=cabBaseSpec(t.cabBase).radius*cabScale(t.widthM,t.cabBase);
  const front=-t.lengthM/2, rear=t.lengthM/2, start=rear-t.bodyLengthM;
  const floor=t.form==='lowbed'?.76:radius*2+.18;
  const rearDeck=t.form==='lowbed'?Math.max(t.id==='cm-transformer-modular'?5.2:t.id==='cm-boat-cradle'?3:4,1+(t.axles-2-t.driveAxles)*1.19+radius+.12):0;
  const bridgeLift=Math.max(.50,radius*2+.18-floor);
  const neck=t.form==='lowbed'?(t.driveAxles===2?3.5:2.4):0;
  const cargoStart=start+(neck||(t.id==='cm-tile-knuckle'?1.20:.12)),cargoEnd=rear-(rearDeck||.12);
  return {front,rear,start,center:(start+rear)/2,cargoCenter:(cargoStart+cargoEnd)/2,cargoStart,cargoEnd,floor,radius,rearDeck,neck,bridgeLift,cabEnd:front+t.design.cabLength,innerWidth:cargoWidthM(t),innerLength:cargoEnd-cargoStart};
}
/** The same metre-based packing is rendered, counted in the manifest and checked in tests. */
export function cargoPlacements(t: CollectionTruck): CargoPlacement[] {
  const l=truckLayout(t),[a,b,c]=t.cargo.unitM,gap=.02;
  const placement=(i:number,position:Vec):CargoPlacement=>({id:`${t.id}-load-${i+1}`,barcode:cargoBarcode(t.id,i),size:t.cargo.unitM,position});
  const lift=t.id==='cm-boat-cradle'?.52:t.id==='cm-transformer-modular'?.15:0;
  if(t.cargo.kind==='glass'||t.cargo.kind==='panels')return Array.from({length:t.cargo.count},(_,i)=>placement(i,[l.cargoCenter,l.floor+.13+c/2,(i%2===0?-1:1)*(.22+Math.floor(i/2)*(b+.02))]));
  if(t.cargo.kind==='bottles')return Array.from({length:t.cargo.count},(_,i)=>placement(i,[l.cargoCenter+((Math.floor(i/2)%6)-2.5)*l.innerLength/6,l.floor+c/2+Math.floor(i/12)*(c+.02),(i%2===0?-1:1)*t.widthM*.26]));
  if(t.cargo.kind==='plants')return Array.from({length:t.cargo.count},(_,i)=>placement(i,[l.cargoCenter+(Math.floor(i/3)-1.5)*(l.innerLength-.35)/4,l.floor+c/2,((i%3)-1)*l.innerWidth*.29]));
  if(t.cargo.kind==='cable')return Array.from({length:t.cargo.count},(_,i)=>placement(i,[l.cargoCenter+(i-(t.cargo.count-1)/2)*(a+.14),l.floor+c/2,0]));
  if(t.cargo.kind==='cars'&&t.size==='large')return Array.from({length:t.cargo.count},(_,i)=>placement(i,[l.center+(i%2===0?-2.3:2.3),l.floor+c/2+Math.floor(i/2)*1.75,0]));
  const columns=Math.max(1,Math.floor((l.innerWidth+gap)/(b+gap)));
  const rows=Math.max(1,Math.floor((l.innerLength+gap)/(a+gap)));
  const usedRows=Math.min(rows,Math.ceil(t.cargo.count/columns));
  return Array.from({length:t.cargo.count},(_,i)=>placement(i,[l.cargoCenter+(Math.floor(i/columns)%rows-(usedRows-1)/2)*(a+gap),l.floor+lift+c/2+Math.floor(i/(rows*columns))*(c+gap),(i%columns-(Math.min(columns,t.cargo.count)-1)/2)*(b+gap)]));
}
