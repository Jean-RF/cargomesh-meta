import {cargoGroups,type DraftCargoGroup} from '@/features/v2-intake/cargo-groups';
import {selectedMediaFields} from '@/features/v2-intake/media-draft-model';
import type {V2IntakePrototypeDraft} from '@/features/v2-intake/prototype-model';
import type {PackingListReview} from '@/shared/schemas/meta/packing-list';
export function reviewedPackingGroups(draft:V2IntakePrototypeDraft,hasSavedRequest:boolean,review:PackingListReview,targets:readonly string[]){
 if(targets.length!==review.groups.length||!targets.length)throw Error('PACKING_TARGET_REQUIRED');
 const selected=targets.filter(value=>value!=='new');if(new Set(selected).size!==selected.length)throw Error('PACKING_TARGET_DUPLICATE');
 const groups=cargoGroups(draft),next=[...groups];
 for(const [index,row] of review.groups.entries()){
  const target=targets[index],existing=target==='new'?null:next.find(g=>g.id===target);if(target!=='new'&&!existing)throw Error('PACKING_TARGET_CHANGED');
  const id=existing?.id??`packing-${review.sha256.slice(0,12)}-${index}`;if(!existing&&next.some(g=>g.id===id))throw Error('PACKING_ALREADY_IMPORTED');
  const group:DraftCargoGroup={id,unitPackageType:'',unitQuantity:'',unitWeightPerUnitKg:'',unitVolumePerUnitM3:'',unitLengthCm:'',unitWidthCm:'',unitHeightCm:'',unitIndivisible:true,unitStackable:false,...existing};
  for(const field of selectedMediaFields(row.proposal,new Set(row.proposal.fields.map(f=>f.field)))){if(field.field==='packaging')group.unitPackageType=field.value;else if(field.field in group)(group as unknown as Record<string,unknown>)[field.field]=field.value;}
  if(existing)next[next.findIndex(g=>g.id===id)]=group;else next.push(group);
 }
 // Retain all existing/persisted groups. Only a completely blank new-form placeholder can disappear.
 return next.filter(g=>g.id!==groups[0].id||hasSavedRequest||Object.entries(groups[0]).some(([key,value])=>key.startsWith('unit')&&key!=='unitPackageType'&&typeof value==='string'&&value)||targets.includes(g.id));
}
