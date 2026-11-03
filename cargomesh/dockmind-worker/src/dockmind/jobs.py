"""Ejecución de un job enviado por la API web y aviso del resultado con un callback firmado.

Contrato de entrada `dockmind.job.v2` (API -> worker) y de salida `dockmind.result.v2`
(worker -> API). La API autoriza al usuario, emite URLs firmadas y persiste el
resultado; el worker solo descarga de hosts permitidos, analiza y avisa.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import tempfile
import time
import zlib
from collections.abc import Callable
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Protocol
from urllib.parse import urlparse

import httpx

from .models import ClipSource, CountConfig, CountingLine, Unit
from .pipeline import analyze_clip
from .sam_client import MetaSamClient, ProviderNotConfigured, ProviderUnavailable, SegmentationRun, Segmenter
from .sam_output import SamOutputError
from .video import VideoError, sha256_file

JOB_SCHEMA = "dockmind.job.v2"
RESULT_SCHEMA = "dockmind.result.v2"
MAX_CLIP_BYTES = 50 * 1024 * 1024  # límite por archivo del plan gratis de Supabase
SIGNATURE_HEADER = "X-DockMind-Signature"
TIMESTAMP_HEADER = "X-DockMind-Timestamp"
CALLBACK_BACKOFF_SECONDS = (2.0, 8.0)  # espera antes del 2.º y del 3.er envío; no hay más
CALLBACK_TRIES = len(CALLBACK_BACKOFF_SECONDS) + 1
OVERLAY_BACKOFF_SECONDS = (1.0, 4.0)  # espera antes del 2.o y del 3.er intento de subida
OVERLAY_TRIES = len(OVERLAY_BACKOFF_SECONDS) + 1


class JobRejected(ValueError):
    """El job no cumple el contrato; no se procesa."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


class ResultStore(Protocol):
    """Observaciones ya calculadas. En Modal es un `modal.Dict`; en las pruebas, un dict."""

    def get(self, key: str) -> Any: ...

    def put(self, key: str, value: Any) -> Any: ...


@dataclass(frozen=True)
class Delivery:
    """Recibo del callback: si la API lo confirmó y, si no, por qué."""

    delivered: bool
    tries: int
    http_status: int | None
    problem: str | None  # None, REJECTED (la API lo rechazó: repetir no sirve) o UNREACHABLE (entrega incierta)


@dataclass(frozen=True)
class JobOutcome:
    result: dict
    delivery: Delivery
    reused: bool
    """True si la observación salió del almacén y no se volvió a llamar a SAM."""


@dataclass(frozen=True)
class JobRequest:
    job_id: str
    attempt: int
    organization_id: str
    session_id: str
    evidence_id: str
    group_id: str
    manifest_revision: int
    clip_url: str
    overlay_upload_url: str | None
    callback_url: str
    source: ClipSource
    config: CountConfig


def allowed_hosts_from_env() -> set[str]:
    raw = os.environ.get("DOCKMIND_ALLOWED_HOSTS", "")
    return {host.strip().lower() for host in raw.split(",") if host.strip()}


def _job_url(value: object, field: str, allowed_hosts: set[str], local_origins: frozenset[str]) -> str:
    if not isinstance(value, str):
        raise JobRejected("MEDIA_INVALID", f"{field} debe ser una URL")
    parsed = urlparse(value)
    try:
        origin = f"{parsed.scheme}://{parsed.hostname}:{parsed.port}"
    except ValueError as error:
        raise JobRejected("MEDIA_INVALID", f"{field} tiene un puerto inválido") from error
    if parsed.scheme == "http" and origin in local_origins:
        return value  # solo el lanzador local (local_server.py) pasa orígenes http://127.0.0.1:<puerto>
    if parsed.scheme != "https" or not parsed.hostname:
        raise JobRejected("MEDIA_INVALID", f"{field} debe ser https")
    if parsed.hostname.lower() not in allowed_hosts:
        raise JobRejected("MEDIA_INVALID", f"{field} apunta a un host no permitido")
    return value


def _text(payload: dict, field: str) -> str:
    value = payload.get(field)
    if not isinstance(value, str) or not value.strip():
        raise JobRejected("MEDIA_INVALID", f"Falta {field}")
    return value


def _number(data: dict, field: str, low: float = 0.0, high: float = 1.0) -> float:
    value = data.get(field)
    if not isinstance(value, (int, float)) or isinstance(value, bool) or not low <= value <= high:
        raise JobRejected("MEDIA_INVALID", f"{field} debe estar entre {low} y {high}")
    return float(value)


def parse_job(payload: dict, allowed_hosts: set[str], local_origins: frozenset[str] = frozenset()) -> JobRequest:
    """Valida el job. Modal pasa solo hosts https; `local_origins` lo usa el lanzador local y nunca Modal."""
    if payload.get("schema") != JOB_SCHEMA:
        raise JobRejected("MEDIA_INVALID", f"schema debe ser {JOB_SCHEMA}")
    attempt = payload.get("attempt")
    revision = payload.get("manifest_revision")
    if not isinstance(attempt, int) or attempt < 1:
        raise JobRejected("MEDIA_INVALID", "attempt debe ser un entero mayor que 0")
    if not isinstance(revision, int) or revision < 1:
        raise JobRejected("MEDIA_INVALID", "manifest_revision debe ser un entero mayor que 0")
    config = payload.get("config")
    if not isinstance(config, dict) or not isinstance(config.get("line"), dict):
        raise JobRejected("MEDIA_INVALID", "Falta config.line")
    line = config["line"]
    try:
        unit = Unit(config.get("unit"))
        source = ClipSource(payload.get("source"))
    except ValueError as error:
        raise JobRejected("MEDIA_INVALID", str(error)) from error
    if source is ClipSource.THIRD_PARTY_STOCK:
        raise JobRejected("MEDIA_INVALID", "Los clips de terceros solo se evalúan en local")
    concept = config.get("concept")
    if not isinstance(concept, str) or not concept.strip() or len(concept) > 60:
        raise JobRejected("MEDIA_INVALID", "config.concept debe ser una frase corta")
    overlay_url = payload.get("overlay_upload_url")
    return JobRequest(
        job_id=_text(payload, "job_id"),
        attempt=attempt,
        organization_id=_text(payload, "organization_id"),
        session_id=_text(payload, "session_id"),
        evidence_id=_text(payload, "evidence_id"),
        group_id=_text(payload, "group_id"),
        manifest_revision=revision,
        clip_url=_job_url(payload.get("clip_url"), "clip_url", allowed_hosts, local_origins),
        overlay_upload_url=_job_url(overlay_url, "overlay_upload_url", allowed_hosts, local_origins) if overlay_url else None,
        callback_url=_job_url(payload.get("callback_url"), "callback_url", allowed_hosts, local_origins),
        source=source,
        config=CountConfig(
            line=CountingLine(*(_number(line, k) for k in ("x1", "y1", "x2", "y2", "inside_x", "inside_y"))),
            unit=unit,
            concept=concept.strip(),
            margin=_number(config, "margin", 0.0, 0.1) if "margin" in config else 0.01,
            min_track_frames=int(_number(config, "min_track_frames", 1, 30)) if "min_track_frames" in config else 3,
        ),
    )


def sign(body: bytes, secret: str, timestamp: int) -> str:
    """Firma HMAC-SHA256 de `<timestamp>.<cuerpo>`. La API la verifica y rechaza firmas viejas."""
    digest = hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def verify(body: bytes, secret: str, timestamp: int, signature: str, now: int, tolerance: int = 300) -> bool:
    if abs(now - timestamp) > tolerance:
        return False
    return hmac.compare_digest(sign(body, secret, timestamp), signature)


def _download(http: httpx.Client, url: str, target: Path) -> None:
    received = 0
    with http.stream("GET", url) as response:
        if response.status_code != 200:
            raise VideoError(f"No se pudo descargar el clip (HTTP {response.status_code})")
        with target.open("wb") as handle:
            for chunk in response.iter_bytes():
                received += len(chunk)
                if received > MAX_CLIP_BYTES:
                    raise VideoError("El clip supera 50 MB")
                handle.write(chunk)


def _already_exists(response: httpx.Response) -> bool:
    """Storage responde 409, o 400 con `statusCode` "409" según la versión, si el objeto ya está guardado."""
    if response.status_code == 409:
        return True
    if response.status_code != 400:
        return False
    try:
        body = response.json()
    except ValueError:
        return False
    return isinstance(body, dict) and (str(body.get("statusCode")) == "409" or body.get("error") == "Duplicate")


def _upload_overlay(http: httpx.Client, url: str, video: Path, sleep: Callable[[float], None]) -> dict:
    """Sube el video anotado a la ruta de este intento, que la API deriva del job y del intento.

    La URL firmada solo crea: nunca reemplaza un objeto guardado. Si ya existe (un envío anterior de este mismo
    intento cuya respuesta se perdió), se informa como subido con el SHA-256 de estos bytes y la API lo compara
    con el objeto guardado antes de aceptarlo. Se repite solo lo que puede mejorar: sin respuesta, 408, 429 o 5xx.
    """
    data = video.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    for tries in range(1, OVERLAY_TRIES + 1):
        try:
            response = http.put(url, content=data, headers={"content-type": "video/mp4", "x-upsert": "false"})
        except httpx.TransportError:
            response = None
        if response is not None:
            if response.status_code in (200, 201) or _already_exists(response):
                return {"overlay_uploaded": True, "overlay_sha256": digest}
            if response.status_code not in (408, 429) and response.status_code < 500:
                break
        if tries < OVERLAY_TRIES:
            sleep(OVERLAY_BACKOFF_SECONDS[tries - 1])
    return {"overlay_uploaded": False, "overlay_sha256": None}


def result_key(job: JobRequest) -> str:
    """Mismo job, misma evidencia, misma procedencia y misma configuración: otro intento contaría lo mismo."""
    data = {"job_id": job.job_id, "evidence_id": job.evidence_id, "source": job.source.value, "config": asdict(job.config)}
    return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()


class _Replay:
    """Devuelve la salida de SAM ya pagada para volver a dibujar el video anotado. No llama a SAM."""

    def __init__(self, sam: dict):
        self.name = sam["segmenter"]
        self._run = SegmentationRun(
            text=zlib.decompress(sam["text_zlib"]).decode("utf-8"), model=sam["model"],
            seconds=sam["seconds"], request_id=sam["request_id"],
        )

    def segment(self, video: Path, concept: str) -> SegmentationRun:
        return self._run


def _stored(store: ResultStore | None, key: str, clip: Path) -> tuple[dict, dict] | None:
    """Sirve solo si es del mismo archivo y trae su salida de SAM. Si el almacén falla, se analiza de nuevo."""
    if store is None:
        return None
    try:
        value = store.get(key)
    except Exception:
        return None
    if not isinstance(value, dict):
        return None
    observation, sam = value.get("observation"), value.get("sam")
    if not isinstance(observation, dict) or not isinstance(sam, dict) or not isinstance(sam.get("text_zlib"), bytes):
        return None
    if observation.get("clip", {}).get("sha256") != sha256_file(clip):
        return None
    return observation, sam


def _store(store: ResultStore | None, key: str, observation: dict, out: Path) -> None:
    """Guarda la observación sin la evidencia de subida, que es de cada intento, y la salida de SAM comprimida."""
    if store is None:
        return
    try:
        run = json.loads((out / "sam_run.json").read_text(encoding="utf-8"))
        sam = {
            "segmenter": run["segmenter"], "model": run["model"], "seconds": run["seconds"], "request_id": run["request_id"],
            "text_zlib": zlib.compress((out / "sam_raw.txt").read_text(encoding="utf-8").encode("utf-8")),
        }
        clean = {k: v for k, v in json.loads(json.dumps(observation)).items() if k != "evidence"}
        store.put(key, {"observation": clean, "sam": sam})
    except Exception:
        pass  # sin almacén, o con un valor demasiado grande, se pierde la reentrega barata, no el resultado


def deliver(
    result: dict,
    callback_url: str,
    secret: str,
    http: httpx.Client,
    clock: Callable[[], float] = time.time,
    sleep: Callable[[float], None] = time.sleep,
) -> Delivery:
    """Envía el resultado firmado y exige confirmación 2xx de la API.

    Repetir es seguro porque la API guarda una vez por job e intento. Se repite solo lo que puede
    mejorar (sin respuesta, 408, 429 o 5xx), con un tope de envíos; un 4xx no se repite.
    """
    body = json.dumps(result, ensure_ascii=False, separators=(",", ":")).encode()
    status: int | None = None
    for tries in range(1, CALLBACK_TRIES + 1):
        timestamp = int(clock())  # firma nueva en cada envío: la API rechaza firmas de más de 5 minutos
        try:
            response = http.post(
                callback_url,
                content=body,
                headers={
                    "content-type": "application/json",
                    TIMESTAMP_HEADER: str(timestamp),
                    SIGNATURE_HEADER: sign(body, secret, timestamp),
                },
            )
        except httpx.TransportError:  # timeout o conexión caída: no se sabe si llegó
            status = None
        else:
            status = response.status_code
            if 200 <= status < 300:
                return Delivery(delivered=True, tries=tries, http_status=status, problem=None)
            if status not in (408, 429) and status < 500:
                return Delivery(delivered=False, tries=tries, http_status=status, problem="REJECTED")
        if tries < CALLBACK_TRIES:
            sleep(CALLBACK_BACKOFF_SECONDS[tries - 1])
    return Delivery(delivered=False, tries=CALLBACK_TRIES, http_status=status, problem="UNREACHABLE")


def _error_code(error: Exception) -> str:
    if isinstance(error, (VideoError, JobRejected)):
        return "MEDIA_INVALID"
    if isinstance(error, ProviderNotConfigured):
        return "NOT_CONFIGURED"
    if isinstance(error, ProviderUnavailable):
        return "PROVIDER_UNAVAILABLE"
    if isinstance(error, SamOutputError):
        return "MODEL_OUTPUT_INVALID"
    return "INTERNAL"


def run_job(
    job: JobRequest,
    secret: str,
    http: httpx.Client,
    segmenter_factory: Callable[[], Segmenter] = MetaSamClient,
    clock: Callable[[], float] = time.time,
    store: ResultStore | None = None,
    sleep: Callable[[float], None] = time.sleep,
) -> JobOutcome:
    """Procesa el job y siempre intenta avisar el resultado, también cuando falla.

    Una observación calculada se guarda, con su salida de SAM, antes de avisar. Si el aviso no llega, el
    reintento que pide la API (otro intento del mismo job) la reentrega sin volver a pagar SAM: el video
    anotado se vuelve a dibujar con esa salida y se sube a la ruta del intento nuevo. El worker nunca repite
    la inferencia por su cuenta.
    """
    result: dict = {
        "schema": RESULT_SCHEMA,
        "job_id": job.job_id,
        "attempt": job.attempt,
        "organization_id": job.organization_id,
        "session_id": job.session_id,
        "evidence_id": job.evidence_id,
        "group_id": job.group_id,
        "manifest_revision": job.manifest_revision,
        "status": "FAILED",
        "error": None,
        "observation": None,
    }
    reused = False
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        try:
            clip = work / "clip.mp4"
            _download(http, job.clip_url, clip)
            key = result_key(job)
            out = work / "out"
            stored = _stored(store, key, clip)
            reused = stored is not None
            if stored is None:
                observation = analyze_clip(clip, job.config, job.source, segmenter_factory(), out)
                observation["clip"]["file"] = f"{job.evidence_id}.mp4"
                _store(store, key, observation, out)
            else:
                observation, sam = stored
                analyze_clip(clip, job.config, job.source, _Replay(sam), out)  # solo para el video anotado de este intento
            evidence = {"overlay_uploaded": False, "overlay_sha256": None}
            if job.overlay_upload_url:
                evidence = _upload_overlay(http, job.overlay_upload_url, out / "overlay.mp4", sleep)
            observation["evidence"] = evidence
            result.update(status="SUCCEEDED", observation=observation)
        except Exception as error:  # cualquier fallo se reporta con un código estable, sin datos sensibles
            result["error"] = {"code": _error_code(error), "message": str(error)[:300]}

    delivery = deliver(result, job.callback_url, secret, http, clock=clock, sleep=sleep)
    return JobOutcome(result=result, delivery=delivery, reused=reused)
