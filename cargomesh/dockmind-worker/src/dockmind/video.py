"""Normalización y lectura de metadatos del clip con ffmpeg/ffprobe."""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from dataclasses import asdict, dataclass
from fractions import Fraction
from pathlib import Path

MAX_DURATION_SECONDS = 600  # SAM acepta hasta 15 000 cuadros; a 10 fps son 25 min, pero limitamos a 10.


class VideoError(ValueError):
    """El archivo no es un video utilizable."""


@dataclass(frozen=True)
class VideoInfo:
    width: int
    height: int
    fps: float
    frames: int
    duration: float
    codec: str

    def to_dict(self) -> dict:
        return asdict(self)


def _require(tool: str) -> str:
    path = shutil.which(tool)
    if path is None:
        raise VideoError(f"No se encontró {tool} en el PATH")
    return path


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def probe(path: Path) -> VideoInfo:
    """Lee tamaño, fps, duración y cuenta los cuadros reales del primer stream de video."""
    result = subprocess.run(
        [
            _require("ffprobe"), "-v", "error", "-select_streams", "v:0", "-count_frames",
            "-show_entries", "stream=width,height,avg_frame_rate,nb_read_frames,codec_name:format=duration",
            "-of", "json", str(path),
        ],
        capture_output=True, text=True, check=False,
    )
    if result.returncode != 0:
        raise VideoError(f"ffprobe no pudo leer {path.name}: {result.stderr.strip()[:200]}")
    data = json.loads(result.stdout or "{}")
    streams = data.get("streams") or []
    if not streams:
        raise VideoError(f"{path.name} no tiene un stream de video")
    stream = streams[0]
    frames = int(stream.get("nb_read_frames") or 0)
    if frames == 0:
        raise VideoError(f"{path.name} no tiene cuadros")
    rate = stream.get("avg_frame_rate") or "0/1"
    fps = float(Fraction(rate)) if rate != "0/0" else 0.0
    duration = float((data.get("format") or {}).get("duration") or (frames / fps if fps else 0))
    return VideoInfo(int(stream["width"]), int(stream["height"]), fps, frames, duration, stream.get("codec_name", ""))


def normalize(
    source: Path, target: Path, fps: int = 10, max_height: int = 720, crop: tuple[int, int, int, int] | None = None,
) -> VideoInfo:
    """Convierte a MP4 H.264 sin audio, a `fps` cuadros por segundo y como máximo `max_height` de alto.

    El filtro fps conserva el inicio del clip, así que el cuadro k del video
    normalizado corresponde al segundo k / fps del original. `crop` es
    (x, y, ancho, alto) en píxeles del original y se aplica antes de escalar.
    """
    info = probe(source)
    if info.duration > MAX_DURATION_SECONDS:
        raise VideoError(f"El clip dura {info.duration:.0f} s; el máximo es {MAX_DURATION_SECONDS} s")
    target.parent.mkdir(parents=True, exist_ok=True)
    filters = f"fps={fps},scale=-2:'min({max_height},ih)'"
    if crop is not None:
        x, y, width, height = crop
        filters = f"crop={width}:{height}:{x}:{y},{filters}"
    result = subprocess.run(
        [
            _require("ffmpeg"), "-y", "-v", "error", "-i", str(source),
            "-vf", filters,
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-pix_fmt", "yuv420p",
            "-an", "-movflags", "+faststart", str(target),
        ],
        capture_output=True, text=True, check=False,
    )
    if result.returncode != 0:
        raise VideoError(f"ffmpeg falló al normalizar {source.name}: {result.stderr.strip()[:200]}")
    return probe(target)


def reencode_for_browser(source: Path, target: Path) -> None:
    """Re-codifica a H.264 yuv420p con faststart para que el navegador lo reproduzca."""
    result = subprocess.run(
        [
            _require("ffmpeg"), "-y", "-v", "error", "-i", str(source),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
            "-an", "-movflags", "+faststart", str(target),
        ],
        capture_output=True, text=True, check=False,
    )
    if result.returncode != 0:
        raise VideoError(f"ffmpeg falló al re-codificar {source.name}: {result.stderr.strip()[:200]}")
