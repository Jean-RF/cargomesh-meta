import {z} from 'zod';

const id=z.string().trim().min(1).max(160);
const revision=z.number().int().positive();
const count=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable();
export const LoadingUnitSchema=z.enum(['PALLET','BOX']);
const group=z.object({id,label:z.string().min(1),unit:LoadingUnitSchema,count}).strict();

/** Juan's read projection. Producer payloads must be adapted explicitly, not cast to this shape. */
export const LoadingDashboardSourceSchema=z.object({
  schemaVersion:z.literal(1),snapshotVersion:revision,source:z.enum(['SYNTHETIC_FIXTURE','CONNECTED']),
  capturedAt:z.string().datetime(),
  session:z.object({id,organizationId:id,facilityId:id,facilityName:z.string().min(1),operationId:id.nullable(),manifestId:id,manifestRevision:revision,version:revision,scopeState:z.enum(['OPEN','CLOSED']),mode:z.enum(['DEMO','VERIFICATION']).optional()}).strict(),
  manifest:z.object({id,revision,complete:z.boolean(),current:z.boolean().optional(),groups:z.array(group).max(500)}).strict(),
  plan:z.object({id,revision,manifestRevision:revision,complete:z.boolean(),vehicles:z.array(z.object({id,label:z.string().min(1)}).strict()),allocations:z.array(z.object({vehicleId:id,groupId:id,unit:LoadingUnitSchema,count}).strict())}).strict().nullable(),
  observation:z.object({id,sessionId:id,manifestRevision:revision,complete:z.boolean(),groups:z.array(group.extend({coverage:z.enum(['PARTIAL','COMPLETE']),quality:z.enum(['SUFFICIENT','UNCERTAIN']),evidence:z.array(z.object({id,timeSeconds:z.number().finite().nonnegative().nullable()}).strict())}))}).strict().nullable(),
}).strict().superRefine((source,ctx)=>{
  for(const [path,ids] of [
    ['manifest.groups',source.manifest.groups.map(g=>g.id)],
    ['plan.vehicles',source.plan?.vehicles.map(v=>v.id)??[]],
    ['observation.groups',source.observation?.groups.map(g=>g.id)??[]],
    ['plan.allocations',source.plan?.allocations.map(a=>a.vehicleId+'\0'+a.groupId)??[]],
  ] as const)if(new Set(ids).size!==ids.length)ctx.addIssue({code:z.ZodIssueCode.custom,path:path.split('.'),message:'Duplicate identifiers in a snapshot are ambiguous'});
  const groups=new Set(source.manifest.groups.map(g=>g.id)),vehicles=new Set(source.plan?.vehicles.map(v=>v.id));
  if(source.plan?.allocations.some(a=>!groups.has(a.groupId)||!vehicles.has(a.vehicleId)))ctx.addIssue({code:z.ZodIssueCode.custom,path:['plan','allocations'],message:'Allocation refers to an unknown group or vehicle'});
  if(source.observation?.groups.some(g=>!groups.has(g.id)))ctx.addIssue({code:z.ZodIssueCode.custom,path:['observation','groups'],message:'Observation refers to an unknown group'});
});
export type LoadingDashboardSource=z.infer<typeof LoadingDashboardSourceSchema>;
export type LoadingUnit=z.infer<typeof LoadingUnitSchema>;
