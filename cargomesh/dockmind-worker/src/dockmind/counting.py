"""Conteo de cruces de una línea. Función pura: no llama a ningún servicio.

Cada bulto cruza la línea una vez aunque después quede tapado, así que se
cuentan cruces y no IDs distintos. Afuera -> adentro suma, adentro -> afuera
resta. Lo que no se puede concluir queda marcado para revisión humana.

Como `LineZone` de roboflow/supervision, un bulto tiene lado solo cuando sus 4
esquinas están del mismo lado (montado sobre la línea no cuenta) y solo se
evalúa dentro del segmento dibujado, no en la prolongación de la línea.
"""

from __future__ import annotations

import math
from collections import Counter

from .models import (
    Box,
    CountConfig,
    CountResult,
    CrossingEvent,
    Direction,
    FlagKind,
    ObservationStatus,
    ReviewFlag,
    Track,
)
from .sam_output import SamOutputError
from .tracks import build_tracks


class _Geometry:
    """Distancias con signo a la línea, en píxeles: positivas del lado de adentro."""

    def __init__(self, config: CountConfig, width: int, height: int):
        line = config.line
        self.ax, self.ay = line.x1 * width, line.y1 * height
        self.dx, self.dy = (line.x2 - line.x1) * width, (line.y2 - line.y1) * height
        self.length = math.hypot(self.dx, self.dy)
        if self.length == 0:
            raise ValueError("La línea de cruce necesita dos puntos distintos")
        inside = self._cross(line.inside_x * width, line.inside_y * height)
        if inside == 0:
            raise ValueError("El punto de adentro no puede estar sobre la línea")
        self.orientation = 1 if inside > 0 else -1
        self.margin = config.margin * width
        self.near = config.near_zone * width

    def _cross(self, x: float, y: float) -> float:
        return self.dx * (y - self.ay) - self.dy * (x - self.ax)

    def _signed(self, x: float, y: float) -> float:
        return self.orientation * self._cross(x, y) / self.length

    def _corners(self, box: Box) -> list[float]:
        return [self._signed(x, y) for x in (box.x1, box.x2) for y in (box.y1, box.y2)]

    def in_segment(self, box: Box) -> bool:
        """El centro se proyecta entre los dos extremos de la línea dibujada."""
        x, y = box.center
        t = ((x - self.ax) * self.dx + (y - self.ay) * self.dy) / self.length ** 2
        return 0.0 <= t <= 1.0

    def distance(self, box: Box) -> float:
        return self._signed(*box.center)

    def side(self, box: Box) -> int | None:
        """+1 adentro, -1 afuera, 0 montado sobre la línea, None fuera del segmento."""
        if not self.in_segment(box):
            return None
        corners = self._corners(box)
        if all(d > self.margin for d in corners):
            return 1
        if all(d < -self.margin for d in corners):
            return -1
        return 0

    def is_near(self, box: Box) -> bool:
        if not self.in_segment(box):
            return False
        corners = self._corners(box)
        straddles = min(corners) <= 0 <= max(corners)
        return straddles or min(abs(d) for d in corners) <= self.near


def count_crossings(boxes: list[Box], config: CountConfig, fps: float, total_frames: int) -> CountResult:
    if fps <= 0:
        raise ValueError("fps debe ser mayor que 0")
    if not boxes:
        return CountResult(ObservationStatus.INSUFFICIENT_EVIDENCE, 0, 0, 0)

    sizes = {(box.frame_width, box.frame_height) for box in boxes}
    if len(sizes) != 1:
        raise SamOutputError(f"La respuesta mezcla tamaños de cuadro: {sorted(sizes)}")
    width, height = sizes.pop()
    geometry = _Geometry(config, width, height)
    tracks = build_tracks(boxes, total_frames)

    def seconds(frame: int) -> float:
        return round(frame / fps, 3)

    events: list[CrossingEvent] = []
    flags: list[ReviewFlag] = []

    per_frame = Counter(box.frame for box in boxes)
    max_objects = max(per_frame.values())
    if max_objects >= config.object_limit:
        frame = min(f for f, n in per_frame.items() if n >= config.object_limit)
        flags.append(ReviewFlag(
            FlagKind.OBJECT_LIMIT_REACHED, frame, seconds(frame),
            f"{max_objects} objetos en un cuadro: SAM sigue como máximo {config.object_limit}",
        ))

    counted = 0
    for track in tracks:
        sides = [geometry.side(box) for box in track.boxes]
        if len(track.boxes) < config.min_track_frames:
            if len({s for s in sides if s}) > 1:
                flags.append(ReviewFlag(
                    FlagKind.SHORT_TRACK_CROSSED, track.first_frame, seconds(track.first_frame),
                    f"El {track.name} cruzó con solo {len(track.boxes)} apariciones",
                ))
            continue
        counted += 1
        events.extend(_track_events(track, sides, config.confirm_frames, seconds))

    flags.extend(_continuity_flags(tracks, geometry, config, total_frames, seconds))

    entries = sum(1 for e in events if e.direction is Direction.IN)
    exits = len(events) - entries
    status = ObservationStatus.REQUIRES_REVIEW if flags else ObservationStatus.OK
    return CountResult(
        status=status,
        entries=entries,
        exits=exits,
        net=entries - exits,
        events=tuple(sorted(events, key=lambda e: (e.frame, e.object_id))),
        flags=tuple(sorted(flags, key=lambda f: (f.frame, f.kind))),
        tracks_seen=len(tracks),
        tracks_counted=counted,
        max_objects_in_frame=max_objects,
    )


def _track_events(track: Track, sides: list[int | None], confirm_frames: int, seconds) -> list[CrossingEvent]:
    """Un cruce se acepta cuando el bulto pasa completo al otro lado y no vuelve en las siguientes observaciones.

    Las observaciones montadas sobre la línea (0) o fuera del segmento (None) no cambian el lado.
    """
    events = []
    last = 0
    for index, side in enumerate(sides):
        if not side:
            continue
        if last == 0:
            last = side
            continue
        if side == last:
            continue
        window = sides[index:index + confirm_frames]
        if last in window:
            continue
        frame = track.boxes[index].frame
        direction = Direction.IN if side == 1 else Direction.OUT
        events.append(CrossingEvent(track.object_id, frame, seconds(frame), direction))
        last = side
    return events


def _continuity_flags(tracks: list[Track], geometry: _Geometry, config: CountConfig, total_frames: int, seconds):
    """Marca los lugares donde un cambio de ID o una pérdida pudo romper el conteo."""
    flags = []
    explained_starts: set[tuple[int, int]] = set()
    for track in tracks:
        last_box = track.boxes[-1]
        last_side = geometry.side(last_box)
        reaches_end = track.last_frame >= total_frames - 1
        if reaches_end:
            if last_side == 0:
                flags.append(ReviewFlag(
                    FlagKind.ENDS_ON_LINE, track.last_frame, seconds(track.last_frame),
                    f"El clip termina con el {track.name} sobre la línea",
                ))
            continue
        if not geometry.is_near(last_box):
            continue
        successors = [
            other for other in tracks
            if other is not track
            and track.last_frame < other.first_frame <= track.last_frame + config.switch_window_frames
            and geometry.is_near(other.boxes[0])
        ]
        if successors:
            explained_starts.update((other.object_id, other.segment) for other in successors)
            if any(last_side == 0 or geometry.side(other.boxes[0]) != last_side for other in successors):
                names = ", ".join(other.name for other in successors)
                flags.append(ReviewFlag(
                    FlagKind.ID_SWITCH_SUSPECTED, track.last_frame, seconds(track.last_frame),
                    f"El {track.name} desaparece junto a la línea y aparece el {names}",
                ))
        elif last_side == 0:
            flags.append(ReviewFlag(
                FlagKind.TRACK_LOST_NEAR_LINE, track.last_frame, seconds(track.last_frame),
                f"El {track.name} se pierde sobre la línea",
            ))

    for track in tracks:
        first_box = track.boxes[0]
        if (
            track.first_frame > 0
            and (track.object_id, track.segment) not in explained_starts
            and geometry.is_near(first_box)
            and geometry.distance(first_box) > 0
        ):
            flags.append(ReviewFlag(
                FlagKind.TRACK_LOST_NEAR_LINE, track.first_frame, seconds(track.first_frame),
                f"El {track.name} aparece adentro junto a la línea sin cruce visible",
            ))
    return flags
