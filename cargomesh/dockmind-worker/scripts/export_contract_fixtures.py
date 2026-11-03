"""Exporta fixtures del contrato dockmind.job.v2 / dockmind.result.v2 desde el worker real.

Uso (con el venv activo, desde cargomesh/dockmind-worker):
  python scripts/export_contract_fixtures.py

Usa un clip SYNTHETIC_RENDER y un segmentador FIXTURE: los fixtures sirven para
probar el contrato, nunca como inferencia real. Si el contrato cambia, se
regeneran y la prueba de Zod en cargomesh/src/shared/schemas/meta los vuelve a validar.
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import httpx

from dockmind.jobs import JOB_SCHEMA, parse_job, run_job
from dockmind.sam_client import FixtureSegmenter, ProviderUnavailable
from dockmind.synthetic import generate

TARGET = Path(__file__).resolve().parents[2] / "src" / "shared" / "schemas" / "meta" / "fixtures"
HOSTS = {"storage.example.test", "app.example.test"}
JOB = {
    "schema": JOB_SCHEMA,
    "job_id": "00000000-0000-4000-8000-00000000d001",
    "attempt": 1,
    "organization_id": "00000000-0000-4000-8000-00000000a001",
    "session_id": "00000000-0000-4000-8000-00000000b001",
    "evidence_id": "00000000-0000-4000-8000-00000000c001",
    "group_id": "00000000-0000-4000-8000-00000000e001",
    "manifest_revision": 1,
    "clip_url": "https://storage.example.test/clip?token=synthetic",
    "overlay_upload_url": "https://storage.example.test/upload?token=synthetic",
    "callback_url": "https://app.example.test/api/v2/meta/dockmind/callback",
    "source": "SYNTHETIC_RENDER",
    "config": {
        "line": {"x1": 0.5, "y1": 0.0, "x2": 0.5, "y2": 1.0, "inside_x": 0.8, "inside_y": 0.5},
        "unit": "BOX",
        "concept": "cardboard box",
    },
}


def _run(clip: Path, segmenter_factory) -> dict:
    def server(request: httpx.Request) -> httpx.Response:
        if request.method == "GET":
            return httpx.Response(200, content=clip.read_bytes())
        return httpx.Response(200)

    with httpx.Client(transport=httpx.MockTransport(server)) as http:
        return run_job(parse_job(JOB, HOSTS), "fixture-secret", http, segmenter_factory=segmenter_factory).result


class _Down:
    name = "META_SAM_API"

    def segment(self, video, concept):
        raise ProviderUnavailable("SAM no respondió: timeout (fixture)")


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        clips = Path(tmp)
        generate(clips, ["oclusion"])
        clip = clips / "sintetico_oclusion.mp4"
        review = _run(clip, lambda: FixtureSegmenter(clips / "sintetico_oclusion.fixture.txt"))
        failed = _run(clip, _Down)
    outputs = {
        "dockmind-job.json": JOB,
        "dockmind-result.requires-review.json": review,
        "dockmind-result.failed.json": failed,
    }
    for name, data in outputs.items():
        (TARGET / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Escrito {TARGET / name}")


if __name__ == "__main__":
    main()
