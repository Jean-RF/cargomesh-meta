import {z} from 'zod';
import {LoadingUnitSchema} from './loading-dashboard';

const Id=z.string().uuid(),Revision=z.number().int().positive().max(2147483647);
const Instant=z.string().datetime({offset:true}),Count=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const LoadingModeSchema=z.enum(['DEMO','VERIFICATION']);
export const OpenLoadingSessionSchema=z.object({
  requestId:Id,manifestId:Id,manifestRevision:Revision,facilityId:Id,mode:LoadingModeSchema,
  groups:z.array(z.object({groupId:Id,unit:LoadingUnitSchema}).strict()).min(1).max(100),
}).strict().superRefine((v,c)=>{if(new Set(v.groups.map(g=>g.groupId)).size!==v.groups.length)c.addIssue({code:'custom',message:'Duplicate manifest group.'});});
export const LoadingVersionSchema=z.object({expectedVersion:Revision}).strict();
export const SelectLoadingObservationSchema=LoadingVersionSchema.extend({
  groupId:Id,observationId:Id,coverage:z.enum(['PARTIAL','COMPLETE']),reason:z.string().trim().min(3).max(600),
}).strict();

/** Consumption projection of CR-01, not another canonical declaration or manifest implementation. */
export const LoadingManifestProjectionSchema=z.object({
  id:Id,revision:Revision,status:z.literal('CONFIRMED'),contentHash:z.string().regex(/^[0-9a-f]{64}$/),
  declaration:z.object({
    schemaVersion:z.literal('0.1'),
    source:z.object({requestId:Id,organizationId:Id,requestDraftVersion:Revision}).passthrough(),
    groupBindings:z.array(z.object({groupId:Id,sourceUnitIndex:z.number().int().nonnegative()}).passthrough()).min(1).max(100),
    cargoSpecification:z.object({units:z.array(z.object({packageType:z.string().min(1),quantity:Count}).passthrough()).min(1).max(100)}).passthrough(),
  }).passthrough(),
}).passthrough().superRefine((v,c)=>{
  const b=v.declaration.groupBindings,u=v.declaration.cargoSpecification.units;
  if(b.length!==u.length||new Set(b.map(g=>g.groupId)).size!==b.length||new Set(b.map(g=>g.sourceUnitIndex)).size!==u.length||b.some(g=>g.sourceUnitIndex>=u.length))c.addIssue({code:'custom',message:'Manifest group identities must cover its cargo units exactly once.'});
});

const ProducerId=z.string().trim().min(1).max(200);
const AnalysisConfig=z.object({unit:LoadingUnitSchema,concept:z.string().min(1),line:z.object({x1:z.number().min(0).max(1),y1:z.number().min(0).max(1),x2:z.number().min(0).max(1),y2:z.number().min(0).max(1),inside_x:z.number().min(0).max(1),inside_y:z.number().min(0).max(1)}).strict(),margin:z.number().optional(),min_track_frames:z.number().int().optional()}).passthrough();
/** Required fields of Ramón's saved AnalysisJobRecord; extra producer fields remain producer-owned. */
export const LoadingJobProjectionSchema=z.object({
  jobId:ProducerId,organizationId:Id,sessionId:Id,evidenceId:ProducerId,manifestRevision:Revision,attempt:Revision,status:z.literal('SUCCEEDED'),config:AnalysisConfig,groupId:Id,coverage:z.enum(['PARTIAL','COMPLETE']),
  observation:z.object({
    analysis_version:z.string().min(1),
    clip:z.object({source:z.enum(['OWN_CAPTURE','SYNTHETIC_RENDER']),time_mapping:z.string().min(1),sha256:z.string().regex(/^[0-9a-f]{64}$/)}).passthrough(),
    segmentation:z.object({segmenter:z.enum(['META_SAM_API','FIXTURE']),real_inference:z.boolean()}).passthrough(),
    config:AnalysisConfig,
    result:z.object({status:z.enum(['OK','REQUIRES_REVIEW','INSUFFICIENT_EVIDENCE']),entries:Count,exits:Count,net:z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER),
      events:z.array(z.object({object_id:z.number().int(),seconds:z.number().finite().nonnegative().max(86400),direction:z.enum(['IN','OUT'])}).passthrough()).max(5000),
      flags:z.array(z.object({kind:z.string().min(1).max(100),seconds:z.number().finite().nonnegative().max(86400),detail:z.string().max(600)}).passthrough()).max(5000),
    }).passthrough(),
    evidence:z.object({overlay_uploaded:z.boolean()}).passthrough(),
  }).passthrough(),
}).passthrough().superRefine((v,c)=>{
  const r=v.observation.result;
  const a=v.config,b=v.observation.config;
  if(a.unit!==b.unit||a.concept!==b.concept||JSON.stringify(a.line)!==JSON.stringify(b.line)||(a.margin!==undefined&&a.margin!==b.margin)||(a.min_track_frames!==undefined&&a.min_track_frames!==b.min_track_frames))c.addIssue({code:'custom',message:'Observation configuration differs from the saved job.'});
  if(r.net!==r.entries-r.exits||r.events.filter(e=>e.direction==='IN').length!==r.entries||r.events.filter(e=>e.direction==='OUT').length!==r.exits)c.addIssue({code:'custom',message:'Crossing events and supplied counts disagree.'});
  if(r.status==='OK'&&r.flags.length)c.addIssue({code:'custom',message:'Review flags cannot be labelled OK.'});
  if(v.observation.segmentation.segmenter==='FIXTURE'&&v.observation.segmentation.real_inference)c.addIssue({code:'custom',message:'Fixture inference cannot be real.'});
});

export const LoadingEventSchema=z.object({eventId:Id,evidenceId:Id,timecodeMs:z.number().int().nonnegative().max(86400000),seconds:z.number().nonnegative(),direction:z.enum(['IN','OUT']),objectId:z.number().int()}).strict();
export const LoadingObservationSchema=z.object({
  id:Id,organizationId:Id,sessionId:Id,jobId:ProducerId,attempt:Revision,manifestRevision:Revision,evidenceId:ProducerId,evidenceRefId:Id,
  groupId:Id.nullable().default(null),reportedCoverage:z.enum(['PARTIAL','COMPLETE']).nullable().default(null),
  unit:LoadingUnitSchema,status:z.enum(['OK','REQUIRES_REVIEW','INSUFFICIENT_EVIDENCE']),entries:Count,exits:Count,net:z.number().int(),
  source:z.enum(['OWN_CAPTURE','SYNTHETIC_RENDER']),clipSha256:z.string().regex(/^[0-9a-f]{64}$/),realInference:z.boolean(),overlayUploaded:z.boolean(),analysisVersion:z.string(),timeMapping:z.string(),
  flags:z.array(z.object({kind:z.string(),seconds:z.number().nonnegative(),detail:z.string()}).strict()).max(5000),
  events:z.array(LoadingEventSchema).max(5000),receivedAt:Instant,
}).strict().refine(v=>v.net===v.entries-v.exits,'Invalid net count.');
export const LoadingObservationIngressSchema=z.object({
  groupId:Id,reportedCoverage:z.enum(['PARTIAL','COMPLETE']),
  unit:LoadingUnitSchema,status:z.enum(['OK','REQUIRES_REVIEW','INSUFFICIENT_EVIDENCE']),entries:Count,exits:Count,net:z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER),
  source:z.enum(['OWN_CAPTURE','SYNTHETIC_RENDER']),clipSha256:z.string().regex(/^[0-9a-f]{64}$/),realInference:z.boolean(),overlayUploaded:z.boolean(),analysisVersion:z.string().min(1).max(200),timeMapping:z.string().min(1).max(1000),
  flags:z.array(z.object({kind:z.string().min(1).max(100),seconds:z.number().nonnegative().max(86400),detail:z.string().max(600)}).strict()).max(5000),
  events:z.array(z.object({seconds:z.number().nonnegative().max(86400),direction:z.enum(['IN','OUT']),objectId:z.number().int()}).strict()).max(5000),
}).strict().superRefine((v,c)=>{if(v.net!==v.entries-v.exits||v.events.filter(e=>e.direction==='IN').length!==v.entries||v.events.filter(e=>e.direction==='OUT').length!==v.exits||(v.status==='OK'&&v.flags.length))c.addIssue({code:'custom',message:'Inconsistent observation.'});});
export const LoadingSelectionSchema=z.object({groupId:Id,observationId:Id,coverage:z.enum(['PARTIAL','COMPLETE']),reason:z.string().min(3),memberId:Id,selectedAt:Instant}).strict();
export const LoadingSessionSchema=z.object({
  id:Id,organizationId:Id,requestId:Id,facilityId:Id,facilityName:z.string().min(1),mode:LoadingModeSchema,
  manifest:LoadingManifestProjectionSchema,
  groups:z.array(z.object({id:Id,comparisonId:Id,label:z.string().min(1),unit:LoadingUnitSchema,count:Count}).strict()).min(1).max(100),
  state:z.enum(['OPEN','CLOSED']),version:Revision,openedAt:Instant,openedBy:Id,closedAt:Instant.nullable(),closedBy:Id.nullable(),updatedAt:Instant,
}).strict().superRefine((s,c)=>{
  if(s.manifest.declaration.source.organizationId!==s.organizationId||s.manifest.declaration.source.requestId!==s.requestId)c.addIssue({code:'custom',message:'Manifest session scope mismatch.'});
  const bindings=s.manifest.declaration.groupBindings,units=s.manifest.declaration.cargoSpecification.units;
  if(s.groups.length!==bindings.length||new Set(s.groups.map(g=>g.id)).size!==bindings.length||new Set(s.groups.map(g=>g.comparisonId)).size!==bindings.length||s.groups.some(g=>{const b=bindings.find(b=>b.groupId===g.id);return !b||g.count!==units[b.sourceUnitIndex].quantity;}))c.addIssue({code:'custom',message:'Session groups changed manifest identities or quantities.'});
  if((s.state==='CLOSED')!==(s.closedAt!==null&&s.closedBy!==null))c.addIssue({code:'custom',message:'Session closing provenance missing.'});
});
export const LoadingBundleSchema=z.object({
  session:LoadingSessionSchema,observations:z.array(LoadingObservationSchema).max(1000),selections:z.array(LoadingSelectionSchema).max(100),
  currentManifest:z.object({id:Id,revision:Revision,requestDraftVersion:Revision,contentCurrent:z.boolean()}).strict().nullable(),
}).strict().superRefine((v,c)=>{
  const ids=new Set(v.observations.map(o=>o.id)),groups=new Set(v.session.groups.map(g=>g.id));
  if(ids.size!==v.observations.length||v.observations.some(o=>o.organizationId!==v.session.organizationId||o.sessionId!==v.session.id||o.manifestRevision!==v.session.manifest.revision||(o.groupId!==null&&!groups.has(o.groupId)))||new Set(v.selections.map(s=>s.groupId)).size!==v.selections.length||v.selections.some(s=>{const o=v.observations.find(o=>o.id===s.observationId);return !groups.has(s.groupId)||!ids.has(s.observationId)||(o?.groupId!=null&&o.groupId!==s.groupId);}))c.addIssue({code:'custom',message:'Observation or selection scope mismatch.'});
});
export const LoadingPassportRecordSchema=z.object({id:Id,sessionId:Id,organizationId:Id,sessionVersion:Revision,ruleVersion:z.literal('loading.compare.v1'),createdAt:Instant,createdBy:Id,source:LoadingBundleSchema}).strict().superRefine((p,c)=>{
  if(p.source.session.id!==p.sessionId||p.source.session.organizationId!==p.organizationId||p.source.session.version!==p.sessionVersion||p.source.session.state!=='CLOSED')c.addIssue({code:'custom',message:'Passport must freeze a closed session version.'});
});
export const LoadingExplanationSchema=z.object({
  schemaVersion:z.literal('1.0'),reconciliationId:Id,reconciliationVersion:Revision,
  comparisonStatus:z.enum(['NOT_READY','MATCH','DIFFERENCE_PROPOSED','INSUFFICIENT_EVIDENCE','INCOMPATIBLE_SCOPE','OUTDATED']),
  summary:z.string().trim().min(1).max(600),reasons:z.array(z.string().trim().min(1).max(240)).max(4),limitations:z.array(z.string().trim().min(1).max(240)).max(5),
  suggestedActions:z.array(z.enum(['REVIEW_EVIDENCE','RECORD_MORE_EVIDENCE','CHECK_MANIFEST','WAIT_FOR_SESSION_CLOSE','REQUEST_HUMAN_REVIEW'])).max(3),
  evidenceRefs:z.array(z.object({eventId:Id,evidenceId:Id,timecodeMs:z.number().int().nonnegative().max(86400000)}).strict()).max(20),requiresHumanReview:z.literal(true),
}).strict();
export type OpenLoadingSession=z.infer<typeof OpenLoadingSessionSchema>;
export type LoadingBundle=z.infer<typeof LoadingBundleSchema>;
export type LoadingSession=z.infer<typeof LoadingSessionSchema>;
export type LoadingObservation=z.infer<typeof LoadingObservationSchema>;
export type LoadingPassportRecord=z.infer<typeof LoadingPassportRecordSchema>;
export type LoadingExplanation=z.infer<typeof LoadingExplanationSchema>;
