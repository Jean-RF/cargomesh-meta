import {LoadingBundleSchema,LoadingPassportRecordSchema} from './loading-operation';
export const loadingId=(n:number)=>`95000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
/** Synthetic boundary data, never used as the operational page's data source. */
export function loadingBundleFixture(){
 const at='2026-11-01T10:00:00Z',organizationId=loadingId(1),memberId=loadingId(2),sessionId=loadingId(3),requestId=loadingId(4),manifestId=loadingId(5),groupId=loadingId(6),observationId=loadingId(7),evidenceId=loadingId(8);
 return LoadingBundleSchema.parse({
  session:{id:sessionId,organizationId,requestId,facilityId:loadingId(9),facilityName:'[SYNTHETIC] Almacén Lima',mode:'DEMO',
   manifest:{id:manifestId,revision:1,status:'CONFIRMED',contentHash:'a'.repeat(64),declaration:{schemaVersion:'0.1',source:{requestId,organizationId,requestDraftVersion:1},cargoSpecification:{units:[{packageType:'Carga paletizada',quantity:10}]},groupBindings:[{groupId,sourceUnitIndex:0}]}},
   groups:[{id:groupId,comparisonId:loadingId(10),label:'Carga paletizada',unit:'PALLET',count:10}],state:'CLOSED',version:4,openedAt:at,openedBy:memberId,closedAt:at,closedBy:memberId,updatedAt:at},
  observations:[{id:observationId,organizationId,sessionId,jobId:'ramon-job-1',attempt:1,manifestRevision:1,evidenceId:'ramon-clip-1',evidenceRefId:evidenceId,unit:'PALLET',status:'OK',entries:8,exits:0,net:8,source:'SYNTHETIC_RENDER',clipSha256:'b'.repeat(64),realInference:false,overlayUploaded:false,analysisVersion:'dockmind-1',timeMapping:'identity (synthetic)',flags:[],events:Array.from({length:8},(_,i)=>({eventId:loadingId(20+i),evidenceId,timecodeMs:i*1000,seconds:i,direction:'IN',objectId:i})),receivedAt:at}],
  selections:[{groupId,observationId,coverage:'COMPLETE',reason:'Complete synthetic clip, one group.',memberId,selectedAt:at}],
  currentManifest:{id:manifestId,revision:1,requestDraftVersion:1,contentCurrent:true},
 });
}
export function loadingPassportFixture(){const b=loadingBundleFixture();return LoadingPassportRecordSchema.parse({id:loadingId(11),sessionId:b.session.id,organizationId:b.session.organizationId,sessionVersion:b.session.version,ruleVersion:'loading.compare.v1',createdAt:b.session.updatedAt,createdBy:b.session.openedBy,source:b});}
