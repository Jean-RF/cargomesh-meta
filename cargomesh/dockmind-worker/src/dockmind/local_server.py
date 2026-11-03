"""Lanzador local del worker DockMind: el mismo contrato y el mismo `run_job` que en Modal, en 127.0.0.1.

Modal no alcanza una Supabase ni una app que corren en 127.0.0.1. Este lanzador permite probar el worker desde la
web local del equipo sin publicar nada:
- Escucha solo en 127.0.0.1 y exige las mismas cabeceras `Modal-Key` y `Modal-Secret` que manda la app.
- Acepta URLs http solo de dos orígenes 127.0.0.1:<puerto>: la Supabase local (clip y video anotado) y la app
  local (callback). Nada más.
- Firma el callback con el mismo HMAC que en Modal.
- Las credenciales y las URLs salen de un archivo privado, fuera de cualquier repositorio, que crea
  `dockmind local-credentials`. No hay valores por defecto.
- El segmentador se elige siempre a mano: SAM real (llamada pagada, con un cupo) o un FIXTURE rotulado. Nunca
  se pasa de uno al otro.
- Cada job e intento se lanza una sola vez. Lo que en Modal va al `modal.Dict` aquí queda en memoria: si el
  lanzador se reinicia, se pierde la reentrega sin SAM, no un resultado.

La app lo usa con DOCKMIND_WORKER_MODE=LOCAL_LOOPBACK, que solo funciona en desarrollo (ver
cargomesh/src/server/modules/analysis-jobs/config.ts).
"""

from __future__ import annotations

import hmac
import json
import secrets
import sys
import threading
import uuid
from collections.abc import Callable
from dataclasses import asdict, dataclass, field
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx

from .jobs import JobRejected, JobRequest, parse_job, run_job
from .sam_client import ProviderNotConfigured, Segmenter

LOCAL_HOST = "127.0.0.1"
JOBS_PATH = "/jobs"
CALLBACK_PATH = "/api/v2/meta/dockmind/callback"
MAX_JOB_BYTES = 64 * 1024
MODE = "LOCAL_LOOPBACK"
CREDENTIALS = ("DOCKMIND_CALLBACK_SECRET", "MODAL_PROXY_TOKEN_ID", "MODAL_PROXY_TOKEN_SECRET")
SETTINGS = ("DOCKMIND_WORKER_MODE", "DOCKMIND_WORKER_URL", "DOCKMIND_CALLBACK_URL", "DOCKMIND_LOCAL_STORAGE_ORIGIN")


class LocalSetupError(ValueError):
    """El lanzador no arranca: falta una credencial, una URL no es local o el archivo está dentro de un repositorio."""


def loopback_origin(text: str) -> str:
    """Solo `http://127.0.0.1:<puerto>`, sin ruta ni usuario."""
    parsed = urlparse(text.strip())
    try:
        port = parsed.port
    except ValueError:
        port = None
    if (
        parsed.scheme != "http" or parsed.hostname != LOCAL_HOST or port is None or parsed.username
        or parsed.path not in ("", "/") or parsed.query or parsed.fragment
    ):
        raise LocalSetupError(f"{text.strip()!r} no es un origen http://127.0.0.1:<puerto>")
    return f"http://{LOCAL_HOST}:{port}"


def _origin_and_path(url: str, name: str) -> tuple[str, str]:
    parsed = urlparse(url)
    if parsed.query or parsed.fragment:
        raise LocalSetupError(f"{name} no lleva query ni fragmento")
    return loopback_origin(f"{parsed.scheme}://{parsed.netloc}"), parsed.path


def _inside_git_checkout(path: Path) -> bool:
    return any((parent / ".git").exists() for parent in path.resolve().parents)


@dataclass(frozen=True, repr=False)
class LocalConfig:
    callback_secret: str
    token_id: str
    token_secret: str
    worker_url: str
    callback_url: str
    storage_origin: str
    port: int = field(init=False)
    origins: frozenset[str] = field(init=False)

    def __post_init__(self) -> None:
        worker_origin, worker_path = _origin_and_path(self.worker_url, "DOCKMIND_WORKER_URL")
        callback_origin, callback_path = _origin_and_path(self.callback_url, "DOCKMIND_CALLBACK_URL")
        if worker_path != JOBS_PATH:
            raise LocalSetupError(f"DOCKMIND_WORKER_URL termina en {JOBS_PATH}")
        if callback_path != CALLBACK_PATH:
            raise LocalSetupError(f"DOCKMIND_CALLBACK_URL apunta a {CALLBACK_PATH} de la app local")
        storage = loopback_origin(self.storage_origin)
        if worker_origin in (callback_origin, storage):
            raise LocalSetupError("El lanzador necesita un puerto propio, distinto del de la app y del de Supabase")
        object.__setattr__(self, "port", int(urlparse(worker_origin).port))
        object.__setattr__(self, "origins", frozenset({callback_origin, storage}))

    def __repr__(self) -> str:  # nunca muestra las credenciales
        return f"LocalConfig(worker_url={self.worker_url!r}, origins={sorted(self.origins)!r})"


def write_local_config(path: Path, storage: str, app: str, port: int) -> Path:
    """Crea el archivo privado con credenciales nuevas. No pisa uno existente ni escribe dentro de un repositorio."""
    target = path.expanduser().resolve()
    if _inside_git_checkout(target):
        raise LocalSetupError("El archivo va fuera de cualquier repositorio: tiene credenciales")
    values = {
        "DOCKMIND_WORKER_MODE": MODE,
        "DOCKMIND_WORKER_URL": f"http://{LOCAL_HOST}:{port}{JOBS_PATH}",
        "DOCKMIND_CALLBACK_URL": f"{loopback_origin(app)}{CALLBACK_PATH}",
        "DOCKMIND_LOCAL_STORAGE_ORIGIN": loopback_origin(storage),
        "DOCKMIND_CALLBACK_SECRET": secrets.token_hex(32),
        "MODAL_PROXY_TOKEN_ID": f"local-wk-{secrets.token_hex(8)}",
        "MODAL_PROXY_TOKEN_SECRET": f"local-ws-{secrets.token_hex(24)}",
    }
    _config_from(values)  # valida puertos y rutas antes de escribir
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        with target.open("x", encoding="utf-8", newline="\n") as handle:
            handle.write("# Lanzador local de DockMind (dockmind serve-local). Solo 127.0.0.1; no son tokens de Modal.\n")
            handle.write("# Copiar estas líneas a cargomesh/.env.local de la app local. No pegarlas en chat, PR ni capturas.\n")
            for name, value in values.items():
                handle.write(f"{name}={value}\n")
    except FileExistsError as error:
        raise LocalSetupError(f"{target} ya existe; no se reemplaza") from error
    target.chmod(0o600)
    return target


def _config_from(values: dict[str, str]) -> LocalConfig:
    absent = [name for name in (*SETTINGS, *CREDENTIALS) if not values.get(name) or values[name].startswith("replace-with")]
    if absent:
        raise LocalSetupError(f"Faltan en el archivo: {', '.join(absent)}")
    if values["DOCKMIND_WORKER_MODE"] != MODE:
        raise LocalSetupError(f"DOCKMIND_WORKER_MODE debe ser {MODE}")
    if len(values["DOCKMIND_CALLBACK_SECRET"]) < 32 or len(values["MODAL_PROXY_TOKEN_SECRET"]) < 32:
        raise LocalSetupError("DOCKMIND_CALLBACK_SECRET y MODAL_PROXY_TOKEN_SECRET necesitan al menos 32 caracteres")
    return LocalConfig(
        callback_secret=values["DOCKMIND_CALLBACK_SECRET"],
        token_id=values["MODAL_PROXY_TOKEN_ID"],
        token_secret=values["MODAL_PROXY_TOKEN_SECRET"],
        worker_url=values["DOCKMIND_WORKER_URL"],
        callback_url=values["DOCKMIND_CALLBACK_URL"],
        storage_origin=values["DOCKMIND_LOCAL_STORAGE_ORIGIN"],
    )


def read_local_config(path: Path) -> LocalConfig:
    """Lee solo las variables del lanzador; cualquier otra línea del archivo se ignora."""
    target = path.expanduser().resolve()
    if _inside_git_checkout(target):
        raise LocalSetupError("El archivo va fuera de cualquier repositorio: tiene credenciales")
    values: dict[str, str] = {}
    for raw in target.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = (part.strip() for part in line.split("=", 1))
        if name in SETTINGS or name in CREDENTIALS:
            values[name] = value
    return _config_from(values)


class MemoryStore:
    """Lo que en Modal guarda el `modal.Dict` `cargomesh-dockmind-results`, en memoria de este proceso."""

    def __init__(self) -> None:
        self._data: dict[str, Any] = {}
        self._lock = threading.Lock()

    def get(self, key: str, default: Any = None) -> Any:
        with self._lock:
            return self._data.get(key, default)

    def put(self, key: str, value: Any) -> None:
        with self._lock:
            self._data[key] = value


class PaidCallBudget:
    """Cupo de llamadas a SAM real que autorizó quien arrancó el lanzador. Agotado, el job falla con NOT_CONFIGURED."""

    def __init__(self, factory: Callable[[], Segmenter], calls: int):
        if calls < 1:
            raise LocalSetupError("El cupo de llamadas pagadas debe ser al menos 1")
        self._factory = factory
        self._left = calls
        self._lock = threading.Lock()

    def __call__(self) -> Segmenter:
        with self._lock:
            if self._left < 1:
                raise ProviderNotConfigured("Se agotó el cupo de llamadas pagadas autorizadas para este lanzador")
            self._left -= 1
        return self._factory()


def _receipt(job: JobRequest, call_id: str, result: dict, reused: bool, delivery: dict) -> dict:
    """Recibo sin URLs ni secretos. `provider` registra el consumo real si hubo llamada a SAM."""
    observation = result.get("observation") or {}
    segmentation = observation.get("segmentation", {})
    return {
        "call_id": call_id,
        "job_id": job.job_id,
        "attempt": job.attempt,
        "group_id": job.group_id,
        "status": result["status"],
        "error": result["error"],
        "net": observation.get("result", {}).get("net"),
        "count_status": observation.get("result", {}).get("status"),
        "provider": {
            "segmenter": segmentation.get("segmenter"),
            "real_inference": segmentation.get("real_inference"),
            "model": segmentation.get("model"),
            "request_id": segmentation.get("request_id"),
            "seconds": segmentation.get("seconds"),
            "estimated_cost_usd": 0 if reused else segmentation.get("estimated_cost_usd"),
        },
        "overlay_sha256": observation.get("evidence", {}).get("overlay_sha256"),
        "reused": reused,
        "delivery": delivery,
    }


class LocalLauncher:
    def __init__(
        self,
        config: LocalConfig,
        segmenter_factory: Callable[[], Segmenter],
        log: Callable[[dict], None] = lambda receipt: print(json.dumps(receipt), flush=True),
    ):
        self.config = config
        self.store = MemoryStore()
        self.receipts: list[dict] = []
        self._segmenter_factory = segmenter_factory
        self._log = log
        self._launched: dict[str, str] = {}
        self._threads: list[threading.Thread] = []
        self._lock = threading.Lock()

    def authorized(self, key: str | None, secret: str | None) -> bool:
        if not key or not secret:
            return False
        same_key = hmac.compare_digest(key.encode(), self.config.token_id.encode())
        same_secret = hmac.compare_digest(secret.encode(), self.config.token_secret.encode())
        return same_key and same_secret

    def launch(self, payload: dict) -> dict:
        """Como `jobs` en modal_app.py: valida, reserva el job e intento y lanza sin esperar."""
        job = parse_job(payload, set(), self.config.origins)
        key = f"{job.job_id}:{job.attempt}"
        with self._lock:
            if key in self._launched:
                return {"job_id": job.job_id, "attempt": job.attempt, "call_id": self._launched[key], "duplicate": True}
            call_id = f"local-{uuid.uuid4().hex[:12]}"
            self._launched[key] = call_id
            thread = threading.Thread(target=self._analyze, args=(job, call_id), name=call_id)
            self._threads.append(thread)
        thread.start()
        return {"job_id": job.job_id, "attempt": job.attempt, "call_id": call_id, "duplicate": False}

    def _analyze(self, job: JobRequest, call_id: str) -> None:
        try:
            with httpx.Client(timeout=120, follow_redirects=False) as http:
                outcome = run_job(job, self.config.callback_secret, http, segmenter_factory=self._segmenter_factory, store=self.store)
            receipt = _receipt(job, call_id, outcome.result, outcome.reused, asdict(outcome.delivery))
        except Exception as error:  # run_job ya reporta los fallos del análisis; esto es un fallo del propio lanzador
            receipt = {"call_id": call_id, "job_id": job.job_id, "attempt": job.attempt, "status": "LAUNCHER_ERROR", "error": str(error)[:300]}
        with self._lock:
            self.receipts.append(receipt)
        self._log(receipt)

    def wait(self, timeout: float | None = None) -> None:
        for thread in list(self._threads):
            thread.join(timeout)


class _Server(ThreadingHTTPServer):
    allow_reuse_address = False  # en Windows, reusar la dirección dejaría a otro proceso tomar el mismo puerto
    daemon_threads = True


def make_server(launcher: LocalLauncher) -> ThreadingHTTPServer:
    class Handler(BaseHTTPRequestHandler):
        server_version = "dockmind-local"

        def _send(self, status: int, body: dict) -> None:
            data = json.dumps(body).encode()
            self.send_response(status)
            self.send_header("content-type", "application/json")
            self.send_header("content-length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_POST(self) -> None:
            if not launcher.authorized(self.headers.get("Modal-Key"), self.headers.get("Modal-Secret")):
                self._send(401, {"detail": "missing or invalid credentials for proxy authorization"})
                return
            if self.path != JOBS_PATH:
                self._send(404, {"detail": "Not Found"})
                return
            try:
                length = int(self.headers.get("Content-Length") or "0")
            except ValueError:
                length = 0
            if length > MAX_JOB_BYTES:
                self._send(413, {"detail": "Job too large"})
                return
            try:
                payload = json.loads(self.rfile.read(length)) if length > 0 else None
            except ValueError:
                payload = None
            if not isinstance(payload, dict):
                self._send(400, {"detail": {"code": "MEDIA_INVALID", "message": "El cuerpo debe ser un job JSON"}})
                return
            try:
                self._send(200, launcher.launch(payload))
            except JobRejected as error:
                self._send(400, {"detail": {"code": error.code, "message": str(error)}})

        def _not_allowed(self) -> None:
            self._send(405, {"detail": "Method Not Allowed"})

        do_GET = do_PUT = do_PATCH = do_DELETE = _not_allowed

        def log_message(self, format: str, *args: Any) -> None:  # la ruta es /jobs: no lleva tokens
            sys.stderr.write(f"[dockmind-local] {format % args}\n")

    return _Server((LOCAL_HOST, launcher.config.port), Handler)
