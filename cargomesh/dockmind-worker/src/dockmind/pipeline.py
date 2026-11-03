"""Análisis completo de un clip: normalizar, segmentar, contar y anotar.

No conoce la referencia manual del clip: esa solo se usa en `evaluate`.
"""

from __future__ import annotations

import json
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path

from . import ANALYSIS_VERSION
from .counting import count_crossings
from .models import ClipSource, CountConfig
from .overlay import render_overlay
from .roi import config_for_roi, roi_for_line
from .sam_client import Segmenter, estimated_cost_usd
from .sam_output import parse_sam_output
from .video import normalize, probe, sha256_file


def analyze_clip(
    clip: Path,
    config: CountConfig,
    source: ClipSource,
    segmenter: Segmenter,
    out_dir: Path,
    fps: int = 10,
    overlay: bool = True,
    crop_to_line: bool = True,
) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    original = probe(clip)
    roi = roi_for_line(config.line, original.width, original.height) if crop_to_line else None
    analysis = config if roi is None else config_for_roi(config, roi, original.width, original.height)
    normalized_path = out_dir / "normalized.mp4"
    crop = None if roi is None else (roi.x, roi.y, roi.width, roi.height)
    normalized = normalize(clip, normalized_path, fps=fps, crop=crop)

    run = segmenter.segment(normalized_path, config.concept)
    (out_dir / "sam_raw.txt").write_text(run.text, encoding="utf-8")
    real_inference = segmenter.name == "META_SAM_API"
    (out_dir / "sam_run.json").write_text(json.dumps({
        "segmenter": segmenter.name, "model": run.model, "concept": config.concept,
        "seconds": run.seconds, "request_id": run.request_id,
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    boxes = parse_sam_output(run.text)
    result = count_crossings(boxes, analysis, fps=normalized.fps or fps, total_frames=normalized.frames)

    evidence = {"normalized_video": normalized_path.name, "sam_raw": "sam_raw.txt"}
    if overlay:
        label = f"{source.value} | {segmenter.name} | {ANALYSIS_VERSION}"
        render_overlay(normalized_path, boxes, analysis, result, out_dir / "overlay.mp4", label)
        evidence["overlay_video"] = "overlay.mp4"

    observation = {
        "analysis_version": ANALYSIS_VERSION,
        "created_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "clip": {
            "file": clip.name,
            "sha256": sha256_file(clip),
            "source": source.value,
            "original": original.to_dict(),
            "normalized": normalized.to_dict(),
            "roi": None if roi is None else roi.to_fractions(original.width, original.height),
            "time_mapping": f"segundo = cuadro / {normalized.fps:g}",
        },
        "segmentation": {
            "segmenter": segmenter.name,
            "real_inference": real_inference,
            "model": run.model,
            "concept": config.concept,
            "seconds": run.seconds,
            "request_id": run.request_id,
            "boxes": len(boxes),
            "estimated_cost_usd": estimated_cost_usd(normalized.frames) if real_inference else 0.0,
        },
        "config": _config_dict(config),
        "result": result.to_dict(),
        "evidence": evidence,
    }
    (out_dir / "observation.json").write_text(json.dumps(observation, ensure_ascii=False, indent=2), encoding="utf-8")
    return observation


def _config_dict(config: CountConfig) -> dict:
    data = asdict(config)
    data["unit"] = config.unit.value
    return data
