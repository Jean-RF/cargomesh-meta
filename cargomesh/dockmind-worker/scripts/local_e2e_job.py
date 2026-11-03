"""Corre un job DockMind en esta máquina para el recorrido local de punta a punta.

No reemplaza a Modal ni se despliega: recibe el mismo `dockmind.job.v2` que manda la app, lo valida con
`parse_job` y lo ejecuta con `run_job`, el código que corre en Modal (descarga, análisis, video anotado,
callback firmado con reenvío). Dos diferencias, rotuladas en la evidencia del recorrido:
- La app firma URLs https con el host de prueba `local.dockmind.test`; aquí se traducen a la Supabase y a la
  app locales (solo 127.0.0.1 o localhost).
- El segmentador es el FIXTURE del clip sintético: no hay inferencia real ni costo de SAM.

Uso (con el venv activo):
  DOCKMIND_CALLBACK_SECRET=... DOCKMIND_LOCAL_URL_MAP='{"https://local.dockmind.test/storage/": "http://127.0.0.1:58321/storage/"}' \
    python scripts/local_e2e_job.py <clip.fixture.txt> < job.json
Imprime el recibo del job en una línea JSON, sin URLs ni secretos.
"""

from __future__ import annotations

import dataclasses
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

import httpx

from dockmind.jobs import parse_job, run_job
from dockmind.sam_client import FixtureSegmenter

TEST_HOST = "local.dockmind.test"


def main() -> int:
    fixture = Path(sys.argv[1])
    payload = json.load(sys.stdin)
    mapping: dict[str, str] = json.loads(os.environ["DOCKMIND_LOCAL_URL_MAP"])
    if any(urlparse(target).hostname not in ("127.0.0.1", "localhost") for target in mapping.values()):
        raise SystemExit("El recorrido local solo traduce a 127.0.0.1 o localhost")

    def local(url: str) -> str:
        for prefix, target in mapping.items():
            if url.startswith(prefix):
                return target + url[len(prefix):]
        raise SystemExit("URL sin traducción local")

    job = parse_job(payload, {TEST_HOST})
    job = dataclasses.replace(
        job,
        clip_url=local(job.clip_url),
        overlay_upload_url=local(job.overlay_upload_url) if job.overlay_upload_url else None,
        callback_url=local(job.callback_url),
    )
    with httpx.Client(timeout=120, follow_redirects=False) as http:
        outcome = run_job(job, os.environ["DOCKMIND_CALLBACK_SECRET"], http, segmenter_factory=lambda: FixtureSegmenter(fixture))
    observation = outcome.result["observation"] or {}
    print(json.dumps({
        "job_id": job.job_id,
        "attempt": job.attempt,
        "status": outcome.result["status"],
        "error": outcome.result["error"],
        "net": observation.get("result", {}).get("net"),
        "segmenter": observation.get("segmentation", {}).get("segmenter"),
        "real_inference": observation.get("segmentation", {}).get("real_inference"),
        "overlay_uploaded": observation.get("evidence", {}).get("overlay_uploaded"),
        "overlay_sha256": observation.get("evidence", {}).get("overlay_sha256"),
        "reused": outcome.reused,
        "delivery": dataclasses.asdict(outcome.delivery),
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
