"""Video anotado: línea de cruce, cajas con su ID, contador y marcas de revisión."""

from __future__ import annotations

import tempfile
from collections import defaultdict
from pathlib import Path

import cv2

from .models import Box, CountConfig, CountResult, Direction
from .video import VideoError, reencode_for_browser

_LINE = (0, 215, 255)
_BOX = (80, 200, 80)
_TEXT = (255, 255, 255)
_ALERT = (60, 60, 230)


def render_overlay(video: Path, boxes: list[Box], config: CountConfig, result: CountResult, target: Path, label: str) -> Path:
    """Dibuja sobre el video normalizado (el mismo que vio SAM) y lo guarda como MP4 H.264."""
    capture = cv2.VideoCapture(str(video))
    if not capture.isOpened():
        raise VideoError(f"OpenCV no pudo abrir {video.name}")
    fps = capture.get(cv2.CAP_PROP_FPS) or 10
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))

    by_frame: dict[int, list[Box]] = defaultdict(list)
    for box in boxes:
        by_frame[box.frame].append(box)
    line = config.line
    p1 = (round(line.x1 * width), round(line.y1 * height))
    p2 = (round(line.x2 * width), round(line.y2 * height))
    inside = (round(line.inside_x * width), round(line.inside_y * height))
    flag_frames = {flag.frame for flag in result.flags}

    with tempfile.TemporaryDirectory() as tmp:
        raw = Path(tmp) / "overlay-raw.mp4"
        writer = cv2.VideoWriter(str(raw), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
        entries = exits = 0
        events = list(result.events)
        frame_index = 0
        while True:
            ok, frame = capture.read()
            if not ok:
                break
            while events and events[0].frame <= frame_index:
                event = events.pop(0)
                if event.direction is Direction.IN:
                    entries += 1
                else:
                    exits += 1
            cv2.line(frame, p1, p2, _LINE, 3)
            cv2.putText(frame, "adentro", inside, cv2.FONT_HERSHEY_SIMPLEX, 0.6, _LINE, 2)
            for box in by_frame.get(frame_index, []):
                cv2.rectangle(frame, (round(box.x1), round(box.y1)), (round(box.x2), round(box.y2)), _BOX, 2)
                cv2.putText(frame, f"ID {box.object_id}", (round(box.x1), max(14, round(box.y1) - 6)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, _BOX, 2)
            counter = f"{config.unit.value}  entran {entries}  salen {exits}  neto {entries - exits}"
            cv2.rectangle(frame, (0, 0), (width, 34), (0, 0, 0), -1)
            cv2.putText(frame, counter, (10, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.65, _TEXT, 2)
            cv2.putText(frame, f"{frame_index / fps:6.1f} s", (width - 110, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.6, _TEXT, 2)
            (label_w, _), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.putText(frame, label, (width - label_w - 10, height - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.5, _TEXT, 1)
            if frame_index in flag_frames:
                cv2.rectangle(frame, (2, 2), (width - 3, height - 3), _ALERT, 6)
                cv2.putText(frame, "REVISAR", (width // 2 - 60, 70), cv2.FONT_HERSHEY_SIMPLEX, 1.0, _ALERT, 3)
            writer.write(frame)
            frame_index += 1
        writer.release()
        capture.release()
        if frame_index == 0:
            raise VideoError(f"{video.name} no tiene cuadros legibles")
        target.parent.mkdir(parents=True, exist_ok=True)
        reencode_for_browser(raw, target)
    return target
