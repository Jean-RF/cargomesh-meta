"""Cliente de SAM 3.1 en la Meta Model API.

Sube el clip normalizado a la Files API con vencimiento, pide la segmentación
en streaming con un solo concepto y borra el archivo al terminar.
Referencias: https://dev.meta.ai/docs/sam/segmenting y https://dev.meta.ai/docs/file-handling
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

DEFAULT_BASE_URL = "https://api.meta.ai/v1"
DEFAULT_MODEL = "sam-3.1"
FILE_TTL_SECONDS = 3600  # mínimo permitido por la Files API
USD_PER_FRAME = 0.20 / 1000
MIN_BILLED_FRAMES = 50


class ProviderNotConfigured(RuntimeError):
    """Falta la clave de la Meta API."""


class ProviderUnavailable(RuntimeError):
    """La Meta API no respondió o devolvió un error."""


@dataclass(frozen=True)
class SegmentationRun:
    text: str
    model: str
    seconds: float
    request_id: str | None = None


class Segmenter(Protocol):
    name: str

    def segment(self, video: Path, concept: str) -> SegmentationRun: ...


def estimated_cost_usd(frames: int) -> float:
    return round(max(frames, MIN_BILLED_FRAMES) * USD_PER_FRAME, 4)


class MetaSamClient:
    name = "META_SAM_API"

    def __init__(self, api_key: str | None = None, base_url: str | None = None, model: str | None = None):
        key = api_key or os.environ.get("META_MODEL_API_KEY") or os.environ.get("MODEL_API_KEY")
        if not key:
            raise ProviderNotConfigured("Falta META_MODEL_API_KEY (o MODEL_API_KEY) en el entorno")
        from openai import OpenAI  # importación diferida: los tests no necesitan el SDK configurado

        self.model = model or os.environ.get("META_SAM_MODEL") or DEFAULT_MODEL
        self._client = OpenAI(
            api_key=key,
            base_url=base_url or os.environ.get("META_MODEL_BASE_URL") or DEFAULT_BASE_URL,
            timeout=600,
            max_retries=1,
        )

    def segment(self, video: Path, concept: str) -> SegmentationRun:
        concept = concept.strip()
        if not concept:
            raise ValueError("El concepto no puede estar vacío")
        started = time.monotonic()
        file_id = None
        try:
            with video.open("rb") as handle:
                uploaded = self._client.files.create(
                    purpose="user_data",
                    expires_after={"anchor": "created_at", "seconds": FILE_TTL_SECONDS},
                    file=handle,
                )
            file_id = uploaded.id
            chunks: list[str] = []
            request_id = None
            with self._client.responses.stream(
                model=self.model,
                input=[{
                    "type": "message",
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": concept},
                        {"type": "input_video", "file_id": file_id},
                    ],
                }],
                metadata={"include_confidence": "true", "mask_encoding": "one_bit"},
            ) as stream:
                for event in stream:
                    if event.type == "response.output_text.delta":
                        chunks.append(event.delta)
                        if not event.delta.endswith("\n"):
                            chunks.append("\n")
                    elif event.type == "response.completed":
                        request_id = getattr(event.response, "id", None)
            return SegmentationRun("".join(chunks), self.model, round(time.monotonic() - started, 2), request_id)
        except (ProviderNotConfigured, ValueError):
            raise
        except Exception as error:  # el SDK lanza varios tipos; se reportan como proveedor no disponible
            raise ProviderUnavailable(f"SAM no respondió: {type(error).__name__}: {error}") from error
        finally:
            if file_id is not None:
                try:
                    self._client.files.delete(file_id)
                except Exception:
                    pass  # vence solo en una hora


class FixtureSegmenter:
    """Reproduce una salida guardada. Sirve para pruebas y para no pagar dos veces el mismo clip.

    Si la salida guardada vino de un fixture rotulado (no de SAM), el resultado
    se marca como FIXTURE y nunca se presenta como inferencia real.
    """

    def __init__(self, path: Path, name: str = "FIXTURE"):
        self.path = path
        self.name = name

    def segment(self, video: Path, concept: str) -> SegmentationRun:
        return SegmentationRun(self.path.read_text(encoding="utf-8"), self.name, 0.0)
