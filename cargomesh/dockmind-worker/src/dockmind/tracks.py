"""Agrupa las cajas de SAM en trayectorias por ID y separa los IDs reutilizados."""

from __future__ import annotations

import math
from collections import defaultdict

from .models import Box, Track
from .sam_output import SamOutputError

EXIT_GAP_FRAMES = 5
"""Un ID que sale tocando el borde y vuelve después de más cuadros que estos, lejos, es otro bulto."""
EXIT_JUMP = 0.25
EDGE = 0.01
MAX_STEP = 0.3
"""Desplazamiento máximo del centro por cuadro, en fracciones del cuadro: a 10 fps, 3 cuadros por segundo es imposible."""


def build_tracks(boxes: list[Box], total_frames: int | None = None) -> list[Track]:
    """Trayectorias por ID, con sus cajas ordenadas por cuadro.

    Un cuadro fuera del clip indica que la respuesta no corresponde al video
    enviado, así que se rechaza. Si un ID aparece dos veces en el mismo cuadro
    se conserva la primera aparición. Un ID se parte en tramos cuando salta a
    una posición imposible o vuelve lejos después de salir por el borde.
    """
    by_id: dict[int, dict[int, Box]] = defaultdict(dict)
    for box in boxes:
        if box.frame < 0 or (total_frames is not None and box.frame >= total_frames):
            raise SamOutputError(f"Cuadro {box.frame} fuera del clip de {total_frames} cuadros")
        by_id[box.object_id].setdefault(box.frame, box)
    tracks = [
        Track(object_id, tuple(segment), index)
        for object_id, frames in by_id.items()
        for index, segment in enumerate(_split([frames[f] for f in sorted(frames)]))
    ]
    return sorted(tracks, key=lambda track: (track.first_frame, track.object_id, track.segment))


def _split(boxes: list[Box]) -> list[list[Box]]:
    segments = [[boxes[0]]]
    for previous, box in zip(boxes, boxes[1:]):
        gap = box.frame - previous.frame
        jump = _jump(previous, box)
        left_frame = gap > EXIT_GAP_FRAMES and _touches_edge(previous) and jump > EXIT_JUMP
        if left_frame or jump > MAX_STEP * gap:
            segments.append([])
        segments[-1].append(box)
    return segments


def _touches_edge(box: Box) -> bool:
    return (
        box.x1 <= EDGE * box.frame_width or box.x2 >= (1 - EDGE) * box.frame_width
        or box.y1 <= EDGE * box.frame_height or box.y2 >= (1 - EDGE) * box.frame_height
    )


def _jump(a: Box, b: Box) -> float:
    (ax, ay), (bx, by) = a.center, b.center
    return math.hypot((bx - ax) / a.frame_width, (by - ay) / a.frame_height)
