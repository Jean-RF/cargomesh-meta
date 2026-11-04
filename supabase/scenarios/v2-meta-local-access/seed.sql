-- Local Meta demo only. Reuses the existing synthetic QA actor/operator.
-- This is scenario data, never a production migration or a bypass of identity checks.
begin;
do $$begin
 if not exists(select 1 from auth.users where id='c2310000-0000-4000-8000-000000000001'
   and email='qa-v2-a@cargomesh.test')
 or not exists(select 1 from public.carriers where id='c2340000-0000-4000-8000-000000000001'
   and name='[SYNTHETIC] QA ROAD carrier' and status='ACTIVE')
 or not exists(select 1 from public.carrier_operators where id='c23d0000-0000-4000-8000-000000000001'
   and auth_user_id='c2310000-0000-4000-8000-000000000001'
   and carrier_id='c2340000-0000-4000-8000-000000000001' and status='ACTIVE') then
  raise exception 'Expected isolated Meta QA scenario is missing';
 end if;
end;$$;
insert into private.v2_catalog_grants(auth_user_id,carrier_id,permission,expires_at)
select 'c2310000-0000-4000-8000-000000000001','c2340000-0000-4000-8000-000000000001',
 'CARRIER_EDITOR',now()+interval '14 days'
where not exists(select 1 from private.v2_catalog_grants
 where auth_user_id='c2310000-0000-4000-8000-000000000001'
 and carrier_id='c2340000-0000-4000-8000-000000000001' and permission='CARRIER_EDITOR');
commit;
