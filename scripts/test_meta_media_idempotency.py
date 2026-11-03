"""Real PostgreSQL transactions/concurrent connections. No HTTP/AI doubles or paid inference.
Only dedicated local Docker containers; baseline synthetic A/B actors must exist.
"""
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
import argparse
import hashlib
import json
import subprocess
import uuid

parser = argparse.ArgumentParser()
parser.add_argument('--container', choices=['supabase_db_meta-luis-media-local', 'supabase_db_cargomesh-v2-local'], required=True)
args = parser.parse_args()
ORG = 'c2300000-0000-4000-8000-000000000001'
MEMBER = 'c2320000-0000-4000-8000-000000000001'
USER = 'c2310000-0000-4000-8000-000000000001'
B_ORG, B_MEMBER, B_USER = (x[:-1]+'2' for x in (ORG, MEMBER, USER))
drafts = []
passed = 0

def quote(value):
    return "'" + str(value).replace("'", "''") + "'"

def sql(query, user=None, error=None):
    if user:
        query = "begin; set local role authenticated; set local request.jwt.claims=" + quote(json.dumps({'sub': user, 'role': 'authenticated'})) + '; ' + query + '; commit;'
    result = subprocess.run(['docker', 'exec', '-i', args.container, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], input=query, text=True, capture_output=True, timeout=45)
    if error:
        assert result.returncode and error in result.stderr, (error, result.stderr)
        return None
    if result.returncode:
        raise AssertionError(result.stderr)
    return result.stdout.strip()

def draft():
    value = str(uuid.uuid4())
    drafts.append(value)
    return value

def payload(d=None, kind='photo', size=100):
    return dict(draftKey=d or draft(), requestId=None, requestVersion=None, kind=kind,
                mimeType='audio/wav' if kind == 'audio' else 'image/png', fileName='voice.wav' if kind == 'audio' else 'cargo.png',
                byteSize=size, contentSha256=hashlib.sha256(b'synthetic fixture').hexdigest())

def initialize(key, value, org=ORG, member=MEMBER, user=USER, error=None):
    query = 'select public.initialize_meta_declaration_media(' + ','.join(quote(x) for x in (org, member, key)) + ',' + quote(json.dumps(value)) + '::jsonb)'
    result = sql(query, user, error)
    return json.loads(result) if result else None

def pass_case(name):
    global passed
    passed += 1
    print(json.dumps(dict(case=name, status='PASS')), flush=True)

def race(functions):
    barrier = Barrier(len(functions))
    def call(fn):
        barrier.wait(timeout=30)
        try:
            return fn(), None
        except AssertionError as exc:
            return None, str(exc)
    with ThreadPoolExecutor(max_workers=len(functions)) as pool:
        return list(pool.map(call, functions))

try:
    for kind in ('photo', 'audio'):
        p, key = payload(kind=kind), str(uuid.uuid4())
        # Commit succeeds but the caller discards the first response.
        original = initialize(key, p)
        recovered = initialize(key, p)
        assert original['row']['id'] == recovered['row']['id'] and recovered['replay']
        assert sql('select count(*) from public.meta_declaration_media where draft_key='+quote(p['draftKey'])) == '1'
        pass_case(kind+'-lost-response-after-commit')
        p, key = payload(kind=kind), str(uuid.uuid4())
        results = race([lambda: initialize(key, p) for _ in range(6)])
        assert all(err is None for _, err in results), results
        assert len({r['row']['id'] for r, _ in results}) == 1
        assert sum(not r['replay'] for r, _ in results) == 1
        pass_case(kind+'-six-simultaneous-initializations-one-reservation')
        initialize(key, p | {'fileName': 'different'}, error='IDEMPOTENCY_CONFLICT')
        initialize(key, p | {'contentSha256': 'a'*64}, error='IDEMPOTENCY_CONFLICT')
        pass_case(kind+'-same-key-different-metadata-or-bytes-conflicts')
        canonical = initialize(key, dict(reversed(list(p.items()))) | {'fileName': '  '+p['fileName']+'  '})
        assert canonical['row']['id'] == results[0][0]['row']['id']
        pass_case(kind+'-canonical-json-key-order-and-trim')
        identifier = canonical['row']['id']
        sql('update public.meta_declaration_media set state=\'READY\',sha256=expected_sha256 where id='+quote(identifier))
        ready = initialize(key, p)
        assert ready['row']['id'] == identifier and ready['row']['state'] == 'READY'
        assert ready['row']['sha256'] == p['contentSha256']
        pass_case(kind+'-ready-replay-preserves-original')
        initialize(key, p | {'draftKey': draft()}, error='IDEMPOTENCY_CONFLICT')
        other = initialize(key, p, B_ORG, B_MEMBER, B_USER)
        assert other['row']['id'] != identifier and other['row']['organization_id'] == B_ORG
        initialize(str(uuid.uuid4()), p, ORG, MEMBER, B_USER, error='FORBIDDEN_TENANT')
        pass_case(kind+'-key-is-tenant-member-scoped-and-draft-bound')
        sql('update public.meta_declaration_media set state=\'REMOVED\' where id='+quote(identifier))
        initialize(key, p, error='MEDIA_REMOVED')
        pass_case(kind+'-removed-replay-does-not-revive-evidence')

    for kind, size, expected in [('photo', 100, 4), ('audio', 100, 1), ('photo', 5*1024*1024, 2)]:
        p = payload(kind=kind, size=size)
        keys = [str(uuid.uuid4()) for _ in range(10)]
        results = race([lambda k=k: initialize(k, p) for k in keys])
        assert sum(err is None for _, err in results) == expected, results
        assert all(err is None or 'MEDIA_LIMIT' in err for _, err in results)
        assert sql('select count(*) from public.meta_declaration_media where draft_key='+quote(p['draftKey'])) == str(expected)
        pass_case(f'concurrent-{kind}-{size}-quota-exactly-{expected}')
    # Different keys in different drafts have independent quotas, not a tenant-wide quota.
    for _ in range(2):
        p = payload(kind='audio')
        assert initialize(str(uuid.uuid4()), p)['row']['draft_key'] == p['draftKey']
    pass_case('independent-draft-quotas')
    # Direct RPC access cannot bypass authentication/ownership using privileged row IDs.
    assert sql("select has_function_privilege('anon','public.initialize_meta_declaration_media(uuid,uuid,uuid,jsonb)','EXECUTE')") == 'f'
    assert sql("select has_table_privilege('authenticated','public.meta_declaration_media','INSERT')") == 'f'
    pass_case('anonymous-rpc-and-direct-insert-denied')
finally:
    if drafts:
        sql('delete from public.meta_declaration_media where draft_key in ('+','.join(map(quote, drafts))+')')
print(json.dumps(dict(passed=passed, persistence='real local PostgreSQL', paidInference=0)))
