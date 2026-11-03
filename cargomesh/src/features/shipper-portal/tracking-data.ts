import {displayReference,locationDisplayLabel} from '@/shared/lib/display-identity';
import { z } from "zod";
import { WorkflowRecordV2Schema } from "@/shared/schemas/v2/workflow";
import { FreightRequestV2ResponseSchema } from "@/shared/schemas/v2/freight-request";
import type { WorkflowRecordV2 } from "./shipper-model";
import type { TrackingListItem } from "./tracking-presentation";
import { routeForExecution, canShowConceptual3D, type Execution } from "./tracking-journey";
import { routeRecordToPresentation } from "./tracking-model";
import { operationRouteFacts } from "@/features/v2-road-map/operation-route-model";
import type { OperationsCollection, OperationsReadIssue } from "@/server/services/v2-workspace/operations-collection";
export type TrackingKind = "executions" | "bookings" | "decisions" | "offers" | "plans" | "routes" | "corridors";
export type TrackingSource = {
  record: (kind: TrackingKind, id: string) => Promise<unknown>;
  request: (id: string) => Promise<unknown>;
  children: (kind: "execution-events" | "incidents", parentId: string) => Promise<OperationsCollection<WorkflowRecordV2>>;
};
export class TrackingScopeError extends Error { readonly code = "INVALID_TRACKING_SCOPE"; readonly status = 403; }
/** Fresh per authorized read; shares only identical in-flight/completed lookups
 * inside that read. No module cache, TTL, privileged client or cross-actor reuse.
 * Rejections are retained too: no hidden retry or fallback after access failure.
 */
function trackingReadScope(source:TrackingSource):TrackingSource {
  const requests=new Map<string,Promise<unknown>>(),records=new Map<string,Promise<unknown>>();
  const children=new Map<string,ReturnType<TrackingSource['children']>>();
  function once<T>(cache:Map<string,Promise<T>>,key:string,load:()=>Promise<T>):Promise<T>{
    let pending=cache.get(key);
    if(!pending){pending=Promise.resolve().then(load);cache.set(key,pending);}
    return pending;
  }
  return {
    request:id=>once(requests,id,()=>source.request(id)),
    record:(kind,id)=>once(records,JSON.stringify([kind,id]),()=>source.record(kind,id)),
    children:(kind,id)=>once(children,JSON.stringify([kind,id]),()=>source.children(kind,id)),
  };
}
function scoped<K extends TrackingKind>(raw: unknown, kind: K, organizationId: string, id?: string, execution?: Execution): Extract<WorkflowRecordV2,{kind:K}> {
  const row = WorkflowRecordV2Schema.parse(raw);
  if (row.kind !== kind || row.organizationId !== organizationId || !row.requestId || (id && row.id !== id)
    || (execution && (row.requestId !== execution.requestId
      || (row.carrierId !== null && row.carrierId !== execution.carrierId)
      || (["bookings","offers"].includes(kind) && row.carrierId !== execution.carrierId))))
    throw new TrackingScopeError("Tracking reference scope mismatch.");
  return row as Extract<WorkflowRecordV2,{kind:K}>;
}
/** Exact native lookup: never find an execution inside a capped tenant-wide list. */
export async function collectTrackingItem(raw: unknown, organizationId: string, source: TrackingSource) {
  const execution = scoped(raw,"executions",organizationId);
  const [requestRaw, bookingRaw, eventPage, incidentPage] = await Promise.all([
    source.request(execution.requestId!), source.record("bookings",execution.data.bookingId),
    source.children("execution-events",execution.id), source.children("incidents",execution.id),
  ]);
  const request = FreightRequestV2ResponseSchema.shape.data.parse(requestRaw);
  const booking = scoped(bookingRaw,"bookings",organizationId,execution.data.bookingId,execution);
  if (request.id !== execution.requestId || request.organizationId !== organizationId) throw new TrackingScopeError("Tracking request mismatch.");
  const issues: OperationsReadIssue[] = [];
  for (const [kind,page] of [["execution-events",eventPage],["incidents",incidentPage]] as const) {
    if (page.error || !page.complete) issues.push({resource:kind,reason:page.error?"unavailable":"partial"});
    for (const raw of page.data) {
      const row = WorkflowRecordV2Schema.parse(raw);
      // Child DTOs omit parentId: the authenticated parent-scoped query is its authority.
      if (row.kind!==kind || row.organizationId!==organizationId || row.requestId!==execution.requestId || row.carrierId!==execution.carrierId)
        throw new TrackingScopeError("Tracking child scope mismatch.");
    }
  }
  const item: TrackingListItem = {execution, booking, reference:displayReference(request.referenceCode,'PED',request.id),corridor:`${locationDisplayLabel(request.origin.city)} → ${locationDisplayLabel(request.destination.city)}`,
    events:eventPage.data.filter(row=>row.kind==="execution-events"),incidents:incidentPage.data.filter(row=>row.kind==="incidents"),
    eventsComplete:eventPage.complete&&!eventPage.error,incidentsComplete:incidentPage.complete&&!incidentPage.error};
  return {item, request, issues};
}
/** A page keeps the existing four-item bound (at most sixteen source reads at
 * once), but a finished slot starts its next item instead of waiting for the
 * slowest member of a batch. Output order and partial/unavailable flags survive.
 */
export async function collectTrackingPage(rows:unknown[],organizationId:string,source:TrackingSource){
  z.array(z.unknown()).max(25).parse(rows);
  const executions=rows.map(row=>scoped(row,'executions',organizationId));
  if(new Set(executions.map(row=>row.id)).size!==executions.length)throw new TrackingScopeError('Duplicate tracking execution.');
  const shared=trackingReadScope(source),results:Array<Awaited<ReturnType<typeof collectTrackingItem>>>=[];
  let next=0,failed=false;
  await Promise.all(Array.from({length:Math.min(4,executions.length)},async()=>{
    try{
      while(!failed){
        const index=next++;if(index>=executions.length)return;
        results[index]=await collectTrackingItem(executions[index],organizationId,shared);
      }
    }catch(error){failed=true;throw error;}
  }));
  return {items:results.map(r=>r.item),issues:results.flatMap(r=>r.issues)};
}
export async function collectTrackingDetail(id: string, organizationId: string, input: TrackingSource) {
  z.string().uuid().parse(id);
  const source=trackingReadScope(input);
  const execution = scoped(await source.record("executions",id),"executions",organizationId,id);
  const [result,{booking,decision,plan,route,offer}]=await Promise.all([
    collectTrackingItem(execution,organizationId,source),
    (async()=>{
      const booking=scoped(await source.record('bookings',execution.data.bookingId),'bookings',organizationId,execution.data.bookingId,execution);
      // The commercial chain does not depend on request/events/incident reads;
      // the offer depends on the authorized booking, not on the route lookup.
      const chain=async()=>{
        const decision=scoped(await source.record('decisions',booking.data.decisionId),'decisions',organizationId,booking.data.decisionId,execution);
        if(decision.data.planId!==decision.data.selectedPlanId)throw new TrackingScopeError('Selected plan mismatch.');
        const plan=scoped(await source.record('plans',decision.data.selectedPlanId),'plans',organizationId,decision.data.selectedPlanId,execution);
        const route=scoped(await source.record('routes',plan.data.routeId),'routes',organizationId,plan.data.routeId,execution);
        return {decision,plan,route};
      };
      const [selected,offer]=await Promise.all([chain(),typeof booking.data.offerId==='string'
        ? source.record('offers',booking.data.offerId).then(raw=>scoped(raw,'offers',organizationId,booking.data.offerId,execution))
        : Promise.resolve(null)]);
      return {booking,...selected,offer};
    })(),
  ]);
  if (offer && (!decision.data.selectedOfferIds.includes(offer.id) || offer.data.planCandidateId!==plan.id
    || offer.data.id!==offer.id || offer.data.requestId!==execution.requestId || offer.data.carrierId!==execution.carrierId
    || !offer.data.coveredServiceIds.includes(execution.data.serviceId)
    || !plan.data.legAssignments.some(leg=>leg.serviceId===execution.data.serviceId&&leg.carrierId===execution.carrierId&&offer.data.coveredAssignmentIds.includes(leg.id))))
    throw new TrackingScopeError("Booked offer/service mismatch.");
  let linkedRoute = offer ? routeForExecution(execution,[booking],[decision],[plan],[route]) : null;
  if (linkedRoute && [[result.request.origin, linkedRoute.data.origin], [result.request.destination, linkedRoute.data.destination]]
    .some(([expected, actual]) => expected.lat !== null && expected.lng !== null && (expected.lat !== actual.lat || expected.lng !== actual.lng))) {
    result.issues.push({resource:"route",reason:"partial"});
    linkedRoute = null;
  }
  const presentation = routeRecordToPresentation(linkedRoute);
  if (linkedRoute && offer) {
    const corridorIds = [...new Set(linkedRoute.data.legs.map(leg => leg.corridorId))];
    const bookedCorridorIds = linkedRoute.data.corridorIds;
    const corridorReads = await Promise.all(corridorIds.map(async corridorId => {
      try {
        const row = WorkflowRecordV2Schema.parse(await source.record("corridors",corridorId));
        if (row.kind !== "corridors" || row.id !== corridorId || row.organizationId !== null && row.organizationId !== organizationId
          || row.carrierId !== null && row.carrierId !== execution.carrierId
          || row.requestId !== null && row.requestId !== execution.requestId || !bookedCorridorIds.includes(corridorId)) return null;
        return row;
      } catch { return null; }
    }));
    if (corridorReads.some(row => row === null)) result.issues.push({resource:"corridors",reason:"unavailable"});
    presentation.operation = operationRouteFacts(linkedRoute,offer,plan,execution,corridorReads.filter(row => row !== null));
  }
  if (!offer) result.issues.push({resource:"booking-offer",reason:"partial"});
  return {...result,offer,route:linkedRoute,presentation,canView3D:canShowConceptual3D(linkedRoute,presentation.paths.length>0)};
}
