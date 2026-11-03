-- Synthetic rollback-only SQL boundary tests. Producer integration is a separate assembled check.
begin;
set local search_path=extensions,public;
select no_plan();
select ok(not has_function_privilege('anon','public.meta_loading_sessions_v1(uuid,uuid,text,uuid,jsonb,uuid,integer,integer)','EXECUTE'),'anonymous session RPC forbidden');
select ok(not has_function_privilege('authenticated','public.meta_record_loading_observation_v1(uuid,uuid,text,integer,integer,text,jsonb)','EXECUTE'),'browser cannot publish worker counts');
select ok(not has_function_privilege('authenticated','public.meta_record_loading_explanation_v1(uuid,uuid,uuid,jsonb)','EXECUTE'),'browser cannot publish explanation');
select ok(not has_table_privilege('authenticated','private.meta_loading_sessions','INSERT'),'no direct session DML');
select ok(not has_table_privilege('service_role','private.meta_loading_observations','INSERT'),'server writer uses validated RPC');
select is((select count(*)::integer from pg_class where oid in('private.meta_loading_sessions'::regclass,'private.meta_loading_observations'::regclass,'private.meta_loading_passports'::regclass,'private.meta_loading_explanations'::regclass,'private.meta_loading_receipts'::regclass) and relrowsecurity),5,'all owned tables have RLS');
create temporary table loading_case(name text primary key,value jsonb);
grant select,insert,update on loading_case to authenticated,service_role;
create function pg_temp.loading_payload() returns jsonb language sql as $$select '{
 "schemaVersion":"2.0","origin":{"facilityId":"c2330000-0000-4000-8000-000000000001"},"destination":{"facilityId":"c2330000-0000-4000-8000-000000000002"},
 "pickupWindow":{"startsAt":"2026-11-02T08:00:00Z","endsAt":"2026-11-02T18:00:00Z"},"deliveryWindow":{"startsAt":"2026-11-03T08:00:00Z","endsAt":"2026-11-03T20:00:00Z"},"acceptedModes":["ROAD"],"requiredEquipment":null,
 "cargoSpecification":{"categoryCode":"GENERAL","description":"Synthetic loading test","packaging":"PALLET","totalWeightKg":1000,"totalVolumeM3":10,"divisible":true,"requirements":[],"units":[{"packageType":"PALLET","quantity":10,"weightPerUnitKg":100,"volumePerUnitM3":1,"dimensionsCm":{"length":100,"width":100,"height":100},"indivisible":true,"stackable":false}]},
 "contacts":{"pickup":{"name":"Example sender","phoneE164":"+12025550123"},"recipient":{"name":"Example recipient","phoneE164":"+12025550124"}}}'::jsonb;$$;
set local role authenticated;
set local "request.jwt.claims"='{"sub":"c2310000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into loading_case select 'request',public.create_v2_freight_request('c2300000-0000-4000-8000-000000000001','c2320000-0000-4000-8000-000000000001','d0500000-0000-4000-8000-000000000001',private.hash_v2_freight_payload(pg_temp.loading_payload()),pg_temp.loading_payload());
-- A real current CR reference is required by the additive explanation currency guard.
create function pg_temp.loading_manifest(action text,body jsonb,key uuid) returns jsonb language sql as $$
 select public.meta_declared_manifests_v1('c2300000-0000-4000-8000-000000000001','c2320000-0000-4000-8000-000000000001',
   (select (value->>'id')::uuid from loading_case where name='request'),action,body,key,20,0);$$;
insert into loading_case select 'preparation',pg_temp.loading_manifest('prepare','{"expectedDraftVersion":1,"expectedManifestRevision":0}','d0500000-0000-4000-8000-000000009001');
insert into loading_case select 'manifest',pg_temp.loading_manifest('confirm',jsonb_build_object(
 'preparationId',value#>>'{record,id}','contentHash',value#>>'{record,contentHash}','expectedDraftVersion',1,'expectedManifestRevision',0,'confirmed',true),
 'd0500000-0000-4000-8000-000000009002') from loading_case where name='preparation';
reset role;
-- Owner-inserted consumer projection with stable group aliases, not a native session-opening test.
insert into private.meta_loading_sessions(id,organization_id,request_id,facility_id,facility_name,mode,manifest_id,manifest_revision,manifest,groups,opened_by)
select 'd0500000-0000-4000-8000-000000000002','c2300000-0000-4000-8000-000000000001',(value->>'id')::uuid,'c2330000-0000-4000-8000-000000000001','[SYNTHETIC] Loading test','DEMO',(select (value#>>'{record,id}')::uuid from loading_case where name='manifest'),1,
 jsonb_build_object('id',(select value#>>'{record,id}' from loading_case where name='manifest'),'revision',1,'status','CONFIRMED','contentHash',repeat('a',64),'declaration',jsonb_build_object('schemaVersion','0.1','source',jsonb_build_object('requestId',value->>'id','organizationId','c2300000-0000-4000-8000-000000000001','requestDraftVersion',1),'cargoSpecification',pg_temp.loading_payload()->'cargoSpecification','groupBindings',jsonb_build_array(jsonb_build_object('groupId','d0500000-0000-4000-8000-000000000004','sourceUnitIndex',0)))),
 '[{"id":"d0500000-0000-4000-8000-000000000004","comparisonId":"d0500000-0000-4000-8000-000000000005","label":"PALLET","unit":"PALLET","count":10}]',
 'c2320000-0000-4000-8000-000000000001' from loading_case where name='request';
create function pg_temp.loading_call(action text,value jsonb default '{}',key uuid default null) returns jsonb language sql as $$select public.meta_loading_sessions_v1('c2300000-0000-4000-8000-000000000001','c2320000-0000-4000-8000-000000000001',action,'d0500000-0000-4000-8000-000000000002',value,key,20,0);$$;
create function pg_temp.loading_observation(attempt integer default 1,revision integer default 1,value jsonb default null) returns jsonb language sql as $$select public.meta_record_loading_observation_v1('c2300000-0000-4000-8000-000000000001','d0500000-0000-4000-8000-000000000002','synthetic-worker-job',attempt,revision,'synthetic-evidence',coalesce(value,'{"groupId":"d0500000-0000-4000-8000-000000000004","reportedCoverage":"COMPLETE","unit":"PALLET","status":"OK","entries":1,"exits":0,"net":1,"source":"SYNTHETIC_RENDER","realInference":false,"overlayUploaded":false,"clipSha256":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","analysisVersion":"test-v1","timeMapping":"identity synthetic","flags":[],"events":[{"objectId":1,"seconds":1.25,"direction":"IN"}]}'));$$;
create function pg_temp.loading_select(version integer default 2) returns jsonb language sql as $$select jsonb_build_object('expectedVersion',version,'groupId','d0500000-0000-4000-8000-000000000004','observationId',(select value->>'id' from loading_case where name='observation'),'coverage','COMPLETE','reason','Synthetic full scope review');$$;
set local role authenticated;
select is(pg_temp.loading_call('read')#>>'{session,version}','1','session persists and can reopen');
select throws_ok($q$select pg_temp.loading_call('passport','{"expectedVersion":1}','d0500000-0000-4000-8000-000000000010')$q$,'PT409','SESSION_SCOPE_OPEN','open scope cannot create Passport');
select throws_ok($q$select pg_temp.loading_call('close','{"expectedVersion":0}','d0500000-0000-4000-8000-000000000010')$q$,'PT400','VALIDATION_ERROR','version required at SQL boundary');
set local "request.jwt.claims"='{"sub":"c2310000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($q$select pg_temp.loading_call('read')$q$,'PT403','FORBIDDEN_WORKFLOW','foreign subject cannot claim membership');
reset role;
set local role service_role;
set local "request.jwt.claims"='{"role":"service_role"}';
select throws_ok($q$select pg_temp.loading_observation(1,2)$q$,'PT409','STALE_MANIFEST','worker revision is bound to session');
insert into loading_case select 'observation',pg_temp.loading_observation();
select is((select value->>'reason' from loading_case where name='observation'),'RECORDED','trusted normalized worker observation accepted');
select is(pg_temp.loading_observation()->>'reason','ALREADY_RECORDED','duplicate worker callback preserves identity');
select throws_ok($q$select pg_temp.loading_observation(2,1,'{"groupId":"d0500000-0000-4000-8000-000000000099","reportedCoverage":"COMPLETE","unit":"PALLET","status":"OK","entries":1,"exits":0,"net":1,"source":"SYNTHETIC_RENDER","realInference":false,"overlayUploaded":false,"clipSha256":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","analysisVersion":"test-v1","timeMapping":"identity synthetic","flags":[],"events":[{"objectId":1,"seconds":1.25,"direction":"IN"}]}')$q$,'PT409','INCOMPATIBLE_GROUP','worker cannot claim an unknown manifest group');
select throws_ok($q$select pg_temp.loading_observation(1,1,'{"groupId":"d0500000-0000-4000-8000-000000000004","reportedCoverage":"COMPLETE","unit":"PALLET","status":"OK","entries":1,"exits":0,"net":1,"source":"SYNTHETIC_RENDER","realInference":false,"overlayUploaded":false,"clipSha256":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","analysisVersion":"changed","timeMapping":"identity synthetic","flags":[],"events":[{"objectId":1,"seconds":1.25,"direction":"IN"}]}')$q$,'PT409','OBSERVATION_CONFLICT','same attempt cannot replace an immutable observation');
select throws_ok($q$select pg_temp.loading_observation(1,1,'{"groupId":"d0500000-0000-4000-8000-000000000004","reportedCoverage":"COMPLETE","unit":"PALLET","status":"OK","entries":1,"exits":0,"net":7,"source":"SYNTHETIC_RENDER","realInference":false,"overlayUploaded":false,"clipSha256":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","analysisVersion":"test","timeMapping":"identity","flags":[],"events":[]}')$q$,'PT422','INCONSISTENT_OBSERVATION','inconsistent worker counts rejected');
reset role;
set local role authenticated;
set local "request.jwt.claims"='{"sub":"c2310000-0000-4000-8000-000000000001","role":"authenticated"}';
select is(pg_temp.loading_call('read')#>>'{session,version}','2','observation advances session version once');
select throws_ok($q$select pg_temp.loading_call('close','{"expectedVersion":1}','d0500000-0000-4000-8000-000000000010')$q$,'PT409','STALE_LOADING_SESSION','optimistic concurrency prevents stale close');
insert into loading_case select 'selection',pg_temp.loading_call('select',pg_temp.loading_select(),'d0500000-0000-4000-8000-000000000010');
select is(pg_temp.loading_call('select',pg_temp.loading_select(),'d0500000-0000-4000-8000-000000000010')->>'replay','true','receipt resolves before stale version check');
select throws_ok($q$select pg_temp.loading_call('select',pg_temp.loading_select(3),'d0500000-0000-4000-8000-000000000010')$q$,'PT409','IDEMPOTENCY_CONFLICT','same key cannot change payload');
select is(pg_temp.loading_call('close','{"expectedVersion":3}','d0500000-0000-4000-8000-000000000011')#>>'{record,session,state}','CLOSED','explicit close persists');
insert into loading_case select 'passport',pg_temp.loading_call('passport','{"expectedVersion":4}','d0500000-0000-4000-8000-000000000012');
select is(pg_temp.loading_call('passport','{"expectedVersion":4}','d0500000-0000-4000-8000-000000000013')#>>'{record,id}',(select value#>>'{record,id}' from loading_case where name='passport'),'one immutable Passport per session version');
select is((select value#>>'{record,source,observations,0,events,0,timecodeMs}' from loading_case where name='passport'),'1250','event time aliases preserved exactly');
reset role;
select throws_ok($q$update private.meta_loading_passports set session_version=99 where session_id='d0500000-0000-4000-8000-000000000002'$q$,'PT409','IMMUTABLE_LOADING_RECORD','historical Passport cannot be overwritten');
update public.organization_members set role='REQUESTER' where id='c2320000-0000-4000-8000-000000000001';
set local role authenticated;
select throws_ok($q$select pg_temp.loading_call('close','{"expectedVersion":3}','d0500000-0000-4000-8000-000000000011')$q$,'PT403','FORBIDDEN_WORKFLOW','role downgrade blocks privileged receipt replay');
select lives_ok($q$select pg_temp.loading_call('read')$q$,'requester retains authorized read');
reset role;
create function pg_temp.loading_explanation_value() returns jsonb language sql as $$select jsonb_build_object(
 'schemaVersion','1.0','reconciliationId','d0500000-0000-4000-8000-000000000005','reconciliationVersion',4,'comparisonStatus','DIFFERENCE_PROPOSED',
 'summary','Synthetic SQL scope case, not model output','reasons','[]'::jsonb,'limitations','[]'::jsonb,'suggestedActions','["CHECK_MANIFEST"]'::jsonb,'requiresHumanReview',true,
 'evidenceRefs',jsonb_build_array(jsonb_build_object('eventId',value#>>'{record,source,observations,0,events,0,eventId}','evidenceId',value#>>'{record,source,observations,0,events,0,evidenceId}','timecodeMs',1250)))
 from loading_case where name='passport';$$;
create function pg_temp.loading_explain(value jsonb) returns jsonb language sql as $$select public.meta_record_loading_explanation_v1('c2300000-0000-4000-8000-000000000001',(select (value#>>'{record,id}')::uuid from loading_case where name='passport'),'d0500000-0000-4000-8000-000000000004',$1);$$;
set local role service_role;
set local "request.jwt.claims"='{"role":"service_role"}';
select is(pg_temp.loading_explain(pg_temp.loading_explanation_value())->>'recorded','true','trusted explanation scope can be stored');
select is(pg_temp.loading_explain(pg_temp.loading_explanation_value())->>'recorded','false','exact explanation replay is idempotent');
select throws_ok($q$select pg_temp.loading_explain(jsonb_set(pg_temp.loading_explanation_value(),'{summary}','"Changed output"'))$q$,'PT409','EXPLANATION_CONFLICT','explanation cannot replace existing wording');
select throws_ok($q$select pg_temp.loading_explain(jsonb_set(pg_temp.loading_explanation_value(),'{evidenceRefs,0,timecodeMs}','999'))$q$,'PT409','EXPLANATION_EVIDENCE_MISMATCH','unseen evidence/timecode rejected');
reset role;
update private.meta_loading_sessions set mode='VERIFICATION' where id='d0500000-0000-4000-8000-000000000002';
set local role service_role;
select throws_ok($q$select pg_temp.loading_observation(2)$q$,'PT422','REAL_EVIDENCE_REQUIRED','synthetic clip cannot enter verification session');
reset role;
update private.meta_loading_sessions set mode='DEMO' where id='d0500000-0000-4000-8000-000000000002';
set local role service_role;
select is(pg_temp.loading_observation(3)->>'reason','RECORDED','later attempt is a new immutable observation');
select is(pg_temp.loading_observation(2)->>'reason','STALE_ATTEMPT','late old attempt cannot replace current facts');
select throws_ok($q$select pg_temp.loading_explain(pg_temp.loading_explanation_value())$q$,'PT409','STALE_PASSPORT','new session facts block stale explanation writes');
reset role;
select is((select session_version from private.meta_loading_passports where session_id='d0500000-0000-4000-8000-000000000002'),4,'new evidence preserves historical source version');
select is((select version from private.meta_loading_sessions where id='d0500000-0000-4000-8000-000000000002'),5,'new evidence makes prior Passport historical');
select * from finish();
rollback;
