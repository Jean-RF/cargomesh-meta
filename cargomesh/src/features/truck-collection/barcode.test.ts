import assert from 'node:assert/strict';
import {test} from 'node:test';
import {collectionTrucks} from './catalog';
import {cargoBarcode,cargoBarcodeInventory,cargoCartonCount} from './cargo-codes';
import {barcodeBars} from './barcode';
import {cargoPlacements,buildCollectionTruck,disposeCollectionTruck} from './model';
import {factoryLoadingPlan,factoryLoadingPose} from './factory-loading';

test('all units and interior cartons have distinct, deterministic Code 128 payloads',()=>{
  const entries=collectionTrucks.flatMap(cargoBarcodeInventory),values=entries.map(e=>e.barcode);
  assert.equal(new Set(values).size,values.length);assert(values.length>900);
  for(const truck of collectionTrucks){
    const inventory=cargoBarcodeInventory(truck),placements=cargoPlacements(truck);
    assert.equal(inventory.length,truck.cargo.count*(1+cargoCartonCount(truck)));
    assert.deepEqual(inventory,cargoBarcodeInventory({...truck,color:'#123456',driver:{...truck.driver,name:'Otro conductor'}}));
    for(const placement of placements)assert.equal(inventory.find(e=>e.id===placement.id)?.barcode,placement.barcode);
    for(const code of inventory){
      const encoded=barcodeBars(code.barcode);assert.match(code.barcode,/^\d{10}$/);assert.equal(encoded.modules,110);
      assert.equal(encoded.bars[0].x,10);const last=encoded.bars.at(-1)!;assert.equal(encoded.modules-last.x-last.width,10);
    }
  }
});
test('sorting, moving, seeking and resetting never change the barcode associated with a unit',()=>{
  for(const truck of collectionTrucks){
    const plan=factoryLoadingPlan(truck)!,codes=new Map(cargoPlacements(truck).map(p=>[p.id,p.barcode]));
    for(const time of [0,plan.duration/2,plan.duration,0]){
      const pose=factoryLoadingPose(plan,time);assert.equal(plan.units[pose.currentIndex].barcode,codes.get(plan.units[pose.currentIndex].id));
    }
    assert.deepEqual(new Set(plan.units.map(p=>p.barcode)),new Set(codes.values()));
  }
});
test('every declared label is physically emitted once, stays with solid cargo and is removed in neutral comparison',()=>{
  for(const truck of collectionTrucks){
    const plan=factoryLoadingPlan(truck)!,model=buildCollectionTruck(truck,true,false,undefined,true),expected=cargoBarcodeInventory(truck).map(item=>item.barcode);
    assert.deepEqual([...model.userData.printedBarcodes].sort(),expected.sort(),truck.id);
    assert.equal(new Set(model.userData.printedBarcodes).size,expected.length);
    if(!plan.flow)for(const unit of plan.units){const group=model.getObjectByName(unit.id)!;assert(group.userData.barcodes.some((b:{barcode:string})=>b.barcode===unit.barcode));}
    disposeCollectionTruck(model);
  }
  const neutral=buildCollectionTruck(collectionTrucks[0],false,true);assert.deepEqual(neutral.userData.printedBarcodes,[]);assert.deepEqual(neutral.userData.cargoBarcodes,[]);disposeCollectionTruck(neutral);
});
test('invalid identifiers and non-Code-128 payloads fail before rendering',()=>{
  for(const args of [['unknown',0,0],[collectionTrucks[0].id,-1,0],[collectionTrucks[0].id,1000,0],[collectionTrucks[0].id,0,1000]] as const)assert.throws(()=>cargoBarcode(args[0],args[1],args[2]));
  for(const value of ['123','000400100X','0004 001000',''])assert.throws(()=>barcodeBars(value));
});
