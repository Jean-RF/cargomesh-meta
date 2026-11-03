"""Clips sintéticos (SYNTHETIC_RENDER) para probar el pipeline sin cámara ni API.

Cada escenario genera tres cosas:
- un MP4 renderizado con cajas que cruzan una línea vertical en el centro;
- la referencia manual (cruces reales y total) para evaluar;
- un fixture en formato SAM, calculado de la geometría y rotulado FIXTURE.

El fixture NO es una inferencia: sirve para probar el parser, el contador y el
video anotado. Para validar SAM hay que usar clips propios con la API real.
"""

from __future__ import annotations

import csv
import tempfile
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

from .models import Box
from .sam_output import format_frame
from .video import reencode_for_browser

WIDTH, HEIGHT, RENDER_FPS, FIXTURE_FPS = 1280, 720, 30, 10
BOX_W, BOX_H = 120, 90
LINE_X = WIDTH // 2
SPEED = 320.0  # px por segundo


@dataclass(frozen=True)
class SyntheticBox:
    box_id: int
    y: int
    keyframes: tuple[tuple[float, float], ...]
    """(segundo, x del centro). Fuera de su primer y último keyframe la caja no existe."""

    def center_x(self, t: float) -> float | None:
        frames = self.keyframes
        if t < frames[0][0] or t > frames[-1][0]:
            return None
        for (t0, x0), (t1, x1) in zip(frames, frames[1:]):
            if t0 <= t <= t1:
                return x0 if t1 == t0 else x0 + (x1 - x0) * (t - t0) / (t1 - t0)
        return frames[-1][1]


@dataclass(frozen=True)
class Scenario:
    name: str
    duration: float
    boxes: tuple[SyntheticBox, ...]
    occluder: tuple[float, float, float] | None = None
    """(segundo inicial, segundo final, ancho en px) de una franja que tapa la línea."""


def _crossing(box_id: int, start: float, y: int) -> SyntheticBox:
    """Una caja que entra por la izquierda, cruza la línea y sale por la derecha."""
    x0, x1 = -BOX_W, WIDTH + BOX_W
    return SyntheticBox(box_id, y, ((start, x0), (start + (x1 - x0) / SPEED, x1)))


def scenarios() -> dict[str, Scenario]:
    rows = (380, 470, 420, 500, 400, 450)
    todas = tuple(_crossing(i + 1, 0.5 + 1.4 * i, rows[i]) for i in range(6))
    falta = tuple(_crossing(i + 1, 0.5 + 1.4 * i, rows[i]) for i in range(5)) + (
        SyntheticBox(6, rows[5], ((7.5, -BOX_W), (9.0, WIDTH * 0.32), (10.0, WIDTH * 0.32), (11.5, -BOX_W))),
    )
    reingreso = tuple(_crossing(i + 1, 0.5 + 1.6 * i, rows[i]) for i in range(3)) + (
        SyntheticBox(4, rows[3], (
            (5.5, -BOX_W), (7.6, WIDTH * 0.72), (8.2, WIDTH * 0.72), (9.6, WIDTH * 0.28),
            (10.2, WIDTH * 0.28), (12.8, WIDTH + BOX_W),
        )),
    )
    oclusion = tuple(_crossing(i + 1, 0.5 + 1.6 * i, rows[i]) for i in range(4))
    hidden_start = 0.5 + 1.6 * 2
    return {
        "todas": Scenario("todas", 11.0, todas),
        "falta_una": Scenario("falta_una", 12.5, falta),
        "reingreso": Scenario("reingreso", 13.5, reingreso),
        "oclusion": Scenario("oclusion", 11.0, oclusion, occluder=(hidden_start + 2.0, hidden_start + 3.4, 140)),
    }


def _occluded(scenario: Scenario, t: float, center_x: float) -> bool:
    if scenario.occluder is None:
        return False
    start, end, width = scenario.occluder
    return start <= t <= end and abs(center_x - LINE_X) <= width / 2


def _visible(center_x: float) -> bool:
    return -BOX_W / 2 < center_x < WIDTH + BOX_W / 2


def reference_crossings(scenario: Scenario) -> list[tuple[float, str]]:
    """Cruces físicos reales de la línea, muestreados a 100 Hz. No usa el fixture."""
    events = []
    for box in scenario.boxes:
        previous = None
        t = box.keyframes[0][0]
        while t <= box.keyframes[-1][0]:
            x = box.center_x(t)
            side = 1 if x > LINE_X else -1
            if previous is not None and side != previous:
                events.append((round(t, 2), "IN" if side == 1 else "OUT"))
            previous = side
            t += 0.01
    return sorted(events)


def fixture_text(scenario: Scenario) -> str:
    """Salida en formato SAM a 10 fps. Tras una oclusión, la caja vuelve con otro ID, como haría un seguidor real."""
    next_id = 100
    current_id = {box.box_id: box.box_id for box in scenario.boxes}
    hidden_before = {box.box_id: False for box in scenario.boxes}
    lines = []
    total = int(scenario.duration * FIXTURE_FPS)
    for frame in range(total):
        t = frame / FIXTURE_FPS
        records = []
        for box in scenario.boxes:
            x = box.center_x(t)
            if x is None or not _visible(x):
                continue
            if _occluded(scenario, t, x):
                hidden_before[box.box_id] = True
                continue
            if hidden_before[box.box_id]:
                current_id[box.box_id] = next_id
                next_id += 1
                hidden_before[box.box_id] = False
            x1 = max(0.0, x - BOX_W / 2)
            x2 = min(float(WIDTH), x + BOX_W / 2)
            records.append(Box(frame, current_id[box.box_id], round(x1), box.y, round(x2), box.y + BOX_H, WIDTH, HEIGHT, 0.9))
        if records:
            lines.append(format_frame(frame, records))
    return "\n".join(lines) + ("\n" if lines else "")


def _draw(scenario: Scenario, t: float) -> np.ndarray:
    frame = np.full((HEIGHT, WIDTH, 3), (88, 92, 96), np.uint8)
    cv2.rectangle(frame, (0, 0), (WIDTH, 300), (150, 145, 140), -1)
    cv2.rectangle(frame, (LINE_X, 120), (WIDTH, HEIGHT), (45, 45, 50), -1)
    for box in scenario.boxes:
        x = box.center_x(t)
        if x is None or not _visible(x):
            continue
        left, top = int(x - BOX_W / 2), box.y
        cv2.rectangle(frame, (left, top), (left + BOX_W, top + BOX_H), (70, 120, 170), -1)
        cv2.rectangle(frame, (left, top), (left + BOX_W, top + BOX_H), (40, 75, 110), 2)
        cv2.rectangle(frame, (left + BOX_W // 2 - 8, top), (left + BOX_W // 2 + 8, top + BOX_H), (150, 190, 215), -1)
    if scenario.occluder is not None:
        start, end, width = scenario.occluder
        if start <= t <= end:
            cv2.rectangle(frame, (int(LINE_X - width / 2), 0), (int(LINE_X + width / 2), HEIGHT), (30, 30, 30), -1)
    cv2.putText(frame, "SYNTHETIC RENDER", (20, HEIGHT - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (230, 230, 230), 2)
    return frame


def render(scenario: Scenario, target: Path) -> Path:
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        raw = Path(tmp) / "raw.mp4"
        writer = cv2.VideoWriter(str(raw), cv2.VideoWriter_fourcc(*"mp4v"), RENDER_FPS, (WIDTH, HEIGHT))
        for index in range(int(scenario.duration * RENDER_FPS)):
            writer.write(_draw(scenario, index / RENDER_FPS))
        writer.release()
        reencode_for_browser(raw, target)
    return target


def generate(out_dir: Path, names: list[str] | None = None) -> Path:
    """Genera los clips, sus fixtures y `referencia_sintetica.csv` en `out_dir`."""
    out_dir.mkdir(parents=True, exist_ok=True)
    reference = out_dir / "referencia_sintetica.csv"
    with reference.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["clip", "segundo", "direccion", "total_esperado"])
        for name, scenario in scenarios().items():
            if names and name not in names:
                continue
            clip = render(scenario, out_dir / f"sintetico_{name}.mp4")
            (out_dir / f"sintetico_{name}.fixture.txt").write_text(fixture_text(scenario), encoding="utf-8")
            crossings = reference_crossings(scenario)
            total = sum(1 if d == "IN" else -1 for _, d in crossings)
            for second, direction in crossings:
                writer.writerow([clip.name, second, direction, total])
    return reference
