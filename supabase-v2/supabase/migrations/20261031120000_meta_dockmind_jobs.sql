-- Ramón/Jean: DockMind private clips, persistent analysis jobs and durable delivery to Juan's loading observations.
-- Members reach these rows only through member-checked RPC. The worker result and the delivery state are written
-- by the server with the service role, after it verified the worker signature. SAM never runs from here.
begin;

-- Originals and annotated videos stay private: the server issues short signed URLs after authorizing the member.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('meta-dockmind','meta-dockmind',false,52428800,array['video/mp4','video/quicktime'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create table private.meta_dockmind_clips (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 session_id uuid not null,
 source text not null check(source in('OWN_CAPTURE','SYNTHETIC_RENDER')),
 mime_type text not null check(mime_type in('video/mp4','video/quicktime')),
 size_bytes bigint not null check(size_bytes between 1 and 52428800),
 sha256 text not null check(sha256~'^[0-9a-f]{64}$'),
 state text not null default 'PENDING' check(state in('PENDING','READY','REJECTED')),
 container text check(container in('MP4','MOV')),
 rejection text check(rejection~'^[A-Z][A-Z0-9_]{2,59}$'),
 -- Derived from stable IDs: neither the browser nor the worker chooses where a clip lives.
 storage_path text generated always as ('org/'||organization_id::text||'/'||session_id::text||'/'||id::text||case mime_type when 'video/quicktime' then '.mov' else '.mp4' end) stored,
 created_by uuid not null references public.organization_members(id),
 idempotency_key uuid not null,
 payload_hash text not null check(payload_hash~'^[0-9a-f]{64}$'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 ready_at timestamptz,
 foreign key(session_id,organization_id) references private.meta_loading_sessions(id,organization_id),
 unique(organization_id,created_by,idempotency_key),
 unique(id,organization_id,session_id),
 check((state='READY')=(ready_at is not null and container is not null)),
 check((state='REJECTED')=(rejection is not null))
);
create index meta_dockmind_clips_session_idx on private.meta_dockmind_clips(organization_id,session_id,created_at desc,id);
create index meta_dockmind_clips_member_idx on private.meta_dockmind_clips(created_by);

create table private.meta_dockmind_jobs (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 session_id uuid not null,
 clip_id uuid not null,
 manifest_revision integer not null check(manifest_revision>0),
 group_id uuid not null,
 coverage text not null check(coverage in('PARTIAL','COMPLETE')),
 source text not null check(source in('OWN_CAPTURE','SYNTHETIC_RENDER')),
 clip_sha256 text not null check(clip_sha256~'^[0-9a-f]{64}$'),
 -- Effective configuration: the worker defaults are explicit, so omitting them or sending them is one job.
 config jsonb not null check(extensions.jsonb_matches_schema('{
  "type":"object","required":["line","unit","concept","margin","min_track_frames"],"additionalProperties":false,
  "properties":{"unit":{"enum":["PALLET","BOX"]},"concept":{"type":"string","minLength":1,"maxLength":60},
   "margin":{"type":"number","minimum":0,"maximum":0.1},"min_track_frames":{"type":"integer","minimum":1,"maximum":30},
   "line":{"type":"object","required":["x1","y1","x2","y2","inside_x","inside_y"],"additionalProperties":false,"properties":{
    "x1":{"type":"number","minimum":0,"maximum":1},"y1":{"type":"number","minimum":0,"maximum":1},"x2":{"type":"number","minimum":0,"maximum":1},
    "y2":{"type":"number","minimum":0,"maximum":1},"inside_x":{"type":"number","minimum":0,"maximum":1},"inside_y":{"type":"number","minimum":0,"maximum":1}}}}}'::json,config)),
 dedupe_key text not null check(dedupe_key~'^[0-9a-f]{64}$'),
 attempt integer not null default 1 check(attempt between 1 and 50),
 status text not null default 'QUEUED' check(status in('QUEUED','RUNNING','SUCCEEDED','FAILED')),
 worker_call_id text check(length(worker_call_id) between 1 and 200),
 error jsonb check(error is null or (jsonb_typeof(error)='object' and error->>'code'~'^[A-Z][A-Z0-9_]{2,59}$' and length(coalesce(error->>'message',''))<=300)),
 observation jsonb check(observation is null or jsonb_typeof(observation)='object'),
 -- Analysis SUCCEEDED and observation delivered to Juan are separate facts.
 delivery_status text not null default 'NOT_REQUIRED' check(delivery_status in('NOT_REQUIRED','PENDING','DELIVERED','REJECTED','SUPERSEDED')),
 delivery_tries integer not null default 0 check(delivery_tries between 0 and 1000),
 delivery_error jsonb check(delivery_error is null or (jsonb_typeof(delivery_error)='object' and delivery_error->>'code'~'^[A-Z][A-Z0-9_]{2,59}$' and length(coalesce(delivery_error->>'message',''))<=300)),
 observation_id uuid,
 overlay_path text generated always as ('org/'||organization_id::text||'/'||session_id::text||'/'||clip_id::text||'-'||id::text||'-overlay.mp4') stored,
 created_by uuid not null references public.organization_members(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 dispatched_at timestamptz,
 completed_at timestamptz,
 delivered_at timestamptz,
 foreign key(clip_id,organization_id,session_id) references private.meta_dockmind_clips(id,organization_id,session_id),
 foreign key(observation_id,organization_id,session_id) references private.meta_loading_observations(id,organization_id,session_id),
 unique(organization_id,dedupe_key),
 check((status='SUCCEEDED')=(observation is not null)),
 check(status<>'FAILED' or error is not null),
 check((status in('SUCCEEDED','FAILED'))=(completed_at is not null)),
 check((status='SUCCEEDED')=(delivery_status<>'NOT_REQUIRED')),
 check((delivery_status='DELIVERED')=(observation_id is not null and delivered_at is not null))
);
create index meta_dockmind_jobs_session_idx on private.meta_dockmind_jobs(organization_id,session_id,created_at desc,id);
create index meta_dockmind_jobs_clip_idx on private.meta_dockmind_jobs(clip_id,organization_id,session_id);
create index meta_dockmind_jobs_member_idx on private.meta_dockmind_jobs(created_by);
create index meta_dockmind_jobs_observation_idx on private.meta_dockmind_jobs(observation_id,organization_id,session_id) where observation_id is not null;
create index meta_dockmind_jobs_pending_delivery_idx on private.meta_dockmind_jobs(organization_id,updated_at) where delivery_status='PENDING';

alter table private.meta_dockmind_clips enable row level security;
alter table private.meta_dockmind_jobs enable row level security;
create policy meta_dockmind_clips_org on private.meta_dockmind_clips for select to authenticated using(private.is_organization_member(organization_id));
create policy meta_dockmind_jobs_org on private.meta_dockmind_jobs for select to authenticated using(private.is_organization_member(organization_id));
revoke all on private.meta_dockmind_clips,private.meta_dockmind_jobs from public,anon,authenticated,service_role;

create function private.meta_dockmind_valid(p_schema json,p_value jsonb) returns void language plpgsql immutable set search_path='' as $$begin
 if p_value is null or not coalesce(extensions.jsonb_matches_schema(p_schema,p_value),false) then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
end;$$;
revoke all on function private.meta_dockmind_valid(json,jsonb) from public,anon,authenticated,service_role;

create function private.meta_dockmind_clip_record(c private.meta_dockmind_clips) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('clipId',c.id,'organizationId',c.organization_id,'sessionId',c.session_id,'source',c.source,'mimeType',c.mime_type,
  'sizeBytes',c.size_bytes,'sha256',c.sha256,'state',c.state,'container',c.container,'rejection',c.rejection,'storagePath',c.storage_path,
  'createdBy',c.created_by,'createdAt',c.created_at,'updatedAt',c.updated_at,'readyAt',c.ready_at);
$$;
revoke all on function private.meta_dockmind_clip_record(private.meta_dockmind_clips) from public,anon,authenticated,service_role;

create function private.meta_dockmind_job_record(j private.meta_dockmind_jobs) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('jobId',j.id,'organizationId',j.organization_id,'sessionId',j.session_id,'evidenceId',j.clip_id,'manifestRevision',j.manifest_revision,
  'groupId',j.group_id,'coverage',j.coverage,'source',j.source,'clipSha256',j.clip_sha256,'config',j.config,'dedupeKey',j.dedupe_key,'attempt',j.attempt,
  'status',j.status,'workerCallId',j.worker_call_id,'error',j.error,'observation',j.observation,'overlayPath',j.overlay_path,
  'delivery',jsonb_build_object('status',j.delivery_status,'tries',j.delivery_tries,'error',j.delivery_error,'observationId',j.observation_id,'deliveredAt',j.delivered_at),
  'createdBy',j.created_by,'createdAt',j.created_at,'updatedAt',j.updated_at,'dispatchedAt',j.dispatched_at,'completedAt',j.completed_at);
$$;
revoke all on function private.meta_dockmind_job_record(private.meta_dockmind_jobs) from public,anon,authenticated,service_role;

-- Same thresholds as retry-policy.ts: failed, never left the queue (2 min) or the worker did not report (20 min).
create function private.meta_dockmind_retryable(j private.meta_dockmind_jobs) returns boolean language sql stable set search_path='' as $$
 select j.status='FAILED'
  or (j.status='QUEUED' and (j.error is not null or coalesce(j.dispatched_at,j.updated_at)<=now()-interval '2 minutes'))
  or (j.status='RUNNING' and coalesce(j.dispatched_at,j.updated_at)<=now()-interval '20 minutes');
$$;
revoke all on function private.meta_dockmind_retryable(private.meta_dockmind_jobs) from public,anon,authenticated,service_role;

create function private.meta_dockmind_v1(p_organization_id uuid,p_member_id uuid,p_action text,p_value jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s private.meta_loading_sessions%rowtype; c private.meta_dockmind_clips%rowtype; j private.meta_dockmind_jobs%rowtype; g jsonb; h text;
begin
 if p_action is null or p_action not in('register_clip','read_clip','list_clips','create_job','read_job','list_jobs','mark_dispatched','mark_dispatch_failed','retry_job')
  or p_value is null or jsonb_typeof(p_value)<>'object' then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
 perform private.workflow_member(p_organization_id,p_member_id,p_action in('register_clip','create_job','mark_dispatched','mark_dispatch_failed','retry_job'));

 if p_action='register_clip' then
  perform private.meta_dockmind_valid('{"type":"object","required":["sessionId","source","mimeType","sizeBytes","sha256"],"additionalProperties":false,"properties":{
   "sessionId":{"type":"string"},"source":{"enum":["OWN_CAPTURE","SYNTHETIC_RENDER"]},"mimeType":{"enum":["video/mp4","video/quicktime"]},
   "sizeBytes":{"type":"integer","minimum":1,"maximum":52428800},"sha256":{"type":"string","pattern":"^[0-9a-f]{64}$"}}}'::json,p_value);
  if p_key is null then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
  h:=private.hash_v2_freight_payload(p_value);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('meta-dockmind-clip:'||p_organization_id::text||':'||p_member_id::text||':'||p_key::text,0));
  select * into c from private.meta_dockmind_clips where organization_id=p_organization_id and created_by=p_member_id and idempotency_key=p_key;
  if found then
   if c.payload_hash<>h then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='PT409';end if;
   return jsonb_build_object('record',private.meta_dockmind_clip_record(c),'replay',true);
  end if;
  select * into s from private.meta_loading_sessions where id=(p_value->>'sessionId')::uuid and organization_id=p_organization_id;
  if s.id is null then raise exception 'LOADING_SESSION_NOT_FOUND' using errcode='PT404';end if;
  if s.state<>'OPEN' then raise exception 'SESSION_NOT_OPEN' using errcode='PT409';end if;
  -- A verification session only accepts own capture; DEMO may use a labelled synthetic render.
  if s.mode='VERIFICATION' and p_value->>'source'<>'OWN_CAPTURE' then raise exception 'REAL_EVIDENCE_REQUIRED' using errcode='PT422';end if;
  if (select count(*) from private.meta_dockmind_clips where session_id=s.id)>=200 then raise exception 'SESSION_CLIP_LIMIT' using errcode='PT422';end if;
  insert into private.meta_dockmind_clips(organization_id,session_id,source,mime_type,size_bytes,sha256,created_by,idempotency_key,payload_hash)
   values(p_organization_id,s.id,p_value->>'source',p_value->>'mimeType',(p_value->>'sizeBytes')::bigint,p_value->>'sha256',p_member_id,p_key,h) returning * into c;
  return jsonb_build_object('record',private.meta_dockmind_clip_record(c),'replay',false);
 end if;

 if p_action in('read_clip','list_clips','read_job','list_jobs') then
  if p_action in('read_clip','read_job') then
   perform private.meta_dockmind_valid('{"type":"object","required":["id"],"additionalProperties":false,"properties":{"id":{"type":"string"}}}'::json,p_value);
  else
   perform private.meta_dockmind_valid('{"type":"object","required":["sessionId"],"additionalProperties":false,"properties":{"sessionId":{"type":"string"}}}'::json,p_value);
  end if;
  if p_action='read_clip' then
   select * into c from private.meta_dockmind_clips where id=(p_value->>'id')::uuid and organization_id=p_organization_id;
   return case when c.id is null then 'null'::jsonb else private.meta_dockmind_clip_record(c) end;
  elsif p_action='read_job' then
   select * into j from private.meta_dockmind_jobs where id=(p_value->>'id')::uuid and organization_id=p_organization_id;
   return case when j.id is null then 'null'::jsonb else private.meta_dockmind_job_record(j) end;
  elsif p_action='list_clips' then
   return (select coalesce(jsonb_agg(private.meta_dockmind_clip_record(t) order by t.created_at desc,t.id),'[]') from
    (select * from private.meta_dockmind_clips where organization_id=p_organization_id and session_id=(p_value->>'sessionId')::uuid order by created_at desc,id limit 50)t);
  end if;
  return (select coalesce(jsonb_agg(private.meta_dockmind_job_record(t) order by t.created_at desc,t.id),'[]') from
   (select * from private.meta_dockmind_jobs where organization_id=p_organization_id and session_id=(p_value->>'sessionId')::uuid order by created_at desc,id limit 50)t);
 end if;

 if p_action='create_job' then
  perform private.meta_dockmind_valid('{"type":"object","required":["sessionId","clipId","groupId","coverage","manifestRevision","config"],"additionalProperties":false,"properties":{
   "sessionId":{"type":"string"},"clipId":{"type":"string"},"groupId":{"type":"string"},"coverage":{"enum":["PARTIAL","COMPLETE"]},
   "manifestRevision":{"type":"integer","minimum":1,"maximum":2147483647},"config":{"type":"object"}}}'::json,p_value);
  select * into s from private.meta_loading_sessions where id=(p_value->>'sessionId')::uuid and organization_id=p_organization_id;
  if s.id is null then raise exception 'LOADING_SESSION_NOT_FOUND' using errcode='PT404';end if;
  if s.state<>'OPEN' then raise exception 'SESSION_NOT_OPEN' using errcode='PT409';end if;
  if s.manifest_revision<>(p_value->>'manifestRevision')::integer then raise exception 'STALE_MANIFEST' using errcode='PT409';end if;
  select x into g from jsonb_array_elements(s.groups)x where x->>'id'=((p_value->>'groupId')::uuid)::text;
  if g is null then raise exception 'MANIFEST_GROUP_NOT_FOUND' using errcode='PT404';end if;
  if g->>'unit' is distinct from p_value#>>'{config,unit}' then raise exception 'INCOMPATIBLE_UNIT' using errcode='PT409';end if;
  select * into c from private.meta_dockmind_clips where id=(p_value->>'clipId')::uuid and organization_id=p_organization_id;
  if c.id is null then raise exception 'EVIDENCE_NOT_FOUND' using errcode='PT404';end if;
  if c.session_id<>s.id then raise exception 'EVIDENCE_SESSION_MISMATCH' using errcode='PT409';end if;
  -- Only a verified upload can be analyzed.
  if c.state<>'READY' then raise exception 'EVIDENCE_NOT_READY' using errcode='PT409';end if;
  h:=private.hash_v2_freight_payload(jsonb_build_object('sessionId',s.id,'clipId',c.id,'clipSha256',c.sha256,'manifestRevision',s.manifest_revision,
   'groupId',g->>'id','coverage',p_value->>'coverage','config',p_value->'config'));
  insert into private.meta_dockmind_jobs(organization_id,session_id,clip_id,manifest_revision,group_id,coverage,source,clip_sha256,config,dedupe_key,created_by)
   values(p_organization_id,s.id,c.id,s.manifest_revision,(g->>'id')::uuid,p_value->>'coverage',c.source,c.sha256,p_value->'config',h,p_member_id)
   on conflict(organization_id,dedupe_key) do nothing returning * into j;
  if j.id is not null then return jsonb_build_object('record',private.meta_dockmind_job_record(j),'created',true);end if;
  select * into j from private.meta_dockmind_jobs where organization_id=p_organization_id and dedupe_key=h;
  return jsonb_build_object('record',private.meta_dockmind_job_record(j),'created',false);
 end if;

 if p_action in('mark_dispatched','mark_dispatch_failed') then
  perform private.meta_dockmind_valid('{"type":"object","required":["id","attempt"],"additionalProperties":false,"properties":{"id":{"type":"string"},
   "attempt":{"type":"integer","minimum":1,"maximum":50},"callId":{"type":["string","null"],"minLength":1,"maxLength":200},
   "error":{"type":"object","required":["code","message"],"additionalProperties":false,"properties":{"code":{"type":"string"},"message":{"type":"string","maxLength":300}}}}}'::json,p_value);
  -- Only a job still queued in this attempt changes: a callback that arrived first is never reverted.
  if p_action='mark_dispatched' then
   update private.meta_dockmind_jobs set status='RUNNING',dispatched_at=now(),updated_at=now(),worker_call_id=p_value->>'callId',error=null
    where id=(p_value->>'id')::uuid and organization_id=p_organization_id and attempt=(p_value->>'attempt')::integer and status='QUEUED' returning * into j;
  else
   if p_value->'error' is null then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
   update private.meta_dockmind_jobs set error=p_value->'error',updated_at=now()
    where id=(p_value->>'id')::uuid and organization_id=p_organization_id and attempt=(p_value->>'attempt')::integer and status='QUEUED' returning * into j;
  end if;
  return jsonb_build_object('record',case when j.id is null then null else private.meta_dockmind_job_record(j) end);
 end if;

 -- retry_job: a new attempt of the same evidence, revision and configuration, from the attempt the member saw.
 perform private.meta_dockmind_valid('{"type":"object","required":["id","expectedAttempt"],"additionalProperties":false,"properties":{"id":{"type":"string"},
  "expectedAttempt":{"type":"integer","minimum":1,"maximum":50}}}'::json,p_value);
 select * into j from private.meta_dockmind_jobs where id=(p_value->>'id')::uuid and organization_id=p_organization_id for update;
 if j.id is null then raise exception 'ANALYSIS_JOB_NOT_FOUND' using errcode='PT404';end if;
 if j.attempt<>(p_value->>'expectedAttempt')::integer then raise exception 'STALE_ANALYSIS_JOB' using errcode='PT409';end if;
 if not private.meta_dockmind_retryable(j) then raise exception 'ANALYSIS_NOT_RETRYABLE' using errcode='PT409';end if;
 if j.attempt>=50 then raise exception 'RETRY_LIMIT' using errcode='PT422';end if;
 if not exists(select 1 from private.meta_dockmind_clips where id=j.clip_id and state='READY') then raise exception 'EVIDENCE_NOT_READY' using errcode='PT409';end if;
 update private.meta_dockmind_jobs set attempt=attempt+1,status='QUEUED',error=null,observation=null,worker_call_id=null,dispatched_at=null,completed_at=null,updated_at=now()
  where id=j.id returning * into j;
 return jsonb_build_object('record',private.meta_dockmind_job_record(j));
exception
 when invalid_text_representation or numeric_value_out_of_range or check_violation then raise exception 'VALIDATION_ERROR' using errcode='PT400';
end;$$;
revoke all on function private.meta_dockmind_v1(uuid,uuid,text,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function private.meta_dockmind_v1(uuid,uuid,text,jsonb,uuid) to authenticated;
create function public.meta_dockmind_v1(p_organization_id uuid,p_member_id uuid,p_action text,p_value jsonb default '{}',p_key uuid default null)
returns jsonb language sql security invoker set search_path='' as $$select private.meta_dockmind_v1(p_organization_id,p_member_id,p_action,p_value,p_key);$$;
revoke all on function public.meta_dockmind_v1(uuid,uuid,text,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.meta_dockmind_v1(uuid,uuid,text,jsonb,uuid) to authenticated;

-- Server capability, never a browser command: verified upload, signed worker result and delivery state.
create function public.meta_dockmind_server_v1(p_action text,p_value jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c private.meta_dockmind_clips%rowtype; j private.meta_dockmind_jobs%rowtype; o text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN' using errcode='PT403';end if;
 if p_action is null or p_action not in('read_clip','clip_ready','clip_rejected','read_job','complete_job','record_delivery')
  or p_value is null or jsonb_typeof(p_value)<>'object' then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;

 if p_action in('read_clip','clip_ready','clip_rejected') then
  perform private.meta_dockmind_valid('{"type":"object","required":["id"],"additionalProperties":false,"properties":{"id":{"type":"string"},
   "container":{"enum":["MP4","MOV"]},"sizeBytes":{"type":"integer","minimum":1},"sha256":{"type":"string","pattern":"^[0-9a-f]{64}$"},
   "reason":{"type":"string","pattern":"^[A-Z][A-Z0-9_]{2,59}$"}}}'::json,p_value);
  select * into c from private.meta_dockmind_clips where id=(p_value->>'id')::uuid for update;
  if p_action='read_clip' then return case when c.id is null then 'null'::jsonb else private.meta_dockmind_clip_record(c) end;end if;
  if c.id is null then raise exception 'EVIDENCE_NOT_FOUND' using errcode='PT404';end if;
  if p_action='clip_ready' then
   if p_value->>'container' is null or p_value->>'sizeBytes' is null or p_value->>'sha256' is null then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
   if (p_value->>'sizeBytes')::bigint<>c.size_bytes or p_value->>'sha256'<>c.sha256 then raise exception 'UPLOAD_MISMATCH' using errcode='PT409';end if;
   if c.state='PENDING' then
    update private.meta_dockmind_clips set state='READY',container=p_value->>'container',ready_at=now(),updated_at=now() where id=c.id returning * into c;
   elsif c.state='REJECTED' then raise exception 'EVIDENCE_REJECTED' using errcode='PT409';
   end if;
  else
   if p_value->>'reason' is null then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
   if c.state='READY' then raise exception 'EVIDENCE_ALREADY_READY' using errcode='PT409';end if;
   if c.state='PENDING' then
    update private.meta_dockmind_clips set state='REJECTED',rejection=p_value->>'reason',updated_at=now() where id=c.id returning * into c;
   end if;
  end if;
  return private.meta_dockmind_clip_record(c);
 end if;

 if p_action='read_job' then
  perform private.meta_dockmind_valid('{"type":"object","required":["id"],"additionalProperties":false,"properties":{"id":{"type":"string"}}}'::json,p_value);
  select * into j from private.meta_dockmind_jobs where id=(p_value->>'id')::uuid;
  return case when j.id is null then 'null'::jsonb else private.meta_dockmind_job_record(j) end;
 end if;

 if p_action='complete_job' then
  perform private.meta_dockmind_valid('{"type":"object","required":["id","attempt","organizationId","sessionId","evidenceId","groupId","manifestRevision","status","error","observation"],
   "additionalProperties":false,"properties":{"id":{"type":"string"},"attempt":{"type":"integer","minimum":1,"maximum":50},"organizationId":{"type":"string"},
   "sessionId":{"type":"string"},"evidenceId":{"type":"string"},"groupId":{"type":"string"},"manifestRevision":{"type":"integer","minimum":1},
   "status":{"enum":["SUCCEEDED","FAILED"]},"error":{"type":["object","null"]},"observation":{"type":["object","null"]}}}'::json,p_value);
  select * into j from private.meta_dockmind_jobs where id=(p_value->>'id')::uuid for update;
  if j.id is null then raise exception 'ANALYSIS_JOB_NOT_FOUND' using errcode='PT404';end if;
  -- Exact identity of the signed result: tenant, session, evidence, group and manifest revision.
  if p_value->>'organizationId'<>j.organization_id::text or p_value->>'sessionId'<>j.session_id::text or p_value->>'evidenceId'<>j.clip_id::text
   or p_value->>'groupId'<>j.group_id::text or (p_value->>'manifestRevision')::integer<>j.manifest_revision or (p_value->>'attempt')::integer>j.attempt
   then raise exception 'INPUT_REVISION_MISMATCH' using errcode='PT409';end if;
  if (p_value->>'attempt')::integer<j.attempt then return jsonb_build_object('record',private.meta_dockmind_job_record(j),'outcome','STALE_ATTEMPT');end if;
  if j.status not in('QUEUED','RUNNING') then return jsonb_build_object('record',private.meta_dockmind_job_record(j),'outcome','ALREADY_RECORDED');end if;
  if p_value->>'status'='SUCCEEDED' then
   if p_value->'observation' is null or jsonb_typeof(p_value->'observation')<>'object' or p_value->'error'<>'null'::jsonb
    or p_value#>>'{observation,clip,sha256}' is distinct from j.clip_sha256 or p_value#>>'{observation,clip,source}' is distinct from j.source
    or p_value#>>'{observation,config,unit}' is distinct from j.config->>'unit' then raise exception 'INPUT_REVISION_MISMATCH' using errcode='PT409';end if;
   update private.meta_dockmind_jobs set status='SUCCEEDED',observation=p_value->'observation',error=null,completed_at=now(),updated_at=now(),
    delivery_status='PENDING',delivery_tries=0,delivery_error=null where id=j.id returning * into j;
  else
   if jsonb_typeof(p_value->'error')<>'object' or p_value->'observation'<>'null'::jsonb then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
   update private.meta_dockmind_jobs set status='FAILED',error=p_value->'error',observation=null,completed_at=now(),updated_at=now() where id=j.id returning * into j;
  end if;
  return jsonb_build_object('record',private.meta_dockmind_job_record(j),'outcome','RECORDED');
 end if;

 -- record_delivery: the outcome of one call to Juan's recorder. Only a pending delivery of this attempt changes.
 perform private.meta_dockmind_valid('{"type":"object","required":["id","attempt","outcome"],"additionalProperties":false,"properties":{"id":{"type":"string"},
  "attempt":{"type":"integer","minimum":1,"maximum":50},"outcome":{"enum":["DELIVERED","SUPERSEDED","REJECTED","RETRY"]},"observationId":{"type":"string"},
  "error":{"type":"object","required":["code","message"],"additionalProperties":false,"properties":{"code":{"type":"string"},"message":{"type":"string","maxLength":300}}}}}'::json,p_value);
 o:=p_value->>'outcome';
 if (o='DELIVERED')<>(p_value ? 'observationId') or (o in('REJECTED','RETRY'))<>(p_value ? 'error') then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
 update private.meta_dockmind_jobs set
  delivery_status=case o when 'RETRY' then 'PENDING' else o end,
  delivery_tries=delivery_tries+1,
  delivery_error=case when o in('REJECTED','RETRY') then p_value->'error' end,
  observation_id=case when o='DELIVERED' then (p_value->>'observationId')::uuid end,
  delivered_at=case when o='DELIVERED' then now() end,
  updated_at=now()
  where id=(p_value->>'id')::uuid and attempt=(p_value->>'attempt')::integer and status='SUCCEEDED' and delivery_status='PENDING' returning * into j;
 if j.id is not null then return jsonb_build_object('record',private.meta_dockmind_job_record(j),'applied',true);end if;
 select * into j from private.meta_dockmind_jobs where id=(p_value->>'id')::uuid;
 if j.id is null then raise exception 'ANALYSIS_JOB_NOT_FOUND' using errcode='PT404';end if;
 return jsonb_build_object('record',private.meta_dockmind_job_record(j),'applied',false);
exception
 when invalid_text_representation or numeric_value_out_of_range or check_violation then raise exception 'VALIDATION_ERROR' using errcode='PT400';
end;$$;
revoke all on function public.meta_dockmind_server_v1(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.meta_dockmind_server_v1(text,jsonb) to service_role;

commit;
