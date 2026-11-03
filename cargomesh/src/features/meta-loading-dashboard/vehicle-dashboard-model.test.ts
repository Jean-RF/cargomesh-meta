import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cargoMassKg} from '@/features/truck-collection/catalog';
import {cargoPlacements} from '@/features/truck-collection/layout';
import {filterTetrisFleet,tetrisFleet,truckLoadGroups,truckWeightSummary,vehicleCategories} from './vehicle-dashboard-model';

test('the directory preserves all sixty truck/driver identities and isolates its illustrative tariffs',()=>{
  assert.equal(tetrisFleet.length,60);assert.equal(new Set(tetrisFleet.map(v=>v.truck.id)).size,60);
  for(const row of tetrisFleet){assert(vehicleCategories.some(c=>c.id===row.category));assert.equal(row.source,'SYNTHETIC_DEMO');assert.equal(row.contract.currency,'PEN');assert.equal(row.contract.basis,'TRIP');assert(row.contract.amount>0);assert(row.truck.driver.name);}
});
test('category, weight, accented names and sorting compose without mutating the fleet',()=>{
  const original=tetrisFleet.map(v=>v.truck.id);
  const cold=filterTetrisFleet({category:'refrigerated'});assert(cold.length>0);assert(cold.every(v=>v.truck.form==='reefer'));
  for(const weight of ['light','medium','heavy'] as const){const rows=filterTetrisFleet({weight,sort:'price'});assert(rows.length);for(let i=1;i<rows.length;i++)assert(rows[i-1].contract.amount<=rows[i].contract.amount);assert(rows.every(v=>weight==='light'?v.truck.payloadKg<=3500:weight==='medium'?v.truck.payloadKg>3500&&v.truck.payloadKg<=12000:v.truck.payloadKg>12000));}
  assert.equal(filterTetrisFleet({query:'nicolas mendoza'}).length,1);assert.equal(filterTetrisFleet({query:'vehiculo inexistente zzz'}).length,0);
  assert.deepEqual(tetrisFleet.map(v=>v.truck.id),original);
});
test('3D groups partition the actual placed units, retain weight and contain their geometry envelopes',()=>{
  for(const {truck} of tetrisFleet){
    const groups=truckLoadGroups(truck),placements=cargoPlacements(truck),summary=truckWeightSummary(truck);
    assert(groups.length>=1&&groups.length<=4);assert.equal(groups.reduce((s,g)=>s+g.quantity,0),truck.cargo.count);
    assert(Math.abs(groups.reduce((s,g)=>s+g.weightKg,0)-cargoMassKg(truck))<.11);
    assert.equal(summary.assignedKg,cargoMassKg(truck));assert.equal(summary.remainingKg+summary.assignedKg,truck.payloadKg);
    assert(Math.abs(groups.reduce((s,g)=>s+g.sharePercent,0)-summary.percent)<.001);
    for(const p of placements)assert(groups.some(g=>p.position.every((value,axis)=>{const extent=p.size[[0,2,1][axis]]/2;return value-extent>=g.bounds.min[axis]-.001&&value+extent<=g.bounds.max[axis]+.001;})),truck.id);
    for(const g of groups){assert(g.quantity>0);assert(g.bounds.min.every(Number.isFinite)&&g.bounds.max.every(Number.isFinite));}
  }
});
