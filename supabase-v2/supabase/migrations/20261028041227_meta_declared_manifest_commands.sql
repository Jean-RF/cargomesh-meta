-- Meta CR-01 foundation. Structural only; no demo rows or remote activation.
begin;

create table private.meta_manifest_groups (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 request_id uuid not null references public.freight_requests(id),
 created_at timestamptz not null default now()
);
create index meta_manifest_groups_request_idx on private.meta_manifest_groups(organization_id,request_id);

create table private.meta_manifest_preparations (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 request_id uuid not null references public.freight_requests(id),
 member_id uuid not null references public.organization_members(id),
 request_draft_version integer not null check(request_draft_version>0),
 expected_manifest_revision integer not null check(expected_manifest_revision>=0),
 candidate jsonb not null check(jsonb_typeof(candidate)='object'),
 content_hash text not null check(content_hash ~ '^[0-9a-f]{64}$'),
 prepared_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '30 minutes'),
 check(expires_at>prepared_at),
 unique(id,organization_id,request_id)
);
create index meta_manifest_preparations_request_idx on private.meta_manifest_preparations(organization_id,request_id);
create index meta_manifest_preparations_member_idx on private.meta_manifest_preparations(member_id);

create table private.meta_declared_manifests (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 request_id uuid not null references public.freight_requests(id),
 request_draft_version integer not null check(request_draft_version>0),
 revision integer not null check(revision>0),
 preparation_id uuid not null unique,
 confirmed_by_member_id uuid not null references public.organization_members(id),
 confirmed_at timestamptz not null default now(),
 declaration jsonb not null check(jsonb_typeof(declaration)='object'),
 content_hash text not null check(content_hash ~ '^[0-9a-f]{64}$'),
 foreign key(preparation_id,organization_id,request_id)
   references private.meta_manifest_preparations(id,organization_id,request_id),
 unique(organization_id,request_id,revision),
 unique(organization_id,request_id,request_draft_version)
);
create index meta_declared_manifests_member_idx on private.meta_declared_manifests(confirmed_by_member_id);

create table private.meta_manifest_receipts (
 organization_id uuid not null references public.organizations(id),
 member_id uuid not null references public.organization_members(id),
 idempotency_key uuid not null,
 payload_hash text not null check(payload_hash ~ '^[0-9a-f]{64}$'),
 result jsonb not null check(jsonb_typeof(result)='object'),
 created_at timestamptz not null default now(),
 primary key(organization_id,member_id,idempotency_key)
);
create index meta_manifest_receipts_member_idx on private.meta_manifest_receipts(member_id);

-- Private data is exposed ONLY through scoped commands. No direct client DML.
alter table private.meta_manifest_groups enable row level security;
alter table private.meta_manifest_preparations enable row level security;
alter table private.meta_declared_manifests enable row level security;
alter table private.meta_manifest_receipts enable row level security;
revoke all on private.meta_manifest_groups,private.meta_manifest_preparations,
 private.meta_declared_manifests,private.meta_manifest_receipts from public,anon,authenticated,service_role;

create function private.meta_manifest_immutable() returns trigger
language plpgsql set search_path='' as $$begin
 raise exception 'IMMUTABLE_MANIFEST_RECORD' using errcode='PT409';
end;$$;
create trigger meta_manifest_no_rewrite before update or delete on private.meta_declared_manifests
 for each row execute function private.meta_manifest_immutable();
create trigger meta_preparation_no_rewrite before update or delete on private.meta_manifest_preparations
 for each row execute function private.meta_manifest_immutable();
revoke all on function private.meta_manifest_immutable() from public,anon,authenticated,service_role;

create function private.meta_manifest_record(r private.meta_declared_manifests)
returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('id',r.id,'revision',r.revision,'status','CONFIRMED',
 'preparationId',r.preparation_id,'confirmedByMemberId',r.confirmed_by_member_id,
 'confirmedAt',r.confirmed_at,'contentHash',r.content_hash,'declaration',r.declaration);
$$;
revoke all on function private.meta_manifest_record(private.meta_declared_manifests)
 from public,anon,authenticated,service_role;

create function private.meta_declared_manifests_v1(
 p_organization_id uuid,p_member_id uuid,p_request_id uuid,p_action text,
 p_value jsonb,p_key uuid,p_limit integer,p_offset integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 q public.freight_requests%rowtype;
 prep private.meta_manifest_preparations%rowtype;
 latest private.meta_declared_manifests%rowtype;
 saved private.meta_declared_manifests%rowtype;
 receipt private.meta_manifest_receipts%rowtype;
 command_hash text; candidate jsonb; result jsonb; groups jsonb; bindings jsonb:='[]'::jsonb;
 item jsonb; group_id uuid; unit_index integer; units_count integer;
 expected_draft integer; expected_manifest integer; latest_revision integer;
begin
 -- Mandatory database identity guard even when invoked directly via PostgREST.
 perform private.workflow_member(p_organization_id,p_member_id,p_action='confirm');
 if p_action is null or p_action not in ('prepare','confirm','current','list','read')
   or p_request_id is null then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
 if p_action in ('prepare','confirm') then
  if p_key is null or p_value is null then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
  command_hash:=private.hash_v2_freight_payload(jsonb_build_object(
    'action',p_action,'requestId',p_request_id,'value',p_value));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'meta-manifest:'||p_organization_id::text||':'||p_member_id::text||':'||p_key::text,0));
  select * into receipt from private.meta_manifest_receipts
    where organization_id=p_organization_id and member_id=p_member_id and idempotency_key=p_key;
  if found then
   if receipt.payload_hash<>command_hash then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='PT409';end if;
   return jsonb_build_object('record',receipt.result,'replay',true);
  end if;
  -- Same row lock used by native request commands: confirmation cannot race a revision.
  select * into q from public.freight_requests
   where id=p_request_id and organization_id=p_organization_id and v2_contract_version='2.0' for update;
 else
  select * into q from public.freight_requests
   where id=p_request_id and organization_id=p_organization_id and v2_contract_version='2.0' for share;
 end if;
 if q.id is null then raise exception 'REQUEST_NOT_FOUND' using errcode='PT404';end if;
 select * into latest from private.meta_declared_manifests
  where organization_id=p_organization_id and request_id=q.id order by revision desc limit 1;
 latest_revision:=coalesce(latest.revision,0);

 if p_action='current' then
  return jsonb_build_object('record',case when latest.id is null then null else private.meta_manifest_record(latest) end,
    'currentRequestDraftVersion',q.draft_version);
 elsif p_action='list' then
  if p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset not between 0 and 1000000
   then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
  return (select coalesce(jsonb_agg(private.meta_manifest_record(m) order by m.revision desc),'[]'::jsonb)
   from private.meta_declared_manifests m where m.id in
    (select id from private.meta_declared_manifests where organization_id=p_organization_id and request_id=q.id
     order by revision desc limit p_limit offset p_offset));
 elsif p_action='read' then
  if not coalesce(extensions.jsonb_matches_schema('{"type":"object","required":["manifestId"],"additionalProperties":false,
    "properties":{"manifestId":{"type":"string","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"}}}'::json,p_value),false)
   then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
  select * into saved from private.meta_declared_manifests where id=(p_value->>'manifestId')::uuid
   and organization_id=p_organization_id and request_id=q.id;
  if saved.id is null then raise exception 'MANIFEST_NOT_FOUND' using errcode='PT404';end if;
  return private.meta_manifest_record(saved);
 end if;

 if p_action='prepare' then
  if not coalesce(extensions.jsonb_matches_schema('{
   "type":"object","required":["expectedDraftVersion","expectedManifestRevision"],"additionalProperties":false,
   "properties":{"expectedDraftVersion":{"type":"integer","minimum":1,"maximum":2147483647},
    "expectedManifestRevision":{"type":"integer","minimum":0,"maximum":2147483646},
    "groups":{"type":"array","minItems":1,"maxItems":100,"items":{"type":"object","required":["sourceUnitIndex","groupId"],
     "additionalProperties":false,"properties":{"sourceUnitIndex":{"type":"integer","minimum":0,"maximum":2147483647},
      "groupId":{"type":["string","null"],"pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"}}}}}}
    '::json,p_value),false) then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
 else
  if not coalesce(extensions.jsonb_matches_schema('{
   "type":"object","required":["preparationId","expectedDraftVersion","expectedManifestRevision","contentHash","confirmed"],"additionalProperties":false,
   "properties":{"preparationId":{"type":"string","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"},
    "expectedDraftVersion":{"type":"integer","minimum":1,"maximum":2147483647},
    "expectedManifestRevision":{"type":"integer","minimum":0,"maximum":2147483646},
    "contentHash":{"type":"string","pattern":"^[0-9a-f]{64}$"},"confirmed":{"const":true}}}
    '::json,p_value),false) then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
 end if;
 expected_draft:=(p_value->>'expectedDraftVersion')::integer;
 expected_manifest:=(p_value->>'expectedManifestRevision')::integer;
 if q.draft_version<>expected_draft then raise exception 'STALE_DRAFT' using errcode='PT409';end if;
 if q.status<>'DRAFT' then raise exception 'INVALID_TRANSITION' using errcode='PT409';end if;
 if latest_revision<>expected_manifest then raise exception 'STALE_MANIFEST' using errcode='PT409';end if;
 if latest.request_draft_version=q.draft_version then raise exception 'DECLARATION_ALREADY_CONFIRMED' using errcode='PT409';end if;

 if p_action='prepare' then
  units_count:=jsonb_array_length(q.v2_snapshot#>'{cargoSpecification,units}');
  if units_count is null or units_count not between 1 and 100 then raise exception 'MANIFEST_GROUP_LIMIT' using errcode='PT400';end if;
  groups:=p_value->'groups';
  if groups is null then
   if latest.id is not null then raise exception 'GROUP_MAPPING_REQUIRED' using errcode='PT400';end if;
   select jsonb_agg(jsonb_build_object('sourceUnitIndex',i,'groupId',null) order by i) into groups
    from generate_series(0,units_count-1) i;
  end if;
  if jsonb_array_length(groups)<>units_count or
   (select count(distinct (g->>'sourceUnitIndex')::integer) from jsonb_array_elements(groups) g)<>units_count or
   exists(select 1 from jsonb_array_elements(groups) g where (g->>'sourceUnitIndex')::integer>=units_count) or
   (select count(distinct (g->>'groupId')::uuid) from jsonb_array_elements(groups) g where g->>'groupId' is not null)<>
   (select count(*) from jsonb_array_elements(groups) g where g->>'groupId' is not null)
   then raise exception 'INVALID_GROUP_MAPPING' using errcode='PT400';end if;
  for item in select value from jsonb_array_elements(groups) order by (value->>'sourceUnitIndex')::integer loop
   unit_index:=(item->>'sourceUnitIndex')::integer;
   group_id:=(item->>'groupId')::uuid;
   if group_id is null then
    insert into private.meta_manifest_groups(organization_id,request_id) values(p_organization_id,q.id) returning id into group_id;
   elsif latest.id is null or not exists(select 1 from jsonb_array_elements(latest.declaration->'groupBindings') b
    where (b->>'groupId')::uuid=group_id) then raise exception 'UNKNOWN_MANIFEST_GROUP' using errcode='PT400';end if;
   bindings:=bindings||jsonb_build_array(jsonb_build_object('groupId',group_id,'sourceUnitIndex',unit_index));
  end loop;
  -- Source is persisted request data, never caller/model-supplied cargo or organization.
  candidate:=jsonb_build_object('schemaVersion','0.1','kind','DECLARATION_CANDIDATE',
   'source',jsonb_build_object('requestId',q.id,'organizationId',q.organization_id,'requestDraftVersion',q.draft_version),
   'route',jsonb_build_object('origin',q.v2_snapshot->'origin','destination',q.v2_snapshot->'destination',
    'pickupWindow',q.v2_snapshot->'pickupWindow','deliveryWindow',q.v2_snapshot->'deliveryWindow') ||
    case when jsonb_typeof(q.v2_snapshot->'planningPreferences')='object'
     then jsonb_build_object('planningPreferences',q.v2_snapshot->'planningPreferences') else '{}'::jsonb end,
   'cargoSpecification',(q.v2_snapshot->'cargoSpecification')||jsonb_build_object('availableDocuments',
    coalesce(q.v2_snapshot#>'{cargoSpecification,availableDocuments}','[]'::jsonb)),
   'groupBindings',bindings);
  insert into private.meta_manifest_preparations(organization_id,request_id,member_id,request_draft_version,
    expected_manifest_revision,candidate,content_hash)
   values(p_organization_id,q.id,p_member_id,q.draft_version,expected_manifest,candidate,
    private.hash_v2_freight_payload(candidate)) returning * into prep;
  result:=jsonb_build_object('id',prep.id,'preparedByMemberId',prep.member_id,
   'expectedManifestRevision',prep.expected_manifest_revision,'preparedAt',prep.prepared_at,
   'expiresAt',prep.expires_at,'contentHash',prep.content_hash,'candidate',prep.candidate);
 else
  select * into prep from private.meta_manifest_preparations
   where id=(p_value->>'preparationId')::uuid and request_id=q.id and organization_id=p_organization_id
    and member_id=p_member_id;
  if prep.id is null then raise exception 'PREPARATION_NOT_FOUND' using errcode='PT404';end if;
  if prep.expires_at<=now() then raise exception 'PREPARATION_EXPIRED' using errcode='PT409';end if;
  if prep.request_draft_version<>q.draft_version or prep.expected_manifest_revision<>expected_manifest
   then raise exception 'STALE_PREPARATION' using errcode='PT409';end if;
  if prep.content_hash<>p_value->>'contentHash' then raise exception 'REVIEW_CONTENT_MISMATCH' using errcode='PT409';end if;
  insert into private.meta_declared_manifests(organization_id,request_id,request_draft_version,revision,
   preparation_id,confirmed_by_member_id,declaration,content_hash)
   values(p_organization_id,q.id,q.draft_version,latest_revision+1,prep.id,p_member_id,prep.candidate,prep.content_hash)
   returning * into saved;
  result:=private.meta_manifest_record(saved);
 end if;
 insert into private.meta_manifest_receipts(organization_id,member_id,idempotency_key,payload_hash,result)
  values(p_organization_id,p_member_id,p_key,command_hash,result);
 return jsonb_build_object('record',result,'replay',false);
end;$$;
revoke all on function private.meta_declared_manifests_v1(uuid,uuid,uuid,text,jsonb,uuid,integer,integer)
 from public,anon,authenticated,service_role;
grant execute on function private.meta_declared_manifests_v1(uuid,uuid,uuid,text,jsonb,uuid,integer,integer) to authenticated;

-- Invoker wrapper, matching the existing native command pattern. No service key.
create function public.meta_declared_manifests_v1(
 p_organization_id uuid,p_member_id uuid,p_request_id uuid,p_action text,
 p_value jsonb,p_key uuid,p_limit integer,p_offset integer)
returns jsonb language sql security invoker set search_path='' as $$
 select private.meta_declared_manifests_v1(p_organization_id,p_member_id,p_request_id,p_action,p_value,p_key,p_limit,p_offset);
$$;
revoke all on function public.meta_declared_manifests_v1(uuid,uuid,uuid,text,jsonb,uuid,integer,integer)
 from public,anon,authenticated,service_role;
grant execute on function public.meta_declared_manifests_v1(uuid,uuid,uuid,text,jsonb,uuid,integer,integer) to authenticated;
commit;
