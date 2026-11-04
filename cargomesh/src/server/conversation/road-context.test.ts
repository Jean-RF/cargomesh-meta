import test from 'node:test';
import assert from 'node:assert/strict';
import {withAuthorizedRoadContext,applyRoadResponseAdvice} from './road-context';
import type {InterpretationRequest,InterpretationResponse} from '@/features/v2-conversation-prep/interpretation';
import type {FacilityRecord} from '@/server/modules/intake/application/get-intake-options';
const org='c2300000-0000-4000-8000-000000000001';
const a='c2330000-0000-4000-8000-000000000010',b='c2330000-0000-4000-8000-000000000011',c='c2330000-0000-4000-8000-000000000012';
const f=(id:string,city:string,country_code:string,latitude:number,longitude:number):FacilityRecord=>({id,organization_id:org,code:city,name:city,city,country_code,latitude,longitude,region_code:null,active:true});
const facilities=[f(a,'Buenos Aires','AR',-34.6,-58.38),f(b,'Sydney','AU',-33.87,151.21),f(c,'Cordoba','AR',-31.42,-64.19)];
const input:InterpretationRequest={schemaVersion:'2.0',text:'I have 12 pallets',currentField:'unitQuantity',language:'en',context:{screen:'ROAD_INTAKE',knownFields:[{field:'originFacilityId',value:a},{field:'destinationFacilityId',value:b}],lastAskedField:'unitQuantity',failedAttempts:0,roadRouteStatus:'UNVERIFIED'}};
const result:InterpretationResponse={schemaVersion:'2.0',mode:'DETERMINISTIC',telemetry:null,interpretation:{intent:'PROVIDE',fields:[{field:'unitQuantity',value:'12'}],acknowledgment:'Cargo noted. When should it move?'}};
test('authorized locations override a browser claim and never imply road coverage',()=>{
 assert.equal(withAuthorizedRoadContext(input,facilities).context?.roadRouteStatus,'DISCONNECTED_NETWORKS');
 assert.equal(withAuthorizedRoadContext(input,[]).context?.roadRouteStatus,'INCOMPLETE');
 assert.equal(withAuthorizedRoadContext(input,facilities.map(f=>({...f,latitude:null,longitude:null}))).context?.roadRouteStatus,'COORDINATES_REQUIRED');
 const changed={...input,context:{...input.context!,knownFields:[{field:'originFacilityId' as const,value:a},{field:'destinationFacilityId' as const,value:c}]}};
 assert.equal(withAuthorizedRoadContext(changed,facilities).context?.roadRouteStatus,'UNVERIFIED');
});
test('blocked reply keeps valid facts and metadata but cannot ask for dates or imply ROAD eligibility',()=>{
 for(const language of ['en','es'] as const){const reply=applyRoadResponseAdvice({...input,language},result,facilities);assert.deepEqual(reply.interpretation.fields,result.interpretation.fields);assert.equal(reply.mode,result.mode);assert.match(reply.interpretation.acknowledgment!,/road alone|solo por carretera/);assert.doesNotMatch(reply.interpretation.acknowledgment!,/When should/);}
});
test('a validated change of endpoint is recomputed; old route warning does not stick',()=>{
 const correction={...result,interpretation:{...result.interpretation,fields:[{field:'destinationFacilityId' as const,value:c}],acknowledgment:'Cordoba proposed for review.'}};
 assert.equal(applyRoadResponseAdvice(input,correction,facilities),correction);
 const absent={...input,context:{...input.context!,knownFields:[{field:'originFacilityId' as const,value:a},{field:'destinationFacilityId' as const,value:b},{field:'destinationFacilityId' as const,value:c}]}};
 assert.equal(withAuthorizedRoadContext(absent,facilities).context?.roadRouteStatus,'INCOMPLETE');
});
