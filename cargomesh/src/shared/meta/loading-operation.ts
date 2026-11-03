import {LoadingBundleSchema,LoadingExplanationSchema,LoadingPassportRecordSchema,type LoadingBundle,type LoadingPassportRecord} from '../schemas/meta/loading-operation';
import {buildLoadingDashboard} from './loading-dashboard';
import type {LoadingDashboardSource} from '../schemas/meta/loading-dashboard';

export function loadingDashboardSource(input:LoadingBundle):LoadingDashboardSource{
  const b=LoadingBundleSchema.parse(input),s=b.session,m=s.manifest,current=b.currentManifest;
  const groups=s.groups.map(g=>({id:g.id,label:g.label,unit:g.unit,count:g.count}));
  const selected=b.selections.map(selection=>({selection,observation:b.observations.find(o=>o.id===selection.observationId)!}));
  const complete=selected.length===groups.length&&selected.every(({selection})=>selection.coverage==='COMPLETE');
  return {schemaVersion:1,snapshotVersion:s.version,source:'CONNECTED',capturedAt:new Date(s.updatedAt).toISOString(),
    session:{id:s.id,organizationId:s.organizationId,facilityId:s.facilityId,facilityName:s.facilityName,operationId:null,manifestId:m.id,manifestRevision:m.revision,version:s.version,scopeState:s.state,mode:s.mode},
    manifest:{id:m.id,revision:m.revision,complete:true,current:!!current&&current.id===m.id&&current.revision===m.revision&&current.contentCurrent,groups},
    plan:null,
    observation:selected.length?{id:`selection:${s.id}:v${s.version}`,sessionId:s.id,manifestRevision:m.revision,complete,
      groups:selected.map(({selection,observation:o})=>{
        const latestAttempt=Math.max(...b.observations.filter(v=>v.jobId===o.jobId).map(v=>v.attempt));
        const sourceCompatible=s.mode==='DEMO'||(o.source==='OWN_CAPTURE'&&o.realInference);
        return {id:selection.groupId,label:groups.find(g=>g.id===selection.groupId)!.label,unit:o.unit,count:o.net>=0?o.net:null,
          coverage:selection.coverage,quality:o.status==='OK'&&o.net>=0&&o.attempt===latestAttempt&&sourceCompatible?'SUFFICIENT':'UNCERTAIN',
          evidence:o.events.length?o.events.map(e=>({id:e.eventId,timeSeconds:e.seconds})):[{id:o.evidenceRefId,timeSeconds:null}]};
      }),
    }:null,
  };
}
export function loadingComparison(input:LoadingBundle){return buildLoadingDashboard(loadingDashboardSource(input));}

/** Immutable source plus a versioned pure comparator; a Passport is not proof of delivery. */
export function loadingPassport(input:LoadingPassportRecord){
  const p=LoadingPassportRecordSchema.innerType().strip().pipe(LoadingPassportRecordSchema).parse(input),comparison=loadingComparison(p.source);
  return {...p,comparison,timeline:[
    {kind:'OPENED' as const,at:p.source.session.openedAt,memberId:p.source.session.openedBy},
    ...p.source.observations.map(o=>({kind:'OBSERVATION' as const,at:o.receivedAt,observationId:o.id,jobId:o.jobId,source:o.source,realInference:o.realInference})),
    ...p.source.selections.map(s=>({kind:'COVERAGE_REVIEW' as const,at:s.selectedAt,memberId:s.memberId,groupId:s.groupId,coverage:s.coverage,reason:s.reason})),
    {kind:'CLOSED' as const,at:p.source.session.closedAt!,memberId:p.source.session.closedBy!},
  ].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)),
    effects:{bookingCreated:false,incidentCreated:false,deliveryConfirmed:false},
  };
}

/** Juan supplies facts only; Luis owns the model call and grounded wording. */
export function loadingExplanationFacts(input:LoadingPassportRecord,groupId:string){
  const p=LoadingPassportRecordSchema.innerType().strip().pipe(LoadingPassportRecordSchema).parse(input),comparison=loadingComparison(p.source);
  const group=p.source.session.groups.find(g=>g.id===groupId),row=comparison.rows.find(r=>r.id===groupId);
  if(!group||!row)throw new Error('PASSPORT_GROUP_NOT_FOUND');
  const selected=p.source.selections.find(s=>s.groupId===groupId),o=p.source.observations.find(o=>o.id===selected?.observationId);
  // Luis's v1 projection has explicit bounds. Refuse an unsupported projection without truncating facts.
  if([row.declared,row.observed,row.delta].some(n=>n!==null&&Math.abs(n)>1_000_000)||(o?.events.length??0)>100)throw new Error('EXPLANATION_SCOPE_TOO_LARGE');
  return {schemaVersion:'1.0' as const,reconciliationId:group.comparisonId,reconciliationVersion:p.sessionVersion,
    sessionId:p.sessionId,manifestRevision:p.source.session.manifest.revision,observationRevision:o?.attempt??null,
    comparisonStatus:row.status,sessionClosed:true,evidenceSufficient:row.status==='MATCH'||row.status==='DIFFERENCE_PROPOSED',
    expectedQuantity:row.declared,expectedUnit:group.unit,observedQuantity:row.observed,observedUnit:o?.unit??null,differenceQuantity:row.delta,
    events:o?.events.map(e=>({eventId:e.eventId,evidenceId:e.evidenceId,timecodeMs:e.timecodeMs}))??[],
  };
}
export function validateLoadingExplanation(p:LoadingPassportRecord,groupId:string,input:unknown){
  const facts=loadingExplanationFacts(p,groupId),e=LoadingExplanationSchema.parse(input);
  if(e.reconciliationId!==facts.reconciliationId||e.reconciliationVersion!==facts.reconciliationVersion||e.comparisonStatus!==facts.comparisonStatus||
    new Set(e.suggestedActions).size!==e.suggestedActions.length||new Set(e.evidenceRefs.map(r=>r.eventId)).size!==e.evidenceRefs.length||
    e.evidenceRefs.some(ref=>!facts.events.some(r=>r.eventId===ref.eventId&&r.evidenceId===ref.evidenceId&&r.timecodeMs===ref.timecodeMs)))throw new Error('EXPLANATION_SCOPE_MISMATCH');
  return e;
}
