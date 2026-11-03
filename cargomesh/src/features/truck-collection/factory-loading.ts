import type {CollectionTruck} from './catalog';
import {cargoPlacements,truckLayout} from './layout';
import {tankDimensions} from './vehicle-designs';
import {rollingSupports,rollingPose,type Road,type RollingSupport} from './rolling-supports';

export type FactoryPoint=readonly[number,number,number];
export type FactoryScenario='complete'|'incomplete';
type Move={label:string;start:number;end:number;from:FactoryPoint;to:FactoryPoint;openFrom:number;openTo:number};
type Unit={id:string;barcode:string;source:FactoryPoint;target:FactoryPoint;moves:Move[];graspAt:number;settleAt:number;releaseAt:number;end:number;road?:Road};
export type FactoryLoadingPlan={
  truckId:string;method:'rear'|'crane'|'ramp'|'fill';flow:'liquid'|'bulk'|'powder'|'concrete'|null;
  product:string;unitLabel:string;size:FactoryPoint;unitKg:number;litres:number|null;
  floor:number;rear:number;front:number;innerWidth:number;innerLength:number;openingHeight:number;
  stockColumns:number;stockRows:number;baseX:number;stockWidth:number;highY:number;rampLength:number;
  duration:number;units:Unit[];supports:RollingSupport[];
  scenario:FactoryScenario;stopAt:number;departureAt:number;exitDistance:number;
};
const distance=(a:FactoryPoint,b:FactoryPoint)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const lerp=(a:FactoryPoint,b:FactoryPoint,t:number):FactoryPoint=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
export const factoryMethodLabel={rear:'Robot de carga por el acceso trasero',crane:'Puente grúa con aparejo',ramp:'Carga rodada por rampas',fill:'Estación de llenado'};

/** Metric scene fixtures, never operational observations or authorization to load. */
export function factoryLoadingPlan(truck:CollectionTruck):FactoryLoadingPlan|null{
  const {count,unitKg,unitM,kind}=truck.cargo,[a,b,c]=unitM;
  if(!Number.isInteger(count)||count<1||count>60||![a,b,c,unitKg,truck.widthM,truck.lengthM,truck.bodyLengthM,truck.bodyHeightM,truck.payloadKg].every(v=>Number.isFinite(v)&&v>0)||count*unitKg>truck.payloadKg)return null;
  if(truck.cargo.liquidLitres!==undefined){
    const tank=tankDimensions(truck),capacity=Math.PI*(tank.rx-.025)*(tank.ry-.025)*(tank.length-.05)*1000;
    if(!Number.isFinite(truck.cargo.liquidLitres)||truck.cargo.liquidLitres<=0||truck.cargo.liquidLitres>capacity*.98||count!==1)return null;
  }
  const flow=truck.cargo.liquidLitres?'liquid':kind==='powder'?'powder':kind==='concrete'?'concrete':['gravel','sand','grain','silage','scrap'].includes(kind)?'bulk':null;
  const method=flow?'fill':['cars','excavator','tractor'].includes(kind)?'ramp':['van','box','reefer','curtain'].includes(truck.form)?'rear':'crane';
  const l=truckLayout(truck),shoulder=truck.design.bodyProfile==='bevel'?.21:truck.design.bodyProfile==='taper'?.33:truck.design.bodyProfile==='wedge'?.29:.08;
  // The rendered deck planks end 35.5 mm above the layout datum.
  const floor=l.floor+.036,openingHeight=truck.bodyHeightM-shoulder-.05-.036;
  const targets=cargoPlacements(truck).sort((u,v)=>(method==='ramp'?v.position[1]-u.position[1]:0)||u.position[0]-v.position[0]||u.position[1]-v.position[1]||u.position[2]-v.position[2]);
  if(method==='rear'&&targets.some(p=>p.position[0]-a/2<l.cargoStart-1e-6||p.position[0]+a/2>l.cargoEnd+1e-6||Math.abs(p.position[2])+b/2>l.innerWidth/2+1e-6||p.position[1]+.036+c/2+.20>floor+openingHeight))return null;
  const stockColumns=method==='crane'?(a>3?count:Math.min(6,Math.ceil(Math.sqrt(count)))):method==='ramp'?count:Math.min(4,count);
  const stockRows=Math.ceil(count/stockColumns),stockWidth=stockColumns*(b+.40);
  const rampLength=method==='ramp'?Math.max(4,...targets.map(p=>(p.position[1]-c/2+.036)/.22)):0;
  const baseX=l.rear+2+stockRows*(a+.40)+.70,portalX=l.rear+.65;
  const highY=method==='crane'?Math.max(floor+truck.bodyHeightM+c/2+.70,...targets.map(p=>p.position[1]+c+.60)):Math.max(floor+c*1.5+.15,...targets.map(p=>p.position[1]+.036+.12));
  const unitLabel=flow?'lote':a===1.2&&b===.8?'pallet':({medicine:'contenedor',cartons:'caja',fish:'cajón',bakery:'bandeja',bottles:'cesta',coils:'bobina',cable:'bobina',cars:'vehículo',excavator:'excavadora',tractor:'tractor',drums:'bidón',ibc:'IBC',cylinders:'cilindro',plants:'macetón',flowers:'carro',glass:'paquete',panels:'panel'} as Record<string,string>)[kind]??'unidad';
  const supports=method==='ramp'?rollingSupports(kind,unitM):[];
  const units:Unit[]=[];let time=0,park:FactoryPoint=[portalX,highY,0];
  for(let i=0;i<targets.length;i++){
    const p=targets[i];let target:FactoryPoint=[p.position[0],p.position[1]+(flow?0:.036),p.position[2]];
    let source:FactoryPoint=method==='crane'?[l.cargoCenter+(Math.floor(i/stockColumns)-(stockRows-1)/2)*(a+.40),floor+c/2,truck.widthM/2+1.5+b/2+i%stockColumns*(b+.40)]:method==='ramp'?[l.rear+rampLength+a/2+1,c/2,i*(b+.55)]:[l.rear+2+a/2+Math.floor(i/stockColumns)*(a+.40),floor+c/2,(i%stockColumns-(stockColumns-1)/2)*(b+.40)];
    let road:Road|undefined;
    if(method==='ramp'){
      const deck=truck.form==='lowbed'?floor+l.bridgeLift:target[1]-c/2;
      road=truck.form==='lowbed'?[[-1000,floor],[l.cargoEnd-1.1,floor],[l.cargoEnd,deck],[l.rear,deck],[l.rear+rampLength,.04],[1000,.04]]:[[-1000,deck],[l.rear,deck],[l.rear+rampLength,.04],[1000,.04]];
      target=[target[0],rollingPose(road,supports,target[0],c/2).y,target[2]];
      source=[source[0],rollingPose(road,supports,source[0],c/2).y,source[2]];
    }
    const moves:Move[]=[];let position=park,open=1;
    const move=(label:string,to:FactoryPoint,closed:number,dwell=0)=>{
      const end=time+(dwell||Math.max(.30,distance(position,to)*1.5/1.15));
      moves.push({label,start:time,end,from:position,to,openFrom:open,openTo:closed});position=to;open=closed;time=end;
    };
    let graspAt=0,settleAt=0,releaseAt=0;
    if(method==='fill'){
      position=target;move('Conectar el sistema',target,1,4);graspAt=time;
      move(flow==='liquid'?'Bombear producto':flow==='powder'?'Transferir por tubería':flow==='concrete'?'Alimentar la mezcladora':'Verter desde la tolva',target,0,Math.max(20,count*unitKg/80));settleAt=time;releaseAt=time;
      move('Cerrar y desconectar',target,1,3);
    }else if(method==='ramp'){
      position=[source[0],source[1],0];move('Posicionar el transbordador',source,1,1);graspAt=time;
      move('Transferir a la rampa',[source[0],source[1],0],0);
      const deck=truck.form==='lowbed'?floor+l.bridgeLift:p.position[1]+.036-c/2;
      move('Acercar a las rampas',[l.rear+rampLength,c/2,0],0);
      move('Subir por las rampas',[l.rear-Math.max(...supports.map(s=>s.x))-.30,deck+c/2,0],0);
      const rearX=truck.form==='lowbed'?l.cargoEnd+Math.min(1,l.rearDeck*.3):target[0];
      move('Avanzar sobre la plataforma',[rearX,deck+c/2,0],0);
      if(truck.form==='lowbed')move('Bajar a la cama útil',target,0);
      else move('Estacionar en su posición',target,0);
      settleAt=time;move('Inmovilizar la unidad',target,1,1.2);releaseAt=time;
    }else{
      move('Buscar la unidad',[source[0],highY,source[2]],1);
      move(method==='crane'?'Bajar el aparejo':'Bajar la pinza',source,1);
      move('Sujetar la unidad',source,0,.45);graspAt=time;
      move('Elevar sobre el muelle',[source[0],highY,source[2]],0);
      if(method==='crane')move('Trasladar sobre la plataforma',[target[0],highY,target[2]],0);
      else{
        move('Alinear con el hueco',[source[0],highY,target[2]],0);
        move('Llevar al acceso',[portalX,highY,target[2]],0);
        move('Ajustar altura de entrada',[portalX,target[1]+.08,target[2]],0);
        move('Entrar en el camión',[target[0],target[1]+.08,target[2]],0);
      }
      move('Apoyar la unidad',target,0);settleAt=time;
      move('Soltar la unidad',target,1,.45);releaseAt=time;
      move('Separar el equipo',[target[0],method==='crane'?highY:target[1]+.08,target[2]],1);
      if(method==='rear'){
        move('Retirar el brazo',[portalX,target[1]+.08,target[2]],1);
        move('Regresar a altura segura',[portalX,highY,target[2]],1);
      }
    }
    park=position;units.push({id:p.id,barcode:p.barcode,source:flow?target:source,target,moves,graspAt,settleAt,releaseAt,end:time,road});
  }
  return {truckId:truck.id,method,flow,product:truck.cargo.label,unitLabel,size:unitM,unitKg,litres:truck.cargo.liquidLitres??null,floor,rear:l.rear,front:l.cargoStart,innerWidth:l.innerWidth,innerLength:l.innerLength,openingHeight,stockColumns,stockRows,baseX,stockWidth,highY,rampLength,duration:time,units,supports,scenario:'complete',stopAt:time,departureAt:time,exitDistance:Math.max(6,truck.lengthM*.65)};
}

/** Same metric cargo and paths; the final unit stays at source, or a flow stops at 75%. */
export function incompleteFactoryPlan(plan:FactoryLoadingPlan):FactoryLoadingPlan{
  const stopAt=plan.flow?plan.units[0].graspAt+(plan.units[0].settleAt-plan.units[0].graspAt)*.75:plan.units[plan.units.length-1].moves[0].start;
  const departureAt=stopAt+8;
  return {...plan,scenario:'incomplete',stopAt,departureAt,duration:departureAt+8};
}

const smooth=(t:number)=>{const f=Math.max(0,Math.min(1,t));return f**3*(10+f*(-15+6*f));};
export function factoryLoadingPose(plan:FactoryLoadingPlan,elapsed:number){
  // Native range controls can round their maximum by a few floating-point ULPs.
  const bounded=Number.isFinite(elapsed)&&elapsed>=plan.duration-.000001?plan.duration:Math.max(0,Math.min(plan.duration,Number.isFinite(elapsed)?elapsed:0));
  const time=plan.scenario==='incomplete'&&Math.abs(bounded-plan.stopAt)<.000001?plan.stopAt:bounded;
  const loadingTime=Math.min(time,plan.stopAt),incomplete=plan.scenario==='incomplete';
  const currentIndex=Math.max(0,plan.units.findIndex(u=>loadingTime<u.end));
  const finished=time>=plan.duration,index=finished?plan.units.length-1:currentIndex,unit=plan.units[index];
  const move=unit.moves.find(m=>loadingTime<m.end)??unit.moves[unit.moves.length-1];
  const ease=smooth((loadingTime-move.start)/(move.end-move.start));
  let carrier=lerp(move.from,move.to,ease);const gripOpen=move.openFrom+(move.openTo-move.openFrom)*ease;
  const rolling=unit.road?rollingPose(unit.road,plan.supports,carrier[0],plan.size[2]/2):null,pitch=rolling?.pitch??0;
  if(rolling)carrier=[carrier[0],rolling.y,carrier[2]];
  const clearFraction=incomplete?smooth((time-plan.stopAt-1.5)/(plan.departureAt-plan.stopAt-1.5)):0;
  const departureX=incomplete&&time>plan.departureAt?-plan.exitDistance*smooth((time-plan.departureAt)/(plan.duration-plan.departureAt)):0;
  const positions=plan.units.map((u,i)=>{
    if(incomplete&&!plan.flow&&i===plan.units.length-1)return u.source;
    const point=loadingTime>=u.settleAt?u.target:i===index&&loadingTime>=u.graspAt?carrier:u.source;
    return loadingTime>=u.releaseAt?[point[0]+departureX,point[1],point[2]] as FactoryPoint:point;
  });
  const loaded=plan.units.filter((u,i)=>loadingTime>=u.releaseAt&&(!incomplete||plan.flow||i<plan.units.length-1)).length;
  const fillFraction=plan.flow?Math.max(0,Math.min(1,(loadingTime-unit.graspAt)/(unit.settleAt-unit.graspAt))):0;
  const loadedKg=Math.round((plan.flow?fillFraction*plan.units.length:loaded)*plan.unitKg*1000)/1000;
  if(clearFraction>0)carrier=lerp(carrier,[plan.method==='rear'?plan.baseX-1:plan.rear+.65,plan.highY,plan.method==='crane'?Math.max(...plan.units.map(u=>u.source[2])):0],clearFraction);
  const phase=incomplete&&time>=plan.stopAt?(finished?'Camión salió con carga pendiente':time>=plan.departureAt?'Salida con carga pendiente':clearFraction>0?'Retirar el equipo de carga':plan.flow?'Llenado interrumpido':'Última unidad pendiente en fábrica'):finished?'Carga completa':move.label;
  return {time,currentIndex:index,finished,phase,carrier,gripOpen:clearFraction>0?1:gripOpen,pitch,positions,loaded,loadedKg,fillFraction,clearFraction,departureX,transferring:!!plan.flow&&time>=unit.graspAt&&time<Math.min(unit.settleAt,plan.stopAt)};
}
export type FactoryLoadingPose=ReturnType<typeof factoryLoadingPose>;
