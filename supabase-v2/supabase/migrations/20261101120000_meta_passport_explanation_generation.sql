-- Luis: connect the grounded explanation service to Juan's immutable Passport writer.
-- Additive transition. The original writer body/attribution is retained in private.
begin;
create table private.meta_passport_explanation_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  member_id uuid not null references public.organization_members(id),
  session_id uuid not null, passport_id uuid not null, group_id uuid not null,
  idempotency_key uuid not null, payload_hash text not null check(payload_hash ~ '^[0-9a-f]{64}$'),
  source_hash text not null check(source_hash ~ '^[0-9a-f]{64}$'),
  language text not null check(language in ('es','en')),
  state text not null default 'RUNNING' check(state in ('RUNNING','GENERATED','SAVED','FAILED')),
  generated_value jsonb, metadata jsonb, error_code text,
  processing_may_have_occurred boolean not null default false,
  created_at timestamptz not null default now(), deadline_at timestamptz not null default now()+interval '90 seconds',
  completed_at timestamptz,
  foreign key(passport_id,organization_id) references private.meta_loading_passports(id,organization_id),
  foreign key(session_id,organization_id) references private.meta_loading_sessions(id,organization_id),
  unique(organization_id,member_id,idempotency_key),
  check(generated_value is null or (jsonb_typeof(generated_value)='object' and octet_length(generated_value::text)<=32768)),
  check(metadata is null or (jsonb_typeof(metadata)='object' and octet_length(metadata::text)<=4096)),
  check(error_code is null or error_code in ('VALIDATION_ERROR','NOT_CONFIGURED','PROVIDER_UNAVAILABLE','MODEL_OUTPUT_INVALID','INPUT_REVISION_MISMATCH','FORBIDDEN_TENANT','GENERATION_INTERRUPTED','PERSISTENCE_UNAVAILABLE'))
);
create unique index meta_passport_one_active_explanation on private.meta_passport_explanation_attempts(organization_id,passport_id,group_id)
  where state in ('RUNNING','GENERATED');
create index meta_passport_explanation_scope on private.meta_passport_explanation_attempts(organization_id,passport_id,group_id,created_at desc,id);
create index meta_passport_explanation_member on private.meta_passport_explanation_attempts(member_id);
alter table private.meta_passport_explanation_attempts enable row level security;
revoke all on private.meta_passport_explanation_attempts from public,anon,authenticated,service_role;

create function private.meta_passport_attempt_record(a private.meta_passport_explanation_attempts)
returns jsonb language sql stable set search_path='' as $$
  select jsonb_build_object('id',a.id,'groupId',a.group_id,
    'state',case when a.state='RUNNING' and a.deadline_at<now() then 'FAILED' else a.state end,
    'language',a.language,'createdAt',a.created_at,'completedAt',a.completed_at,
    'errorCode',case when a.state='RUNNING' and a.deadline_at<now() then 'GENERATION_INTERRUPTED' else a.error_code end,
    'processingMayHaveOccurred',a.processing_may_have_occurred or (a.state='RUNNING' and a.deadline_at<now()),'metadata',a.metadata);
$$;

-- Same material-current rule as Juan's authorized bundle, checked while native
-- request revisions and session changes are excluded by row locks. No count is calculated here.
create function private.meta_current_explanation_passport(o uuid,sid uuid,pid uuid,v integer)
returns private.meta_loading_passports language plpgsql security definer set search_path='' as $$
declare p private.meta_loading_passports; s private.meta_loading_sessions; q jsonb; m private.meta_declared_manifests;
begin
  select * into p from private.meta_loading_passports where id=pid and organization_id=o and session_id=sid;
  if p.id is null then raise exception 'PASSPORT_NOT_FOUND' using errcode='PT404'; end if;
  select * into s from private.meta_loading_sessions where id=sid and organization_id=o;
  select v2_snapshot into q from public.freight_requests where id=s.request_id and organization_id=o for share;
  select * into s from private.meta_loading_sessions where id=sid and organization_id=o for update;
  if s.version<>p.session_version or p.session_version is distinct from v or s.state<>'CLOSED'
  then raise exception 'STALE_PASSPORT' using errcode='PT409'; end if;
  select * into m from private.meta_declared_manifests where organization_id=o and request_id=s.request_id order by revision desc limit 1;
  if m.id is distinct from s.manifest_id or m.revision is distinct from s.manifest_revision or q is null
    or not coalesce((q->'cargoSpecification'||jsonb_build_object('availableDocuments',coalesce(q#>'{cargoSpecification,availableDocuments}','[]')))=m.declaration->'cargoSpecification'
      and q->'origin'=m.declaration#>'{route,origin}' and q->'destination'=m.declaration#>'{route,destination}'
      and q->'pickupWindow'=m.declaration#>'{route,pickupWindow}' and q->'deliveryWindow'=m.declaration#>'{route,deliveryWindow}'
      and coalesce(q->'planningPreferences','null')=coalesce(m.declaration#>'{route,planningPreferences}','null'),false)
  then raise exception 'STALE_PASSPORT' using errcode='PT409'; end if;
  return p;
end $$;

-- Preserve Juan's writer unchanged, then keep its public contract with a currency guard.
alter function public.meta_record_loading_explanation_v1(uuid,uuid,uuid,jsonb) set schema private;
revoke all on function private.meta_record_loading_explanation_v1(uuid,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
create function public.meta_record_loading_explanation_v1(p_organization_id uuid,p_passport_id uuid,p_group_id uuid,p_value jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p private.meta_loading_passports;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN' using errcode='PT403'; end if;
  select * into p from private.meta_loading_passports where id=p_passport_id and organization_id=p_organization_id;
  p:=private.meta_current_explanation_passport(p_organization_id,p.session_id,p_passport_id,p.session_version);
  return private.meta_record_loading_explanation_v1(p_organization_id,p_passport_id,p_group_id,p_value);
end $$;
revoke all on function public.meta_record_loading_explanation_v1(uuid,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.meta_record_loading_explanation_v1(uuid,uuid,uuid,jsonb) to service_role;

create function public.meta_claim_passport_explanation_v1(p_organization_id uuid,p_member_id uuid,p_session_id uuid,p_passport_id uuid,
  p_group_id uuid,p_expected_version integer,p_language text,p_key uuid,p_retry_of uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a private.meta_passport_explanation_attempts; previous private.meta_passport_explanation_attempts;
  p private.meta_loading_passports; h text; existing jsonb;
begin
  perform private.workflow_member(p_organization_id,p_member_id,true);
  if p_key is null or p_group_id is null or p_expected_version is null or p_language is null or p_language not in ('es','en')
  then raise exception 'VALIDATION_ERROR' using errcode='PT400'; end if;
  -- Actor/key lock prevents the same key being claimed concurrently for two groups.
  perform pg_advisory_xact_lock(hashtextextended('passport-key:'||p_organization_id::text||':'||p_member_id::text||':'||p_key::text,0));
  perform pg_advisory_xact_lock(hashtextextended('passport-group:'||p_organization_id::text||':'||p_passport_id::text||':'||p_group_id::text,0));
  h:=private.hash_v2_freight_payload(jsonb_build_object('sessionId',p_session_id,'passportId',p_passport_id,'groupId',p_group_id,
    'expectedVersion',p_expected_version,'language',p_language,'retryOf',p_retry_of));
  select * into a from private.meta_passport_explanation_attempts where organization_id=p_organization_id and member_id=p_member_id and idempotency_key=p_key;
  if found and a.payload_hash<>h then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='PT409'; end if;
  p:=private.meta_current_explanation_passport(p_organization_id,p_session_id,p_passport_id,p_expected_version);
  if not exists(select 1 from jsonb_array_elements(p.source#>'{session,groups}')g where g->>'id'=p_group_id::text)
  then raise exception 'PASSPORT_GROUP_NOT_FOUND' using errcode='PT404'; end if;
  update private.meta_passport_explanation_attempts set state='FAILED',error_code='GENERATION_INTERRUPTED',processing_may_have_occurred=true,completed_at=now()
    where organization_id=p_organization_id and passport_id=p_passport_id and group_id=p_group_id and state='RUNNING' and deadline_at<now();
  if a.id is not null then
    select * into a from private.meta_passport_explanation_attempts where id=a.id;
    return jsonb_build_object('attempt',private.meta_passport_attempt_record(a),'claimed',false,'replay',true,'value',a.generated_value);
  end if;
  select value into existing from private.meta_loading_explanations where passport_id=p_passport_id and group_id=p_group_id;
  if existing is not null then
    select * into previous from private.meta_passport_explanation_attempts where passport_id=p_passport_id and group_id=p_group_id and state='SAVED' order by created_at desc,id desc limit 1;
    insert into private.meta_passport_explanation_attempts(organization_id,member_id,session_id,passport_id,group_id,idempotency_key,payload_hash,source_hash,language,state,generated_value,metadata,completed_at)
      values(p_organization_id,p_member_id,p_session_id,p_passport_id,p_group_id,p_key,h,private.hash_v2_freight_payload(p.source),coalesce(previous.language,p_language),'SAVED',existing,previous.metadata,now()) returning * into a;
    return jsonb_build_object('attempt',private.meta_passport_attempt_record(a),'claimed',false,'replay',true,'value',existing);
  end if;
  select * into a from private.meta_passport_explanation_attempts where organization_id=p_organization_id and passport_id=p_passport_id and group_id=p_group_id and state in ('RUNNING','GENERATED');
  if found then return jsonb_build_object('attempt',private.meta_passport_attempt_record(a),'claimed',false,'replay',true,'value',a.generated_value); end if;
  select * into previous from private.meta_passport_explanation_attempts where organization_id=p_organization_id and passport_id=p_passport_id and group_id=p_group_id order by created_at desc,id desc limit 1;
  if previous.id is not null and (p_retry_of is distinct from previous.id or previous.state<>'FAILED')
    or previous.id is null and p_retry_of is not null
  then raise exception 'EXPLANATION_RETRY_REQUIRED' using errcode='PT409'; end if;
  insert into private.meta_passport_explanation_attempts(organization_id,member_id,session_id,passport_id,group_id,idempotency_key,payload_hash,source_hash,language)
    values(p_organization_id,p_member_id,p_session_id,p_passport_id,p_group_id,p_key,h,private.hash_v2_freight_payload(p.source),p_language) returning * into a;
  return jsonb_build_object('attempt',private.meta_passport_attempt_record(a),'claimed',true,'replay',false,'value',null);
end $$;

create function public.meta_read_passport_explanation_attempts_v1(p_organization_id uuid,p_member_id uuid,p_session_id uuid,p_passport_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform private.workflow_member(p_organization_id,p_member_id,false);
  if not exists(select 1 from private.meta_loading_passports where id=p_passport_id and organization_id=p_organization_id and session_id=p_session_id)
  then raise exception 'PASSPORT_NOT_FOUND' using errcode='PT404'; end if;
  return (select coalesce(jsonb_agg(private.meta_passport_attempt_record(a) order by a.group_id),'[]') from (
    select distinct on(group_id) * from private.meta_passport_explanation_attempts where organization_id=p_organization_id and passport_id=p_passport_id order by group_id,created_at desc,id desc
  )a);
end $$;

create function public.meta_complete_passport_explanation_v1(p_attempt_id uuid,p_action text,p_value jsonb default null,p_metadata jsonb default null,p_error_code text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a private.meta_passport_explanation_attempts; p private.meta_loading_passports; result jsonb;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN' using errcode='PT403'; end if;
  select * into a from private.meta_passport_explanation_attempts where id=p_attempt_id;
  if a.id is null then raise exception 'EXPLANATION_ATTEMPT_NOT_FOUND' using errcode='PT404'; end if;
  perform pg_advisory_xact_lock(hashtextextended('passport-group:'||a.organization_id::text||':'||a.passport_id::text||':'||a.group_id::text,0));
  select * into a from private.meta_passport_explanation_attempts where id=p_attempt_id for update;
  if p_action is null or p_action not in ('stage','complete','fail') then raise exception 'VALIDATION_ERROR' using errcode='PT400'; end if;
  if a.state='SAVED' then return jsonb_build_object('recorded',false); end if;
  if a.state='FAILED' then return jsonb_build_object('recorded',false); end if;
  if p_action='fail' then
    -- Never throw away an already generated result after an ambiguous save response.
    if a.state='GENERATED' and p_error_code not in ('INPUT_REVISION_MISMATCH','FORBIDDEN_TENANT','MODEL_OUTPUT_INVALID') then return jsonb_build_object('recorded',false); end if;
    if p_error_code is null or p_error_code not in ('VALIDATION_ERROR','NOT_CONFIGURED','PROVIDER_UNAVAILABLE','MODEL_OUTPUT_INVALID','INPUT_REVISION_MISMATCH','FORBIDDEN_TENANT','GENERATION_INTERRUPTED','PERSISTENCE_UNAVAILABLE')
    then raise exception 'VALIDATION_ERROR' using errcode='PT400'; end if;
    update private.meta_passport_explanation_attempts set state='FAILED',error_code=p_error_code,metadata=p_metadata,
      processing_may_have_occurred=coalesce((p_metadata->>'processingMayHaveOccurred')::boolean,true),completed_at=now() where id=a.id;
    return jsonb_build_object('recorded',false);
  end if;
  if not exists(select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id
    where m.id=a.member_id and m.organization_id=a.organization_id and m.status='ACTIVE' and m.role in ('OWNER','SUPERVISOR') and o.status='ACTIVE')
  then raise exception 'FORBIDDEN_WORKFLOW' using errcode='PT403'; end if;
  select * into p from private.meta_loading_passports where id=a.passport_id;
  p:=private.meta_current_explanation_passport(a.organization_id,a.session_id,a.passport_id,p.session_version);
  if private.hash_v2_freight_payload(p.source)<>a.source_hash then raise exception 'STALE_PASSPORT' using errcode='PT409'; end if;
  if p_action='stage' then
    if a.state='GENERATED' then
      if a.generated_value is distinct from p_value then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='PT409'; end if;
      return jsonb_build_object('recorded',false);
    end if;
    if a.deadline_at<now() then raise exception 'EXPLANATION_ATTEMPT_EXPIRED' using errcode='PT409'; end if;
    if p_value is null or jsonb_typeof(p_value)<>'object' or p_metadata is null or jsonb_typeof(p_metadata)<>'object'
    then raise exception 'VALIDATION_ERROR' using errcode='PT400'; end if;
    update private.meta_passport_explanation_attempts set state='GENERATED',generated_value=p_value,metadata=p_metadata,
      processing_may_have_occurred=true where id=a.id;
    return jsonb_build_object('recorded',false);
  end if;
  if a.state<>'GENERATED' or a.generated_value is distinct from p_value then raise exception 'EXPLANATION_NOT_GENERATED' using errcode='PT409'; end if;
  -- The original immutable writer validates group/revision/evidence and owns storage.
  result:=public.meta_record_loading_explanation_v1(a.organization_id,a.passport_id,a.group_id,a.generated_value);
  update private.meta_passport_explanation_attempts set state='SAVED',completed_at=now(),error_code=null where id=a.id;
  return result;
end $$;

revoke all on function private.meta_passport_attempt_record(private.meta_passport_explanation_attempts),private.meta_current_explanation_passport(uuid,uuid,uuid,integer) from public,anon,authenticated,service_role;
revoke all on function public.meta_claim_passport_explanation_v1(uuid,uuid,uuid,uuid,uuid,integer,text,uuid,uuid),public.meta_read_passport_explanation_attempts_v1(uuid,uuid,uuid,uuid),public.meta_complete_passport_explanation_v1(uuid,text,jsonb,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.meta_claim_passport_explanation_v1(uuid,uuid,uuid,uuid,uuid,integer,text,uuid,uuid),public.meta_read_passport_explanation_attempts_v1(uuid,uuid,uuid,uuid) to authenticated;
grant execute on function public.meta_complete_passport_explanation_v1(uuid,text,jsonb,jsonb,text) to service_role;
notify pgrst,'reload schema';
commit;
