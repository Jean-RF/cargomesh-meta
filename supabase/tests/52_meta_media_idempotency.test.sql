begin;
set local search_path=extensions,public;
select plan(12);
select has_column('public','meta_declaration_media','idempotency_key','stable operation key added');
select has_column('public','meta_declaration_media','init_payload_hash','canonical fingerprint added');
select has_column('public','meta_declaration_media','expected_sha256','original content fingerprint added');
select has_index('public','meta_declaration_media','meta_media_initialization_key','unique tenant/member/key index exists');
select ok(not has_function_privilege('anon','public.initialize_meta_declaration_media(uuid,uuid,uuid,jsonb)','EXECUTE'),'anonymous cannot reserve evidence');
select ok(has_function_privilege('authenticated','public.initialize_meta_declaration_media(uuid,uuid,uuid,jsonb)','EXECUTE'),'authenticated checked RPC available');
select ok(not has_function_privilege('authenticated','private.lock_meta_media_actor(uuid,uuid)','EXECUTE'),'private actor helper is not directly callable');
select ok(not has_function_privilege('authenticated','private.check_meta_media_request(uuid,uuid,integer)','EXECUTE'),'private scope helper is not directly callable');
select ok(not has_function_privilege('anon','public.bind_meta_declaration_media(uuid,uuid,uuid,uuid,integer)','EXECUTE'),'anonymous cannot bind evidence');
select ok(not has_table_privilege('authenticated','public.meta_declaration_media','INSERT'),'client cannot bypass atomic quota command');
select ok((select relrowsecurity from pg_class where oid='public.meta_declaration_media'::regclass),'RLS retained');
select lives_ok($sql$
  insert into public.meta_declaration_media(id,organization_id,member_id,draft_key,kind,object_path,mime_type,file_name,byte_size,state,sha256)
  values(extensions.gen_random_uuid(),'c2300000-0000-4000-8000-000000000001','c2320000-0000-4000-8000-000000000001',
    extensions.gen_random_uuid(),'photo','synthetic/legacy/'||extensions.gen_random_uuid(),'image/png','legacy.png',100,'READY',repeat('a',64));
$sql$,'legacy READY evidence remains compatible with the additive transition');
select * from finish();
rollback;
