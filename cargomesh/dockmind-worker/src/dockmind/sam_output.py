"""Lee la salida de texto de sam-3.1 para video y extrae las cajas.

Gramática documentada (https://dev.meta.ai/docs/sam/reading-segmentation):
una línea por cuadro, que empieza con ``<Nf>`` y sigue con registros separados
por coma. Cada registro es ``<id><|box;x1=..;y1=..;x2=..;y2=..;w=..;h=..(;c=..)|>``
seguido opcionalmente de ``<|mask;...|>``. Las máscaras no hacen falta para
contar, así que se ignoran. Los cuadros sin objetos no emiten línea.
"""

from __future__ import annotations

import re

from .models import Box

_FRAME = re.compile(r"^<(\d+)f>")
_BOX = re.compile(r"(\d+)<\|box;([^|>]*)\|>")
_REQUIRED = ("x1", "y1", "x2", "y2", "w", "h")


class SamOutputError(ValueError):
    """La salida no respeta la gramática esperada: el contrato del proveedor cambió."""


def parse_sam_output(text: str) -> list[Box]:
    """Convierte la salida completa (todas las líneas) en cajas. Texto vacío = sin detecciones."""
    boxes: list[Box] = []
    for line_number, raw in enumerate(text.splitlines(), start=1):
        line = raw.strip()
        if not line:
            continue
        frame_match = _FRAME.match(line)
        if frame_match is None:
            raise SamOutputError(f"Línea {line_number} sin marca de cuadro <Nf>: {line[:40]!r}")
        frame = int(frame_match.group(1))
        records = _BOX.findall(line, frame_match.end())
        if not records:
            raise SamOutputError(f"Línea {line_number} (cuadro {frame}) sin registros de caja")
        for object_id, fields in records:
            boxes.append(_parse_box(frame, int(object_id), fields, line_number))
    return boxes


def _parse_box(frame: int, object_id: int, fields: str, line_number: int) -> Box:
    values: dict[str, str] = {}
    for part in fields.split(";"):
        key, sep, value = part.partition("=")
        if not sep:
            raise SamOutputError(f"Línea {line_number}: campo de caja sin '=': {part!r}")
        values[key] = value
    missing = [key for key in _REQUIRED if key not in values]
    if missing:
        raise SamOutputError(f"Línea {line_number}: faltan {', '.join(missing)} en la caja del objeto {object_id}")
    try:
        x1, y1, x2, y2 = (float(values[k]) for k in ("x1", "y1", "x2", "y2"))
        width, height = int(values["w"]), int(values["h"])
        confidence = float(values["c"]) if "c" in values else None
    except ValueError as error:
        raise SamOutputError(f"Línea {line_number}: valor no numérico en la caja del objeto {object_id}") from error
    if x2 < x1 or y2 < y1:
        raise SamOutputError(f"Línea {line_number}: caja invertida en el objeto {object_id}")
    return Box(frame, object_id, x1, y1, x2, y2, width, height, confidence)


def format_box(box: Box) -> str:
    """Escribe una caja con la misma gramática (sin máscara). Se usa para fixtures rotulados."""
    fields = f"x1={box.x1:g};y1={box.y1:g};x2={box.x2:g};y2={box.y2:g};w={box.frame_width};h={box.frame_height}"
    if box.confidence is not None:
        fields += f";c={box.confidence:g}"
    return f"{box.object_id}<|box;{fields}|>"


def format_frame(frame: int, boxes: list[Box]) -> str:
    return f"<{frame}f>" + ",".join(format_box(box) for box in boxes)
