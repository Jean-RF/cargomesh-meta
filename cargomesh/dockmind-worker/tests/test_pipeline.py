"""Prueba de punta a punta con clips sintéticos y fixtures rotulados. Necesita ffmpeg."""

import json
import shutil
from pathlib import Path

import pytest

from dockmind.evaluate import evaluate
from dockmind.models import ClipSource, CountConfig, CountingLine, ObservationStatus, Unit
from dockmind.pipeline import analyze_clip
from dockmind.sam_client import FixtureSegmenter
from dockmind.synthetic import generate
from dockmind.video import VideoError, probe

pytestmark = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="requiere ffmpeg")

CONFIG = CountConfig(line=CountingLine(0.5, 0.0, 0.5, 1.0, 0.8, 0.5), unit=Unit.BOX, concept="cardboard box")


@pytest.fixture(scope="module")
def clips(tmp_path_factory) -> Path:
    folder = tmp_path_factory.mktemp("clips")
    generate(folder, ["todas", "oclusion"])
    return folder


def analyze(clips: Path, name: str, out: Path) -> dict:
    return analyze_clip(
        clips / f"sintetico_{name}.mp4", CONFIG, ClipSource.SYNTHETIC_RENDER,
        FixtureSegmenter(clips / f"sintetico_{name}.fixture.txt"), out / name,
    )


def test_full_loading_matches_reference(clips, tmp_path):
    observation = analyze(clips, "todas", tmp_path)
    result = observation["result"]
    assert result["status"] == ObservationStatus.OK
    assert result["net"] == 6
    assert observation["clip"]["source"] == "SYNTHETIC_RENDER"
    assert observation["clip"]["roi"] is None  # la línea ocupa todo el alto: no hay recorte
    assert observation["segmentation"]["segmenter"] == "FIXTURE"
    assert observation["segmentation"]["real_inference"] is False
    assert observation["segmentation"]["estimated_cost_usd"] == 0.0
    assert (tmp_path / "todas" / "overlay.mp4").stat().st_size > 0
    saved = json.loads((tmp_path / "todas" / "observation.json").read_text(encoding="utf-8"))
    assert saved["result"]["net"] == 6


def test_occlusion_is_flagged_instead_of_guessed(clips, tmp_path):
    result = analyze(clips, "oclusion", tmp_path)["result"]
    assert result["status"] == ObservationStatus.REQUIRES_REVIEW
    assert result["net"] == 3  # el cruce tapado no se inventa; se marca para revisión


def test_evaluation_uses_the_reference_only_at_the_end(clips, tmp_path):
    analyze(clips, "todas", tmp_path)
    analyze(clips, "oclusion", tmp_path)
    rows = {row.clip: row for row in evaluate(clips / "referencia_sintetica.csv", tmp_path)}
    assert rows["sintetico_todas.mp4"].difference == 0
    assert rows["sintetico_oclusion.mp4"].expected == 4
    assert rows["sintetico_oclusion.mp4"].difference == 1


def test_first_frame_grid_is_written(clips, tmp_path):
    from dockmind.frame_grid import first_frame_with_grid

    target = first_frame_with_grid(clips / "sintetico_todas.mp4", tmp_path / "grid.png")
    assert target.stat().st_size > 0


def test_file_without_frames_is_rejected(tmp_path):
    empty = tmp_path / "vacio.mp4"
    empty.write_bytes(b"not a video")
    with pytest.raises(VideoError):
        probe(empty)
