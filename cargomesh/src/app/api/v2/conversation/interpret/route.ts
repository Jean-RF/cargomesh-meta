import { NextResponse } from "next/server";
import { requireAuthenticatedMember } from "@/server/auth/member";
import { InterpretationRequestSchema } from "@/features/v2-conversation-prep/interpretation";
import { interpretConversationTurn } from "@/server/conversation/interpret";
import {withAuthorizedRoadContext,applyRoadResponseAdvice} from '@/server/conversation/road-context';

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const target = new URL(request.url);
  let source: URL | null = null;
  try { source = origin ? new URL(origin) : null; } catch { /* Reject malformed origins below. */ }
  const localAlias = source && ["localhost", "127.0.0.1"].includes(source.hostname) && ["localhost", "127.0.0.1"].includes(target.hostname) && source.port === target.port && source.protocol === target.protocol;
  if (origin && origin !== target.origin && !localAlias) {
    return NextResponse.json({ schemaVersion: "2.0", error: { code: "FORBIDDEN_ORIGIN", message: "This origin is not allowed." } }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ schemaVersion: "2.0", error: { code: "VALIDATION_ERROR", message: "JSON is required." } }, { status: 415 });
  }
  let member;
  try {
    member=await requireAuthenticatedMember();
  } catch {
    return NextResponse.json({ schemaVersion: "2.0", error: { code: "UNAUTHORIZED", message: "An active CargoMesh session and organization membership are required." } }, { status: 401 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 32768) {
    return NextResponse.json({ schemaVersion: "2.0", error: { code: "VALIDATION_ERROR", message: "Message is too long." } }, { status: 413 });
  }
  let input;
  try {
    input = InterpretationRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ schemaVersion: "2.0", error: { code: "VALIDATION_ERROR", message: "Invalid conversation message." } }, { status: 400 });
  }
  try {
    const ids=input.context?.knownFields.filter(f=>f.field==='originFacilityId'||f.field==='destinationFacilityId')??[];
    const {v2IntakeOptionsRepository}=await import('@/server/modules/intake/infrastructure/supabase-intake-options-repository');
    const [facilities,documents]=await Promise.all([
      ids.length?(await v2IntakeOptionsRepository()).listActiveFacilities(member.organizationId):Promise.resolve([]),
      (async()=>{try{const {documentService}=await import('@/server/modules/media-evidence/document-repository');const {readDocumentReadiness}=await import('@/server/modules/media-evidence/document-readiness');return await readDocumentReadiness(await documentService(),{organizationId:member.organizationId,actorId:member.memberId,carrierId:null});}catch{return {companyProfile:'UNKNOWN' as const,regulatoryReview:'NOT_ASSESSED' as const};}})(),
    ]);
    const authorized=facilities.filter(f=>f.organization_id===member.organizationId);
    const roadScoped=withAuthorizedRoadContext(input,authorized);
    const scoped={...roadScoped,context:{...roadScoped.context!,referenceTime:new Date().toISOString(),planningTimeZone:roadScoped.context?.planningTimeZone??'America/Lima',knownFields:roadScoped.context?.knownFields??[],lastAskedField:roadScoped.context?.lastAskedField??null,failedAttempts:roadScoped.context?.failedAttempts??0,documents:{companyProfile:documents.companyProfile,regulatoryReview:documents.regulatoryReview}}};
    const result=await interpretConversationTurn(scoped,{signal:request.signal});
    return NextResponse.json(applyRoadResponseAdvice(scoped,result,authorized),{headers:{'Cache-Control':'no-store'}});
  } catch {
    return NextResponse.json({schemaVersion:'2.0',error:{code:'ROAD_CONTEXT_UNAVAILABLE',message:'Could not read the selected locations. Please retry.'}},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
