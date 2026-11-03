import {collectionTrucks,type CollectionTruck} from './catalog';

const prefixes=new Map(collectionTrucks.map(t=>[t.id,t.plate.match(/^DEMO-(\d+)$/)![1].padStart(4,'0')]));
/** Internal collection IDs: model / handled unit / carton. Zero identifies the parent unit. */
export function cargoBarcode(truckId:string,unitIndex:number,carton=0){
  const prefix=prefixes.get(truckId);
  if(!prefix||!Number.isInteger(unitIndex)||unitIndex<0||unitIndex>=999||!Number.isInteger(carton)||carton<0||carton>999)throw Error('Identificador de carga inválido.');
  return prefix+String(unitIndex+1).padStart(3,'0')+String(carton).padStart(3,'0');
}
export function cargoCartonCount(t:CollectionTruck){
  return ['cartons','medicine'].includes(t.cargo.kind)&&t.cargo.unitM[0]===1.2&&t.cargo.unitM[1]===.8?8:0;
}
export function cargoBarcodeInventory(t:CollectionTruck){
  return Array.from({length:t.cargo.count},(_,i)=>[
    {id:`${t.id}-load-${i+1}`,unitId:`${t.id}-load-${i+1}`,barcode:cargoBarcode(t.id,i),label:`Unidad ${i+1}`},
    ...Array.from({length:cargoCartonCount(t)},(_,j)=>({id:`${t.id}-load-${i+1}-carton-${j+1}`,unitId:`${t.id}-load-${i+1}`,barcode:cargoBarcode(t.id,i,j+1),label:`Unidad ${i+1} · caja ${j+1}`})),
  ]).flat();
}
