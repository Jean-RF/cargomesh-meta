import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {LoadingBundleSchema,LoadingJobProjectionSchema} from '../schemas/meta/loading-operation';
import {loadingBundleFixture,loadingPassportFixture,loadingId} from '../schemas/meta/loading-operation.fixtures';
import {loadingComparison,loadingExplanationFacts,loadingPassport,validateLoadingExplanation} from './loading-operation';

describe('Operational loading facts',()=>{
 it('compares a closed evidenced group and preserves the immutable Passport source',()=>{
  const p=loadingPassportFixture(),saved=JSON.stringify(p),view=loadingPassport(p);
  assert.equal(view.comparison.rows[0].delta,2);assert.equal(view.comparison.rows[0].planned,null);assert.equal(view.comparison.isDemo,true);
  assert.deepEqual(view.effects,{bookingCreated:false,incidentCreated:false,deliveryConfirmed:false});assert.equal(view.timeline.length,4);assert.equal(JSON.stringify(p),saved);
 });
 it('does not conclude a difference from open, incomplete, uncertain, stale or negative-net evidence',()=>{
  for(const mutate of [
   (b:ReturnType<typeof loadingBundleFixture>)=>{b.session.state='OPEN';b.session.closedAt=null;b.session.closedBy=null;},
   b=>{b.selections[0].coverage='PARTIAL';},b=>{b.observations[0].status='REQUIRES_REVIEW';},
   b=>{b.currentManifest!.contentCurrent=false;},b=>{b.currentManifest!.id=loadingId(99);},
   b=>{const o=b.observations[0];o.entries=0;o.exits=1;o.net=-1;o.events=[{...o.events[0],direction:'OUT'}];},
   b=>{b.observations.push({...b.observations[0],id:loadingId(98),attempt:2});},
  ] as ((b:ReturnType<typeof loadingBundleFixture>)=>void)[]){const b=loadingBundleFixture();mutate(b);assert.equal(loadingComparison(b).rows[0].delta,null);}
 });
 it('keeps a workflow-only draft-version change current but rejects synthetic verification evidence',()=>{
  const b=loadingBundleFixture();b.currentManifest!.requestDraftVersion=8;assert.equal(loadingComparison(b).rows[0].status,'DIFFERENCE_PROPOSED');
  b.session.mode='VERIFICATION';assert.equal(loadingComparison(b).isDemo,false);assert.equal(loadingComparison(b).rows[0].delta,null);
 });
 it('rejects forged quantities, foreign observations and changed identities at the boundary',()=>{
  for(const mutate of [(b:ReturnType<typeof loadingBundleFixture>)=>{b.session.groups[0].count=11;},b=>{b.observations[0].organizationId=loadingId(99);},b=>{b.selections[0].groupId=loadingId(99);},b=>{b.observations[0].groupId=loadingId(99);} ] as ((b:ReturnType<typeof loadingBundleFixture>)=>void)[]){const b=loadingBundleFixture();mutate(b);assert.equal(LoadingBundleSchema.safeParse(b).success,false);}
 });
 it('projects exact event aliases for Luis, validates response scope and refuses lossy projections',()=>{
  const p=loadingPassportFixture(),g=p.source.session.groups[0],f=loadingExplanationFacts(p,g.id);
  assert.equal(f.differenceQuantity,2);assert.equal(f.events[0].timecodeMs,0);
  const output={schemaVersion:'1.0',reconciliationId:g.comparisonId,reconciliationVersion:p.sessionVersion,comparisonStatus:f.comparisonStatus,summary:'Synthetic test explanation',reasons:[],limitations:[],suggestedActions:['REVIEW_EVIDENCE'],evidenceRefs:[f.events[0]],requiresHumanReview:true};
  assert.equal(validateLoadingExplanation(p,g.id,output).reconciliationId,g.comparisonId);
  assert.throws(()=>validateLoadingExplanation(p,g.id,{...output,evidenceRefs:[{...f.events[0],timecodeMs:99}]}));
  assert.throws(()=>validateLoadingExplanation(p,g.id,{...output,comparisonStatus:'MATCH'}));
  p.source.session.groups[0].count=1000001;p.source.session.manifest.declaration.cargoSpecification.units[0].quantity=1000001;
  assert.throws(()=>loadingExplanationFacts(p,g.id),/EXPLANATION_SCOPE_TOO_LARGE/);
 });
 it('checks the worker supplied net and event counts instead of inventing conversions',()=>{
  const b=loadingBundleFixture(),o=b.observations[0],config={unit:o.unit,concept:'pallet',line:{x1:0.5,y1:0,x2:0.5,y2:1,inside_x:0.8,inside_y:0.5}},job={jobId:o.jobId,organizationId:o.organizationId,sessionId:o.sessionId,evidenceId:o.evidenceId,manifestRevision:1,attempt:1,status:'SUCCEEDED',config,groupId:b.session.groups[0].id,coverage:'COMPLETE',observation:{analysis_version:'1',clip:{source:o.source,time_mapping:o.timeMapping,sha256:o.clipSha256},segmentation:{segmenter:'FIXTURE',real_inference:false},config:{...config},result:{status:o.status,entries:8,exits:0,net:8,flags:[],events:o.events.map(e=>({object_id:e.objectId,seconds:e.seconds,direction:e.direction}))},evidence:{overlay_uploaded:false}}};
  assert.equal(LoadingJobProjectionSchema.safeParse(job).success,true);job.observation.result.net=7;assert.equal(LoadingJobProjectionSchema.safeParse(job).success,false);
  job.observation.result.net=8;job.observation.config.concept='box';assert.equal(LoadingJobProjectionSchema.safeParse(job).success,false);
 });
});
