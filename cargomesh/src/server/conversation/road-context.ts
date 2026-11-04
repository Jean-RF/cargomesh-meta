import 'server-only';
import type {InterpretationRequest,InterpretationResponse} from '@/features/v2-conversation-prep/interpretation';
import type {FacilityRecord} from '@/server/modules/intake/application/get-intake-options';
import {roadIntakeStatus,disconnectedRoadNotice} from '@/shared/lib/road-intake-advice';

/** The caller supplies only the authenticated organization's catalog. Browser/model IDs do not authorize access. */
export function withAuthorizedRoadContext(input:InterpretationRequest,facilities:readonly FacilityRecord[]):InterpretationRequest{
 if(!input.context)return input;
 const find=(field:'originFacilityId'|'destinationFacilityId')=>{
  const matches=input.context!.knownFields.filter(f=>f.field===field);
  if(matches.length!==1)return null;
  const f=facilities.find(f=>f.id===matches[0].value&&f.active);
  return f?{countryCode:f.country_code,lat:f.latitude,lng:f.longitude}:null;
 };
 return {...input,context:{...input.context,roadRouteStatus:roadIntakeStatus(find('originFacilityId'),find('destinationFacilityId'))}};
}
export function applyRoadResponseAdvice(input:InterpretationRequest,result:InterpretationResponse,facilities:readonly FacilityRecord[]):InterpretationResponse{
 if(input.context?.screen==='TRANSPORT_SELECTION'||!input.context)return result;
 const locationFields=result.interpretation.fields.filter(f=>f.field==='originFacilityId'||f.field==='destinationFacilityId');
 const knownFields=[...input.context.knownFields.filter(f=>!locationFields.some(p=>p.field===f.field)),...locationFields] as NonNullable<InterpretationRequest['context']>['knownFields'];
 const updated=withAuthorizedRoadContext({...input,context:{...input.context,knownFields}},facilities);
 if(updated.context?.roadRouteStatus!=='DISCONNECTED_NETWORKS')return result;
 // Retain validated proposed facts and provider errors; only replace unsafe next-step wording.
 return {...result,interpretation:{...result.interpretation,acknowledgment:disconnectedRoadNotice(input.language==='es')}};
}
