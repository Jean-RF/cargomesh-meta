"""Tipos compartidos del worker. Todos son inmutables y serializables a JSON."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import StrEnum


class Unit(StrEnum):
    PALLET = "PALLET"
    BOX = "BOX"


class ClipSource(StrEnum):
    """THIRD_PARTY_STOCK es solo para evaluar en local: no entra a jobs, demo ni repositorio."""

    OWN_CAPTURE = "OWN_CAPTURE"
    SYNTHETIC_RENDER = "SYNTHETIC_RENDER"
    THIRD_PARTY_STOCK = "THIRD_PARTY_STOCK"


class Segmenter(StrEnum):
    """De dónde salieron las cajas. FIXTURE nunca es una inferencia real."""

    META_SAM_API = "META_SAM_API"
    FIXTURE = "FIXTURE"


class Direction(StrEnum):
    IN = "IN"
    OUT = "OUT"


class ObservationStatus(StrEnum):
    OK = "OK"
    REQUIRES_REVIEW = "REQUIRES_REVIEW"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


class FlagKind(StrEnum):
    ID_SWITCH_SUSPECTED = "ID_SWITCH_SUSPECTED"
    TRACK_LOST_NEAR_LINE = "TRACK_LOST_NEAR_LINE"
    ENDS_ON_LINE = "ENDS_ON_LINE"
    OBJECT_LIMIT_REACHED = "OBJECT_LIMIT_REACHED"
    SHORT_TRACK_CROSSED = "SHORT_TRACK_CROSSED"


@dataclass(frozen=True)
class Box:
    """Una caja de SAM en un cuadro, en píxeles del video enviado."""

    frame: int
    object_id: int
    x1: float
    y1: float
    x2: float
    y2: float
    frame_width: int
    frame_height: int
    confidence: float | None = None

    @property
    def center(self) -> tuple[float, float]:
        return ((self.x1 + self.x2) / 2, (self.y1 + self.y2) / 2)


@dataclass(frozen=True)
class Track:
    """Las apariciones de un mismo ID, ordenadas por cuadro.

    SAM reutiliza IDs: cuando un bulto sale del cuadro o se llega al límite de
    objetos, el mismo ID puede pasar a otro bulto. Cada tramo es un Track aparte.
    """

    object_id: int
    boxes: tuple[Box, ...]
    segment: int = 0

    @property
    def name(self) -> str:
        return f"ID {self.object_id}" if self.segment == 0 else f"ID {self.object_id} (tramo {self.segment + 1})"

    @property
    def first_frame(self) -> int:
        return self.boxes[0].frame

    @property
    def last_frame(self) -> int:
        return self.boxes[-1].frame


@dataclass(frozen=True)
class CountingLine:
    """Línea de cruce en fracciones del cuadro (0 a 1) y un punto del lado de adentro."""

    x1: float
    y1: float
    x2: float
    y2: float
    inside_x: float
    inside_y: float


@dataclass(frozen=True)
class CountConfig:
    line: CountingLine
    unit: Unit
    concept: str
    margin: float = 0.01
    """Distancia mínima de las 4 esquinas a la línea para dar un lado, como fracción del ancho del cuadro."""
    near_zone: float = 0.09
    """Distancia (fracción del ancho) en la que un bulto se considera junto a la línea para las marcas de revisión."""
    min_track_frames: int = 3
    confirm_frames: int = 2
    """Observaciones seguidas del nuevo lado que hacen falta para aceptar un cruce."""
    switch_window_frames: int = 5
    object_limit: int = 16


@dataclass(frozen=True)
class CrossingEvent:
    object_id: int
    frame: int
    seconds: float
    direction: Direction


@dataclass(frozen=True)
class ReviewFlag:
    kind: FlagKind
    frame: int
    seconds: float
    detail: str


@dataclass(frozen=True)
class CountResult:
    status: ObservationStatus
    entries: int
    exits: int
    net: int
    events: tuple[CrossingEvent, ...] = field(default_factory=tuple)
    flags: tuple[ReviewFlag, ...] = field(default_factory=tuple)
    tracks_seen: int = 0
    tracks_counted: int = 0
    max_objects_in_frame: int = 0

    def to_dict(self) -> dict:
        return asdict(self)
