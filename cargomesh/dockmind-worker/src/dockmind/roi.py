"""Ventana de análisis alrededor de la línea de cruce.

SAM 3.1 sigue como máximo 16 objetos. En un andén real los bultos quietos del
fondo ocupan esos lugares y SAM deja de dar IDs nuevos o reutiliza IDs viejos,
lo que aparece como salidas falsas. Recortar el video a un corredor alrededor
de la línea deja fuera lo que nunca va a cruzar.

En el clip de la cinta (evidencia del 29 de octubre) el recorte pasó de neto 5
con 3 salidas falsas a 10 de 11 sin salidas falsas. Los valores por defecto
reproducen ese recorte; no están ajustados con más clips.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, replace

from .models import CountConfig, CountingLine

ACROSS = 1.6
"""Ancho del corredor a cada lado de la línea, en largos de línea."""
ALONG = 0.6
"""Cuánto se prolonga el corredor más allá de cada extremo, en largos de línea."""
MIN_SIDE = 256
FULL_FRAME_SHARE = 0.9


@dataclass(frozen=True)
class Roi:
    """Rectángulo en píxeles del cuadro original, con lados pares para H.264."""

    x: int
    y: int
    width: int
    height: int

    def to_fractions(self, frame_width: int, frame_height: int) -> dict:
        return {
            "x": round(self.x / frame_width, 4),
            "y": round(self.y / frame_height, 4),
            "width": round(self.width / frame_width, 4),
            "height": round(self.height / frame_height, 4),
        }


def roi_for_line(line: CountingLine, frame_width: int, frame_height: int) -> Roi | None:
    """Corredor alrededor de la línea; None si casi todo el cuadro queda adentro."""
    ax, ay = line.x1 * frame_width, line.y1 * frame_height
    bx, by = line.x2 * frame_width, line.y2 * frame_height
    length = math.hypot(bx - ax, by - ay)
    if length == 0:
        raise ValueError("La línea de cruce necesita dos puntos distintos")
    ux, uy = (bx - ax) / length, (by - ay) / length
    nx, ny = -uy, ux
    xs, ys = [], []
    for along in (-ALONG * length, (1 + ALONG) * length):
        for across in (-ACROSS * length, ACROSS * length):
            xs.append(ax + ux * along + nx * across)
            ys.append(ay + uy * along + ny * across)
    x0, x1 = _span(min(xs), max(xs), frame_width)
    y0, y1 = _span(min(ys), max(ys), frame_height)
    if (x1 - x0) * (y1 - y0) >= FULL_FRAME_SHARE * frame_width * frame_height:
        return None
    return Roi(x0, y0, x1 - x0, y1 - y0)


def config_for_roi(config: CountConfig, roi: Roi, frame_width: int, frame_height: int) -> CountConfig:
    """La misma configuración expresada en fracciones de la ventana.

    Margen y zona cercana conservan su distancia en píxeles del cuadro original.
    El punto de adentro se acerca a la línea si cae fuera de la ventana, para que
    el video anotado lo muestre: sigue del mismo lado porque se mueve sobre el
    segmento que lo une con el centro de la línea.
    """
    def fx(x: float) -> float:
        return (x * frame_width - roi.x) / roi.width

    def fy(y: float) -> float:
        return (y * frame_height - roi.y) / roi.height

    line = config.line
    mid_x, mid_y = (fx(line.x1) + fx(line.x2)) / 2, (fy(line.y1) + fy(line.y2)) / 2
    in_x, in_y = fx(line.inside_x), fy(line.inside_y)
    scale = 1.0
    for mid, point in ((mid_x, in_x), (mid_y, in_y)):
        bound = 0.95 if point > 0.95 else 0.05 if point < 0.05 else None
        if bound is not None and (bound - mid) * (point - mid) > 0:
            scale = min(scale, (bound - mid) / (point - mid))
    moved = CountingLine(
        x1=fx(line.x1), y1=fy(line.y1), x2=fx(line.x2), y2=fy(line.y2),
        inside_x=mid_x + (in_x - mid_x) * scale, inside_y=mid_y + (in_y - mid_y) * scale,
    )
    widen = frame_width / roi.width
    return replace(config, line=moved, margin=config.margin * widen, near_zone=config.near_zone * widen)


def _span(low: float, high: float, limit: int) -> tuple[int, int]:
    """Recorta al cuadro, asegura MIN_SIDE y deja inicio y largo pares."""
    side = min(limit - limit % 2, max(MIN_SIDE, math.ceil(high - low)))
    center = (low + high) / 2
    start = int(min(max(0.0, center - side / 2), limit - side))
    start -= start % 2
    side -= side % 2
    return start, start + side
