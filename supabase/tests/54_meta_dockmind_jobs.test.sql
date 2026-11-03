-- Synthetic rollback-only SQL boundary tests for DockMind clips, jobs and delivery to Juan's observations.
begin;
set local search_path=extensions,public;
select no_plan();
select ok(not has_function_privilege('anon','public.meta_dockmind_v1(uuid,uuid,text,jsonb,uuid)','EXECUTE'),'anonymous DockMind RPC forbidden');
select ok(not has_function_privilege('authenticated','public.meta_dockmind_server_v1(text,jsonb)','EXECUTE'),'browser cannot publish worker results or delivery');
select ok(has_function_privilege('service_role','public.meta_dockmind_server_v1(text,jsonb)','EXECUTE'),'server capability granted to the service role');
select ok(not has_table_privilege('authenticated','private.meta_dockmind_jobs','UPDATE'),'no direct job DML from members');
select ok(not has_table_privilege('service_role','private.meta_dockmind_jobs','UPDATE'),'server writes through validated transitions');
select is((select count(*)::integer from pg_class where oid in('private.meta_dockmind_clips'::regclass,'private.meta_dockmind_jobs'::regclass) and relrowsecurity),2,'both tables have RLS');
select is((select jsonb_build_object('public',public,'limit',file_size_limit,'types',allowed_mime_types) from storage.buckets where id='meta-dockmind'),
 '{"public":false,"limit":52428800,"types":["video/mp4","video/quicktime"]}'::jsonb,'private bucket limited to 50 MB MP4/MOV');

create temporary table dockmind_case(name text primary key,value jsonb);
grant select,insert,update on dockmind_case to authenticated,service_role;
create function pg_temp.dockmind_payload() returns jsonb language sql as $$select '{
 "schemaVersion":"2.0","origin":{"facilityId":"c2330000-0000-4000-8000-000000000001"},"destination":{"facilityId":"c2330000-0000-4000-8000-000000000002"},
 "pickupWindow":{"startsAt":"2026-11-02T08:00:00Z","endsAt":"2026-11-02T18:00:00Z"},"deliveryWindow":{"startsAt":"2026-11-03T08:00:00Z","endsAt":"2026-11-03T20:00:00Z"},"acceptedModes":["ROAD"],"requiredEquipment":null,
 "cargoSpecification":{"categoryCode":"GENERAL","description":"Synthetic DockMind test","packaging":"PALLET","totalWeightKg":1000,"totalVolumeM3":10,"divisible":true,"requirements":[],"units":[{"packageType":"PALLET","quantity":10,"weightPerUnitKg":100,"volumePerUnitM3":1,"dimensionsCm":{"length":100,"width":100,"height":100},"indivisible":true,"stackable":false}]},
 "contacts":{"pickup":{"name":"Example sender","phoneE164":"+12025550123"},"recipient":{"name":"Example recipient","phoneE164":"+12025550124"}}}'::jsonb;$$;
set local role authenticated;
set local "request.jwt.claims"='{"sub":"c2310000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into dockmind_case select 'request',public.create_v2_freight_request('c2300000-0000-4000-8000-000000000001','c2320000-0000-4000-8000-000000000001','d0510000-0000-4000-8000-000000000001',private.hash_v2_freight_payload(pg_temp.dockmind_payload()),pg_temp.dockmind_payload());
reset role;
-- A test owner inserts one synthetic frozen session, as in Juan's test; this does not emulate CR-01.
insert into private.meta_loading_sessions(id,organization_id,request_id,facility_id,facility_name,mode,manifest_id,manifest_revision,manifest,groups,opened_by)
select 'd0510000-0000-4000-8000-000000000002','c2300000-0000-4000-8000-000000000001',(value->>'id')::uuid,'c2330000-0000-4000-8000-000000000001','[SYNTHETIC] DockMind test','DEMO','d0510000-0000-4000-8000-000000000003',1,
 jsonb_build_object('id','d0510000-0000-4000-8000-000000000003','revision',1,'status','CONFIRMED','contentHash',repeat('a',64),'declaration',jsonb_build_object('schemaVersion','0.1','source',jsonb_build_object('requestId',value->>'id','organizationId','c2300000-0000-4000-8000-000000000001','requestDraftVersion',1),'cargoSpecification',pg_temp.dockmind_payload()->'cargoSpecification','groupBindings',jsonb_build_array(jsonb_build_object('groupId','d0510000-0000-4000-8000-000000000004','sourceUnitIndex',0)))),
 '[{"id":"d0510000-0000-4000-8000-000000000004","comparisonId":"d0510000-0000-4000-8000-000000000005","label":"PALLET","unit":"PALLET","count":10}]',
 'c2320000-0000-4000-8000-000000000001' from dockmind_case where name='request';

create function pg_temp.member(action text,value jsonb default '{}',key uuid default null) returns jsonb language sql as $$
 select public.meta_dockmind_v1('c2300000-0000-4000-8000-000000000001','c2320000-0000-4000-8000-000000000001',action,value,key);$$;
create function pg_temp.server(action text,value jsonb) returns jsonb language sql as $$select public.meta_dockmind_server_v1(action,value);$$;
create function pg_temp.clip_value(source text default 'OWN_CAPTURE') returns jsonb language sql as $$
 select jsonb_build_object('sessionId','d0510000-0000-4000-8000-000000000002','source',source,'mimeType','video/mp4','sizeBytes',1048576,'sha256',repeat('c',64));$$;
create function pg_temp.config(unit text default 'PALLET') returns jsonb language sql as $$
 select jsonb_build_object('line',jsonb_build_object('x1',0.5,'y1',0.05,'x2',0.5,'y2',0.95,'inside_x',0.8,'inside_y',0.5),'unit',unit,'concept','wooden pallet','margin',0.01,'min_track_frames',3);$$;
create function pg_temp.job_value(coverage text default 'COMPLETE',config jsonb default null,revision integer default 1,grp text default 'd0510000-0000-4000-8000-000000000004') returns jsonb language sql as $$
 select jsonb_build_object('sessionId','d0510000-0000-4000-8000-000000000002','clipId',(select value#>>'{record,clipId}' from dockmind_case where name='clip'),
  'groupId',grp,'coverage',coverage,'manifestRevision',revision,'config',coalesce(config,pg_temp.config()));$$;
create function pg_temp.job_id() returns text language sql as $$select value#>>'{record,jobId}' from dockmind_case where name='job';$$;
create function pg_temp.observation(sha text default repeat('c',64)) returns jsonb language sql as $$
 select jsonb_build_object('analysis_version','test-v1','clip',jsonb_build_object('sha256',sha,'source','OWN_CAPTURE','time_mapping','identity synthetic'),
  'config',jsonb_build_object('unit','PALLET'),'result',jsonb_build_object('status','OK','entries',1,'exits',0,'net',1),'evidence',jsonb_build_object('overlay_uploaded',false));$$;
create function pg_temp.result(attempt integer default 1,status text default 'SUCCEEDED',grp text default 'd0510000-0000-4000-8000-000000000004') returns jsonb language sql as $$
 select jsonb_build_object('id',pg_temp.job_id(),'attempt',attempt,'organizationId','c2300000-0000-4000-8000-000000000001','sessionId','d0510000-0000-4000-8000-000000000002',
  'evidenceId',(select value#>>'{record,clipId}' from dockmind_case where name='clip'),'groupId',grp,'manifestRevision',1,'status',status,
  'error',case when status='FAILED' then '{"code":"PROVIDER_UNAVAILABLE","message":"synthetic outage"}'::jsonb else 'null'::jsonb end,
  'observation',case when status='SUCCEEDED' then pg_temp.observation() else 'null'::jsonb end,
  'overlay','{"status":"NONE","sha256":null}'::jsonb);$$;
-- A result whose annotated video the server verified at the path of that attempt.
create function pg_temp.result_with_overlay(attempt integer,sha text) returns jsonb language sql as $$
 select jsonb_set(jsonb_set(pg_temp.result(attempt),'{overlay}',jsonb_build_object('status','VERIFIED','sha256',sha)),
  '{observation,evidence}',jsonb_build_object('overlay_uploaded',true,'overlay_sha256',sha));$$;
-- Juan's recorder with the values DockMind derives from the saved job; the payload is identical on every delivery.
create function pg_temp.juan_record(attempt integer default 1) returns jsonb language sql as $$
 select public.meta_record_loading_observation_v1('c2300000-0000-4000-8000-000000000001','d0510000-0000-4000-8000-000000000002',pg_temp.job_id(),attempt,1,
  (select value#>>'{record,clipId}' from dockmind_case where name='clip'),
  '{"groupId":"d0510000-0000-4000-8000-000000000004","reportedCoverage":"COMPLETE","unit":"PALLET","status":"OK","entries":1,"exits":0,"net":1,"source":"OWN_CAPTURE","realInference":true,"overlayUploaded":false,"clipSha256":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc","analysisVersion":"test-v1","timeMapping":"identity synthetic","flags":[],"events":[{"objectId":1,"seconds":1.25,"direction":"IN"}]}');$$;

-- Clips: PENDING -> READY, bound to organization and session, idempotent per member key.
set local role authenticated;
set local "request.jwt.claims"='{"sub":"c2310000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into dockmind_case select 'clip',pg_temp.member('register_clip',pg_temp.clip_value(),'d0510000-0000-4000-8000-000000000010');
select is((select value#>>'{record,state}' from dockmind_case where name='clip'),'PENDING','a registered clip waits for its upload');
select is((select value#>>'{record,storagePath}' from dockmind_case where name='clip'),
 'org/c2300000-0000-4000-8000-000000000001/d0510000-0000-4000-8000-000000000002/'||(select value#>>'{record,clipId}' from dockmind_case where name='clip')||'.mp4','storage path derives from stable IDs');
select is(pg_temp.member('register_clip',pg_temp.clip_value(),'d0510000-0000-4000-8000-000000000010')#>>'{record,clipId}',(select value#>>'{record,clipId}' from dockmind_case where name='clip'),'same key replays the same clip');
select throws_ok($q$select pg_temp.member('register_clip',pg_temp.clip_value('SYNTHETIC_RENDER'),'d0510000-0000-4000-8000-000000000010')$q$,'PT409','IDEMPOTENCY_CONFLICT','same key cannot change the clip');
select throws_ok($q$select pg_temp.member('register_clip',jsonb_set(pg_temp.clip_value(),'{sizeBytes}','52428801'),'d0510000-0000-4000-8000-000000000011')$q$,'PT400','VALIDATION_ERROR','clips above 50 MB are rejected');
select throws_ok($q$select pg_temp.member('register_clip',jsonb_set(pg_temp.clip_value(),'{mimeType}','"video/webm"'),'d0510000-0000-4000-8000-000000000011')$q$,'PT400','VALIDATION_ERROR','only MP4 or MOV');
select throws_ok($q$select pg_temp.member('create_job',pg_temp.job_value())$q$,'PT409','EVIDENCE_NOT_READY','a pending upload cannot be analyzed');
reset role;
update private.meta_loading_sessions set mode='VERIFICATION' where id='d0510000-0000-4000-8000-000000000002';
set local role authenticated;
select throws_ok($q$select pg_temp.member('register_clip',pg_temp.clip_value('SYNTHETIC_RENDER'),'d0510000-0000-4000-8000-000000000012')$q$,'PT422','REAL_EVIDENCE_REQUIRED','verification only accepts own capture');
reset role;
update private.meta_loading_sessions set mode='DEMO' where id='d0510000-0000-4000-8000-000000000002';

-- Tenant isolation: another organization's member neither claims tenant A nor reads its rows through tenant B.
set local role authenticated;
set local "request.jwt.claims"='{"sub":"c2310000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($q$select pg_temp.member('read_clip',jsonb_build_object('id',(select value#>>'{record,clipId}' from dockmind_case where name='clip')))$q$,'PT403','FORBIDDEN_WORKFLOW','foreign subject cannot claim membership');
select is(public.meta_dockmind_v1('c2300000-0000-4000-8000-000000000002','c2320000-0000-4000-8000-000000000002','read_clip',jsonb_build_object('id',(select value#>>'{record,clipId}' from dockmind_case where name='clip'))),'null'::jsonb,'tenant B cannot read tenant A clip');
select throws_ok($q$select public.meta_dockmind_v1('c2300000-0000-4000-8000-000000000002','c2320000-0000-4000-8000-000000000002','register_clip',pg_temp.clip_value(),'d0510000-0000-4000-8000-000000000013')$q$,'PT404','LOADING_SESSION_NOT_FOUND','tenant B cannot attach a clip to tenant A session');
select throws_ok($q$select count(*) from private.meta_dockmind_clips$q$,'42501',null,'members never read the private table directly');
reset role;

-- The server verifies the upload: size and hash must match what the member declared.
set local role service_role;
set local "request.jwt.claims"='{"role":"service_role"}';
select throws_ok($q$select pg_temp.server('clip_ready',jsonb_build_object('id',(select value#>>'{record,clipId}' from dockmind_case where name='clip'),'container','MP4','sizeBytes',1048576,'sha256',repeat('d',64)))$q$,'PT409','UPLOAD_MISMATCH','different bytes never become READY');
select is(pg_temp.server('clip_ready',jsonb_build_object('id',(select value#>>'{record,clipId}' from dockmind_case where name='clip'),'container','MP4','sizeBytes',1048576,'sha256',repeat('c',64)))->>'state','READY','verified upload becomes READY');
select throws_ok($q$select pg_temp.server('clip_rejected',jsonb_build_object('id',(select value#>>'{record,clipId}' from dockmind_case where name='clip'),'reason','MEDIA_INVALID'))$q$,'PT409','EVIDENCE_ALREADY_READY','a READY clip is not rejected afterwards');
reset role;

-- Jobs: dedupe per organization and canonical payload; scope checked against the session.
set local role authenticated;
set local "request.jwt.claims"='{"sub":"c2310000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into dockmind_case select 'job',pg_temp.member('create_job',pg_temp.job_value());
select is((select value->>'created' from dockmind_case where name='job'),'true','first request creates a queued job');
select is(pg_temp.member('create_job',pg_temp.job_value())#>>'{record,jobId}',pg_temp.job_id(),'same canonical payload returns the same job');
select isnt(pg_temp.member('create_job',pg_temp.job_value('PARTIAL'))#>>'{record,jobId}',pg_temp.job_id(),'another declared coverage is another job');
select throws_ok($q$select pg_temp.member('create_job',pg_temp.job_value('COMPLETE',null,2))$q$,'PT409','STALE_MANIFEST','job bound to the session manifest revision');
select throws_ok($q$select pg_temp.member('create_job',pg_temp.job_value('COMPLETE',null,1,'d0510000-0000-4000-8000-000000000099'))$q$,'PT404','MANIFEST_GROUP_NOT_FOUND','unknown manifest group');
select throws_ok($q$select pg_temp.member('create_job',pg_temp.job_value('COMPLETE',pg_temp.config('BOX')))$q$,'PT409','INCOMPATIBLE_UNIT','PALLET and BOX are never mixed');
select throws_ok($q$select pg_temp.member('create_job',pg_temp.job_value('COMPLETE',pg_temp.config()-'margin'))$q$,'PT400','VALIDATION_ERROR','effective configuration must be explicit');
select is(pg_temp.member('mark_dispatched',jsonb_build_object('id',pg_temp.job_id(),'attempt',1,'callId','fc-test'))#>>'{record,status}','RUNNING','dispatch moves the queued attempt to RUNNING');
select is(pg_temp.member('mark_dispatched',jsonb_build_object('id',pg_temp.job_id(),'attempt',1,'callId','fc-test'))->'record','null'::jsonb,'a second dispatch mark changes nothing');
select throws_ok($q$select pg_temp.member('retry_job',jsonb_build_object('id',pg_temp.job_id(),'expectedAttempt',1))$q$,'PT409','ANALYSIS_NOT_RETRYABLE','a running job is not retried before the deadline');
reset role;

-- Signed worker result: exact identity, one transition per attempt, and SUCCEEDED separate from delivery.
set local role service_role;
set local "request.jwt.claims"='{"role":"service_role"}';
select throws_ok($q$select pg_temp.server('complete_job',pg_temp.result(1,'SUCCEEDED','d0510000-0000-4000-8000-000000000099'))$q$,'PT409','INPUT_REVISION_MISMATCH','result for another group rejected');
select throws_ok($q$select pg_temp.server('complete_job',pg_temp.result(2))$q$,'PT409','INPUT_REVISION_MISMATCH','result for a future attempt rejected');
select throws_ok($q$select pg_temp.server('complete_job',jsonb_set(pg_temp.result(),'{observation}',pg_temp.observation(repeat('e',64))))$q$,'PT409','INPUT_REVISION_MISMATCH','result counted on other bytes rejected');
select is(pg_temp.server('complete_job',pg_temp.result())->>'outcome','RECORDED','signed result saved once');
select is(pg_temp.server('read_job',jsonb_build_object('id',pg_temp.job_id()))#>>'{delivery,status}','PENDING','SUCCEEDED leaves the observation pending delivery');
select is(pg_temp.server('complete_job',pg_temp.result(1,'FAILED'))->>'outcome','ALREADY_RECORDED','a later result cannot replace SUCCEEDED');
-- Mandatory case at the SQL boundary: Juan fails, the delivery stays pending, then one immutable observation.
select is(pg_temp.server('record_delivery',jsonb_build_object('id',pg_temp.job_id(),'attempt',1,'outcome','RETRY','error',jsonb_build_object('code','LOADING_DATABASE_ERROR','message','synthetic outage')))#>>'{record,delivery,tries}','1','failed delivery recorded durably');
select is(pg_temp.server('read_job',jsonb_build_object('id',pg_temp.job_id()))#>>'{delivery,status}','PENDING','delivery stays recoverable after a failure');
insert into dockmind_case select 'observation',pg_temp.juan_record();
select is(pg_temp.juan_record()->>'id',(select value->>'id' from dockmind_case where name='observation'),'a repeated delivery returns the same observation');
select is(pg_temp.server('record_delivery',jsonb_build_object('id',pg_temp.job_id(),'attempt',1,'outcome','DELIVERED','observationId',(select value->>'id' from dockmind_case where name='observation')))#>>'{record,delivery,status}','DELIVERED','delivery linked to Juan observation');
select is(pg_temp.server('record_delivery',jsonb_build_object('id',pg_temp.job_id(),'attempt',1,'outcome','RETRY','error',jsonb_build_object('code','LOADING_DATABASE_ERROR','message','late failure')))->>'applied','false','a late failure cannot reopen a delivered observation');
reset role;
select is((select count(*)::integer from private.meta_loading_observations where job_id=pg_temp.job_id()),1,'observation registered exactly once');
select throws_ok($q$update private.meta_dockmind_jobs set delivery_status='PENDING' where id=pg_temp.job_id()::uuid$q$,'23514',null,'delivered state requires the observation link');

-- Retries: only failed or overdue attempts, from the attempt the member saw; old results never replace new ones.
set local role authenticated;
set local "request.jwt.claims"='{"sub":"c2310000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($q$select pg_temp.member('retry_job',jsonb_build_object('id',pg_temp.job_id(),'expectedAttempt',1))$q$,'PT409','ANALYSIS_NOT_RETRYABLE','a SUCCEEDED job is never re-run');
update dockmind_case set value=pg_temp.member('create_job',pg_temp.job_value('PARTIAL')) where name='job';
reset role;
set local role service_role;
set local "request.jwt.claims"='{"role":"service_role"}';
select is(pg_temp.server('complete_job',pg_temp.result(1,'FAILED'))#>>'{record,delivery,status}','NOT_REQUIRED','a failed analysis has nothing to deliver');
reset role;
set local role authenticated;
set local "request.jwt.claims"='{"sub":"c2310000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($q$select pg_temp.member('retry_job',jsonb_build_object('id',pg_temp.job_id(),'expectedAttempt',2))$q$,'PT409','STALE_ANALYSIS_JOB','retry needs the attempt the member saw');
select is(pg_temp.member('retry_job',jsonb_build_object('id',pg_temp.job_id(),'expectedAttempt',1))#>>'{record,attempt}','2','failed job gets a new attempt');
select throws_ok($q$select pg_temp.member('retry_job',jsonb_build_object('id',pg_temp.job_id(),'expectedAttempt',1))$q$,'PT409','STALE_ANALYSIS_JOB','two concurrent retries create one attempt');
reset role;
set local role service_role;
set local "request.jwt.claims"='{"role":"service_role"}';
select is(pg_temp.server('complete_job',pg_temp.result(1))->>'outcome','STALE_ATTEMPT','an old attempt result is ignored');
select is(pg_temp.server('read_job',jsonb_build_object('id',pg_temp.job_id()))#>>'{status}','QUEUED','the new attempt stays untouched');

-- One annotated-video object per attempt (20261101180000): a late attempt 1 never changes attempt 2's evidence.
select ok(pg_temp.server('read_job',jsonb_build_object('id',pg_temp.job_id()))->>'overlayPath' like '%-'||pg_temp.job_id()||'-a2-overlay.mp4','the overlay path is derived from the job and the current attempt');
select throws_ok($q$select pg_temp.server('complete_job',jsonb_set(pg_temp.result(2),'{overlay}','{"status":"VERIFIED","sha256":null}'))$q$,'PT400','VALIDATION_ERROR','a verified overlay needs its hash');
select throws_ok($q$select pg_temp.server('complete_job',jsonb_set(pg_temp.result_with_overlay(2,repeat('7',64)),'{observation,evidence,overlay_sha256}','"8888888888888888888888888888888888888888888888888888888888888888"'))$q$,'PT409','INPUT_REVISION_MISMATCH','the verified bytes are the ones the worker declared');
select throws_ok($q$select pg_temp.server('complete_job',jsonb_set(pg_temp.result(2,'FAILED'),'{overlay}','{"status":"MISSING","sha256":null}'))$q$,'PT400','VALIDATION_ERROR','a failed attempt has no annotated video');
select is(pg_temp.server('complete_job',pg_temp.result_with_overlay(2,repeat('7',64)))#>'{record,overlay}',jsonb_build_object('status','VERIFIED','sha256',repeat('7',64)),'attempt 2 keeps the video the server verified');
select is(pg_temp.server('complete_job',pg_temp.result_with_overlay(1,repeat('9',64)))->>'outcome','STALE_ATTEMPT','a late attempt 1 result is ignored');
select is(pg_temp.server('read_job',jsonb_build_object('id',pg_temp.job_id()))#>>'{overlay,sha256}',repeat('7',64),'a late attempt 1 never replaces the verified video of attempt 2');
select is(pg_temp.server('complete_job',pg_temp.result_with_overlay(2,repeat('9',64)))->>'outcome','ALREADY_RECORDED','a repeated callback of attempt 2 does not change its video');
select is(pg_temp.server('read_job',jsonb_build_object('id',pg_temp.job_id()))#>>'{overlay,sha256}',repeat('7',64),'finalized evidence is never replaced');
reset role;
select throws_ok($q$update private.meta_dockmind_jobs set overlay_sha256=null where id=pg_temp.job_id()::uuid$q$,'23514',null,'a verified video requires its hash');
select * from finish();
rollback;
