-- Private declaration evidence. Access is mediated by authenticated application services.
create table public.meta_declaration_media (
 id uuid primary key,
 organization_id uuid not null references public.organizations(id),
 member_id uuid not null references public.organization_members(id),
 draft_key uuid not null,
 request_id uuid references public.freight_requests(id),
 kind text not null check(kind in ('photo','label','audio')),
 object_path text not null unique,
 mime_type text not null check(mime_type in ('image/png','image/jpeg','audio/wav')),
 file_name text not null check(length(file_name) between 1 and 180),
 byte_size integer not null check(byte_size between 1 and 30000000),
 sha256 text,
 state text not null default 'PENDING' check(state in ('PENDING','READY','REMOVED')),
 created_at timestamptz not null default now()
);
create index meta_declaration_media_scope on public.meta_declaration_media(organization_id,member_id,draft_key);
create index meta_declaration_media_request on public.meta_declaration_media(request_id);
alter table public.meta_declaration_media enable row level security;
revoke all on public.meta_declaration_media from public,anon,authenticated;
grant select,insert,update,delete on public.meta_declaration_media to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('declaration-media','declaration-media',false,30000000,array['image/png','image/jpeg','audio/wav'])
 on conflict(id) do nothing;
