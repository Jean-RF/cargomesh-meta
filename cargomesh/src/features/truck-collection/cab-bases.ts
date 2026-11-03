import bases from '../../../public/truck-cabs/bases.json';
import type {VehicleDesign} from './vehicle-designs';
export type CabBase=keyof typeof bases;
const small:CabBase[]=['sprinter','sprinter','isuzu','isuzu','bonnet','sprinter','bonnet','isuzu','isuzu','isuzu','sprinter','bonnet','isuzu','bonnet','sprinter','sprinter','isuzu','isuzu','bonnet','isuzu'];
const medium:CabBase[]=['isuzu','euro-day','euro-day','isuzu','bonnet','isuzu','isuzu','bonnet','euro-day','isuzu','isuzu','bonnet','euro-high','isuzu','euro-day','euro-day','isuzu','isuzu','bonnet','euro-day'];
const large:CabBase[]=['euro-high','euro-high','euro-high','euro-day','euro-day','euro-day','euro-high','euro-high','euro-day','euro-high','euro-high','euro-high','euro-day','euro-high','euro-high','euro-day','euro-day','euro-high','euro-day','euro-high'];
export const cabBaseFor=(serial:number)=>([...small,...medium,...large])[serial];
export const cabBaseSpec=(base:CabBase)=>bases[base];
export const cabScale=(width:number,base:CabBase)=>width*.96/bases[base].bodyWidth;
export function licensedCabDesign(serial:number,width:number,original:VehicleDesign):VehicleDesign{
  const id=cabBaseFor(serial),spec=bases[id],scale=cabScale(width,id);
  const architecture:Record<CabBase,VehicleDesign['architecture']>={sprinter:'panel',bonnet:'pickup',isuzu:'compact','euro-day':'wide','euro-high':'high-roof'};
  return {...original,architecture:architecture[id],cabLength:spec.length*scale,frontAxle:spec.frontAxle*scale,roof:({sprinter:2.726,bonnet:2.08,isuzu:2.65,'euro-high':4.065,'euro-day':3.385})[id]*scale,hood:id==='bonnet'||id==='sprinter',nose:id==='bonnet'?1.1*scale:id==='sprinter'?.65*scale:0};
}
