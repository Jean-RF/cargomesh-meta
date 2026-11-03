"""Lanzador local: mismo contrato, cabeceras y firma que Modal, solo en 127.0.0.1 y con un archivo privado fuera del repo."""

import hashlib
import json
import shutil
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import httpx
import pytest

from dockmind.jobs import JOB_SCHEMA, SIGNATURE_HEADER, TIMESTAMP_HEADER, JobRejected, parse_job, verify
from dockmind.local_server import (
    LocalConfig,
    LocalLauncher,
    LocalSetupError,
    PaidCallBudget,
    loopback_origin,
    make_server,
    read_local_config,
    write_local_config,
)
from dockmind.sam_client import FixtureSegmenter, ProviderNotConfigured
from dockmind.synthetic import generate

SECRET = "c" * 64
TOKEN_ID = "local-wk-prueba"
TOKEN_SECRET = "local-ws-" + "t" * 48
HEADERS = {"Modal-Key": TOKEN_ID, "Modal-Secret": TOKEN_SECRET}


def config(worker: int = 8765, app: int = 8080, storage: int = 64321) -> LocalConfig:
    return LocalConfig(
        callback_secret=SECRET, token_id=TOKEN_ID, token_secret=TOKEN_SECRET,
        worker_url=f"http://127.0.0.1:{worker}/jobs",
        callback_url=f"http://127.0.0.1:{app}/api/v2/meta/dockmind/callback",
        storage_origin=f"http://127.0.0.1:{storage}",
    )


def payload(storage: str = "http://127.0.0.1:64321", app: str = "http://127.0.0.1:8080", **overrides) -> dict:
    data = {
        "schema": JOB_SCHEMA, "job_id": "job-1", "attempt": 1, "organization_id": "org-1", "session_id": "ses-1",
        "evidence_id": "ev-1", "group_id": "grp-a", "manifest_revision": 1,
        "clip_url": f"{storage}/storage/v1/object/sign/meta-dockmind/clip.mp4?token=x",
        "overlay_upload_url": f"{storage}/storage/v1/object/upload/sign/meta-dockmind/a1-overlay.mp4?token=y",
        "callback_url": f"{app}/api/v2/meta/dockmind/callback",
        "source": "SYNTHETIC_RENDER",
        "config": {"line": {"x1": 0.5, "y1": 0, "x2": 0.5, "y2": 1, "inside_x": 0.8, "inside_y": 0.5}, "unit": "BOX", "concept": "cardboard box"},
    }
    data.update(overrides)
    return data


@pytest.mark.parametrize("text", ["http://127.0.0.1:64321", "http://127.0.0.1:8080/", " http://127.0.0.1:1 "])
def test_loopback_origin_accepts_only_127_0_0_1_with_port(text):
    assert loopback_origin(text).startswith("http://127.0.0.1:")


@pytest.mark.parametrize("text", [
    "http://localhost:8080", "https://127.0.0.1:8080", "http://127.0.0.1", "http://10.0.0.5:8080",
    "http://127.0.0.1:8080/api", "http://user@127.0.0.1:8080", "http://127.0.0.1:8080?x=1", "http://127.0.0.1:99999",
])
def test_loopback_origin_rejects_anything_else(text):
    with pytest.raises(LocalSetupError):
        loopback_origin(text)


def test_http_urls_are_accepted_only_from_the_launcher_origins():
    origins = config().origins
    job = parse_job(payload(), set(), origins)
    assert job.clip_url.startswith("http://127.0.0.1:64321/") and job.callback_url.startswith("http://127.0.0.1:8080/")
    with pytest.raises(JobRejected):
        parse_job(payload(), set())  # Modal: sin orígenes locales, http no pasa
    with pytest.raises(JobRejected):
        parse_job(payload(storage="http://127.0.0.1:9999"), set(), origins)
    with pytest.raises(JobRejected):
        parse_job(payload(app="http://localhost:8080"), set(), origins)
    with pytest.raises(JobRejected):
        parse_job(payload(storage="https://storage.example.co"), set(), origins)  # https sigue necesitando host permitido


def test_config_needs_its_own_port_and_the_exact_paths():
    assert config().port == 8765
    assert config().origins == {"http://127.0.0.1:8080", "http://127.0.0.1:64321"}
    with pytest.raises(LocalSetupError):
        config(worker=8080)
    with pytest.raises(LocalSetupError):
        LocalConfig(SECRET, TOKEN_ID, TOKEN_SECRET, "http://127.0.0.1:8765/", config().callback_url, config().storage_origin)
    with pytest.raises(LocalSetupError):
        LocalConfig(SECRET, TOKEN_ID, TOKEN_SECRET, config().worker_url, "http://127.0.0.1:8080/callback", config().storage_origin)
    assert SECRET not in repr(config()) and TOKEN_SECRET not in repr(config())


def test_private_file_is_created_outside_a_repository_and_never_replaced(tmp_path):
    target = tmp_path / "privado" / "dockmind-local.env"
    write_local_config(target, storage="http://127.0.0.1:64321", app="http://127.0.0.1:8080", port=8765)
    loaded = read_local_config(target)
    assert loaded.worker_url == "http://127.0.0.1:8765/jobs"
    assert loaded.callback_url == "http://127.0.0.1:8080/api/v2/meta/dockmind/callback"
    assert len(loaded.callback_secret) == 64 and loaded.token_id.startswith("local-wk-")
    other = tmp_path / "otro.env"
    write_local_config(other, storage="http://127.0.0.1:64321", app="http://127.0.0.1:8080", port=8765)
    assert read_local_config(other).callback_secret != loaded.callback_secret  # cada archivo trae valores nuevos
    with pytest.raises(LocalSetupError):
        write_local_config(target, storage="http://127.0.0.1:64321", app="http://127.0.0.1:8080", port=8765)
    assert read_local_config(target).callback_secret == loaded.callback_secret


def test_private_file_inside_a_repository_is_refused(tmp_path):
    repo = tmp_path / "repo"
    (repo / ".git").mkdir(parents=True)
    with pytest.raises(LocalSetupError):
        write_local_config(repo / "cargomesh" / "dockmind-local.env", storage="http://127.0.0.1:64321", app="http://127.0.0.1:8080", port=8765)
    outside = tmp_path / "fuera.env"
    write_local_config(outside, storage="http://127.0.0.1:64321", app="http://127.0.0.1:8080", port=8765)
    copied = repo / "copia.env"
    copied.write_text(outside.read_text(encoding="utf-8"), encoding="utf-8")
    with pytest.raises(LocalSetupError):
        read_local_config(copied)


@pytest.mark.parametrize("change", [
    {"DOCKMIND_CALLBACK_SECRET": "corto"},
    {"MODAL_PROXY_TOKEN_SECRET": ""},
    {"DOCKMIND_WORKER_MODE": "MODAL"},
    {"DOCKMIND_CALLBACK_URL": "https://app.example.com/api/v2/meta/dockmind/callback"},
    {"DOCKMIND_LOCAL_STORAGE_ORIGIN": "replace-with-origin"},
])
def test_incomplete_or_remote_settings_do_not_start(tmp_path, change):
    target = tmp_path / "dockmind-local.env"
    write_local_config(target, storage="http://127.0.0.1:64321", app="http://127.0.0.1:8080", port=8765)
    lines = target.read_text(encoding="utf-8").splitlines()
    edited = [f"{line.split('=')[0]}={change[line.split('=')[0]]}" if line.split("=")[0] in change else line for line in lines]
    target.write_text("\n".join(edited) + "\n", encoding="utf-8")
    with pytest.raises(LocalSetupError):
        read_local_config(target)


def test_paid_call_budget_stops_after_the_authorized_calls():
    made = []
    budget = PaidCallBudget(lambda: made.append(1) or "segmenter", 2)
    assert budget() == "segmenter" and budget() == "segmenter"
    with pytest.raises(ProviderNotConfigured):
        budget()
    assert len(made) == 2
    with pytest.raises(LocalSetupError):
        PaidCallBudget(lambda: None, 0)


@pytest.fixture
def launcher_server(monkeypatch):
    """Lanzador en un puerto libre; el análisis se reemplaza por un registro."""
    launcher = LocalLauncher(config(worker=0), segmenter_factory=lambda: None, log=lambda receipt: None)
    started: list[tuple[str, int]] = []
    monkeypatch.setattr(launcher, "_analyze", lambda job, call_id: started.append((job.job_id, job.attempt)))
    server = make_server(launcher)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{server.server_address[1]}", started
    server.shutdown()
    server.server_close()


def test_launcher_requires_the_proxy_headers_and_launches_each_attempt_once(launcher_server):
    base, started = launcher_server
    assert server_address_is_loopback(base)
    assert httpx.post(f"{base}/jobs", json=payload()).status_code == 401
    assert httpx.post(f"{base}/jobs", json=payload(), headers={**HEADERS, "Modal-Secret": "local-ws-otro"}).status_code == 401
    assert httpx.post(f"{base}/jobs", json=payload(), headers={"Authorization": f"Bearer {TOKEN_ID}.{TOKEN_SECRET}"}).status_code == 401
    first = httpx.post(f"{base}/jobs", json=payload(), headers=HEADERS)
    assert first.status_code == 200 and first.json()["duplicate"] is False
    again = httpx.post(f"{base}/jobs", json=payload(), headers=HEADERS).json()
    assert again["duplicate"] is True and again["call_id"] == first.json()["call_id"]
    assert httpx.post(f"{base}/jobs", json=payload(attempt=2), headers=HEADERS).json()["duplicate"] is False
    assert started == [("job-1", 1), ("job-1", 2)]


def test_launcher_rejects_bad_jobs_without_launching(launcher_server):
    base, started = launcher_server
    remote = httpx.post(f"{base}/jobs", json=payload(storage="https://storage.example.co"), headers=HEADERS)
    assert remote.status_code == 400 and remote.json()["detail"]["code"] == "MEDIA_INVALID"
    assert httpx.post(f"{base}/jobs", content=b"{no es json", headers=HEADERS).status_code == 400
    assert httpx.post(f"{base}/jobs", content=b"x" * (64 * 1024 + 1), headers=HEADERS).status_code == 413
    assert httpx.post(f"{base}/otra", json=payload(), headers=HEADERS).status_code == 404
    assert httpx.get(f"{base}/jobs", headers=HEADERS).status_code == 405
    assert started == []


def server_address_is_loopback(base: str) -> bool:
    return base.startswith("http://127.0.0.1:")


class LocalStack:
    """Supabase y app locales falsas en 127.0.0.1: clip, subida de solo creación y callback firmado."""

    def __init__(self, clip: bytes):
        self.clip = clip
        self.objects: dict[str, bytes] = {}
        self.callbacks: list[tuple[dict, bool]] = []
        stack = self

        class Handler(BaseHTTPRequestHandler):
            def _reply(self, status: int) -> None:
                self.send_response(status)
                self.send_header("content-length", "0")
                self.end_headers()

            def do_GET(self):
                if self.path.startswith("/storage/v1/object/sign/"):
                    self.send_response(200)
                    self.send_header("content-length", str(len(stack.clip)))
                    self.end_headers()
                    self.wfile.write(stack.clip)
                else:
                    self._reply(404)

            def do_PUT(self):
                body = self.rfile.read(int(self.headers["Content-Length"]))
                path = self.path.split("?")[0]
                if path in stack.objects:
                    self._reply(409)
                    return
                stack.objects[path] = body
                self._reply(200)

            def do_POST(self):
                raw = self.rfile.read(int(self.headers["Content-Length"]))
                signed = verify(raw, SECRET, int(self.headers[TIMESTAMP_HEADER]), self.headers[SIGNATURE_HEADER], now=int(self.headers[TIMESTAMP_HEADER]))
                stack.callbacks.append((json.loads(raw), signed))
                self._reply(202)

            def log_message(self, *args):
                pass

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.origin = f"http://127.0.0.1:{self.server.server_address[1]}"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def close(self):
        self.server.shutdown()
        self.server.server_close()


def test_local_run_downloads_uploads_and_signs_like_modal_and_reuses_on_retry(tmp_path):
    if shutil.which("ffmpeg") is None:
        pytest.skip("requiere ffmpeg")
    generate(tmp_path, ["todas"])
    stack = LocalStack((tmp_path / "sintetico_todas.mp4").read_bytes())
    calls: list[int] = []

    def segmenter():
        calls.append(1)
        return FixtureSegmenter(tmp_path / "sintetico_todas.fixture.txt")

    try:
        launcher = LocalLauncher(LocalConfig(
            SECRET, TOKEN_ID, TOKEN_SECRET, "http://127.0.0.1:9/jobs", f"{stack.origin}/api/v2/meta/dockmind/callback", stack.origin,
        ), segmenter, log=lambda receipt: None)
        for attempt in (1, 2):
            job = payload(storage=stack.origin, app=stack.origin, attempt=attempt, overlay_upload_url=f"{stack.origin}/storage/v1/object/upload/sign/meta-dockmind/a{attempt}-overlay.mp4?token=y")
            launcher.launch(job)
            launcher.wait(120)
    finally:
        stack.close()

    assert len(calls) == 1  # el intento 2 reusa la observación y la salida de SAM: no vuelve a segmentar
    assert [signed for _, signed in stack.callbacks] == [True, True]
    results = [body for body, _ in stack.callbacks]
    assert [r["attempt"] for r in results] == [1, 2] and all(r["status"] == "SUCCEEDED" for r in results)
    for result in results:
        observation = result["observation"]
        assert observation["segmentation"]["segmenter"] == "FIXTURE" and observation["segmentation"]["real_inference"] is False
        uploaded = stack.objects[f"/storage/v1/object/upload/sign/meta-dockmind/a{result['attempt']}-overlay.mp4"]
        assert observation["evidence"]["overlay_sha256"] == hashlib.sha256(uploaded).hexdigest()
    receipts = launcher.receipts
    assert [r["reused"] for r in receipts] == [False, True]
    assert receipts[1]["provider"]["estimated_cost_usd"] == 0
    assert all(r["delivery"]["delivered"] for r in receipts)
    assert all("127.0.0.1" not in json.dumps(r) and "token=" not in json.dumps(r) for r in receipts)  # sin URLs firmadas
