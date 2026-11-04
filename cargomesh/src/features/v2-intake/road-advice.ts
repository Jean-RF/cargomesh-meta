import type {IntakeOptionsData} from './contracts';
import {roadIntakeStatus} from '@/shared/lib/road-intake-advice';
export {disconnectedRoadNotice} from '@/shared/lib/road-intake-advice';
export function draftRoadStatus(draft:{originFacilityId:string;destinationFacilityId:string},options?:IntakeOptionsData|null){
 return roadIntakeStatus(options?.facilities.find(f=>f.facilityId===draft.originFacilityId),options?.facilities.find(f=>f.facilityId===draft.destinationFacilityId));
}
