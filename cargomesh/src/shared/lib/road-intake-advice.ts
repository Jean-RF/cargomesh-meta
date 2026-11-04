import {facilityLandPolicy} from './land-network';
type Location={countryCode:string;lat:number|null;lng:number|null};
export type RoadIntakeStatus='INCOMPLETE'|'COORDINATES_REQUIRED'|'DISCONNECTED_NETWORKS'|'UNVERIFIED';
/** Exclusion is not eligibility. A connected network still needs a provider and carrier checks. */
export function roadIntakeStatus(origin?:Location|null,destination?:Location|null):RoadIntakeStatus{
 if(!origin||!destination)return 'INCOMPLETE';
 const located=(p:Location)=>p.lat!==null&&p.lng!==null&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;
 if(!located(origin)||!located(destination))return 'COORDINATES_REQUIRED';
 return facilityLandPolicy(origin,destination)==='disconnected'?'DISCONNECTED_NETWORKS':'UNVERIFIED';
}
export function disconnectedRoadNotice(es:boolean){
 return es?'Estas sedes no tienen conexión solo por carretera. Puedes conservar los datos como borrador pendiente, pero no se evaluará una opción ROAD. Aéreo y marítimo aún no están disponibles. Elige otro origen o destino para continuar por carretera.':
  'These locations cannot be connected by road alone. You may keep the details as a pending draft, but a ROAD option will not be evaluated. Air and Sea are not available yet. Choose another origin or destination to continue by road.';
}
