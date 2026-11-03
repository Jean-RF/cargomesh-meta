"""Primer cuadro de un clip con una cuadrícula de décimas, para elegir --line e --inside a ojo."""

from __future__ import annotations

from pathlib import Path

import cv2

from .video import VideoError


def first_frame_with_grid(clip: Path, target: Path) -> Path:
    capture = cv2.VideoCapture(str(clip))
    ok, frame = capture.read()
    capture.release()
    if not ok:
        raise VideoError(f"No se pudo leer el primer cuadro de {clip.name}")
    height, width = frame.shape[:2]
    for step in range(1, 10):
        x, y = round(width * step / 10), round(height * step / 10)
        cv2.line(frame, (x, 0), (x, height), (0, 215, 255), 1)
        cv2.line(frame, (0, y), (width, y), (0, 215, 255), 1)
        cv2.putText(frame, f"{step / 10:.1f}", (x + 4, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 215, 255), 1)
        cv2.putText(frame, f"{step / 10:.1f}", (4, y - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 215, 255), 1)
    target.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(target), frame):
        raise VideoError(f"No se pudo escribir {target}")
    return target
