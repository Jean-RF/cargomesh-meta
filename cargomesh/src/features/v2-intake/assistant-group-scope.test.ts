import assert from 'node:assert/strict';
import test from 'node:test';
import {needsExplicitCargoGroup} from './assistant-group-scope';
import {EMPTY_PROTOTYPE_DRAFT,applyChatFieldsToDraft,updatePrototypeDraftField} from './prototype-model';
import {cargoGroups,appendCargoGroup,replaceCargoGroups} from './cargo-groups';

test('assistant scalar proposals cannot select or partly modify one of multiple groups',()=>{
  const single={...EMPTY_PROTOTYPE_DRAFT,unitQuantity:'8',unitWeightPerUnitKg:'10',unitVolumePerUnitM3:'.036'};
  const groups=cargoGroups(single),multi=replaceCargoGroups(single,[...groups,{...groups[0],id:'B',unitQuantity:'4'}]);
  for(const field of ['packaging','unitQuantity','unitWeightPerUnitKg','unitVolumePerUnitM3','unitLengthCm','unitWidthCm','unitHeightCm','unitIndivisible','unitStackable'] as const){
    const proposals=[{field,value:'6'},{field:'cargoDescription' as const,value:'Must not partially apply this turn'}];
    assert(needsExplicitCargoGroup(multi,proposals));
    assert.equal(applyChatFieldsToDraft(multi,proposals),multi);
  }
  assert.equal(applyChatFieldsToDraft(single,[{field:'unitQuantity',value:'6'}]).unitQuantity,'6');
  assert.equal(applyChatFieldsToDraft(multi,[{field:'cargoDescription',value:'Declared machine parts'}]).cargoDescription,'Declared machine parts');
  assert.equal(updatePrototypeDraftField(multi,'unitQuantity','6').unitQuantity,'6','manual form edits remain available');
  const manuallyEdited=replaceCargoGroups(multi,cargoGroups(multi).map(g=>g.id==='B'?{...g,unitQuantity:'6'}:g));
  assert.equal(manuallyEdited.unitQuantity,'8');assert.equal(manuallyEdited.additionalUnits?.[0].unitQuantity,'6');
});

test('a newly appended group has no guessed quantity',()=>{
  const result=appendCargoGroup(EMPTY_PROTOTYPE_DRAFT);
  assert.equal(result.at(-1)?.unitQuantity,'');
  assert.equal(result[0].unitQuantity,EMPTY_PROTOTYPE_DRAFT.unitQuantity);
});
