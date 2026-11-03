import {LoadingDashboardSourceSchema,type LoadingDashboardSource} from './loading-dashboard';

/** Development inputs only. No endpoint presents these as a manifest or a worker response. */
const base:LoadingDashboardSource={
  schemaVersion:1,snapshotVersion:1,source:'SYNTHETIC_FIXTURE',capturedAt:'2026-10-29T14:30:00Z',
  session:{id:'DEMO-SES-029',organizationId:'DEMO-ORG-JUAN',facilityId:'DEMO-DEP-01',facilityName:'Sede Callao · muelle 02',operationId:null,manifestId:'DEMO-MAN-048',manifestRevision:3,version:2,scopeState:'OPEN'},
  manifest:{id:'DEMO-MAN-048',revision:3,complete:true,groups:[{id:'g-food',label:'Conservas en pallet',unit:'PALLET',count:12},{id:'g-clean',label:'Limpieza en pallet',unit:'PALLET',count:6},{id:'g-box',label:'Repuestos embalados',unit:'BOX',count:40}]},
  plan:{id:'DEMO-PLAN-07',revision:2,manifestRevision:3,complete:true,vehicles:[{id:'DEMO-VEH-A',label:'Vehículo de muestra A'},{id:'DEMO-VEH-B',label:'Vehículo de muestra B'}],allocations:[{vehicleId:'DEMO-VEH-A',groupId:'g-food',unit:'PALLET',count:12},{vehicleId:'DEMO-VEH-B',groupId:'g-clean',unit:'PALLET',count:6},{vehicleId:'DEMO-VEH-B',groupId:'g-box',unit:'BOX',count:40}]},
  observation:{id:'DEMO-OBS-013',sessionId:'DEMO-SES-029',manifestRevision:3,complete:true,groups:[
    {id:'g-food',label:'Conservas en pallet',unit:'PALLET',count:9,coverage:'PARTIAL',quality:'SUFFICIENT',evidence:[{id:'DEMO-EV-01',timeSeconds:14.2}]},
    {id:'g-clean',label:'Limpieza en pallet',unit:'PALLET',count:5,coverage:'PARTIAL',quality:'SUFFICIENT',evidence:[{id:'DEMO-EV-02',timeSeconds:31.8}]},
    {id:'g-box',label:'Repuestos embalados',unit:'BOX',count:null,coverage:'PARTIAL',quality:'UNCERTAIN',evidence:[]},
  ]},
};
export const dashboardScenarios=[
  {id:'open',label:'Carga en curso',description:'Sesión abierta: 14 pallets observados. Todavía no se calculan faltantes.'},
  {id:'review',label:'Alcance cerrado',description:'Conteos completos: una diferencia propuesta necesita revisión humana.'},
  {id:'unknown',label:'Datos incompletos',description:'Lectura parcial, cantidades desconocidas y sin observación disponible.'},
  {id:'outdated',label:'Revisión desactualizada',description:'El manifiesto cambió. La observación anterior no es comparable.'},
  {id:'incompatible',label:'Unidad incompatible',description:'El worker contó cajas en un grupo declarado en pallets. No se convierten unidades.'},
] as const;
export type DashboardScenario=typeof dashboardScenarios[number]['id'];
export function dashboardFixture(scenario:DashboardScenario):LoadingDashboardSource{
  const s=structuredClone(base);
  if(scenario==='review'){
    s.session.scopeState='CLOSED';s.session.version=3;s.snapshotVersion=2;
    s.observation!.groups.forEach(g=>{g.coverage='COMPLETE';g.quality='SUFFICIENT';g.count=g.id==='g-food'?11:g.id==='g-clean'?6:40;});
  }else if(scenario==='unknown'){
    s.manifest.complete=false;s.manifest.groups[0].count=null;s.plan=null;s.observation=null;
  }else if(scenario==='outdated'){
    s.session.scopeState='CLOSED';s.manifest.revision=4;
  }else if(scenario==='incompatible'){
    s.session.scopeState='CLOSED';s.observation!.groups[0].unit='BOX';
  }
  return LoadingDashboardSourceSchema.parse(s);
}
