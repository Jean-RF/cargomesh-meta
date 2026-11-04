import {z} from 'zod';
const Size=z.number().finite().min(0.1).max(5000);
export const PackingInputSchema=z.object({
 vehicle:z.object({lengthCm:Size,widthCm:Size,heightCm:Size,maxPayloadKg:z.number().finite().positive().max(200000)}).strict(),
 groups:z.array(z.object({id:z.string().min(1).max(200),label:z.string().min(1).max(160),
  unit:z.enum(['BOX','PALLET']),quantity:z.number().int().positive().max(200),
  lengthCm:Size,widthCm:Size,heightCm:Size,weightKg:z.number().finite().positive().max(200000),rotate:z.boolean(),
 }).strict()).min(1).max(30),
}).strict().superRefine((v,c)=>{
 if(new Set(v.groups.map(g=>g.id)).size!==v.groups.length)c.addIssue({code:'custom',message:'Duplicate group identities.'});
 if(v.groups.reduce((n,g)=>n+g.quantity,0)>200)c.addIssue({code:'custom',message:'Preview supports at most 200 units.'});
});
export type PackingInput=z.infer<typeof PackingInputSchema>;
export type Placement={id:string;groupId:string;label:string;unit:'BOX'|'PALLET';index:number;x:number;y:number;
 lengthCm:number;widthCm:number;heightCm:number;weightKg:number;rotated:boolean};
export type PackingPlan={algorithm:'FLOOR_BOTTOM_LEFT_V1';vehicle:PackingInput['vehicle'];placements:Placement[];
 unplaced:Array<{groupId:string;index:number;reason:'HEIGHT'|'PAYLOAD'|'FLOOR_SPACE'}>;loadedWeightKg:number;
 floorUsagePercent:number;volumeUsagePercent:number;counts:Array<{groupId:string;label:string;unit:'BOX'|'PALLET';planned:number;requested:number}>};
const EPS=1e-7;
export function placementsOverlap(a:Placement,b:Placement){return a.x<b.x+b.lengthCm-EPS&&a.x+a.lengthCm>b.x+EPS&&a.y<b.y+b.widthCm-EPS&&a.y+a.widthCm>b.y+EPS;}
/** Conservative single-layer planning. No stacking, axle loads, tie-downs or transport authorization. */
export function packCargo(raw:unknown):PackingPlan{
 const input=PackingInputSchema.parse(raw),v=input.vehicle;
 const placements:Placement[]=[],unplaced:PackingPlan['unplaced']=[];
 let weight=0;
 const units=input.groups.flatMap(g=>Array.from({length:g.quantity},(_,index)=>({...g,index})));
 units.sort((a,b)=>b.lengthCm*b.widthCm-a.lengthCm*a.widthCm||(a.id<b.id?-1:a.id>b.id?1:0)||a.index-b.index);
 for(const g of units){
  if(g.heightCm>v.heightCm+EPS){unplaced.push({groupId:g.id,index:g.index,reason:'HEIGHT'});continue;}
  if(weight+g.weightKg>v.maxPayloadKg+EPS){unplaced.push({groupId:g.id,index:g.index,reason:'PAYLOAD'});continue;}
  const anchors=[{x:0,y:0},...placements.flatMap(p=>[{x:p.x+p.lengthCm,y:p.y},{x:p.x,y:p.y+p.widthCm}])];
  const points=[...new Map(anchors.map(p=>[`${p.x},${p.y}`,p])).values()].sort((a,b)=>a.y-b.y||a.x-b.x);
  let fitted:Placement|undefined;
  // Bounded corner search, not an optimal packing solver; at most 401 anchors for 200 units.
  search:for(const {x,y} of points)for(const rotated of g.rotate?[false,true]:[false]){
   const p:Placement={id:`${g.id}:${g.index}`,groupId:g.id,label:g.label,unit:g.unit,index:g.index,x,y,
    lengthCm:rotated?g.widthCm:g.lengthCm,widthCm:rotated?g.lengthCm:g.widthCm,heightCm:g.heightCm,weightKg:g.weightKg,rotated};
   if(x+p.lengthCm>v.lengthCm+EPS||y+p.widthCm>v.widthCm+EPS)continue;
   if(placements.some(existing=>placementsOverlap(p,existing)))continue;
   fitted=p;break search;
  }
  if(fitted){placements.push(fitted);weight+=g.weightKg;}else unplaced.push({groupId:g.id,index:g.index,reason:'FLOOR_SPACE'});
 }
 const floor=placements.reduce((sum,p)=>sum+p.lengthCm*p.widthCm,0),volume=placements.reduce((sum,p)=>sum+p.lengthCm*p.widthCm*p.heightCm,0);
 return {algorithm:'FLOOR_BOTTOM_LEFT_V1',vehicle:v,placements,unplaced,loadedWeightKg:weight,
  floorUsagePercent:floor/(v.lengthCm*v.widthCm)*100,volumeUsagePercent:volume/(v.lengthCm*v.widthCm*v.heightCm)*100,
  counts:input.groups.map(g=>({groupId:g.id,label:g.label,unit:g.unit,planned:placements.filter(p=>p.groupId===g.id).length,requested:g.quantity}))};
}

// A read-only projection: the manifest remains authoritative and is never changed by planning.
export function packingGroupsFromManifest(raw:unknown,unitChoices:Readonly<Record<string,'BOX'|'PALLET'|undefined>>={}):PackingInput['groups']{
 const parsed=z.object({status:z.literal('CONFIRMED'),declaration:z.object({
  groupBindings:z.array(z.object({groupId:z.string().uuid(),sourceUnitIndex:z.number().int().nonnegative()})),
  cargoSpecification:z.object({units:z.array(z.object({packageType:z.string().min(1),quantity:z.number().int().positive().max(200),
   weightPerUnitKg:z.number().finite().positive(),dimensionsCm:z.object({length:Size,width:Size,height:Size})}))}),
 })}).parse(raw);
 const {groupBindings,cargoSpecification}=parsed.declaration;
 if(groupBindings.length!==cargoSpecification.units.length||new Set(groupBindings.map(g=>g.groupId)).size!==groupBindings.length||
  new Set(groupBindings.map(g=>g.sourceUnitIndex)).size!==groupBindings.length)throw Error('INVALID_MANIFEST_GROUPS');
 return groupBindings.map(binding=>{
  const u=cargoSpecification.units[binding.sourceUnitIndex];if(!u)throw Error('INVALID_MANIFEST_GROUPS');
  const unit=unitChoices[binding.groupId]??(u.packageType==='BOX'||u.packageType==='PALLET'?u.packageType:null);
  if(!unit)throw Error('UNIT_MAPPING_REQUIRED');
  return {id:binding.groupId,label:`${binding.sourceUnitIndex+1} · ${u.packageType}`,unit,quantity:u.quantity,
   lengthCm:u.dimensionsCm.length,widthCm:u.dimensionsCm.width,heightCm:u.dimensionsCm.height,weightKg:u.weightPerUnitKg,rotate:false};
 });
}
