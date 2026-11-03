"""Ejecutor de jobs con HTTP simulado: descarga, análisis, subida del video anotado y callback firmado."""

import copy
import hashlib
import json
import re
import shutil
from pathlib import Path

import httpx
import pytest

from dockmind.jobs import (
    CALLBACK_BACKOFF_SECONDS,
    CALLBACK_TRIES,
    JOB_SCHEMA,
    RESULT_SCHEMA,
    SIGNATURE_HEADER,
    TIMESTAMP_HEADER,
    OVERLAY_BACKOFF_SECONDS,
    Delivery,
    JobRejected,
    parse_job,
    result_key,
    run_job,
    verify,
)
from dockmind.models import CountConfig, CountingLine, Unit
from dockmind.sam_client import FixtureSegmenter, ProviderUnavailable, SegmentationRun
from dockmind.synthetic import generate

CONTRACT = Path(__file__).resolve().parents[2] / "src" / "shared" / "schemas" / "meta" / "dockmind.ts"

HOSTS = {"storage.example.co", "app.example.com"}
SECRET = "secreto-de-prueba"
NOW = 1_800_000_000


def payload(**overrides) -> dict:
    data = {
        "schema": JOB_SCHEMA,
        "job_id": "job-1",
        "attempt": 1,
        "organization_id": "org-1",
        "session_id": "ses-1",
        "evidence_id": "ev-1",
        "group_id": "grp-1",
        "manifest_revision": 2,
        "clip_url": "https://storage.example.co/clip?token=x",
        "overlay_upload_url": "https://storage.example.co/upload?token=y",
        "callback_url": "https://app.example.com/api/v2/meta/dockmind/callback",
        "source": "SYNTHETIC_RENDER",
        "config": {
            "line": {"x1": 0.5, "y1": 0, "x2": 0.5, "y2": 1, "inside_x": 0.8, "inside_y": 0.5},
            "unit": "BOX",
            "concept": "cardboard box",
        },
    }
    data.update(overrides)
    return data


def test_valid_job_is_parsed():
    job = parse_job(payload(), HOSTS)
    assert job.manifest_revision == 2
    assert job.group_id == "grp-1"
    assert job.config.line.inside_x == 0.8


@pytest.mark.parametrize("override", [
    {"schema": "otro"},
    {"attempt": 0},
    {"group_id": ""},
    {"clip_url": "http://storage.example.co/clip"},
    {"clip_url": "https://evil.example.net/clip"},
    {"callback_url": "https://evil.example.net/cb"},
    {"source": "CCTV"},
    {"source": "THIRD_PARTY_STOCK"},
    {"config": {"line": {"x1": 2, "y1": 0, "x2": 0.5, "y2": 1, "inside_x": 0.8, "inside_y": 0.5}, "unit": "BOX", "concept": "box"}},
    {"config": {"line": {"x1": 0.5, "y1": 0, "x2": 0.5, "y2": 1, "inside_x": 0.8, "inside_y": 0.5}, "unit": "CAJA", "concept": "box"}},
])
def test_invalid_jobs_are_rejected(override):
    with pytest.raises(JobRejected):
        parse_job(payload(**override), HOSTS)


def test_config_defaults_match_the_web_contract():
    """La API normaliza la configuración con estos valores; si el worker cambia los suyos, el callback se rechazaría."""
    match = re.search(r"DOCKMIND_CONFIG_DEFAULTS = \{margin: ([0-9.]+), min_track_frames: (\d+)\}", CONTRACT.read_text("utf-8"))
    assert match, "no se encontró DOCKMIND_CONFIG_DEFAULTS en el contrato"
    defaults = CountConfig(line=CountingLine(0.5, 0, 0.5, 1, 0.8, 0.5), unit=Unit.BOX, concept="box")
    assert (float(match[1]), int(match[2])) == (defaults.margin, defaults.min_track_frames)
    parsed = parse_job(payload(), HOSTS).config
    assert (parsed.margin, parsed.min_track_frames) == (defaults.margin, defaults.min_track_frames)


class FakeServer:
    """Simula Storage (clip y subida) y la API web (callback).

    `replies` son las respuestas del callback en orden (código HTTP o excepción); después, 202.
    `uploads` son las respuestas forzadas de las subidas en orden; después, Storage de solo creación:
    la ruta nueva se guarda y una ruta ya guardada responde 400 con statusCode "409", sin reemplazarla.
    """

    def __init__(self, clip: Path, replies: list[int | Exception] | None = None, uploads: list[int | Exception] | None = None):
        self.clip = clip
        self.objects: dict[str, bytes] = {}
        self.puts: list[httpx.Request] = []
        self.callbacks: list[httpx.Request] = []
        self.replies = list(replies or [])
        self.uploads = list(uploads or [])

    @property
    def uploaded(self) -> bytes:
        return next(iter(self.objects.values()), b"")

    def __call__(self, request: httpx.Request) -> httpx.Response:
        if request.method == "GET" and request.url.path == "/clip":
            return httpx.Response(200, content=self.clip.read_bytes())
        if request.method == "PUT" and request.url.path.startswith("/upload"):
            self.puts.append(request)
            if self.uploads:
                forced = self.uploads.pop(0)
                if isinstance(forced, Exception):
                    raise forced
                return httpx.Response(forced)
            if request.url.path in self.objects:
                return httpx.Response(400, json={"statusCode": "409", "error": "Duplicate", "message": "The resource already exists"})
            self.objects[request.url.path] = request.content
            return httpx.Response(200)
        if request.method == "POST":
            self.callbacks.append(request)
            reply = self.replies.pop(0) if self.replies else 202
            if isinstance(reply, Exception):
                raise reply
            return httpx.Response(reply)
        return httpx.Response(404)


def as_json(value):
    return json.loads(json.dumps(value))


class Store(dict):
    """Almacén en memoria con la interfaz de modal.Dict que usa el worker."""

    def put(self, key, value):
        self[key] = copy.deepcopy(value)  # como modal.Dict: guarda una copia


def without_evidence(observation: dict) -> dict:
    return {k: v for k, v in as_json(observation).items() if k != "evidence"}


def fixture_segmenter(folder: Path, calls: list[int] | None = None):
    def factory():
        if calls is not None:
            calls.append(1)
        return FixtureSegmenter(folder / "sintetico_todas.fixture.txt")

    return factory


@pytest.fixture(scope="module")
def synthetic(tmp_path_factory) -> Path:
    if shutil.which("ffmpeg") is None:
        pytest.skip("requiere ffmpeg")
    folder = tmp_path_factory.mktemp("clips")
    generate(folder, ["todas"])
    return folder


def test_successful_job_uploads_overlay_and_sends_signed_callback(synthetic):
    server = FakeServer(synthetic / "sintetico_todas.mp4")
    with httpx.Client(transport=httpx.MockTransport(server)) as http:
        outcome = run_job(
            parse_job(payload(), HOSTS), SECRET, http, segmenter_factory=fixture_segmenter(synthetic), clock=lambda: NOW,
        )
    result = outcome.result
    assert outcome.delivery.delivered and outcome.delivery.tries == 1
    assert result["status"] == "SUCCEEDED"
    assert result["observation"]["result"]["net"] == 6
    assert len(server.uploaded) > 0
    assert result["observation"]["evidence"] == {"overlay_uploaded": True, "overlay_sha256": hashlib.sha256(server.uploaded).hexdigest()}
    assert server.puts[0].headers["x-upsert"] == "false"  # solo crea: nunca reemplaza un objeto guardado

    (callback,) = server.callbacks
    body = callback.content
    sent = json.loads(body)
    assert sent["schema"] == RESULT_SCHEMA
    # Identidad exacta del job: la API la compara antes de guardar nada.
    assert {k: sent[k] for k in ("job_id", "attempt", "organization_id", "session_id", "evidence_id", "group_id", "manifest_revision")} == {
        "job_id": "job-1", "attempt": 1, "organization_id": "org-1", "session_id": "ses-1",
        "evidence_id": "ev-1", "group_id": "grp-1", "manifest_revision": 2,
    }
    assert verify(body, SECRET, int(callback.headers[TIMESTAMP_HEADER]), callback.headers[SIGNATURE_HEADER], now=NOW)
    assert not verify(body, "otro-secreto", NOW, callback.headers[SIGNATURE_HEADER], now=NOW)
    assert not verify(body, SECRET, NOW, callback.headers[SIGNATURE_HEADER], now=NOW + 3600)


def test_provider_failure_is_reported_without_inventing_a_count(synthetic):
    class Down:
        name = "META_SAM_API"

        def segment(self, video, concept) -> SegmentationRun:
            raise ProviderUnavailable("timeout")

    server = FakeServer(synthetic / "sintetico_todas.mp4")
    store = Store()
    with httpx.Client(transport=httpx.MockTransport(server)) as http:
        result = run_job(parse_job(payload(), HOSTS), SECRET, http, segmenter_factory=Down, clock=lambda: NOW, store=store).result
    assert result["status"] == "FAILED"
    assert result["error"]["code"] == "PROVIDER_UNAVAILABLE"
    assert result["observation"] is None
    assert len(server.callbacks) == 1
    assert store == {}  # un fallo no se guarda: el reintento vuelve a intentar con SAM


def test_missing_clip_fails_with_stable_error(tmp_path):
    def server(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404) if request.method == "GET" else httpx.Response(202)

    with httpx.Client(transport=httpx.MockTransport(server)) as http:
        result = run_job(parse_job(payload(), HOSTS), SECRET, http, segmenter_factory=lambda: None, clock=lambda: NOW).result
    assert result["status"] == "FAILED"
    assert result["error"]["code"] == "MEDIA_INVALID"


@pytest.mark.parametrize("failure", [500, 503, 429, httpx.ReadTimeout("timeout"), httpx.ConnectError("caída")])
def test_callback_without_ack_is_retried_a_bounded_number_of_times_and_reported(synthetic, failure):
    server = FakeServer(synthetic / "sintetico_todas.mp4", replies=[failure] * CALLBACK_TRIES)
    waits: list[float] = []
    store = Store()
    with httpx.Client(transport=httpx.MockTransport(server)) as http:
        outcome = run_job(
            parse_job(payload(), HOSTS), SECRET, http, segmenter_factory=fixture_segmenter(synthetic),
            clock=lambda: NOW, store=store, sleep=waits.append,
        )
    assert outcome.result["status"] == "SUCCEEDED"  # el conteo existe, pero la API no lo confirmó
    assert not outcome.delivery.delivered
    assert outcome.delivery.problem == "UNREACHABLE"
    assert outcome.delivery.tries == CALLBACK_TRIES == len(server.callbacks)
    assert waits == list(CALLBACK_BACKOFF_SECONDS)
    stored = store[result_key(parse_job(payload(), HOSTS))]
    assert stored["observation"] == without_evidence(outcome.result["observation"])  # la subida es de cada intento
    assert isinstance(stored["sam"]["text_zlib"], bytes) and stored["sam"]["segmenter"] == "FIXTURE"


@pytest.mark.parametrize("status", [400, 401, 404, 409])
def test_callback_rejected_by_the_api_is_not_repeated(synthetic, status):
    server = FakeServer(synthetic / "sintetico_todas.mp4", replies=[status])
    waits: list[float] = []
    with httpx.Client(transport=httpx.MockTransport(server)) as http:
        outcome = run_job(
            parse_job(payload(), HOSTS), SECRET, http, segmenter_factory=fixture_segmenter(synthetic),
            clock=lambda: NOW, sleep=waits.append,
        )
    assert outcome.delivery == Delivery(delivered=False, tries=1, http_status=status, problem="REJECTED")
    assert len(server.callbacks) == 1
    assert waits == []


def test_callback_that_recovers_is_delivered_with_a_fresh_signature(synthetic):
    server = FakeServer(synthetic / "sintetico_todas.mp4", replies=[httpx.ReadTimeout("timeout"), 200])
    ticks = iter([NOW, NOW + 400])
    with httpx.Client(transport=httpx.MockTransport(server)) as http:
        outcome = run_job(
            parse_job(payload(), HOSTS), SECRET, http, segmenter_factory=fixture_segmenter(synthetic),
            clock=lambda: next(ticks), sleep=lambda _: None,
        )
    assert outcome.delivery.delivered and outcome.delivery.tries == 2
    first, second = server.callbacks
    assert first.content == second.content
    assert verify(second.content, SECRET, int(second.headers[TIMESTAMP_HEADER]), second.headers[SIGNATURE_HEADER], now=NOW + 400)


def test_retry_after_undelivered_result_resends_it_without_calling_sam_again(synthetic):
    store = Store()
    calls: list[int] = []
    lost = FakeServer(synthetic / "sintetico_todas.mp4", replies=[500] * CALLBACK_TRIES)
    with httpx.Client(transport=httpx.MockTransport(lost)) as http:
        first = run_job(
            parse_job(payload(), HOSTS), SECRET, http, segmenter_factory=fixture_segmenter(synthetic, calls),
            clock=lambda: NOW, store=store, sleep=lambda _: None,
        )
    assert not first.delivery.delivered and calls == [1]

    # La API no recibió nada y, pasado el plazo, pide otro intento del mismo job con su propia ruta de video anotado.
    server = FakeServer(synthetic / "sintetico_todas.mp4")
    second_job = payload(attempt=2, overlay_upload_url="https://storage.example.co/upload-a2?token=z")
    with httpx.Client(transport=httpx.MockTransport(server)) as http:
        second = run_job(
            parse_job(second_job, HOSTS), SECRET, http, segmenter_factory=fixture_segmenter(synthetic, calls),
            clock=lambda: NOW, store=store,
        )
    assert calls == [1]  # SAM no se volvió a llamar
    assert second.reused and second.delivery.delivered
    sent = json.loads(server.callbacks[0].content)
    assert sent["attempt"] == 2
    assert without_evidence(sent["observation"]) == without_evidence(first.result["observation"])
    # El video anotado se volvió a dibujar con la salida guardada y se subió a la ruta del intento 2.
    assert list(server.objects) == ["/upload-a2"]
    assert sent["observation"]["evidence"] == {"overlay_uploaded": True, "overlay_sha256": hashlib.sha256(server.objects["/upload-a2"]).hexdigest()}

    # Con otra configuración no se reutiliza: es otro conteo.
    other = payload(attempt=3, config={**payload()["config"], "margin": 0.02})
    with httpx.Client(transport=httpx.MockTransport(FakeServer(synthetic / "sintetico_todas.mp4"))) as http:
        third = run_job(
            parse_job(other, HOSTS), SECRET, http, segmenter_factory=fixture_segmenter(synthetic, calls),
            clock=lambda: NOW, store=store,
        )
    assert calls == [1, 1] and not third.reused


def test_stored_observation_of_another_file_is_not_reused(synthetic, tmp_path):
    store = Store()
    job = parse_job(payload(), HOSTS)
    store.put(result_key(job), {"observation": {"clip": {"sha256": "0" * 64}, "result": {"net": 99}}, "sam": {"text_zlib": b"x"}})
    calls: list[int] = []
    with httpx.Client(transport=httpx.MockTransport(FakeServer(synthetic / "sintetico_todas.mp4"))) as http:
        outcome = run_job(job, SECRET, http, segmenter_factory=fixture_segmenter(synthetic, calls), clock=lambda: NOW, store=store)
    assert calls == [1] and not outcome.reused
    assert outcome.result["observation"]["result"]["net"] == 6


def test_overlay_upload_already_stored_is_reported_but_never_replaced(synthetic):
    """Un envío repetido del mismo intento no reemplaza el objeto: se informa su SHA-256 y la API lo compara."""
    server = FakeServer(synthetic / "sintetico_todas.mp4")
    server.objects["/upload"] = b"bytes guardados por un envio anterior"
    with httpx.Client(transport=httpx.MockTransport(server)) as http:
        outcome = run_job(parse_job(payload(), HOSTS), SECRET, http, segmenter_factory=fixture_segmenter(synthetic), clock=lambda: NOW)
    evidence = outcome.result["observation"]["evidence"]
    assert evidence["overlay_uploaded"] is True
    assert server.objects["/upload"] == b"bytes guardados por un envio anterior"
    assert evidence["overlay_sha256"] != hashlib.sha256(server.objects["/upload"]).hexdigest()  # la API lo verá distinto
    assert len(server.puts) == 1


@pytest.mark.parametrize("failure", [503, httpx.ReadTimeout("timeout")])
def test_overlay_upload_is_retried_only_when_it_can_improve(synthetic, failure):
    server = FakeServer(synthetic / "sintetico_todas.mp4", uploads=[failure])
    waits: list[float] = []
    with httpx.Client(transport=httpx.MockTransport(server)) as http:
        outcome = run_job(
            parse_job(payload(), HOSTS), SECRET, http, segmenter_factory=fixture_segmenter(synthetic), clock=lambda: NOW, sleep=waits.append,
        )
    assert outcome.result["observation"]["evidence"]["overlay_uploaded"] is True
    assert len(server.puts) == 2 and waits == [OVERLAY_BACKOFF_SECONDS[0]]

    refused = FakeServer(synthetic / "sintetico_todas.mp4", uploads=[403])
    with httpx.Client(transport=httpx.MockTransport(refused)) as http:
        outcome = run_job(parse_job(payload(), HOSTS), SECRET, http, segmenter_factory=fixture_segmenter(synthetic), clock=lambda: NOW)
    assert outcome.result["observation"]["evidence"] == {"overlay_uploaded": False, "overlay_sha256": None}
    assert len(refused.puts) == 1
