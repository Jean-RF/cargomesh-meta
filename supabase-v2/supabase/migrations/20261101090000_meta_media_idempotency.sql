-- Additive transition: legacy evidence remains readable; new reservations are atomic.
begin;
alter table public.meta_declaration_media
  add column idempotency_key uuid,
  add column init_payload_hash text check(init_payload_hash ~ '^[0-9a-f]{64}$'),
  add column expected_sha256 text check(expected_sha256 ~ '^[0-9a-f]{64}$'),
  add constraint meta_media_init_receipt_complete check(
    (idempotency_key is null and init_payload_hash is null and expected_sha256 is null)
    or (idempotency_key is not null and init_payload_hash is not null and expected_sha256 is not null));
create unique index meta_media_initialization_key
  on public.meta_declaration_media(organization_id,member_id,idempotency_key)
  where idempotency_key is not null;

create function private.lock_meta_media_actor(o uuid,m uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.organization_members a join public.organizations b on b.id=a.organization_id
    where a.id=m and a.organization_id=o and a.auth_user_id=auth.uid()
      and a.status='ACTIVE' and a.role in ('OWNER','SUPERVISOR','REQUESTER') and b.status='ACTIVE'
  ) then raise exception 'FORBIDDEN_TENANT' using errcode='PT403'; end if;
  -- One lock per actor, shared by initialize and bind, including aliases after native save.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('meta-media:'||o::text||':'||m::text,0));
end $$;
create function private.check_meta_media_request(o uuid,r uuid,v integer)
returns void language plpgsql security definer set search_path='' as $$
declare f public.freight_requests%rowtype;
begin
  if r is null then
    if v is not null then raise exception 'VALIDATION_ERROR' using errcode='PT400'; end if;
    return;
  end if;
  select * into f from public.freight_requests where id=r and organization_id=o for share;
  if not found then raise exception 'FORBIDDEN_TENANT' using errcode='PT403'; end if;
  if f.status<>'DRAFT' or v is null or f.draft_version<>v then
    raise exception 'INPUT_REVISION_MISMATCH' using errcode='PT409';
  end if;
end $$;

create function public.initialize_meta_declaration_media(
  p_organization_id uuid,p_member_id uuid,p_idempotency_key uuid,p_value jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  o uuid:=p_organization_id; m uuid:=p_member_id; d uuid; r uuid; v integer;
  h text; canonical jsonb; media public.meta_declaration_media%rowtype;
  n integer; audios integer; image_bytes bigint;
begin
  perform private.lock_meta_media_actor(o,m);
  if p_idempotency_key is null or not coalesce(extensions.jsonb_matches_schema('{
    "type":"object","additionalProperties":false,
    "required":["draftKey","requestId","requestVersion","kind","mimeType","fileName","byteSize","contentSha256"],
    "properties":{
      "draftKey":{"type":"string","format":"uuid"},"requestId":{"type":["string","null"],"format":"uuid"},
      "requestVersion":{"type":["integer","null"],"minimum":1},
      "kind":{"enum":["photo","label","audio"]},"mimeType":{"enum":["image/png","image/jpeg","audio/wav"]},
      "fileName":{"type":"string","minLength":1,"maxLength":180},
      "byteSize":{"type":"integer","minimum":1,"maximum":30000000},
      "contentSha256":{"type":"string","pattern":"^[0-9a-f]{64}$"}}
    }'::json,p_value),false)
  then raise exception 'VALIDATION_ERROR' using errcode='PT400'; end if;
  d:=(p_value->>'draftKey')::uuid; r:=(p_value->>'requestId')::uuid; v:=(p_value->>'requestVersion')::integer;
  if d is null or length(btrim(p_value->>'fileName'))=0
    or (p_value->>'fileName') ~ '[[:cntrl:]]'
    or ((p_value->>'kind'='audio') <> (p_value->>'mimeType'='audio/wav'))
    or (p_value->>'kind'<>'audio' and (p_value->>'byteSize')::integer>5242880)
  then raise exception 'MEDIA_INVALID' using errcode='PT400'; end if;
  -- jsonb's canonical text ignores object key order. Typed UUIDs and trimmed names
  -- normalize equivalent wire representations. Content hash distinguishes equal-size files.
  canonical:=p_value||jsonb_build_object('draftKey',d,'requestId',r,'requestVersion',v,'fileName',btrim(p_value->>'fileName'));
  h:=private.hash_v2_freight_payload(canonical);
  select * into media from public.meta_declaration_media
    where organization_id=o and member_id=m and idempotency_key=p_idempotency_key;
  if found then
    if media.init_payload_hash<>h then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='PT409'; end if;
    if media.state='REMOVED' then raise exception 'MEDIA_REMOVED' using errcode='PT409'; end if;
    perform private.check_meta_media_request(o,r,v);
    -- A reservation may have been bound since its unsaved initialization. Do not
    -- revive evidence for a request that is no longer editable.
    if r is null and media.request_id is not null and not exists(
      select 1 from public.freight_requests where id=media.request_id and organization_id=o and status='DRAFT'
    ) then raise exception 'INPUT_REVISION_MISMATCH' using errcode='PT409'; end if;
    return jsonb_build_object('row',to_jsonb(media),'replay',true);
  end if;
  perform private.check_meta_media_request(o,r,v);
  if r is null and exists(select 1 from public.meta_declaration_media where organization_id=o and member_id=m
    and draft_key=d and request_id is not null)
  then raise exception 'INPUT_REVISION_MISMATCH' using errcode='PT409'; end if;
  select count(*),count(*) filter(where kind='audio'),coalesce(sum(byte_size) filter(where kind<>'audio'),0)
    into n,audios,image_bytes from public.meta_declaration_media
    where organization_id=o and member_id=m and state<>'REMOVED'
      and ((r is not null and request_id=r) or (r is null and request_id is null and draft_key=d));
  if n>=4 or (p_value->>'kind'='audio' and audios>=1)
    or (p_value->>'kind'<>'audio' and image_bytes+(p_value->>'byteSize')::integer>12582912)
  then raise exception 'MEDIA_LIMIT' using errcode='PT400'; end if;
  media.id:=extensions.gen_random_uuid();
  insert into public.meta_declaration_media(id,organization_id,member_id,draft_key,request_id,kind,object_path,
    mime_type,file_name,byte_size,idempotency_key,init_payload_hash,expected_sha256)
  values(media.id,o,m,d,r,p_value->>'kind',o::text||'/'||m::text||'/'||media.id::text,
    p_value->>'mimeType',btrim(p_value->>'fileName'),(p_value->>'byteSize')::integer,p_idempotency_key,h,p_value->>'contentSha256')
  returning * into media;
  return jsonb_build_object('row',to_jsonb(media),'replay',false);
end $$;

create function public.bind_meta_declaration_media(p_organization_id uuid,p_member_id uuid,
  p_draft_key uuid,p_request_id uuid,p_request_version integer)
returns void language plpgsql security definer set search_path='' as $$
declare n integer; audios integer; image_bytes bigint;
begin
  perform private.lock_meta_media_actor(p_organization_id,p_member_id);
  if p_draft_key is null or p_request_id is null then raise exception 'VALIDATION_ERROR' using errcode='PT400'; end if;
  perform private.check_meta_media_request(p_organization_id,p_request_id,p_request_version);
  if exists(select 1 from public.meta_declaration_media where organization_id=p_organization_id and member_id=p_member_id
    and draft_key=p_draft_key and request_id is not null and request_id<>p_request_id)
  then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='PT409'; end if;
  select count(*),count(*) filter(where kind='audio'),coalesce(sum(byte_size) filter(where kind<>'audio'),0)
    into n,audios,image_bytes from public.meta_declaration_media
    where organization_id=p_organization_id and member_id=p_member_id and state<>'REMOVED'
      and (request_id=p_request_id or (draft_key=p_draft_key and request_id is null));
  if n>4 or audios>1 or image_bytes>12582912 then raise exception 'MEDIA_LIMIT' using errcode='PT400'; end if;
  update public.meta_declaration_media set request_id=p_request_id where organization_id=p_organization_id
    and member_id=p_member_id and draft_key=p_draft_key and request_id is null;
end $$;
revoke all on function private.lock_meta_media_actor(uuid,uuid),private.check_meta_media_request(uuid,uuid,integer) from public,anon,authenticated,service_role;
revoke all on function public.initialize_meta_declaration_media(uuid,uuid,uuid,jsonb),public.bind_meta_declaration_media(uuid,uuid,uuid,uuid,integer) from public,anon,service_role;
grant execute on function public.initialize_meta_declaration_media(uuid,uuid,uuid,jsonb),public.bind_meta_declaration_media(uuid,uuid,uuid,uuid,integer) to authenticated;
notify pgrst,'reload schema';
commit;
