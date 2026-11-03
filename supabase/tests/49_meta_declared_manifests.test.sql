-- Synthetic rollback-only cases for the v2 clean profile. Executed only in isolated Meta local validation.
begin;
set local search_path=extensions,public;
select no_plan();
select ok(has_function_privilege('authenticated',
 'public.meta_declared_manifests_v1(uuid,uuid,uuid,text,jsonb,uuid,integer,integer)','EXECUTE'),'scoped RPC available to authenticated');
select ok(not has_function_privilege('anon',
 'public.meta_declared_manifests_v1(uuid,uuid,uuid,text,jsonb,uuid,integer,integer)','EXECUTE'),'anonymous RPC forbidden');
select ok(not has_function_privilege('service_role',
 'public.meta_declared_manifests_v1(uuid,uuid,uuid,text,jsonb,uuid,integer,integer)','EXECUTE'),'service role is not a confirmation identity');
select ok(not has_table_privilege('authenticated','private.meta_declared_manifests','INSERT'),'direct insert forbidden');
select ok(not has_table_privilege('authenticated','private.meta_manifest_receipts','SELECT'),'receipts private');
select ok((select relrowsecurity from pg_class where oid='private.meta_declared_manifests'::regclass),'RLS enabled');

create function pg_temp.meta_payload() returns jsonb language sql as $$select '{
 "schemaVersion":"2.0",
 "origin":{"facilityId":"c2330000-0000-4000-8000-000000000001"},
 "destination":{"facilityId":"c2330000-0000-4000-8000-000000000002"},
 "pickupWindow":{"startsAt":"2026-11-02T08:00:00Z","endsAt":"2026-11-02T18:00:00Z"},
 "deliveryWindow":{"startsAt":"2026-11-03T08:00:00Z","endsAt":"2026-11-03T20:00:00Z"},
 "acceptedModes":["ROAD"],"requiredEquipment":null,
 "cargoSpecification":{"categoryCode":"GENERAL","description":"Synthetic manifest contract case","packaging":"PALLET",
  "totalWeightKg":1000,"totalVolumeM3":2,"divisible":true,"requirements":[],
  "units":[{"packageType":"PALLET","quantity":1,"weightPerUnitKg":990,"volumePerUnitM3":1.9,
    "dimensionsCm":{"length":100,"width":100,"height":190},"indivisible":true,"stackable":false},
   {"packageType":"BOX","quantity":1,"weightPerUnitKg":10,"volumePerUnitM3":0.1,
    "dimensionsCm":{"length":50,"width":40,"height":50},"indivisible":true,"stackable":false}]},
 "contacts":{"pickup":{"name":"Example sender","phoneE164":"+12025550123"},
  "recipient":{"name":"Example recipient","phoneE164":"+12025550124"}}}'::jsonb;$$;
create temporary table meta_case(name text primary key,value jsonb);
grant select,insert on meta_case to authenticated;
create function pg_temp.meta_call(p_action text,p_value jsonb,p_key uuid default null) returns jsonb language sql as $$
 select public.meta_declared_manifests_v1('c2300000-0000-4000-8000-000000000001',
 'c2320000-0000-4000-8000-000000000001',(select (value->>'id')::uuid from meta_case where name='request'),
 p_action,p_value,p_key,20,0);$$;
create function pg_temp.meta_confirmation() returns jsonb language sql as $$
 select jsonb_build_object('preparationId',value#>>'{record,id}','expectedDraftVersion',1,
 'expectedManifestRevision',0,'contentHash',value#>>'{record,contentHash}','confirmed',true)
 from meta_case where name='preparation';$$;

set local role authenticated;
set local "request.jwt.claims"='{"sub":"c2310000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into meta_case select 'request',public.create_v2_freight_request(
 'c2300000-0000-4000-8000-000000000001','c2320000-0000-4000-8000-000000000001',
 'd0490000-0000-4000-8000-000000000001',private.hash_v2_freight_payload(pg_temp.meta_payload()),pg_temp.meta_payload());
select is(pg_temp.meta_call('current',null)->'record','null'::jsonb,'no fabricated initial manifest');
insert into meta_case select 'preparation',pg_temp.meta_call('prepare',
 '{"expectedDraftVersion":1,"expectedManifestRevision":0}', 'd0490000-0000-4000-8000-000000000002');
select is(jsonb_array_length((select value#>'{record,candidate,groupBindings}' from meta_case where name='preparation')),2,'both groups mapped');
select is((pg_temp.meta_call('prepare','{"expectedDraftVersion":1,"expectedManifestRevision":0}',
 'd0490000-0000-4000-8000-000000000002')->>'replay'),'true','preparation retry preserves generated identities');
select throws_ok($q$select pg_temp.meta_call('prepare','{"expectedDraftVersion":2,"expectedManifestRevision":0}',
 'd0490000-0000-4000-8000-000000000002')$q$,'PT409','IDEMPOTENCY_CONFLICT','key cannot change payload');
select throws_ok($q$select pg_temp.meta_call('confirm',jsonb_set(pg_temp.meta_confirmation(),'{contentHash}',to_jsonb(repeat('0',64))),
 'd0490000-0000-4000-8000-000000000003')$q$,'PT409','REVIEW_CONTENT_MISMATCH','cannot confirm another review hash');
select throws_ok($q$select pg_temp.meta_call('confirm',jsonb_set(pg_temp.meta_confirmation(),'{confirmed}','false'),
 'd0490000-0000-4000-8000-000000000003')$q$,'PT400','VALIDATION_ERROR','human confirmation must be explicit');
insert into meta_case select 'manifest',pg_temp.meta_call('confirm',pg_temp.meta_confirmation(),
 'd0490000-0000-4000-8000-000000000003');
select is((select value#>>'{record,revision}' from meta_case where name='manifest'),'1','first immutable revision');
select is(jsonb_array_length(pg_temp.meta_call('list',null)),1,'one logical confirmation');
select is((select status from public.freight_requests where id=(select (value->>'id')::uuid from meta_case where name='request')),
 'DRAFT','confirmation does not submit, book or dispatch');

select lives_ok($q$select public.command_v2_freight_request(
 'c2300000-0000-4000-8000-000000000001','c2320000-0000-4000-8000-000000000001',
 'd0490000-0000-4000-8000-000000000004',(select (value->>'id')::uuid from meta_case where name='request'),1,'REVISE',
 jsonb_set(pg_temp.meta_payload(),'{cargoSpecification,units}',jsonb_build_array(
 pg_temp.meta_payload()#>'{cargoSpecification,units,1}',pg_temp.meta_payload()#>'{cargoSpecification,units,0}')))$q$,'native revision can reorder groups');
select is(pg_temp.meta_call('confirm',pg_temp.meta_confirmation(),'d0490000-0000-4000-8000-000000000003')->>'replay',
 'true','receipt replay succeeds even after request has advanced');
select is(pg_temp.meta_call('current',null)->>'currentRequestDraftVersion','2','current reports source version independently');
select throws_ok($q$select pg_temp.meta_call('prepare','{"expectedDraftVersion":1,"expectedManifestRevision":1}',
 'd0490000-0000-4000-8000-000000000005')$q$,'PT409','STALE_DRAFT','new command rejects stale source');
select throws_ok($q$select pg_temp.meta_call('prepare','{"expectedDraftVersion":2,"expectedManifestRevision":0}',
 'd0490000-0000-4000-8000-000000000005')$q$,'PT409','STALE_MANIFEST','new command rejects stale baseline');
select throws_ok($q$select pg_temp.meta_call('prepare','{"expectedDraftVersion":2,"expectedManifestRevision":1}',
 'd0490000-0000-4000-8000-000000000005')$q$,'PT400','GROUP_MAPPING_REQUIRED','revisions never guess group identity by index');
insert into meta_case select 'preparation2',pg_temp.meta_call('prepare',jsonb_build_object(
 'expectedDraftVersion',2,'expectedManifestRevision',1,'groups',jsonb_build_array(
 jsonb_build_object('groupId',value#>>'{record,declaration,groupBindings,0,groupId}','sourceUnitIndex',1),
 jsonb_build_object('groupId',value#>>'{record,declaration,groupBindings,1,groupId}','sourceUnitIndex',0))),
 'd0490000-0000-4000-8000-000000000005') from meta_case where name='manifest';
select is((select value#>>'{record,candidate,groupBindings,0,groupId}' from meta_case where name='preparation2'),
 (select value#>>'{record,declaration,groupBindings,1,groupId}' from meta_case where name='manifest'),'reordering preserves group UUIDs');

set local "request.jwt.claims"='{"sub":"c2310000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($q$select pg_temp.meta_call('current',null)$q$,'PT403','FORBIDDEN_WORKFLOW','foreign identity cannot read claimed organization');
reset role;
select is((select count(*)::integer from private.meta_declared_manifests
 where request_id=(select (value->>'id')::uuid from meta_case where name='request')),1,'source revision preserves historical snapshot');
select throws_ok($q$update private.meta_declared_manifests set revision=9
 where request_id=(select (value->>'id')::uuid from meta_case where name='request')$q$,
 'PT409','IMMUTABLE_MANIFEST_RECORD','stored confirmation cannot be overwritten');
-- Role changes are checked in SQL, not trusted from the caller or a previous receipt.
update public.organization_members set role='REQUESTER'
 where id='c2320000-0000-4000-8000-000000000001';
set local role authenticated;
set local "request.jwt.claims"='{"sub":"c2310000-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($q$select pg_temp.meta_call('current',null)$q$,'requester can read its own manifest');
select throws_ok($q$select pg_temp.meta_call('confirm',pg_temp.meta_confirmation(),
 'd0490000-0000-4000-8000-000000000003')$q$,'PT403','FORBIDDEN_WORKFLOW','downgraded role cannot replay a privileged confirmation');
reset role;
update public.organization_members set role='OWNER'
 where id='c2320000-0000-4000-8000-000000000001';

-- Only the test owner can construct an expired preparation; clients have no table privileges.
insert into private.meta_manifest_preparations(id,organization_id,request_id,member_id,
 request_draft_version,expected_manifest_revision,candidate,content_hash,prepared_at,expires_at)
select 'd0490000-0000-4000-8000-000000000099',organization_id,request_id,member_id,
 request_draft_version,expected_manifest_revision,candidate,content_hash,now()-interval '2 hours',now()-interval '1 hour'
 from private.meta_manifest_preparations where id=(select (value#>>'{record,id}')::uuid from meta_case where name='preparation2');
set local role authenticated;
select throws_ok($q$select pg_temp.meta_call('confirm',jsonb_build_object(
 'preparationId','d0490000-0000-4000-8000-000000000099','expectedDraftVersion',2,'expectedManifestRevision',1,
 'contentHash',(select value#>>'{record,contentHash}' from meta_case where name='preparation2'),'confirmed',true),
 'd0490000-0000-4000-8000-000000000006')$q$,'PT409','PREPARATION_EXPIRED','expired review cannot be confirmed');
insert into meta_case select 'manifest2',pg_temp.meta_call('confirm',jsonb_build_object(
 'preparationId',value#>>'{record,id}','expectedDraftVersion',2,'expectedManifestRevision',1,
 'contentHash',value#>>'{record,contentHash}','confirmed',true),'d0490000-0000-4000-8000-000000000007')
 from meta_case where name='preparation2';
select is((select value#>>'{record,revision}' from meta_case where name='manifest2'),'2','correction confirms revision 2 on the same request');
select is(pg_temp.meta_call('read',jsonb_build_object('manifestId',value#>>'{record,id}'))#>'{declaration,groupBindings}',
 value#>'{record,declaration,groupBindings}','reopening revision preserves every group identity') from meta_case where name='manifest2';
select is(pg_temp.meta_call('read',jsonb_build_object('manifestId',value#>>'{record,id}'))#>'{declaration,cargoSpecification}',
 value#>'{record,declaration,cargoSpecification}','reopening revision preserves all cargo fields') from meta_case where name='manifest2';
select throws_ok($q$select pg_temp.meta_call('confirm',jsonb_build_object(
 'preparationId',value#>>'{record,id}','expectedDraftVersion',2,'expectedManifestRevision',2,
 'contentHash',value#>>'{record,contentHash}','confirmed',true),'d0490000-0000-4000-8000-000000000008')
 from meta_case where name='preparation2'$q$,'PT409','DECLARATION_ALREADY_CONFIRMED','another key cannot confirm the same request version twice');
select is(jsonb_array_length(pg_temp.meta_call('list',null)),2,'correction creates one additional historical revision');
select is((select status from public.freight_requests where id=(select (value->>'id')::uuid from meta_case where name='request')),
 'DRAFT','reopening and correction do not submit or book');
select * from finish();
rollback;
