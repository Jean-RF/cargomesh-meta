import {LoadingDashboardSourceSchema,type LoadingDashboardSource,type LoadingUnit} from '@/shared/schemas/meta/loading-dashboard';

export type ComparisonStatus='NOT_READY'|'INCOMPATIBLE_SCOPE'|'INSUFFICIENT_EVIDENCE'|'OUTDATED'|'MATCH'|'DIFFERENCE_PROPOSED';
const needsReview=new Set<ComparisonStatus>(['INCOMPATIBLE_SCOPE','INSUFFICIENT_EVIDENCE','OUTDATED','DIFFERENCE_PROPOSED']);
const knownSum=(values:(number|null)[])=>{if(values.some(v=>v===null))return null;const total=values.reduce<number>((a,b)=>a+b!,0);return Number.isSafeInteger(total)?total:null;};
export function knownPercentage(numerator:number|null,denominator:number|null){
  return numerator===null||denominator===null||denominator<=0?null:100*numerator/denominator;
}
export function buildLoadingDashboard(input:LoadingDashboardSource){
  const s=LoadingDashboardSourceSchema.parse(input),o=s.observation,p=s.plan;
  const current=s.manifest.current!==false&&s.manifest.id===s.session.manifestId&&s.manifest.revision===s.session.manifestRevision;
  const rows=s.manifest.groups.map(group=>{
    const observed=o?.groups.find(g=>g.id===group.id),allocations=p?.allocations.filter(a=>a.groupId===group.id)??[];
    const planCurrent=!!p&&p.manifestRevision===s.session.manifestRevision&&current;
    const planCompatible=allocations.every(a=>a.unit===group.unit);
    const planned=planCurrent&&planCompatible&&p.complete?knownSum(allocations.map(a=>a.count)):null;
    const observationCurrent=!!o&&o.sessionId===s.session.id&&o.manifestRevision===s.session.manifestRevision&&current;
    const unitCompatible=observed?.unit===group.unit;
    const observedCount=observationCurrent&&unitCompatible?observed!.count:null;
    let status:ComparisonStatus='NOT_READY';
    if(!current||(o&&o.manifestRevision!==s.session.manifestRevision))status='OUTDATED';
    else if(o&&(o.sessionId!==s.session.id||(observed&&!unitCompatible)))status='INCOMPATIBLE_SCOPE';
    else if(s.session.scopeState==='OPEN'||!o||!observed)status='NOT_READY';
    else if(!s.manifest.complete||group.count===null||!o.complete||observed.count===null||observed.coverage!=='COMPLETE'||observed.quality!=='SUFFICIENT')status='INSUFFICIENT_EVIDENCE';
    else status=group.count===observed.count?'MATCH':'DIFFERENCE_PROPOSED';
    const comparable=status==='MATCH'||status==='DIFFERENCE_PROPOSED';
    return {id:group.id,label:group.label,unit:group.unit,declared:group.count,planned,observed:observedCount,
      status,delta:comparable?group.count!-observed!.count!:null,
      progressPercent:observationCurrent&&unitCompatible?knownPercentage(observedCount,group.count):null,
      evidence:observed?.evidence??[],coverage:observed?.coverage??null,
      planIssue:!p?'Sin plan':!planCurrent?'Plan de otra revisión':!planCompatible?'Unidad de plan incompatible':!p.complete?'Plan parcial':null,
      assignments:allocations.map(a=>({vehicleId:a.vehicleId,label:p!.vehicles.find(v=>v.id===a.vehicleId)!.label,count:a.count,unit:a.unit})),
    };
  });
  const totals=(unit:LoadingUnit)=>{
    const scoped=rows.filter(r=>r.unit===unit);
    return {unit,groups:scoped.length,declared:scoped.length?knownSum(scoped.map(r=>r.declared)):null,planned:scoped.length?knownSum(scoped.map(r=>r.planned)):null,observed:scoped.length?knownSum(scoped.map(r=>r.observed)):null,pendingReview:scoped.filter(r=>needsReview.has(r.status)).length};
  };
  return {schemaVersion:1 as const,snapshotVersion:s.snapshotVersion,source:s.source,capturedAt:s.capturedAt,session:s.session,
    isDemo:s.source==='SYNTHETIC_FIXTURE'||(s.session.mode?s.session.mode==='DEMO':s.session.operationId===null),
    scope:s.manifest.complete?'SESSION' as const:'LOADED_GROUPS' as const,
    manifest:{id:s.manifest.id,revision:s.manifest.revision},planRef:p?`${p.id} · r${p.revision}`:null,observationRef:o?.id??null,
    rows,totals:[totals('PALLET'),totals('BOX')],
  };
}
export type LoadingDashboard=ReturnType<typeof buildLoadingDashboard>;
/** An empty refresh and an older response never erase a newer reading of the same session. */
export function retainLoadingDashboard(previous:LoadingDashboard|null,next:LoadingDashboard|null){
  if(!next)return previous;
  return previous&&previous.session.id===next.session.id&&previous.snapshotVersion>=next.snapshotVersion?previous:next;
}
