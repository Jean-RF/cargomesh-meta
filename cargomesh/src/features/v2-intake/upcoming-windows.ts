import {planningInstant} from '@/shared/lib/planning-clock';
import type {PrototypeValidationIssue,V2IntakePrototypeDraft} from './prototype-model';
/** An operational request needs at least one non-expired choice on each side. History can still be read. */
export function upcomingWindowIssues(draft:V2IntakePrototypeDraft,now=Date.now()):PrototypeValidationIssue[]{
 const zone=draft.planningTimeZone??Intl.DateTimeFormat().resolvedOptions().timeZone,issues:PrototypeValidationIssue[]=[];
 for(const role of ['pickup','delivery'] as const){const alternatives=role==='pickup'?draft.pickupAlternatives:draft.deliveryAlternatives;
  const ends=[draft[`${role}WindowEndsAt`],...(alternatives??[]).map(w=>w.endsAt)];
  if(ends.every(end=>{const at=planningInstant(end,zone);return at!==null&&at<=now;}))issues.push({field:`${role}WindowEndsAt`,code:'past-window'});
 }
 return issues;
}
