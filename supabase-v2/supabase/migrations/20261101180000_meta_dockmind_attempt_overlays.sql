-- Ramón/Jean: one annotated-video object per attempt. Additive over 20261031120000_meta_dockmind_jobs.sql.
-- Before, every attempt of a job shared overlay_path and the signed upload allowed upsert, so a delayed worker of
-- an old attempt could overwrite the video of the current attempt even though its callback was STALE_ATTEMPT.
-- Now the path is derived by the server from the job identity and the attempt, the upload only creates, and the
-- server stores which bytes it verified for the attempt it completed. An old attempt can only reach its own path.
begin;

alter table private.meta_dockmind_jobs drop column overlay_path;
alter table private.meta_dockmind_jobs
 add column overlay_path text generated always as
  ('org/'||organization_id::text||'/'||session_id::text||'/'||clip_id::text||'-'||id::text||'-a'||attempt::text||'-overlay.mp4') stored,
 -- NONE: no annotated video for this attempt. VERIFIED: the object at overlay_path has overlay_sha256.
 -- MISSING / MISMATCH: the worker reported an upload that the server could not verify; it is never played.
 add column overlay_status text not null default 'NONE' check(overlay_status in('NONE','VERIFIED','MISSING','MISMATCH')),
 add column overlay_sha256 text check(overlay_sha256~'^[0-9a-f]{64}$'),
 add constraint meta_dockmind_jobs_overlay_verified check((overlay_status='VERIFIED')=(overlay_sha256 is not null)),
 add constraint meta_dockmind_jobs_overlay_succeeded check(overlay_status='NONE' or status='SUCCEEDED');

create or replace function private.meta_dockmind_job_record(j private.meta_dockmind_jobs) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('jobId',j.id,'organizationId',j.organization_id,'sessionId',j.session_id,'evidenceId',j.clip_id,'manifestRevision',j.manifest_revision,
  'groupId',j.group_id,'coverage',j.coverage,'source',j.source,'clipSha256',j.clip_sha256,'config',j.config,'dedupeKey',j.dedupe_key,'attempt',j.attempt,
  'status',j.status,'workerCallId',j.worker_call_id,'error',j.error,'observation',j.observation,'overlayPath',j.overlay_path,
  'overlay',jsonb_build_object('status',j.overlay_status,'sha256',j.overlay_sha256),
  'delivery',jsonb_build_object('status',j.delivery_status,'tries',j.delivery_tries,'error',j.delivery_error,'observationId',j.observation_id,'deliveredAt',j.delivered_at),
  'createdBy',j.created_by,'createdAt',j.created_at,'updatedAt',j.updated_at,'dispatchedAt',j.dispatched_at,'completedAt',j.completed_at);
$$;
revoke all on function private.meta_dockmind_job_record(private.meta_dockmind_jobs) from public,anon,authenticated,service_role;

-- Same server capability as before; complete_job now also records the annotated video the server verified.
create or replace function public.meta_dockmind_server_v1(p_action text,p_value jsonb)
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
  perform private.meta_dockmind_valid('{"type":"object","required":["id","attempt","organizationId","sessionId","evidenceId","groupId","manifestRevision","status","error","observation","overlay"],
   "additionalProperties":false,"properties":{"id":{"type":"string"},"attempt":{"type":"integer","minimum":1,"maximum":50},"organizationId":{"type":"string"},
   "sessionId":{"type":"string"},"evidenceId":{"type":"string"},"groupId":{"type":"string"},"manifestRevision":{"type":"integer","minimum":1},
   "status":{"enum":["SUCCEEDED","FAILED"]},"error":{"type":["object","null"]},"observation":{"type":["object","null"]},
   "overlay":{"type":"object","required":["status","sha256"],"additionalProperties":false,"properties":{
    "status":{"enum":["NONE","VERIFIED","MISSING","MISMATCH"]},"sha256":{"type":["string","null"],"pattern":"^[0-9a-f]{64}$"}}}}}'::json,p_value);
  if (p_value#>>'{overlay,status}'='VERIFIED')<>(p_value#>'{overlay,sha256}'<>'null'::jsonb) then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
  select * into j from private.meta_dockmind_jobs where id=(p_value->>'id')::uuid for update;
  if j.id is null then raise exception 'ANALYSIS_JOB_NOT_FOUND' using errcode='PT404';end if;
  -- Exact identity of the signed result: tenant, session, evidence, group and manifest revision.
  if p_value->>'organizationId'<>j.organization_id::text or p_value->>'sessionId'<>j.session_id::text or p_value->>'evidenceId'<>j.clip_id::text
   or p_value->>'groupId'<>j.group_id::text or (p_value->>'manifestRevision')::integer<>j.manifest_revision or (p_value->>'attempt')::integer>j.attempt
   then raise exception 'INPUT_REVISION_MISMATCH' using errcode='PT409';end if;
  -- An old attempt never touches the current one, its observation or its annotated video.
  if (p_value->>'attempt')::integer<j.attempt then return jsonb_build_object('record',private.meta_dockmind_job_record(j),'outcome','STALE_ATTEMPT');end if;
  if j.status not in('QUEUED','RUNNING') then return jsonb_build_object('record',private.meta_dockmind_job_record(j),'outcome','ALREADY_RECORDED');end if;
  if p_value->>'status'='SUCCEEDED' then
   if p_value->'observation' is null or jsonb_typeof(p_value->'observation')<>'object' or p_value->'error'<>'null'::jsonb
    or p_value#>>'{observation,clip,sha256}' is distinct from j.clip_sha256 or p_value#>>'{observation,clip,source}' is distinct from j.source
    or p_value#>>'{observation,config,unit}' is distinct from j.config->>'unit' then raise exception 'INPUT_REVISION_MISMATCH' using errcode='PT409';end if;
   -- A verified video is exactly the one the worker declared for this attempt.
   if p_value#>>'{overlay,status}'='VERIFIED' and p_value#>>'{overlay,sha256}' is distinct from p_value#>>'{observation,evidence,overlay_sha256}'
    then raise exception 'INPUT_REVISION_MISMATCH' using errcode='PT409';end if;
   update private.meta_dockmind_jobs set status='SUCCEEDED',observation=p_value->'observation',error=null,completed_at=now(),updated_at=now(),
    overlay_status=p_value#>>'{overlay,status}',overlay_sha256=p_value#>>'{overlay,sha256}',
    delivery_status='PENDING',delivery_tries=0,delivery_error=null where id=j.id returning * into j;
  else
   if jsonb_typeof(p_value->'error')<>'object' or p_value->'observation'<>'null'::jsonb or p_value#>>'{overlay,status}'<>'NONE'
    then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
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
