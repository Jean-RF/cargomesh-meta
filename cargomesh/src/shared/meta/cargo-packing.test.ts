import test from 'node:test';
import assert from 'node:assert/strict';
import {packCargo,placementsOverlap,packingGroupsFromManifest,type PackingInput} from './cargo-packing';
const input=():PackingInput=>({vehicle:{lengthCm:400,widthCm:200,heightCm:200,maxPayloadKg:1000},
 groups:[{id:'a',label:'Boxes',unit:'BOX',quantity:8,lengthCm:100,widthCm:100,heightCm:100,weightKg:20,rotate:false}]});
test('exact floor fit is reproducible, has no overlaps, conserves counts and mass',()=>{
 const i=input(),p=packCargo(i);assert.deepEqual(p,packCargo(i));assert.equal(p.placements.length,8);
 assert.equal(p.loadedWeightKg,160);assert.equal(p.floorUsagePercent,100);assert.equal(p.volumeUsagePercent,50);
 assert.equal(p.unplaced.length,0);assert.equal(i.groups[0].quantity,8);
 for(const a of p.placements)for(const b of p.placements)if(a.id!==b.id)assert.equal(placementsOverlap(a,b),false);
});
test('no geometric fit does not become a false complete plan',()=>{
 const i=input();i.groups[0].quantity=9;const p=packCargo(i);
 assert.equal(p.placements.length,8);assert.equal(p.unplaced[0].reason,'FLOOR_SPACE');
 assert.equal(p.counts[0].planned+p.unplaced.length,p.counts[0].requested);
});
test('rotation is opt-in, horizontal only; height and payload are hard filters',()=>{
 const i=input();i.vehicle={lengthCm:80,widthCm:120,heightCm:100,maxPayloadKg:30};
 i.groups[0]={...i.groups[0],quantity:2,lengthCm:100,widthCm:60};
 assert.equal(packCargo(i).placements.length,0);
 i.groups[0].rotate=true;const p=packCargo(i);assert.equal(p.placements.length,1);assert.equal(p.placements[0].rotated,true);
 assert.equal(p.unplaced[0].reason,'PAYLOAD');i.groups[0].heightCm=101;assert.equal(packCargo(i).unplaced[0].reason,'HEIGHT');
});
test('unknown, zero, infinite, excessive and duplicate inputs cannot imply capacity',()=>{
 const i=input();for(const value of [0,-1,NaN,Infinity])assert.throws(()=>packCargo({...i,vehicle:{...i.vehicle,widthCm:value}}));
 assert.throws(()=>packCargo({...i,groups:[{...i.groups[0],quantity:201}]}));
 assert.throws(()=>packCargo({...i,groups:[i.groups[0],i.groups[0]]}));
});
test('mixed BOX/PALLET groups remain separate, no hidden stacking',()=>{
 const i=input();i.groups=[{...i.groups[0],quantity:1},{...i.groups[0],id:'b',unit:'PALLET',quantity:1}];
 const p=packCargo(i);assert.deepEqual(p.counts.map(c=>c.unit),['BOX','PALLET']);assert.equal(p.floorUsagePercent,25);
});
test('many varied plans conserve per-group quantities and stay inside physical bounds',()=>{
 for(let seed=1;seed<=20;seed++){
  const i=input();i.groups=Array.from({length:8},(_,n)=>({...i.groups[0],id:String(n),quantity:3,
   lengthCm:30+(seed*7+n*13)%130,widthCm:20+(seed*9+n*17)%90,rotate:n%2===0}));
  const p=packCargo(i);assert.ok(p.loadedWeightKg<=i.vehicle.maxPayloadKg);assert.ok(p.floorUsagePercent<=100+1e-6);
  for(const a of p.placements){assert.ok(a.x>=0&&a.y>=0&&a.x+a.lengthCm<=i.vehicle.lengthCm+1e-7&&a.y+a.widthCm<=i.vehicle.widthCm+1e-7);
   for(const b of p.placements)if(a.id!==b.id)assert.equal(placementsOverlap(a,b),false);}
  for(const g of p.counts)assert.equal(g.planned+p.unplaced.filter(u=>u.groupId===g.groupId).length,g.requested);
 }
});
test('confirmed manifest maps stable group identities; missing dimensions cannot be guessed',()=>{
 const raw={status:'CONFIRMED',declaration:{groupBindings:[{groupId:'11111111-1111-4111-8111-111111111111',sourceUnitIndex:0}],
  cargoSpecification:{units:[{packageType:'BOX',quantity:3,weightPerUnitKg:15,dimensionsCm:{length:50,width:40,height:30}}]}}};
 assert.equal(packingGroupsFromManifest(raw)[0].quantity,3);assert.equal(packingGroupsFromManifest(raw)[0].rotate,false);
 assert.throws(()=>packingGroupsFromManifest({...raw,status:'DRAFT'}));
 const missing=structuredClone(raw);delete (missing.declaration.cargoSpecification.units[0] as Partial<typeof raw.declaration.cargoSpecification.units[0]>).dimensionsCm;
 assert.throws(()=>packingGroupsFromManifest(missing));
 const custom=structuredClone(raw);custom.declaration.cargoSpecification.units[0].packageType='Carga paletizada';
 assert.throws(()=>packingGroupsFromManifest(custom),/UNIT_MAPPING_REQUIRED/);
 assert.equal(packingGroupsFromManifest(custom,{'11111111-1111-4111-8111-111111111111':'PALLET'})[0].unit,'PALLET');
});
