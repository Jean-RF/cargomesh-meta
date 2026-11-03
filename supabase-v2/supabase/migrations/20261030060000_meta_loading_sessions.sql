-- Juan: verification sessions, authorized observations and immutable Passport sources.
-- CR-01 remains its producer. Missing producer capability returns 503, never a fabricated manifest.
begin;

create table private.meta_loading_sessions (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 request_id uuid not null references public.freight_requests(id),
 facility_id uuid not null references public.facilities(id),
 facility_name text not null,
 mode text not null check(mode in ('DEMO','VERIFICATION')),
 manifest_id uuid not null, manifest_revision integer not null check(manifest_revision>0),
 manifest jsonb not null check(jsonb_typeof(manifest)='object'),
 groups jsonb not null check(jsonb_typeof(groups)='array'),
 selections jsonb not null default '[]' check(jsonb_typeof(selections)='array'),
 state text not null default 'OPEN' check(state in ('OPEN','CLOSED')),
 version integer not null default 1 check(version>0),
 opened_at timestamptz not null default now(), opened_by uuid not null references public.organization_members(id),
 closed_at timestamptz, closed_by uuid references public.organization_members(id),
 updated_at timestamptz not null default now(),
 check((state='CLOSED')=(closed_at is not null and closed_by is not null)),
 unique(id,organization_id)
);
create index meta_loading_request_idx on private.meta_loading_sessions(organization_id,request_id,opened_at desc,id);
create index meta_loading_facility_idx on private.meta_loading_sessions(organization_id,facility_id);
create index meta_loading_members_idx on private.meta_loading_sessions(opened_by,closed_by);
create unique index meta_loading_one_open_idx on private.meta_loading_sessions(organization_id,request_id,facility_id,manifest_id) where state='OPEN';

create table private.meta_loading_observations (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 session_id uuid not null, job_id text not null check(length(job_id) between 1 and 200),
 attempt integer not null check(attempt>0), manifest_revision integer not null check(manifest_revision>0),
 evidence_id text not null check(length(evidence_id) between 1 and 200), evidence_ref_id uuid not null default gen_random_uuid(),
 value jsonb not null check(jsonb_typeof(value)='object'), events jsonb not null,
 payload_hash text not null check(payload_hash ~ '^[0-9a-f]{64}$'), received_at timestamptz not null default now(),
 foreign key(session_id,organization_id) references private.meta_loading_sessions(id,organization_id),
 unique(organization_id,job_id,attempt), unique(id,organization_id,session_id)
);
create index meta_loading_observations_session_idx on private.meta_loading_observations(organization_id,session_id,received_at,id);

create table private.meta_loading_passports (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), session_id uuid not null,
 session_version integer not null check(session_version>0), rule_version text not null check(rule_version='loading.compare.v1'),
 source jsonb not null check(jsonb_typeof(source)='object'), created_at timestamptz not null default now(),
 created_by uuid not null references public.organization_members(id),
 foreign key(session_id,organization_id) references private.meta_loading_sessions(id,organization_id),
 unique(session_id,session_version), unique(id,organization_id)
);
create index meta_loading_passports_org_idx on private.meta_loading_passports(organization_id,session_id,created_at desc);
create index meta_loading_passports_member_idx on private.meta_loading_passports(created_by);

create table private.meta_loading_explanations (
 organization_id uuid not null references public.organizations(id), passport_id uuid not null, group_id uuid not null,
 value jsonb not null check(jsonb_typeof(value)='object'), created_at timestamptz not null default now(),
 foreign key(passport_id,organization_id) references private.meta_loading_passports(id,organization_id),
 primary key(passport_id,group_id)
);
create index meta_loading_explanations_org_idx on private.meta_loading_explanations(organization_id,passport_id);
create table private.meta_loading_receipts (
 organization_id uuid not null references public.organizations(id), member_id uuid not null references public.organization_members(id),
 idempotency_key uuid not null, payload_hash text not null, result jsonb not null, created_at timestamptz not null default now(),
 primary key(organization_id,member_id,idempotency_key)
);
create index meta_loading_receipts_member_idx on private.meta_loading_receipts(member_id);

alter table private.meta_loading_sessions enable row level security;
alter table private.meta_loading_observations enable row level security;
alter table private.meta_loading_passports enable row level security;
alter table private.meta_loading_explanations enable row level security;
alter table private.meta_loading_receipts enable row level security;
create policy meta_loading_sessions_org on private.meta_loading_sessions for select to authenticated using(private.is_organization_member(organization_id));
create policy meta_loading_observations_org on private.meta_loading_observations for select to authenticated using(private.is_organization_member(organization_id));
create policy meta_loading_passports_org on private.meta_loading_passports for select to authenticated using(private.is_organization_member(organization_id));
create policy meta_loading_explanations_org on private.meta_loading_explanations for select to authenticated using(private.is_organization_member(organization_id));
create policy meta_loading_receipts_org on private.meta_loading_receipts for select to authenticated using(private.is_organization_member(organization_id));
revoke all on private.meta_loading_sessions,private.meta_loading_observations,private.meta_loading_passports,private.meta_loading_explanations,private.meta_loading_receipts from public,anon,authenticated,service_role;

create function private.meta_loading_immutable() returns trigger language plpgsql set search_path='' as $$begin
 raise exception 'IMMUTABLE_LOADING_RECORD' using errcode='PT409';
end;$$;
create trigger meta_loading_observation_immutable before update or delete on private.meta_loading_observations for each row execute function private.meta_loading_immutable();
create trigger meta_loading_passport_immutable before update or delete on private.meta_loading_passports for each row execute function private.meta_loading_immutable();
create trigger meta_loading_explanation_immutable before update or delete on private.meta_loading_explanations for each row execute function private.meta_loading_immutable();
revoke all on function private.meta_loading_immutable() from public,anon,authenticated,service_role;

create function private.meta_loading_session_record(s private.meta_loading_sessions) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('id',s.id,'organizationId',s.organization_id,'requestId',s.request_id,'facilityId',s.facility_id,'facilityName',s.facility_name,
 'mode',s.mode,'manifest',s.manifest,'groups',s.groups,'state',s.state,'version',s.version,'openedAt',s.opened_at,'openedBy',s.opened_by,'closedAt',s.closed_at,'closedBy',s.closed_by,'updatedAt',s.updated_at);
$$;
revoke all on function private.meta_loading_session_record(private.meta_loading_sessions) from public,anon,authenticated,service_role;

create function private.meta_loading_manifest(p_org uuid,p_member uuid,p_request uuid,p_action text,p_value jsonb default null) returns jsonb
language plpgsql security definer set search_path='' as $$declare r jsonb;begin
 -- A fixed producer function name with bound parameters; no caller-supplied SQL or identifiers.
 execute 'select public.meta_declared_manifests_v1($1,$2,$3,$4,$5,$6,$7,$8)'
 into r using p_org,p_member,p_request,p_action,p_value,null::uuid,20,0;
 return r;
exception when undefined_function then raise exception 'MANIFESTS_NOT_INSTALLED' using errcode='PT503';
end;$$;
revoke all on function private.meta_loading_manifest(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;

create function private.meta_loading_bundle(s private.meta_loading_sessions,p_member uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare c jsonb; current_ref jsonb; q jsonb; obs jsonb;
begin
 begin
  c:=private.meta_loading_manifest(s.organization_id,p_member,s.request_id,'current');
  select v2_snapshot into q from public.freight_requests where id=s.request_id and organization_id=s.organization_id;
  if c->'record' is not null and c->'record'<>'null'::jsonb then
   current_ref:=jsonb_build_object('id',c#>>'{record,id}','revision',(c#>>'{record,revision}')::integer,
     'requestDraftVersion',(c->>'currentRequestDraftVersion')::integer,
     'contentCurrent',coalesce((q->'cargoSpecification'||jsonb_build_object('availableDocuments',coalesce(q#>'{cargoSpecification,availableDocuments}','[]')))=c#>'{record,declaration,cargoSpecification}' and
       q->'origin'=c#>'{record,declaration,route,origin}' and q->'destination'=c#>'{record,declaration,route,destination}' and
       q->'pickupWindow'=c#>'{record,declaration,route,pickupWindow}' and q->'deliveryWindow'=c#>'{record,declaration,route,deliveryWindow}' and
       coalesce(q->'planningPreferences','null')=coalesce(c#>'{record,declaration,route,planningPreferences}','null'),false));
  end if;
 exception when sqlstate 'PT503' then current_ref:=null;
 end;
 select coalesce(jsonb_agg(o.value||jsonb_build_object('id',o.id,'organizationId',o.organization_id,'sessionId',o.session_id,
   'jobId',o.job_id,'attempt',o.attempt,'manifestRevision',o.manifest_revision,'evidenceId',o.evidence_id,'evidenceRefId',o.evidence_ref_id,'events',o.events,'receivedAt',o.received_at) order by o.received_at,o.id),'[]')
 into obs from private.meta_loading_observations o where o.session_id=s.id and o.organization_id=s.organization_id;
 return jsonb_build_object('session',private.meta_loading_session_record(s),'observations',obs,'selections',s.selections,'currentManifest',current_ref);
end;$$;
revoke all on function private.meta_loading_bundle(private.meta_loading_sessions,uuid) from public,anon,authenticated,service_role;

create function private.meta_loading_passport_record(p private.meta_loading_passports) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('id',p.id,'organizationId',p.organization_id,'sessionId',p.session_id,'sessionVersion',p.session_version,'ruleVersion',p.rule_version,'source',p.source,'createdAt',p.created_at,'createdBy',p.created_by);
$$;
revoke all on function private.meta_loading_passport_record(private.meta_loading_passports) from public,anon,authenticated,service_role;

create function private.meta_loading_sessions_v1(p_organization_id uuid,p_member_id uuid,p_action text,p_session_id uuid,p_value jsonb,p_key uuid,p_limit integer,p_offset integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 s private.meta_loading_sessions%rowtype; receipt private.meta_loading_receipts%rowtype; passport private.meta_loading_passports%rowtype;
 observation private.meta_loading_observations%rowtype; command_hash text; result jsonb; m jsonb; cur jsonb; g jsonb; binding jsonb; groups jsonb:='[]';
 v_request_id uuid; v_facility_id uuid; v_facility_name text; group_id uuid; observation_id uuid; expected integer; mappings jsonb; q public.freight_requests%rowtype;
begin
 perform private.workflow_member(p_organization_id,p_member_id,p_action in ('open','select','close','passport'));
 if p_action is null or p_action not in ('open','read','list','select','close','passport','read_passport','list_passports') or p_value is null or jsonb_typeof(p_value)<>'object' then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
 if p_action in ('open','select','close','passport') then
  if p_key is null then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
  command_hash:=private.hash_v2_freight_payload(jsonb_build_object('action',p_action,'sessionId',p_session_id,'value',p_value));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('meta-loading:'||p_organization_id::text||':'||p_member_id::text||':'||p_key::text,0));
  select * into receipt from private.meta_loading_receipts where organization_id=p_organization_id and member_id=p_member_id and idempotency_key=p_key;
  if found then
   if receipt.payload_hash<>command_hash then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='PT409';end if;
   return jsonb_build_object('record',receipt.result,'replay',true);
  end if;
 end if;
 if p_action='list' then
  if p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset not between 0 and 1000000 or
   not coalesce(extensions.jsonb_matches_schema('{"type":"object","additionalProperties":false,"properties":{"requestId":{"type":["string","null"]}}}'::json,p_value),false)
    then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
  return (select coalesce(jsonb_agg(private.meta_loading_session_record(t) order by t.opened_at desc,t.id),'[]') from
   (select * from private.meta_loading_sessions where organization_id=p_organization_id and (p_value->>'requestId' is null or request_id=(p_value->>'requestId')::uuid) order by opened_at desc,id limit p_limit offset p_offset)t);
 end if;
 if p_action='open' then
  if p_session_id is not null or not coalesce(extensions.jsonb_matches_schema('{
   "type":"object","required":["requestId","manifestId","manifestRevision","facilityId","mode","groups"],"additionalProperties":false,
   "properties":{"requestId":{"type":"string"},"manifestId":{"type":"string"},"facilityId":{"type":"string"},"manifestRevision":{"type":"integer","minimum":1,"maximum":2147483647},
   "mode":{"enum":["DEMO","VERIFICATION"]},"groups":{"type":"array","minItems":1,"maxItems":100,"items":{"type":"object","required":["groupId","unit"],"additionalProperties":false,"properties":{"groupId":{"type":"string"},"unit":{"enum":["PALLET","BOX"]}}}}}}
  '::json,p_value),false) then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
  v_request_id:=(p_value->>'requestId')::uuid;v_facility_id:=(p_value->>'facilityId')::uuid;
  select * into q from public.freight_requests where id=v_request_id and organization_id=p_organization_id and v2_contract_version='2.0' for share;
  if q.id is null then raise exception 'REQUEST_NOT_FOUND' using errcode='PT404';end if;
  select name into v_facility_name from public.facilities where id=v_facility_id and organization_id=p_organization_id;
  if v_facility_name is null then raise exception 'FACILITY_NOT_FOUND' using errcode='PT404';end if;
  cur:=private.meta_loading_manifest(p_organization_id,p_member_id,v_request_id,'current');
  if cur->'record' is null or cur->'record'='null'::jsonb then raise exception 'CONFIRMED_MANIFEST_REQUIRED' using errcode='PT409';end if;
  m:=private.meta_loading_manifest(p_organization_id,p_member_id,v_request_id,'read',jsonb_build_object('manifestId',(p_value->>'manifestId')::uuid));
  if m->>'status'<>'CONFIRMED' or m->>'id'<>cur#>>'{record,id}' or (m->>'revision')::integer<>(p_value->>'manifestRevision')::integer then raise exception 'STALE_MANIFEST' using errcode='PT409';end if;
  if m#>>'{declaration,source,organizationId}'<>p_organization_id::text or m#>>'{declaration,source,requestId}'<>v_request_id::text then raise exception 'MANIFEST_SCOPE_MISMATCH' using errcode='PT409';end if;
  -- A workflow state may advance draft_version without changing the reviewed declaration.
  if (q.v2_snapshot->'cargoSpecification'||jsonb_build_object('availableDocuments',coalesce(q.v2_snapshot#>'{cargoSpecification,availableDocuments}','[]'))) is distinct from m#>'{declaration,cargoSpecification}' or
   q.v2_snapshot->'origin' is distinct from m#>'{declaration,route,origin}' or q.v2_snapshot->'destination' is distinct from m#>'{declaration,route,destination}' or
   q.v2_snapshot->'pickupWindow' is distinct from m#>'{declaration,route,pickupWindow}' or q.v2_snapshot->'deliveryWindow' is distinct from m#>'{declaration,route,deliveryWindow}' or
   coalesce(q.v2_snapshot->'planningPreferences','null') is distinct from coalesce(m#>'{declaration,route,planningPreferences}','null')
    then raise exception 'STALE_MANIFEST' using errcode='PT409';end if;
  mappings:=p_value->'groups';
  if jsonb_array_length(mappings)<>jsonb_array_length(m#>'{declaration,groupBindings}') or
    (select count(distinct x->>'groupId') from jsonb_array_elements(mappings)x)<>jsonb_array_length(mappings) then raise exception 'INVALID_GROUP_MAPPING' using errcode='PT400';end if;
  for binding in select * from jsonb_array_elements(m#>'{declaration,groupBindings}') loop
   group_id:=(binding->>'groupId')::uuid;
   select x into g from jsonb_array_elements(mappings)x where (x->>'groupId')::uuid=group_id;
   if g is null then raise exception 'INVALID_GROUP_MAPPING' using errcode='PT400';end if;
   groups:=groups||jsonb_build_array(jsonb_build_object('id',group_id,'comparisonId',gen_random_uuid(),'unit',g->>'unit',
    'label',m#>>array['declaration','cargoSpecification','units',binding->>'sourceUnitIndex','packageType'],
    'count',m#>array['declaration','cargoSpecification','units',binding->>'sourceUnitIndex','quantity']));
  end loop;
  if exists(select 1 from jsonb_array_elements(groups)x where jsonb_typeof(x->'count')<>'number' or (x->>'count')::numeric<0 or (x->>'count')::numeric>9007199254740991) then raise exception 'INVALID_DECLARED_QUANTITY' using errcode='PT422';end if;
  if exists(select 1 from private.meta_loading_sessions t where t.organization_id=p_organization_id and t.request_id=v_request_id and t.facility_id=v_facility_id and t.manifest_id=(m->>'id')::uuid and t.state='OPEN') then raise exception 'ACTIVE_SESSION_EXISTS' using errcode='PT409';end if;
  insert into private.meta_loading_sessions(organization_id,request_id,facility_id,facility_name,mode,manifest_id,manifest_revision,manifest,groups,opened_by)
   values(p_organization_id,v_request_id,v_facility_id,v_facility_name,p_value->>'mode',(m->>'id')::uuid,(m->>'revision')::integer,m,groups,p_member_id) returning * into s;
  result:=private.meta_loading_bundle(s,p_member_id);
 else
  select * into s from private.meta_loading_sessions where id=p_session_id and organization_id=p_organization_id for update;
  if s.id is null then raise exception 'LOADING_SESSION_NOT_FOUND' using errcode='PT404';end if;
  if p_action='read' then
   if p_value<>'{}'::jsonb then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
   return private.meta_loading_bundle(s,p_member_id);
  elsif p_action='list_passports' then
   if p_value<>'{}'::jsonb then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
   return (select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'sessionVersion',t.session_version,'createdAt',t.created_at) order by t.created_at desc,t.id),'[]') from
    (select * from private.meta_loading_passports where session_id=s.id and organization_id=p_organization_id order by created_at desc,id limit 100)t);
  elsif p_action='read_passport' then
   if not coalesce(extensions.jsonb_matches_schema('{"type":"object","required":["passportId"],"additionalProperties":false,"properties":{"passportId":{"type":"string"}}}'::json,p_value),false) then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
   select * into passport from private.meta_loading_passports where id=(p_value->>'passportId')::uuid and session_id=s.id and organization_id=p_organization_id;
   if passport.id is null then raise exception 'PASSPORT_NOT_FOUND' using errcode='PT404';end if;
   cur:=private.meta_loading_bundle(s,p_member_id)->'currentManifest';
   return jsonb_build_object('record',private.meta_loading_passport_record(passport),'currentVersion',s.version,
    'manifestCurrent',coalesce(cur->>'id'=s.manifest_id::text and (cur->>'revision')::integer=s.manifest_revision and (cur->>'contentCurrent')::boolean,false),
    'explanations',(select coalesce(jsonb_agg(jsonb_build_object('groupId',e.group_id,'value',e.value) order by e.group_id),'[]') from private.meta_loading_explanations e where e.passport_id=passport.id and e.organization_id=p_organization_id));
  end if;
  if p_action='select' then
   if not coalesce(extensions.jsonb_matches_schema('{"type":"object","required":["expectedVersion","groupId","observationId","coverage","reason"],"additionalProperties":false,
    "properties":{"expectedVersion":{"type":"integer","minimum":1,"maximum":2147483647},"groupId":{"type":"string"},"observationId":{"type":"string"},"coverage":{"enum":["PARTIAL","COMPLETE"]},"reason":{"type":"string","minLength":3,"maxLength":600}}}'::json,p_value),false) then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
  elsif not coalesce(extensions.jsonb_matches_schema('{"type":"object","required":["expectedVersion"],"additionalProperties":false,"properties":{"expectedVersion":{"type":"integer","minimum":1,"maximum":2147483647}}}'::json,p_value),false) then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
  expected:=(p_value->>'expectedVersion')::integer;
  if s.version<>expected then raise exception 'STALE_LOADING_SESSION' using errcode='PT409';end if;
  if p_action='select' then
   if length(btrim(p_value->>'reason'))<3 then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
   group_id:=(p_value->>'groupId')::uuid;observation_id:=(p_value->>'observationId')::uuid;
   select x into g from jsonb_array_elements(s.groups)x where x->>'id'=group_id::text;
   if g is null then raise exception 'GROUP_NOT_FOUND' using errcode='PT404';end if;
   select * into observation from private.meta_loading_observations where id=observation_id and session_id=s.id and organization_id=p_organization_id;
   if observation.id is null then raise exception 'OBSERVATION_NOT_FOUND' using errcode='PT404';end if;
   if observation.value->>'groupId' is not null and observation.value->>'groupId'<>group_id::text then raise exception 'OBSERVATION_GROUP_MISMATCH' using errcode='PT409';end if;
   if observation.value->>'unit'<>g->>'unit' then raise exception 'INCOMPATIBLE_UNIT' using errcode='PT409';end if;
   if exists(select 1 from private.meta_loading_observations o where o.organization_id=p_organization_id and o.job_id=observation.job_id and o.attempt>observation.attempt) then raise exception 'STALE_OBSERVATION' using errcode='PT409';end if;
   if exists(select 1 from jsonb_array_elements(s.selections)x where x->>'observationId'=observation_id::text and x->>'groupId'<>group_id::text) then raise exception 'OBSERVATION_ALREADY_ASSIGNED' using errcode='PT409';end if;
   select coalesce(jsonb_agg(x),'[]') into mappings from jsonb_array_elements(s.selections)x where x->>'groupId'<>group_id::text;
   mappings:=mappings||jsonb_build_array(jsonb_build_object('groupId',group_id,'observationId',observation_id,'coverage',p_value->>'coverage','reason',btrim(p_value->>'reason'),'memberId',p_member_id,'selectedAt',now()));
   update private.meta_loading_sessions set selections=mappings,version=version+1,updated_at=now() where id=s.id returning * into s;
   result:=private.meta_loading_bundle(s,p_member_id);
  elsif p_action='close' then
   if s.state<>'OPEN' then raise exception 'INVALID_LOADING_TRANSITION' using errcode='PT409';end if;
   update private.meta_loading_sessions set state='CLOSED',closed_at=now(),closed_by=p_member_id,version=version+1,updated_at=now() where id=s.id returning * into s;
   result:=private.meta_loading_bundle(s,p_member_id);
  elsif p_action='passport' then
   if s.state<>'CLOSED' then raise exception 'SESSION_SCOPE_OPEN' using errcode='PT409';end if;
   select * into passport from private.meta_loading_passports where session_id=s.id and session_version=s.version;
   if passport.id is null then
    insert into private.meta_loading_passports(organization_id,session_id,session_version,rule_version,source,created_by)
     values(p_organization_id,s.id,s.version,'loading.compare.v1',private.meta_loading_bundle(s,p_member_id),p_member_id) returning * into passport;
   end if;
   result:=private.meta_loading_passport_record(passport);
  end if;
 end if;
 insert into private.meta_loading_receipts(organization_id,member_id,idempotency_key,payload_hash,result) values(p_organization_id,p_member_id,p_key,command_hash,result);
 return jsonb_build_object('record',result,'replay',false);
exception
 when unique_violation then raise exception 'ACTIVE_SESSION_EXISTS' using errcode='PT409';
 when invalid_text_representation or numeric_value_out_of_range then raise exception 'VALIDATION_ERROR' using errcode='PT400';
end;$$;
revoke all on function private.meta_loading_sessions_v1(uuid,uuid,text,uuid,jsonb,uuid,integer,integer) from public,anon,authenticated,service_role;
grant execute on function private.meta_loading_sessions_v1(uuid,uuid,text,uuid,jsonb,uuid,integer,integer) to authenticated;
create function public.meta_loading_sessions_v1(p_organization_id uuid,p_member_id uuid,p_action text,p_session_id uuid default null,p_value jsonb default '{}',p_key uuid default null,p_limit integer default 20,p_offset integer default 0)
returns jsonb language sql security invoker set search_path='' as $$select private.meta_loading_sessions_v1(p_organization_id,p_member_id,p_action,p_session_id,p_value,p_key,p_limit,p_offset);$$;
revoke all on function public.meta_loading_sessions_v1(uuid,uuid,text,uuid,jsonb,uuid,integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.meta_loading_sessions_v1(uuid,uuid,text,uuid,jsonb,uuid,integer,integer) to authenticated;

-- These two ingresses are server capabilities, never browser commands.
create function public.meta_record_loading_observation_v1(p_organization_id uuid,p_session_id uuid,p_job_id text,p_attempt integer,p_manifest_revision integer,p_evidence_id text,p_value jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s private.meta_loading_sessions%rowtype; o private.meta_loading_observations%rowtype; h text; aliases jsonb; evidence_alias uuid:=gen_random_uuid();
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN' using errcode='PT403';end if;
 if p_organization_id is null or p_session_id is null or p_job_id is null or length(btrim(p_job_id)) not between 1 and 200 or p_evidence_id is null or length(btrim(p_evidence_id)) not between 1 and 200 or p_attempt is null or p_attempt<1 or p_manifest_revision is null or p_manifest_revision<1 or
 not coalesce(extensions.jsonb_matches_schema('{
  "type":"object","additionalProperties":false,"required":["groupId","reportedCoverage","unit","status","entries","exits","net","source","realInference","overlayUploaded","clipSha256","analysisVersion","timeMapping","flags","events"],
  "properties":{"groupId":{"type":"string","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"},"reportedCoverage":{"enum":["PARTIAL","COMPLETE"]},"unit":{"enum":["PALLET","BOX"]},"status":{"enum":["OK","REQUIRES_REVIEW","INSUFFICIENT_EVIDENCE"]},
  "entries":{"type":"integer","minimum":0,"maximum":9007199254740991},"exits":{"type":"integer","minimum":0,"maximum":9007199254740991},"net":{"type":"integer","minimum":-9007199254740991,"maximum":9007199254740991},
  "source":{"enum":["OWN_CAPTURE","SYNTHETIC_RENDER"]},"realInference":{"type":"boolean"},"overlayUploaded":{"type":"boolean"},"clipSha256":{"type":"string","pattern":"^[0-9a-f]{64}$"},"analysisVersion":{"type":"string","minLength":1,"maxLength":200},"timeMapping":{"type":"string","minLength":1,"maxLength":1000},
  "flags":{"type":"array","maxItems":5000,"items":{"type":"object","additionalProperties":false,"required":["kind","seconds","detail"],"properties":{"kind":{"type":"string","minLength":1,"maxLength":100},"seconds":{"type":"number","minimum":0,"maximum":86400},"detail":{"type":"string","maxLength":600}}}},
  "events":{"type":"array","maxItems":5000,"items":{"type":"object","additionalProperties":false,"required":["seconds","direction","objectId"],"properties":{"seconds":{"type":"number","minimum":0,"maximum":86400},"direction":{"enum":["IN","OUT"]},"objectId":{"type":"integer","minimum":-9007199254740991,"maximum":9007199254740991}}}}}}
 '::json,p_value),false) then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
 if (p_value->>'net')::numeric<>(p_value->>'entries')::numeric-(p_value->>'exits')::numeric or
  (select count(*) from jsonb_array_elements(p_value->'events')e where e->>'direction'='IN')<>(p_value->>'entries')::numeric or
  (select count(*) from jsonb_array_elements(p_value->'events')e where e->>'direction'='OUT')<>(p_value->>'exits')::numeric or
  (p_value->>'status'='OK' and jsonb_array_length(p_value->'flags')>0) then raise exception 'INCONSISTENT_OBSERVATION' using errcode='PT422';end if;
 select * into s from private.meta_loading_sessions where id=p_session_id and organization_id=p_organization_id for update;
 if s.id is null then raise exception 'LOADING_SESSION_NOT_FOUND' using errcode='PT404';end if;
 if s.manifest_revision<>p_manifest_revision then raise exception 'STALE_MANIFEST' using errcode='PT409';end if;
 if s.mode='VERIFICATION' and (p_value->>'source'<>'OWN_CAPTURE' or not (p_value->>'realInference')::boolean) then raise exception 'REAL_EVIDENCE_REQUIRED' using errcode='PT422';end if;
 if not exists(select 1 from jsonb_array_elements(s.groups)g where g->>'id'=p_value->>'groupId' and g->>'unit'=p_value->>'unit') then raise exception 'INCOMPATIBLE_GROUP' using errcode='PT409';end if;
 -- Lock the producer identity across sessions before checking its immutable receipt.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('loading-job:'||p_organization_id::text||':'||p_job_id,0));
 h:=private.hash_v2_freight_payload(jsonb_build_object('sessionId',p_session_id,'manifestRevision',p_manifest_revision,'evidenceId',p_evidence_id,'value',p_value));
 select * into o from private.meta_loading_observations where organization_id=p_organization_id and job_id=p_job_id and attempt=p_attempt;
 if found then
  if o.payload_hash<>h then raise exception 'OBSERVATION_CONFLICT' using errcode='PT409';end if;
  return jsonb_build_object('id',o.id,'recorded',false,'reason','ALREADY_RECORDED');
 end if;
 if exists(select 1 from private.meta_loading_observations where organization_id=p_organization_id and job_id=p_job_id and attempt>p_attempt) then return jsonb_build_object('id',null,'recorded',false,'reason','STALE_ATTEMPT');end if;
 if (select count(*) from private.meta_loading_observations where session_id=s.id)>=1000 then raise exception 'SESSION_OBSERVATION_LIMIT' using errcode='PT422';end if;
 select coalesce(jsonb_agg(jsonb_build_object('eventId',gen_random_uuid(),'evidenceId',evidence_alias,'seconds',(e->>'seconds')::numeric,'timecodeMs',round((e->>'seconds')::numeric*1000),'direction',e->>'direction','objectId',(e->>'objectId')::numeric) order by n),'[]') into aliases from jsonb_array_elements(p_value->'events') with ordinality t(e,n);
 insert into private.meta_loading_observations(organization_id,session_id,job_id,attempt,manifest_revision,evidence_id,evidence_ref_id,value,events,payload_hash)
 values(p_organization_id,s.id,p_job_id,p_attempt,p_manifest_revision,p_evidence_id,evidence_alias,p_value-'events',aliases,h) returning * into o;
 update private.meta_loading_sessions set version=version+1,updated_at=now() where id=s.id;
 return jsonb_build_object('id',o.id,'recorded',true,'reason','RECORDED');
end;$$;
revoke all on function public.meta_record_loading_observation_v1(uuid,uuid,text,integer,integer,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.meta_record_loading_observation_v1(uuid,uuid,text,integer,integer,text,jsonb) to service_role;

create function public.meta_record_loading_explanation_v1(p_organization_id uuid,p_passport_id uuid,p_group_id uuid,p_value jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p private.meta_loading_passports%rowtype; s private.meta_loading_sessions%rowtype; g jsonb; selected jsonb; events jsonb; existing jsonb;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN' using errcode='PT403';end if;
 if not coalesce(extensions.jsonb_matches_schema('{
  "type":"object","additionalProperties":false,"required":["schemaVersion","reconciliationId","reconciliationVersion","comparisonStatus","summary","reasons","limitations","suggestedActions","evidenceRefs","requiresHumanReview"],
  "properties":{"schemaVersion":{"const":"1.0"},"reconciliationId":{"type":"string"},"reconciliationVersion":{"type":"integer","minimum":1},"comparisonStatus":{"enum":["NOT_READY","MATCH","DIFFERENCE_PROPOSED","INSUFFICIENT_EVIDENCE","INCOMPATIBLE_SCOPE","OUTDATED"]},
  "summary":{"type":"string","minLength":1,"maxLength":600},"reasons":{"type":"array","maxItems":4,"items":{"type":"string","minLength":1,"maxLength":240}},"limitations":{"type":"array","maxItems":5,"items":{"type":"string","minLength":1,"maxLength":240}},
  "suggestedActions":{"type":"array","maxItems":3,"uniqueItems":true,"items":{"enum":["REVIEW_EVIDENCE","RECORD_MORE_EVIDENCE","CHECK_MANIFEST","WAIT_FOR_SESSION_CLOSE","REQUEST_HUMAN_REVIEW"]}},
  "evidenceRefs":{"type":"array","maxItems":20,"items":{"type":"object","additionalProperties":false,"required":["eventId","evidenceId","timecodeMs"],"properties":{"eventId":{"type":"string"},"evidenceId":{"type":"string"},"timecodeMs":{"type":"integer","minimum":0,"maximum":86400000}}}},"requiresHumanReview":{"const":true}}}
 '::json,p_value),false) then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
 select * into p from private.meta_loading_passports where id=p_passport_id and organization_id=p_organization_id;
 if p.id is null then raise exception 'PASSPORT_NOT_FOUND' using errcode='PT404';end if;
 select * into s from private.meta_loading_sessions where id=p.session_id for update;
 if s.version<>p.session_version then raise exception 'STALE_PASSPORT' using errcode='PT409';end if;
 select x into g from jsonb_array_elements(p.source#>'{session,groups}')x where x->>'id'=p_group_id::text;
 if g is null then raise exception 'PASSPORT_GROUP_NOT_FOUND' using errcode='PT404';end if;
 if p_value->>'reconciliationId'<>g->>'comparisonId' or (p_value->>'reconciliationVersion')::integer<>p.session_version then raise exception 'EXPLANATION_SCOPE_MISMATCH' using errcode='PT409';end if;
 select x into selected from jsonb_array_elements(p.source->'selections')x where x->>'groupId'=p_group_id::text;
 select x->'events' into events from jsonb_array_elements(p.source->'observations')x where x->>'id'=selected->>'observationId';
 if (select count(distinct x->>'eventId') from jsonb_array_elements(p_value->'evidenceRefs')x)<>jsonb_array_length(p_value->'evidenceRefs') or exists(
  select 1 from jsonb_array_elements(p_value->'evidenceRefs')r where not exists(select 1 from jsonb_array_elements(coalesce(events,'[]'))e where e->>'eventId'=r->>'eventId' and e->>'evidenceId'=r->>'evidenceId' and e->'timecodeMs'=r->'timecodeMs')
 ) then raise exception 'EXPLANATION_EVIDENCE_MISMATCH' using errcode='PT409';end if;
 select value into existing from private.meta_loading_explanations where passport_id=p.id and group_id=p_group_id;
 if found then
  if existing<>p_value then raise exception 'EXPLANATION_CONFLICT' using errcode='PT409';end if;
  return jsonb_build_object('recorded',false);
 end if;
 insert into private.meta_loading_explanations(organization_id,passport_id,group_id,value) values(p_organization_id,p.id,p_group_id,p_value);
 return jsonb_build_object('recorded',true);
end;$$;
revoke all on function public.meta_record_loading_explanation_v1(uuid,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.meta_record_loading_explanation_v1(uuid,uuid,uuid,jsonb) to service_role;

commit;
