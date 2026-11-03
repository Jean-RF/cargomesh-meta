import {collectionTrucks,cargoMassKg,type CollectionTruck} from '@/features/truck-collection/catalog';
import {cargoPlacements} from '@/features/truck-collection/layout';

export const vehicleCategories=[
  {id:'refrigerated',label:'Frigoríficos'},
  {id:'dry',label:'Furgones y lonas'},
  {id:'open',label:'Plataformas y barandas'},
  {id:'tipper',label:'Volquetes y tolvas'},
  {id:'tank',label:'Cisternas y silos'},
  {id:'special',label:'Especializados'},
] as const;
export type VehicleCategory=typeof vehicleCategories[number]['id'];
export type WeightFilter='all'|'light'|'medium'|'heavy';
export type FleetSort='capacity'|'price'|'name';
export function vehicleCategory(truck:CollectionTruck):VehicleCategory{
  if(truck.form==='reefer')return 'refrigerated';
  if(['van','box','curtain'].includes(truck.form))return 'dry';
  if(['dropside','rack','flatbed'].includes(truck.form))return 'open';
  if(['tipper','hopper'].includes(truck.form))return 'tipper';
  if(['tank','silo'].includes(truck.form))return 'tank';
  return 'special';
}
const driverPortraits=['ar','lm','mt','av','dc','sv','jp','eq','rv','vr','pc','cl'] as const;
/** Local display fixtures only; these amounts never create offers, bookings or contracts. */
export const tetrisFleet=collectionTrucks.map((truck,index)=>({
  truck,category:vehicleCategory(truck),source:'SYNTHETIC_DEMO' as const,
  portraitSrc:`/v2-workspace/drivers/${driverPortraits[index%driverPortraits.length]}.webp`,
  // shortcut: static model captures; regenerate after geometry or paint changes.
  thumbnailSrc:`/truck-thumbnails/${truck.id}.jpg`,
  contract:{reference:`CT-${String(index+1).padStart(3,'0')}`,currency:'PEN' as const,basis:'TRIP' as const,
    amount:({small:850,medium:1850,large:4200}[truck.size])+(index%20)*85+(truck.form==='reefer'?280:truck.form==='lowbed'?900:0)},
}));
export type TetrisVehicle=typeof tetrisFleet[number];
const normalized=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-PE');
export function filterTetrisFleet({query='',category='all',weight='all',sort='capacity'}:{query?:string;category?:VehicleCategory|'all';weight?:WeightFilter;sort?:FleetSort}){
  const words=normalized(query).trim().split(/\s+/).filter(Boolean);
  return tetrisFleet.filter(({truck:t,category:c})=>{
    const text=normalized([t.type,t.model,t.plate,t.driver.name,t.cargo.label,vehicleCategories.find(v=>v.id===c)!.label].join(' '));
    return (category==='all'||category===c)&&words.every(w=>text.includes(w))&&(weight==='all'||weight==='light'&&t.payloadKg<=3500||weight==='medium'&&t.payloadKg>3500&&t.payloadKg<=12000||weight==='heavy'&&t.payloadKg>12000);
  }).sort((a,b)=>sort==='price'?a.contract.amount-b.contract.amount:sort==='name'?a.truck.type.localeCompare(b.truck.type,'es'):a.truck.payloadKg-b.truck.payloadKg);
}
export type TruckLoadGroup={id:string;label:string;quantity:number;weightKg:number;sharePercent:number;bounds:{min:readonly[number,number,number];max:readonly[number,number,number]}};
export function truckLoadGroups(truck:CollectionTruck):TruckLoadGroup[]{
  const placements=cargoPlacements(truck).sort((a,b)=>a.position[0]-b.position[0]||a.position[2]-b.position[2]||a.position[1]-b.position[1]);
  const count=Math.min(4,placements.length),groups:TruckLoadGroup[]=[];
  let cursor=0;
  for(let i=0;i<count;i++){
    const quantity=Math.floor(placements.length/count)+(i<placements.length%count?1:0),items=placements.slice(cursor,cursor+quantity);cursor+=quantity;
    const min:[number,number,number]=[Infinity,Infinity,Infinity],max:[number,number,number]=[-Infinity,-Infinity,-Infinity];
    for(const item of items)for(let axis=0;axis<3;axis++){
      const extent=item.size[[0,2,1][axis]]/2;min[axis]=Math.min(min[axis],item.position[axis]-extent);max[axis]=Math.max(max[axis],item.position[axis]+extent);
    }
    const weightKg=Math.round(quantity*truck.cargo.unitKg*10)/10;
    groups.push({id:`${truck.id}-group-${i+1}`,label:`G${String(i+1).padStart(2,'0')}`,quantity,weightKg,sharePercent:weightKg/truck.payloadKg*100,bounds:{min,max}});
  }
  return groups;
}
export function truckWeightSummary(truck:CollectionTruck){
  const assignedKg=cargoMassKg(truck);
  return {assignedKg,remainingKg:Math.max(0,truck.payloadKg-assignedKg),percent:assignedKg/truck.payloadKg*100};
}
export const contractPrice=(value:number)=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN',maximumFractionDigits:0}).format(value);
