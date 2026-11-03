-- CR-DOC: private revision library and explicitly shared booking dossier.
-- No legal checklist, external certification, booking/capacity side effects or demo data.
begin;
create table private.meta_documents(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),
 request_id uuid references public.freight_requests(id),kind text not null check(kind in('COMPANY_PROFILE','PACKING_LIST','OTHER')),
 title text not null check(length(title) between 1 and 160),version integer not null default 1 check(version>0),
 created_by uuid not null references public.organization_members(id),created_at timestamptz not null default now(),
 check(kind<>'PACKING_LIST' or request_id is not null),check(kind<>'COMPANY_PROFILE' or request_id is null),unique(id,organization_id));
create index meta_documents_org_request_idx on private.meta_documents(organization_id,request_id,created_at desc,id);
create index meta_documents_creator_idx on private.meta_documents(created_by);
create table private.meta_document_revisions(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,document_id uuid not null,
 revision integer not null check(revision>0),filename text not null check(length(filename) between 1 and 200),
 mime text not null check(mime in('application/pdf','image/png','image/jpeg')),bytes integer not null check(bytes between 1 and 4194304),
 sha256 text not null check(sha256~'^[a-f0-9]{64}$'),object_path text not null unique,
 state text not null default 'UPLOADING' check(state in('UPLOADING','READY')),
 issued_on date,expires_on date,created_by uuid not null references public.organization_members(id),created_at timestamptz not null default now(),
 foreign key(document_id,organization_id) references private.meta_documents(id,organization_id),
 check(expires_on is null or issued_on is null or expires_on>=issued_on),unique(document_id,revision),unique(id,organization_id));
create index meta_document_revisions_org_idx on private.meta_document_revisions(organization_id,document_id,revision desc);
create index meta_document_revisions_creator_idx on private.meta_document_revisions(created_by);
create table private.meta_document_links(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),
 request_id uuid not null references public.freight_requests(id),document_id uuid not null,revision_id uuid not null,
 manifest_id uuid,manifest_revision integer,version integer not null default 1 check(version>0),active boolean not null default true,
 foreign key(document_id,organization_id) references private.meta_documents(id,organization_id),
 foreign key(revision_id,organization_id) references private.meta_document_revisions(id,organization_id),
 unique(request_id,document_id));
create index meta_document_links_org_idx on private.meta_document_links(organization_id,request_id,id);
create index meta_document_links_revision_idx on private.meta_document_links(revision_id);
create table private.meta_document_shares(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),
 link_id uuid not null references private.meta_document_links(id),revision_id uuid not null references private.meta_document_revisions(id),
 booking_id uuid not null references public.v2_bookings(id),carrier_id uuid not null references public.carriers(id),
 state text not null default 'ACTIVE' check(state in('ACTIVE','REVOKED')),version integer not null default 1 check(version>0),
 review text not null default 'PENDING' check(review in('PENDING','ACCEPTED','CORRECTION_REQUESTED')),
 reason text,reviewed_at timestamptz,shared_by uuid not null references public.organization_members(id),
 unique(link_id,booking_id));
create index meta_document_shares_carrier_idx on private.meta_document_shares(carrier_id,booking_id,state);
create index meta_document_shares_org_idx on private.meta_document_shares(organization_id,link_id);
create index meta_document_shares_revision_idx on private.meta_document_shares(revision_id);
create index meta_document_shares_booking_idx on private.meta_document_shares(booking_id);
create index meta_document_shares_member_idx on private.meta_document_shares(shared_by);
create table private.meta_document_audit(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),
 actor_user_id uuid not null,action text not null,target_id uuid not null,value jsonb not null,created_at timestamptz not null default now());
create index meta_document_audit_org_idx on private.meta_document_audit(organization_id,created_at,id);
create table private.meta_document_receipts(
 organization_id uuid not null,actor_id uuid not null,idempotency_key uuid not null,payload_hash text not null,
 result jsonb not null,created_at timestamptz not null default now(),primary key(organization_id,actor_id,idempotency_key));
create index meta_document_receipts_actor_idx on private.meta_document_receipts(actor_id);
alter table private.meta_documents enable row level security;
alter table private.meta_document_revisions enable row level security;
alter table private.meta_document_links enable row level security;
alter table private.meta_document_shares enable row level security;
alter table private.meta_document_audit enable row level security;
alter table private.meta_document_receipts enable row level security;
-- Access is exclusively through scoped RPCs. No broad organization-library policy for REQUESTER.
revoke all on private.meta_documents,private.meta_document_revisions,private.meta_document_links,private.meta_document_shares,private.meta_document_audit,private.meta_document_receipts from public,anon,authenticated,service_role;
create trigger meta_document_audit_immutable before update or delete on private.meta_document_audit for each row execute function private.meta_loading_immutable();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('meta-documents','meta-documents',false,4194304,array['application/pdf','image/jpeg','image/png']);
-- No client Storage policy: only the server writes validated bytes. Access URLs are signed after scoped RPC authorization.
-- Restrictive policy protects this bucket even if a legacy permissive Storage policy exists elsewhere.
create policy meta_documents_server_only on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id<>'meta-documents') with check(bucket_id<>'meta-documents');

create function private.meta_document_record(r private.meta_document_revisions) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',r.id,'documentId',d.id,'organizationId',r.organization_id,'title',d.title,'kind',d.kind,'requestId',d.request_id,
 'version',r.revision,'documentVersion',d.version,'filename',r.filename,'mime',r.mime,'bytes',r.bytes,'sha256',r.sha256,'state',r.state,
 'issuedOn',r.issued_on,'expiresOn',r.expires_on,'createdAt',r.created_at) from private.meta_documents d where d.id=r.document_id;
$$;
create function private.meta_document_share(s private.meta_document_shares) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('id',s.id,'bookingId',s.booking_id,'carrierId',s.carrier_id,'version',s.version,'state',s.state,'review',s.review,'reason',s.reason,'reviewedAt',s.reviewed_at);
$$;
create function private.meta_documents_v1(o uuid,a uuid,c uuid,action text,target uuid,v jsonb,k uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d private.meta_documents%rowtype;r private.meta_document_revisions%rowtype;l private.meta_document_links%rowtype;s private.meta_document_shares%rowtype;
 b public.v2_bookings%rowtype;receipt private.meta_document_receipts%rowtype;org uuid:=o;h text;out_value jsonb;manifest jsonb;material_current boolean;
 expected integer;offset_value integer;new_revision_id uuid;write_action boolean:=action in('upload','finish','link','unlink','share','revoke','review');
begin
 if auth.uid() is null then raise exception 'UNAUTHORIZED' using errcode='PT401';end if;
 if action is null or action not in('library','upload','finish','dossier','link','unlink','share','revoke','review','carrier_dossier','download') or v is null or jsonb_typeof(v)<>'object' then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
 if c is null then
  perform private.workflow_member(o,a,true); -- owner/supervisor for sensitive documents, including reads
  if action in('review','carrier_dossier') then raise exception 'FORBIDDEN_DOCUMENT' using errcode='PT403';end if;
 else
  if o is not null or a is distinct from private.identity_carrier(c) or action not in('review','carrier_dossier','download') then raise exception 'FORBIDDEN_DOCUMENT' using errcode='PT403';end if;
  if write_action and not exists(select 1 from public.carrier_operators where id=a and role in('ADMIN','DISPATCHER')) then raise exception 'FORBIDDEN_DOCUMENT_REVIEW' using errcode='PT403';end if;
  if action='carrier_dossier' then
   select * into b from public.v2_bookings where id=target and carrier_id=c;
  else
   select * into s from private.meta_document_shares where id=target and carrier_id=c and state='ACTIVE';
   select * into b from public.v2_bookings where id=s.booking_id and carrier_id=c;
   select * into l from private.meta_document_links where id=s.link_id and active and revision_id=s.revision_id;
   if l.id is null then raise exception 'DOCUMENT_NOT_FOUND' using errcode='PT404';end if;
  end if;
  if b.id is null or b.status in('CANCELLED','REJECTED') then raise exception 'DOCUMENT_NOT_FOUND' using errcode='PT404';end if;
  org:=b.organization_id;
 end if;
 if write_action then
  if k is null then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
  h:=private.hash_v2_freight_payload(jsonb_build_object('action',action,'target',target,'carrier',c,'value',v));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('meta-doc:'||org::text||':'||a::text||':'||k::text,0));
  select * into receipt from private.meta_document_receipts where organization_id=org and actor_id=a and idempotency_key=k;
  if found then
   if receipt.payload_hash<>h then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='PT409';end if;
   return receipt.result;
  end if;
 end if;
 if action='library' then
  offset_value:=coalesce((v->>'offset')::integer,0);
  if offset_value not between 0 and 1000000 then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
  return jsonb_build_object('data',coalesce((select jsonb_agg(x.value) from(select private.meta_document_record(rr) value from private.meta_document_revisions rr join private.meta_documents dd on dd.id=rr.document_id
    where dd.organization_id=org and (dd.request_id is null or dd.request_id=nullif(v->>'requestId','')::uuid)
    and (v->>'documentId' is null or dd.id=(v->>'documentId')::uuid)
    order by rr.created_at desc,rr.id limit 50 offset offset_value)x),'[]'),
    'nextOffset',case when (select count(*) from private.meta_document_revisions rr join private.meta_documents dd on dd.id=rr.document_id where dd.organization_id=org and (dd.request_id is null or dd.request_id=nullif(v->>'requestId','')::uuid) and (v->>'documentId' is null or dd.id=(v->>'documentId')::uuid))>offset_value+50 then offset_value+50 else null end);
 end if;
 if action='upload' then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('document-quota:'||org::text,0));
  if length(v->>'title') not between 1 and 160 or length(v->>'filename') not between 1 and 200 or (v->>'mime') not in('application/pdf','image/png','image/jpeg') or (v->>'bytes')::integer not between 1 and 4194304 or (v->>'sha256')!~'^[a-f0-9]{64}$' or (v->>'kind') not in('COMPANY_PROFILE','PACKING_LIST','OTHER') or not(v ?& array['expectedVersion','title','kind','mime','bytes','sha256','filename']) then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
  if v->>'requestId' is not null and not exists(select 1 from public.freight_requests where id=(v->>'requestId')::uuid and organization_id=org) then raise exception 'REQUEST_NOT_FOUND' using errcode='PT404';end if;
  if v->>'documentId' is null then
   if (v->>'expectedVersion')::integer<>0 then raise exception 'STALE_DOCUMENT' using errcode='PT409';end if;
   if (select coalesce(sum(bytes),0) from private.meta_document_revisions where organization_id=org)>104857600-(v->>'bytes')::integer then raise exception 'DOCUMENT_QUOTA' using errcode='PT409';end if;
   insert into private.meta_documents(organization_id,request_id,kind,title,created_by) values(org,(v->>'requestId')::uuid,v->>'kind',v->>'title',a) returning * into d;
  else
   select * into d from private.meta_documents where id=(v->>'documentId')::uuid and organization_id=org for update;
   if d.id is null then raise exception 'DOCUMENT_NOT_FOUND' using errcode='PT404';end if;
   if d.version<>(v->>'expectedVersion')::integer then raise exception 'STALE_DOCUMENT' using errcode='PT409';end if;
   if d.kind<>v->>'kind' or d.request_id is distinct from (v->>'requestId')::uuid or d.title<>v->>'title' then raise exception 'IMMUTABLE_DOCUMENT_SCOPE' using errcode='PT400';end if;
   if (select coalesce(sum(bytes),0) from private.meta_document_revisions where organization_id=org)>104857600-(v->>'bytes')::integer then raise exception 'DOCUMENT_QUOTA' using errcode='PT409';end if;
   update private.meta_documents set version=version+1 where id=d.id returning * into d;
  end if;
  new_revision_id:=gen_random_uuid();
  insert into private.meta_document_revisions(id,organization_id,document_id,revision,filename,mime,bytes,sha256,object_path,issued_on,expires_on,created_by)
   values(new_revision_id,org,d.id,d.version,v->>'filename',v->>'mime',(v->>'bytes')::integer,v->>'sha256',org::text||'/'||d.id::text||'/'||new_revision_id::text,(v->>'issuedOn')::date,(v->>'expiresOn')::date,a) returning * into r;
  out_value:=jsonb_build_object('data',private.meta_document_record(r),'objectPath',r.object_path);
 elsif action='finish' then
  select * into r from private.meta_document_revisions where id=target and organization_id=org for update;
  if r.id is null then raise exception 'DOCUMENT_NOT_FOUND' using errcode='PT404';end if;
  if not exists(select 1 from storage.objects obj where bucket_id='meta-documents' and name=r.object_path and (obj.metadata->>'size')::bigint=r.bytes and obj.metadata->>'mimetype'=r.mime) then raise exception 'UPLOAD_INCOMPLETE' using errcode='PT409';end if;
  update private.meta_document_revisions set state='READY' where id=r.id returning * into r;
  out_value:=jsonb_build_object('data',private.meta_document_record(r));
 elsif action='download' then
  select * into r from private.meta_document_revisions where id=case when c is null then target else s.revision_id end and organization_id=org and state='READY';
  if r.id is null then raise exception 'DOCUMENT_NOT_FOUND' using errcode='PT404';end if;
  return jsonb_build_object('data',private.meta_document_record(r),'objectPath',r.object_path);
 elsif action in('dossier','link','unlink','share','revoke') then
  if not exists(select 1 from public.freight_requests where id=target and organization_id=org) then raise exception 'REQUEST_NOT_FOUND' using errcode='PT404';end if;
  if action='dossier' then
   manifest:=public.meta_declared_manifests_v1(org,a,target,'current',null,null,20,0);
   return jsonb_build_object('data',coalesce((select jsonb_agg(jsonb_build_object('id',ll.id,'active',ll.active,'version',ll.version,'revision',private.meta_document_record(rr),'manifestId',ll.manifest_id,'manifestRevision',ll.manifest_revision,
    'correspondenceCurrent',rrdoc.kind<>'PACKING_LIST' or (ll.manifest_id::text=manifest#>>'{record,id}' and ll.manifest_revision=(manifest#>>'{record,revision}')::integer and private.meta_document_content_current(org,a,target,manifest)),
    'shares',coalesce((select jsonb_agg(private.meta_document_share(ss)) from private.meta_document_shares ss where ss.link_id=ll.id),'[]')) order by rr.created_at desc)
    from private.meta_document_links ll join private.meta_document_revisions rr on rr.id=ll.revision_id join private.meta_documents rrdoc on rrdoc.id=rr.document_id where ll.organization_id=org and ll.request_id=target),'[]'),
    'relations',coalesce((select jsonb_agg(jsonb_build_object('id',bb.id,'carrierId',bb.carrier_id,'status',bb.status)) from public.v2_bookings bb where bb.organization_id=org and bb.freight_request_id=target and bb.status not in('CANCELLED','REJECTED')),'[]'),'policy','REQUIREMENTS_TO_CONFIRM');
  elsif action='link' then
   select * into r from private.meta_document_revisions where id=(v->>'revisionId')::uuid and organization_id=org and state='READY';
   select * into d from private.meta_documents where id=r.document_id;
   if r.id is null or d.request_id is not null and d.request_id<>target then raise exception 'DOCUMENT_NOT_FOUND' using errcode='PT404';end if;
   select * into l from private.meta_document_links where request_id=target and document_id=d.id for update;
   if coalesce(l.version,0) is distinct from (v->>'expectedVersion')::integer then raise exception 'STALE_DOCUMENT_LINK' using errcode='PT409';end if;
   if d.kind='PACKING_LIST' then
    manifest:=public.meta_declared_manifests_v1(org,a,target,'current',null,null,20,0);
    if manifest#>>'{record,id}' is null then raise exception 'CONFIRMED_MANIFEST_REQUIRED' using errcode='PT409';end if;
    if not private.meta_document_content_current(org,a,target,manifest) then raise exception 'STALE_MANIFEST' using errcode='PT409';end if;
   end if;
   if l.id is null then
    insert into private.meta_document_links(organization_id,request_id,document_id,revision_id,manifest_id,manifest_revision) values(org,target,d.id,r.id,(manifest#>>'{record,id}')::uuid,(manifest#>>'{record,revision}')::integer) returning * into l;
   else
    update private.meta_document_shares set state='REVOKED',version=version+1 where link_id=l.id and state='ACTIVE';
    update private.meta_document_links set revision_id=r.id,manifest_id=(manifest#>>'{record,id}')::uuid,manifest_revision=(manifest#>>'{record,revision}')::integer,version=version+1,active=true where id=l.id returning * into l;
   end if;
   out_value:=jsonb_build_object('id',l.id,'version',l.version);
  elsif action='unlink' then
   select * into l from private.meta_document_links where id=(v->>'linkId')::uuid and request_id=target and organization_id=org for update;
   if l.id is null then raise exception 'DOCUMENT_NOT_FOUND' using errcode='PT404';end if;
   if l.version is distinct from (v->>'expectedVersion')::integer then raise exception 'STALE_DOCUMENT_LINK' using errcode='PT409';end if;
   update private.meta_document_shares set state='REVOKED',version=version+1 where link_id=l.id and state='ACTIVE';
   update private.meta_document_links set active=false,version=version+1 where id=l.id;
   out_value:=jsonb_build_object('id',l.id);
  elsif action='share' then
   select * into l from private.meta_document_links where id=(v->>'linkId')::uuid and request_id=target and organization_id=org and active for update;
   if l.id is null then raise exception 'DOCUMENT_NOT_FOUND' using errcode='PT404';end if;
   if l.version is distinct from (v->>'expectedVersion')::integer then raise exception 'STALE_DOCUMENT_LINK' using errcode='PT409';end if;
   select * into b from public.v2_bookings where id=(v->>'bookingId')::uuid and organization_id=org and freight_request_id=target and status not in('CANCELLED','REJECTED');
   if b.id is null then raise exception 'BOOKING_NOT_FOUND' using errcode='PT404';end if;
   insert into private.meta_document_shares(organization_id,link_id,revision_id,booking_id,carrier_id,shared_by) values(org,l.id,l.revision_id,b.id,b.carrier_id,a)
    on conflict(link_id,booking_id) do update set revision_id=excluded.revision_id,state='ACTIVE',review='PENDING',reason=null,reviewed_at=null,shared_by=excluded.shared_by,version=private.meta_document_shares.version+1 returning * into s;
   update private.meta_document_links set version=version+1 where id=l.id;
   out_value:=private.meta_document_share(s);
  elsif action='revoke' then
   select ss.* into s from private.meta_document_shares ss join private.meta_document_links ll on ll.id=ss.link_id where ss.id=(v->>'shareId')::uuid and ll.request_id=target and ss.organization_id=org for update of ss;
   if s.id is null then raise exception 'DOCUMENT_NOT_FOUND' using errcode='PT404';end if;
   if s.version is distinct from (v->>'expectedVersion')::integer then raise exception 'STALE_DOCUMENT_SHARE' using errcode='PT409';end if;
   update private.meta_document_shares set state='REVOKED',version=version+1 where id=s.id returning * into s;
   out_value:=private.meta_document_share(s);
  end if;
 elsif action='carrier_dossier' then
  manifest:=null;
  return jsonb_build_object('data',coalesce((select jsonb_agg(jsonb_build_object('share',private.meta_document_share(ss),'revision',private.meta_document_record(rr),'manifestId',ll.manifest_id,'manifestRevision',ll.manifest_revision,'correspondenceCurrent',dd.kind<>'PACKING_LIST' or private.meta_document_link_current(ll)) order by rr.created_at)
   from private.meta_document_shares ss join private.meta_document_links ll on ll.id=ss.link_id and ll.active and ll.revision_id=ss.revision_id join private.meta_document_revisions rr on rr.id=ss.revision_id join private.meta_documents dd on dd.id=rr.document_id
   where ss.carrier_id=c and ss.booking_id=b.id and ss.state='ACTIVE'),'[]'),'policy','REQUIREMENTS_TO_CONFIRM');
 elsif action='review' then
  select ss.* into s from private.meta_document_shares ss join private.meta_document_links ll on ll.id=ss.link_id and ll.active and ll.revision_id=ss.revision_id where ss.id=target and ss.carrier_id=c and ss.state='ACTIVE' for update of ss,ll;
  if s.id is null then raise exception 'DOCUMENT_NOT_FOUND' using errcode='PT404';end if;
  select * into l from private.meta_document_links where id=s.link_id;
  if s.version is distinct from (v->>'expectedVersion')::integer then raise exception 'STALE_DOCUMENT_SHARE' using errcode='PT409';end if;
  if v->>'decision' not in('ACCEPTED','CORRECTION_REQUESTED') or length(btrim(v->>'reason')) not between 3 and 1000 then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
  if v->>'decision'='ACCEPTED' and not private.meta_document_link_current(l) then raise exception 'STALE_MANIFEST' using errcode='PT409';end if;
  select * into r from private.meta_document_revisions where id=s.revision_id;
  if v->>'decision'='ACCEPTED' and r.expires_on is not null and r.expires_on<current_date then raise exception 'EXPIRED_DOCUMENT' using errcode='PT409';end if;
  update private.meta_document_shares set review=v->>'decision',reason=btrim(v->>'reason'),reviewed_at=now(),version=version+1 where id=s.id returning * into s;
  out_value:=private.meta_document_share(s);
 end if;
 if out_value is null then raise exception 'VALIDATION_ERROR' using errcode='PT400';end if;
 insert into private.meta_document_audit(organization_id,actor_user_id,action,target_id,value) values(org,auth.uid(),action,coalesce(target,(out_value#>>'{data,id}')::uuid),jsonb_build_object('input',v,'result',out_value));
 insert into private.meta_document_receipts values(org,a,k,h,out_value,now());
 return out_value;
exception when invalid_text_representation or datetime_field_overflow or check_violation or not_null_violation then raise exception 'VALIDATION_ERROR' using errcode='PT400';
 when unique_violation then raise exception 'DOCUMENT_CONFLICT' using errcode='PT409';
end;$$;

-- A packing list keeps the exact manifest and material declaration that it was attached to.
create function private.meta_document_content_current(o uuid,a uuid,q uuid,m jsonb) returns boolean language plpgsql security definer set search_path='' as $$
declare snapshot jsonb;begin
 select v2_snapshot into snapshot from public.freight_requests where id=q and organization_id=o;
 return coalesce(m#>>'{record,id}' is not null and
  (snapshot->'cargoSpecification'||jsonb_build_object('availableDocuments',coalesce(snapshot#>'{cargoSpecification,availableDocuments}','[]')))=m#>'{record,declaration,cargoSpecification}' and
  snapshot->'origin'=m#>'{record,declaration,route,origin}' and snapshot->'destination'=m#>'{record,declaration,route,destination}' and
  snapshot->'pickupWindow'=m#>'{record,declaration,route,pickupWindow}' and snapshot->'deliveryWindow'=m#>'{record,declaration,route,deliveryWindow}' and
  coalesce(snapshot->'planningPreferences','null')=coalesce(m#>'{record,declaration,route,planningPreferences}','null'),false);
end;$$;
create function private.meta_document_link_current(l private.meta_document_links) returns boolean language plpgsql security definer set search_path='' as $$
declare m jsonb;r private.meta_document_revisions%rowtype;d private.meta_documents%rowtype;begin
 select * into r from private.meta_document_revisions where id=l.revision_id;
 select * into d from private.meta_documents where id=r.document_id;
 if d.kind<>'PACKING_LIST' then return true;end if;
 -- A carrier cannot invoke the shipper RPC; inspect the immutable producer tables through their authorized consumer projection.
 select jsonb_build_object('record',jsonb_build_object('id',mm.id,'revision',mm.revision,'declaration',mm.declaration)) into m
 from private.meta_declared_manifests mm where mm.organization_id=l.organization_id and mm.request_id=l.request_id order by mm.revision desc limit 1;
 return coalesce(l.manifest_id::text=m#>>'{record,id}' and l.manifest_revision=(m#>>'{record,revision}')::integer and private.meta_document_content_current(l.organization_id,null,l.request_id,m),false);
end;$$;
revoke all on function private.meta_document_record(private.meta_document_revisions),private.meta_document_share(private.meta_document_shares),private.meta_documents_v1(uuid,uuid,uuid,text,uuid,jsonb,uuid),private.meta_document_content_current(uuid,uuid,uuid,jsonb),private.meta_document_link_current(private.meta_document_links) from public,anon,authenticated,service_role;
create function public.meta_documents_v1(p_org uuid,p_actor uuid,p_carrier uuid,p_action text,p_target uuid,p_value jsonb,p_key uuid) returns jsonb
language sql security invoker set search_path='' as $$select private.meta_documents_v1(p_org,p_actor,p_carrier,p_action,p_target,p_value,p_key);$$;
revoke all on function public.meta_documents_v1(uuid,uuid,uuid,text,uuid,jsonb,uuid) from public,anon,service_role;
grant execute on function public.meta_documents_v1(uuid,uuid,uuid,text,uuid,jsonb,uuid),private.meta_documents_v1(uuid,uuid,uuid,text,uuid,jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
