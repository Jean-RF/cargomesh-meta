"""Reproduce two PR12 evaluation gaps with test doubles, without network or inference.

Usage: python repro.py <PR12 cargomesh/dockmind-worker directory>
Does not edit the reviewed source. These packs are not physical SAM evidence.
"""
import json
from pathlib import Path
import sys
import tempfile

sys.path.insert(0, str(Path(sys.argv[1]).resolve() / 'src'))
from dockmind.evaluate import evaluate, to_markdown

A = '879dc96b-3c00-43e1-b772-619996b2b713'
B = 'd1b2aab3-29d2-4b90-8a70-d369c0dd1f6c'

def pack(sha, group, count, coverage):
    return {'schema': 'dockmind.evidence.v1',
            'identity': {'evidenceId': group, 'groupId': group, 'coverage': coverage},
            'clip': {'source': 'OWN_CAPTURE', 'sha256Uploaded': sha},
            'provenance': {'segmenter': 'META_SAM_API', 'realInference': True},
            'count': {'status': 'OK', 'net': count, 'reviewFlags': []},
            'providerUsage': {'seconds': 12.5, 'estimatedCostUsd': 0.06}}

with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    reference = root / 'reference.csv'
    reference.write_text('clip,sha256,grupo,cobertura,segundo,direccion,total_esperado\n'
                         f'a.mp4,{"a"*64},{A},COMPLETE,1,IN,8\n'
                         f'b.mp4,{"b"*64},{B},COMPLETE,1,IN,4\n', encoding='utf8')
    for name, value in [('a', pack('a'*64, A, 8, 'COMPLETE')), ('b', pack('b'*64, B, 4, None))]:
        directory = root / 'out' / name
        directory.mkdir(parents=True)
        (directory / 'evidencia.json').write_text(json.dumps(value), encoding='utf8')
    rows = evaluate(reference, root / 'out')
    print('NULL_COVERAGE_ACTUAL:', [(r.group, r.coverage, r.problem, r.exact) for r in rows])
    failed = pack('b'*64, B, 4, 'COMPLETE')
    failed.update(status='FAILED', count=None, provenance=None, providerUsage=None)
    (root / 'out' / 'b' / 'evidencia.json').write_text(json.dumps(failed), encoding='utf8')
    print('FAILED_B_ACTUAL:\n' + to_markdown(evaluate(reference, root / 'out')))
    (root / 'out' / 'b' / 'evidencia.json').unlink()
    print('MISSING_B_ACTUAL:\n' + to_markdown(evaluate(reference, root / 'out')))
