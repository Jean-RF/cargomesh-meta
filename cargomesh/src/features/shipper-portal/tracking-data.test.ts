import assert from "node:assert/strict";
import test from "node:test";
import { WorkflowRecordV2Schema } from "@/shared/schemas/v2/workflow";
import type { OperationsCollection } from "@/server/services/v2-workspace/operations-collection";
import { commercialFixture, id, org, at } from "./commercial-context.test-fixtures";
import { booking, execution, location } from "@/features/carrier-portal/commercial-test-fixtures";
import { trackingQaItem } from "./tracking-qa-fixtures";
import { collectTrackingDetail, collectTrackingItem, collectTrackingPage, TrackingScopeError, type TrackingSource } from "./tracking-data";
import { parseTrackingQuery, trackingSearch } from "./tracking-query";
import { trackingStatus, matchesTrackingFilter } from "./tracking-presentation";
import type { WorkflowRecordV2 } from "./shipper-model";

const complete = (data: WorkflowRecordV2[] = []): OperationsCollection<WorkflowRecordV2> => ({data,offset:0,batchSize:500,nextOffset:null,complete:true,error:null});
function fixture() {
  const context=commercialFixture(), b=booking(), ex=execution();
  b.data.carrierConfirmationStatus="CONFIRMED";
  const metadata={organizationId:org,carrierId:null,requestId:ex.requestId,version:1,createdAt:at,updatedAt:at};
  const decision=WorkflowRecordV2Schema.parse({...metadata,id:b.data.decisionId,kind:"decisions",status:"SELECTED",data:{
    planId:context.plans[0].id,selectedPlanId:context.plans[0].id,selectedOfferIds:[context.offers[0].id],consideredOfferIds:[context.offers[0].id],
    rationale:"Explicit unit-test selection",policyId:null,policyVersion:null,evidence:[],selectedAt:at,selectedBy:id(99),status:"SELECTED",
  }});
  const {facilityId:_,...point}=location;
  const route=WorkflowRecordV2Schema.parse({...metadata,id:context.plans[0].data.routeId,kind:"routes",status:"SIMULATED",data:{
    origin:point,destination:point,corridorIds:[],policyId:id(90),policyVersion:1,estimatedDistanceKm:null,estimatedDurationSeconds:null,
    geographicSource:{kind:"PUBLISHED_CORRIDORS",references:[]},planner:{algorithmVersion:"PUBLISHED_ITINERARY_VALIDATOR_V1",graphVersion:"a".repeat(64),source:{kind:"PUBLISHED_CORRIDORS",scope:"SELECTED_ITINERARY_SNAPSHOT",references:[]}},
    confidence:"UNKNOWN",estimatedTolls:null,borderCostEstimate:null,reasons:[],legs:[],
  }});
  const records:WorkflowRecordV2[]=[ex,b,decision,...context.plans,...context.offers,route],calls:string[]=[];
  const source:TrackingSource={
    record:async(kind,recordId)=>{calls.push(`${kind}:${recordId}`);return records.find(row=>row.kind===kind&&row.id===recordId);},
    request:async()=>context.request,children:async()=>complete(),
  };
  return {context,b,ex,decision,route,records,source,calls};
}

function pageFixture(bindings=1){
  const f=fixture(),counts={requests:0,bookings:0,children:0,active:0,peak:0};
  const rows=Array.from({length:25},(_,i)=>({...structuredClone(f.ex),id:id(200+i),requestId:id(300+i%bindings),
    data:{...structuredClone(f.ex.data),bookingId:id(400+i%bindings)}}));
  const requests=new Map(Array.from({length:bindings},(_,i)=>[id(300+i),{...structuredClone(f.context.request),id:id(300+i)}]));
  const bookings=new Map(Array.from({length:bindings},(_,i)=>[id(400+i),{...structuredClone(f.b),id:id(400+i),requestId:id(300+i)}]));
  const wait=async<T>(value:T)=>{counts.active++;counts.peak=Math.max(counts.peak,counts.active);await Promise.resolve();await Promise.resolve();counts.active--;return value;};
  const source:TrackingSource={
    request:async key=>{counts.requests++;return wait(requests.get(key));},
    record:async(kind,key)=>{assert.equal(kind,'bookings');counts.bookings++;return wait(bookings.get(key));},
    children:async()=>{counts.children++;return wait(complete());},
  };
  return {rows,source,counts,requests,bookings};
}

test('25 executions share request/booking reads only inside their authorized page',async()=>{
  for(const [bindings,expectedReads] of [[1,52],[5,60],[25,100]]){
    const f=pageFixture(bindings),result=await collectTrackingPage(f.rows,org,f.source);
    assert.deepEqual(result.items.map(i=>i.execution.id),f.rows.map(row=>row.id));
    assert.deepEqual(result.issues,[]);
    assert.deepEqual([f.counts.requests,f.counts.bookings,f.counts.children],[bindings,bindings,50]);
    assert.equal(f.counts.requests+f.counts.bookings+f.counts.children,expectedReads);
    assert(f.counts.peak<=16,'must not exceed the previous four-item fan-out');
  }
});
test('a slow first execution does not block free slots from starting later items',async()=>{
  const f=pageFixture(),started:string[]=[],original=f.source.children;
  let release!:()=>void;const gate=new Promise<void>(done=>release=done);
  f.source.children=async(kind,key)=>{started.push(key);if(key===f.rows[0].id)await gate;return original(kind,key);};
  const pending=collectTrackingPage(f.rows,org,f.source);
  await new Promise<void>(done=>setImmediate(done));
  assert(started.includes(f.rows[4].id),'the fifth item should start while the first is still waiting');
  release();assert.deepEqual((await pending).items.map(i=>i.execution.id),f.rows.map(row=>row.id));
});
test('page validation and shared lookups do not weaken tenant/carrier/duplicate boundaries',async()=>{
  const invalid=pageFixture();invalid.rows[24].organizationId=id(999);
  await assert.rejects(collectTrackingPage(invalid.rows,org,invalid.source),TrackingScopeError);
  assert.deepEqual([invalid.counts.requests,invalid.counts.bookings,invalid.counts.children],[0,0,0]);
  const duplicate=pageFixture();duplicate.rows[24].id=duplicate.rows[0].id;
  await assert.rejects(collectTrackingPage(duplicate.rows,org,duplicate.source),TrackingScopeError);
  const f=pageFixture();f.rows[1].carrierId=id(999);
  await assert.rejects(collectTrackingPage(f.rows,org,f.source),TrackingScopeError);
  await assert.rejects(collectTrackingPage(Array(26).fill(f.rows[0]),org,f.source),{name:'ZodError'});
});
test('read scopes do not survive another page or hide authorization errors and partial children',async()=>{
  const f=pageFixture();await collectTrackingPage(f.rows,org,f.source);
  f.source.request=async()=>{throw new Error('403 FORBIDDEN');};
  await assert.rejects(collectTrackingPage(f.rows,org,f.source),/403 FORBIDDEN/);
  const partial=pageFixture();partial.source.children=async(kind,key)=>key===partial.rows[7].id
    ? {...complete(),complete:false,error:kind==='incidents'?{code:'OPERATIONS_READ_UNAVAILABLE'}:null}:complete();
  const r=await collectTrackingPage(partial.rows,org,partial.source);
  assert.equal(r.items[7].eventsComplete,false);assert.equal(r.items[7].incidentsComplete,false);
  assert.deepEqual(r.issues,[{resource:'execution-events',reason:'partial'},{resource:'incidents',reason:'unavailable'}]);
});
test('detail starts the selected commercial chain and offer while events remain pending',async()=>{
  const f=fixture(),original=f.source.children;
  let release!:()=>void;const gate=new Promise<void>(done=>release=done);
  f.source.children=async(kind,parent)=>{await gate;return original(kind,parent);};
  const pending=collectTrackingDetail(f.ex.id,org,f.source);
  await new Promise<void>(done=>setImmediate(done));
  assert(f.calls.includes(`decisions:${f.b.data.decisionId}`));
  assert(f.calls.includes(`offers:${f.context.offers[0].id}`));
  assert(f.calls.includes(`routes:${f.route.id}`));
  assert.equal(f.calls.filter(call=>call===`bookings:${f.b.id}`).length,1);
  release();assert.equal((await pending).item.execution.id,f.ex.id);
});
test("detail uses exact execution and booking-selected chain, not a capped tenant list",async()=>{
  const f=fixture(),detail=await collectTrackingDetail(f.ex.id,org,f.source);
  assert.equal(detail.item.execution.id,f.ex.id);assert.equal(detail.item.booking?.id,f.b.id);
  assert.equal(detail.offer?.id,f.context.offers[0].id);assert.equal(detail.route?.id,f.route.id);
  assert.equal(detail.canView3D,false);assert.deepEqual(detail.presentation.paths,[]);
  assert.deepEqual(detail.issues,[]);assert.equal(f.calls[0],`executions:${f.ex.id}`);
  assert.equal(f.calls.length,6);
});
test("PLANNED remains active but does not assert departure or location",async()=>{
  const f=fixture(),{item}=await collectTrackingItem(f.ex,org,f.source);
  assert.equal(trackingStatus(item.execution,item.booking,[],[],es=>es).label,"Por iniciar");
  assert.equal(matchesTrackingFilter(item,"active"),true);assert.equal(item.execution.data.lastKnownPosition,null);
});
test("foreign tenant, carrier, request, wrong IDs and child scope fail closed",async()=>{
  for(const mutate of [
    (f:ReturnType<typeof fixture>)=>{f.ex.organizationId=id(999);},
    (f:ReturnType<typeof fixture>)=>{f.b.carrierId=id(999);},
    (f:ReturnType<typeof fixture>)=>{f.route.requestId=id(999);},
    (f:ReturnType<typeof fixture>)=>{f.context.request.organizationId=id(999);},
    (f:ReturnType<typeof fixture>)=>{f.decision.id=id(999);f.source.record=async()=>f.decision;},
    (f:ReturnType<typeof fixture>)=>{f.source.children=async()=>complete(trackingQaItem("transit").events);},
  ]){
    const f=fixture();mutate(f);await assert.rejects(collectTrackingDetail(f.ex.id,org,f.source),TrackingScopeError);
  }
});
test("selected offer and service/assignment mismatches cannot authorize route/3D",async()=>{
  for(const mutate of [
    (f:ReturnType<typeof fixture>)=>{if(f.decision.kind==="decisions")f.decision.data.selectedOfferIds=[id(999)];},
    (f:ReturnType<typeof fixture>)=>{f.context.offers[0].data.planCandidateId=id(999);},
    (f:ReturnType<typeof fixture>)=>{f.context.offers[0].data.coveredServiceIds=[id(999)];},
    (f:ReturnType<typeof fixture>)=>{f.context.offers[0].data.coveredAssignmentIds=[id(999)];},
    (f:ReturnType<typeof fixture>)=>{f.context.plans[0].data.legAssignments[0].carrierId=id(999);},
  ]){
    const f=fixture();mutate(f);await assert.rejects(collectTrackingDetail(f.ex.id,org,f.source),TrackingScopeError);
  }
});
test("legacy booking without exact offer disables route, not the whole execution",async()=>{
  const f=fixture();delete f.b.data.offerId;
  const detail=await collectTrackingDetail(f.ex.id,org,f.source);
  assert.equal(detail.route,null);assert.equal(detail.offer,null);assert.equal(detail.canView3D,false);
  assert.deepEqual(detail.issues,[{resource:"booking-offer",reason:"partial"}]);
});
test("failed/partial child collections stay incomplete, never become a verified zero",async()=>{
  const f=fixture();f.source.children=async kind=>({...complete(),complete:false,nextOffset:100,error:kind==="incidents"?{code:"OPERATIONS_READ_UNAVAILABLE"}:null});
  const detail=await collectTrackingDetail(f.ex.id,org,f.source);
  assert.equal(detail.item.eventsComplete,false);assert.equal(detail.item.incidentsComplete,false);
  assert.deepEqual(detail.issues,[{resource:"execution-events",reason:"partial"},{resource:"incidents",reason:"unavailable"}]);
});
test("authentication, contract and exact-read backend failures propagate without fallback",async()=>{
  for(const message of ["401 UNAUTHORIZED","403 FORBIDDEN","404 NOT_FOUND","NETWORK"]){
    const f=fixture();f.source.record=async()=>{throw new Error(message);};
    await assert.rejects(collectTrackingDetail(f.ex.id,org,f.source),new RegExp(message));
  }
  const f=fixture();f.source.record=async()=>({});await assert.rejects(collectTrackingDetail(f.ex.id,org,f.source),{name:"ZodError"});
});
test("tracking query round-trips local filters/page and discards arbitrary navigation",()=>{
  const query=parseTrackingQuery(new URLSearchParams("q=L%C3%ADma&filter=attention&sort=oldest&offset=25&returnTo=https://foreign.invalid"));
  assert.deepEqual(parseTrackingQuery(new URLSearchParams(trackingSearch(query))),query);
  assert.equal(trackingSearch(query).includes("returnTo"),false);
  for(const offset of ["NaN","-1","100001","0.5"])assert.equal(parseTrackingQuery(new URLSearchParams({offset})).offset,0);
  assert.equal(parseTrackingQuery(new URLSearchParams({q:"x".repeat(300),filter:"REJECTED"})).q.length,200);
});
