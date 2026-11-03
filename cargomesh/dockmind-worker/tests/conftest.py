import pytest

from dockmind.models import Box, CountConfig, CountingLine, Unit

FRAME_W, FRAME_H, SIZE = 1000, 500, 40


def track(object_id: int, xs: list[float], start: int = 0, y: float = 250) -> list[Box]:
    """Cajas de un objeto cuyo centro pasa por `xs`, un cuadro por valor."""
    return [
        Box(start + i, object_id, x - SIZE / 2, y - SIZE / 2, x + SIZE / 2, y + SIZE / 2, FRAME_W, FRAME_H)
        for i, x in enumerate(xs)
    ]


@pytest.fixture
def config() -> CountConfig:
    """Línea vertical al centro, adentro a la derecha. Margen de 10 px y zona cercana de 90 px (cuadro de 1000 px)."""
    return CountConfig(line=CountingLine(0.5, 0.0, 0.5, 1.0, 0.8, 0.5), unit=Unit.BOX, concept="cardboard box")
