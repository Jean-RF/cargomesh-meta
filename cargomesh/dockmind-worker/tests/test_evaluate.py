"""Evaluación por grupo: cada clip esperado aparece, prueba un solo grupo y el conteo sale del pipeline, no de la referencia."""

import json
from pathlib import Path

import pytest

from dockmind.evaluate import evaluate, load_reference, summary, to_markdown

GROUP_A = "879dc96b-3c00-43e1-b772-619996b2b713"
GROUP_B = "d1b2aab3-29d2-4b90-8a70-d369c0dd1f6c"
SHA_A = "a" * 64
SHA_B = "b" * 64
ABSENT = object()


def pack(folder: Path, sha: str, group: str, net: int = 0, *, coverage="COMPLETE", real=True, source="OWN_CAPTURE",
         count_status="OK", job_status="SUCCEEDED", error=None) -> None:
    """Un `evidencia.json` como lo escribe scripts/meta-dockmind-evidence.ts (solo los campos que lee la evaluación).

    Un job FAILED, QUEUED o RUNNING no trae `count`, `provenance` ni `providerUsage`. `coverage=ABSENT` quita el campo.
    """
    folder.mkdir(parents=True)
    identity = {"evidenceId": f"clip-{sha[:4]}", "groupId": group, "coverage": coverage}
    if coverage is ABSENT:
        del identity["coverage"]
    observed = job_status == "SUCCEEDED"
    (folder / "evidencia.json").write_text(json.dumps({
        "schema": "dockmind.evidence.v1",
        "identity": identity,
        "status": job_status,
        "error": {"code": error, "message": "detalle"} if error else None,
        "clip": {"source": source, "sha256Uploaded": sha},
        "provenance": {"segmenter": "META_SAM_API" if real else "FIXTURE", "realInference": real} if observed else None,
        "count": {"status": count_status, "net": net, "reviewFlags": [] if count_status == "OK" else [{"seconds": 3.0}]} if observed else None,
        "providerUsage": {"seconds": 12.5, "estimatedCostUsd": 0.06 if real else 0} if observed else None,
    }), encoding="utf-8")


def reference(path: Path, rows: list[str]) -> Path:
    path.write_text("clip,sha256,grupo,cobertura,segundo,direccion,total_esperado\n" + "\n".join(rows) + "\n", encoding="utf-8")
    return path


def both_groups(tmp_path: Path) -> Path:
    return reference(tmp_path / "ref.csv", [
        f"grupo_a.mp4,{SHA_A},{GROUP_A},COMPLETE,2.0,IN,8",
        f"grupo_b.mp4,{SHA_B},{GROUP_B},COMPLETE,2.5,IN,4",
    ])


def test_each_group_is_evaluated_with_its_own_clip(tmp_path):
    ref = both_groups(tmp_path)
    pack(tmp_path / "out" / "a", SHA_A, GROUP_A, 8)
    pack(tmp_path / "out" / "b", SHA_B, GROUP_B, 4)
    rows = {row.clip: row for row in evaluate(ref, tmp_path / "out")}
    assert [rows["grupo_a.mp4"].exact, rows["grupo_b.mp4"].exact] == [True, True]
    table = to_markdown(list(rows.values()))
    assert "Clips: esperados 2, evaluados 2 (exactos 2), fallidos 0, pendientes 0, sin resultado 0." in table
    assert "Todos los clips esperados tienen un conteo exacto" in table
    assert f"- Grupo {GROUP_B}: esperados 1, evaluados 1 (exactos 1), fallidos 0, pendientes 0, sin resultado 0." in table


def test_a_failed_group_is_reported_and_never_dropped(tmp_path):
    ref = both_groups(tmp_path)
    pack(tmp_path / "out" / "a", SHA_A, GROUP_A, 8)
    pack(tmp_path / "out" / "b", SHA_B, GROUP_B, job_status="FAILED", error="PROVIDER_UNAVAILABLE")
    rows = evaluate(ref, tmp_path / "out")
    b = next(row for row in rows if row.expected_group == GROUP_B)
    assert (b.outcome, b.error, b.observed, b.difference, b.exact) == ("FAILED", "PROVIDER_UNAVAILABLE", None, None, False)
    assert summary(rows) == {"esperados": 2, "evaluados": 1, "exactos": 1, "fallidos": 1, "pendientes": 0, "sin_resultado": 0}
    table = to_markdown(rows)
    assert "No todos los clips esperados tienen un conteo exacto y válido" in table
    assert f"- Grupo {GROUP_B}: esperados 1, evaluados 0 (exactos 0), fallidos 1, pendientes 0, sin resultado 0." in table
    assert "1 de 1" not in table


def test_a_group_without_any_file_is_reported_without_inventing_amounts(tmp_path):
    ref = both_groups(tmp_path)
    pack(tmp_path / "out" / "a", SHA_A, GROUP_A, 8)
    rows = evaluate(ref, tmp_path / "out")
    b = next(row for row in rows if row.expected_group == GROUP_B)
    assert (b.outcome, b.observed, b.group, b.coverage, b.source, b.exact) == ("SIN_RESULTADO", None, None, None, None, False)
    assert summary(rows)["sin_resultado"] == 1
    assert f"- Grupo {GROUP_B}: esperados 1, evaluados 0 (exactos 0), fallidos 0, pendientes 0, sin resultado 1." in to_markdown(rows)


def test_a_job_still_running_is_pending(tmp_path):
    ref = both_groups(tmp_path)
    pack(tmp_path / "out" / "a", SHA_A, GROUP_A, 8)
    pack(tmp_path / "out" / "b", SHA_B, GROUP_B, job_status="RUNNING")
    b = next(row for row in evaluate(ref, tmp_path / "out") if row.expected_group == GROUP_B)
    assert (b.outcome, b.observed, b.error, b.exact) == ("PENDIENTE", None, None, False)


@pytest.mark.parametrize("coverage", [None, ABSENT, "TOTAL"])
def test_unknown_coverage_is_kept_unknown_and_not_taken_from_the_reference(tmp_path, coverage):
    ref = both_groups(tmp_path)
    pack(tmp_path / "out" / "b", SHA_B, GROUP_B, 4, coverage=coverage)
    b = next(row for row in evaluate(ref, tmp_path / "out") if row.expected_group == GROUP_B)
    assert (b.difference, b.problem, b.coverage, b.expected_coverage, b.exact) == (0, "COBERTURA_DESCONOCIDA", None, "COMPLETE", False)
    line = next(line for line in to_markdown([b]).splitlines() if line.startswith("| grupo_b.mp4"))
    assert f"| {GROUP_B} | {GROUP_B} | COMPLETE | desconocida |" in line


def test_a_failed_job_of_another_group_is_still_flagged(tmp_path):
    ref = both_groups(tmp_path)
    pack(tmp_path / "out" / "b", SHA_B, GROUP_A, job_status="FAILED", error="MEDIA_INVALID")
    b = next(row for row in evaluate(ref, tmp_path / "out") if row.expected_group == GROUP_B)
    assert (b.outcome, b.problem, b.group) == ("FAILED", "GRUPO_DISTINTO", GROUP_A)


def test_a_count_from_another_group_does_not_prove_the_group(tmp_path):
    ref = reference(tmp_path / "ref.csv", [f"grupo_b.mp4,{SHA_B},{GROUP_B},COMPLETE,2.5,IN,4"])
    pack(tmp_path / "out" / "b", SHA_B, GROUP_A, 4)  # mismo clip, pero el job se pidió para el grupo A
    [row] = evaluate(ref, tmp_path / "out")
    assert row.difference == 0 and row.problem == "GRUPO_DISTINTO" and not row.exact


@pytest.mark.parametrize(("change", "problem"), [
    ({"real": False}, "SIN_INFERENCIA_REAL"),
    ({"source": "SYNTHETIC_RENDER"}, "NO_ES_CAPTURA_PROPIA"),
    ({"coverage": "PARTIAL"}, "COBERTURA_DISTINTA"),
])
def test_fixture_synthetic_or_partial_results_are_not_group_evidence(tmp_path, change, problem):
    ref = reference(tmp_path / "ref.csv", [f"grupo_a.mp4,{SHA_A},{GROUP_A},COMPLETE,2.0,IN,8"])
    pack(tmp_path / "out" / "a", SHA_A, GROUP_A, 8, **change)
    [row] = evaluate(ref, tmp_path / "out")
    assert row.problem == problem and not row.exact


def test_review_flags_keep_the_clip_out_of_the_exact_count(tmp_path):
    ref = reference(tmp_path / "ref.csv", [f"grupo_a.mp4,{SHA_A},{GROUP_A},COMPLETE,2.0,IN,8"])
    pack(tmp_path / "out" / "a", SHA_A, GROUP_A, 7, count_status="REQUIRES_REVIEW")
    [row] = evaluate(ref, tmp_path / "out")
    assert (row.status, row.difference, row.exact) == ("REQUIRES_REVIEW", 1, False)


def test_two_results_for_one_clip_are_not_cherry_picked(tmp_path):
    ref = reference(tmp_path / "ref.csv", [f"grupo_a.mp4,{SHA_A},{GROUP_A},COMPLETE,2.0,IN,8"])
    pack(tmp_path / "out" / "uno", SHA_A, GROUP_A, 8)
    pack(tmp_path / "out" / "dos", SHA_A, GROUP_A, 7)
    rows = evaluate(ref, tmp_path / "out")
    assert [row.problem for row in rows] == ["VARIOS_RESULTADOS", "VARIOS_RESULTADOS"]
    assert summary(rows) == {"esperados": 1, "evaluados": 1, "exactos": 0, "fallidos": 0, "pendientes": 0, "sin_resultado": 0}


def test_a_clip_cannot_be_reference_for_two_groups(tmp_path):
    ref = reference(tmp_path / "ref.csv", [
        f"todas.mp4,{SHA_A},{GROUP_A},COMPLETE,2.0,IN,12",
        f"todas.mp4,{SHA_A},{GROUP_B},COMPLETE,4.0,IN,12",
    ])
    with pytest.raises(ValueError, match="dos grupos"):
        load_reference(ref)


@pytest.mark.parametrize("row", [
    f"grupo_a.mp4,{SHA_A},{GROUP_A},,2.0,IN,8",           # por grupo sin cobertura
    f"grupo_a.mp4,{SHA_A},{GROUP_A},TOTAL,2.0,IN,8",      # cobertura fuera del contrato
    f"grupo_a.mp4,,{GROUP_A},COMPLETE,2.0,IN,8",          # por grupo sin sha256
    f"grupo_a.mp4,{SHA_A},,COMPLETE,2.0,IN,8",            # cobertura sin grupo
])
def test_a_group_reference_row_needs_sha256_and_coverage(tmp_path, row):
    with pytest.raises(ValueError):
        load_reference(reference(tmp_path / "ref.csv", [row]))


def test_a_placeholder_instead_of_the_hash_is_rejected(tmp_path):
    ref = reference(tmp_path / "ref.csv", [f"grupo_a.mp4,<sha256 del archivo grupo_a.mp4>,{GROUP_A},COMPLETE,2.0,IN,8"])
    with pytest.raises(ValueError, match="SHA-256"):
        load_reference(ref)


def test_reference_by_bytes_ignores_the_file_name(tmp_path):
    ref = reference(tmp_path / "ref.csv", [f"nombre_local.mp4,{SHA_A},{GROUP_A},COMPLETE,2.0,IN,8"])
    pack(tmp_path / "out" / "a", SHA_A, GROUP_A, 8)
    [row] = evaluate(ref, tmp_path / "out")
    assert row.clip == "nombre_local.mp4" and row.exact


def test_old_format_without_group_or_coverage_keeps_working_and_lists_missing_clips(tmp_path):
    old = tmp_path / "vieja.csv"
    old.write_text("clip,segundo,direccion,total_esperado\ntodas.mp4,3.2,IN,4\nfalta.mp4,1.0,IN,2\n", encoding="utf-8")
    folder = tmp_path / "local" / "todas"
    folder.mkdir(parents=True)
    (folder / "observation.json").write_text(json.dumps({
        "clip": {"file": "todas.mp4", "sha256": SHA_B, "source": "OWN_CAPTURE"},
        "segmentation": {"segmenter": "META_SAM_API", "real_inference": True, "seconds": 9.0, "estimated_cost_usd": 0.05},
        "result": {"net": 4, "status": "OK", "flags": []},
    }), encoding="utf-8")
    rows = {row.clip: row for row in evaluate(old, tmp_path / "local")}
    assert (rows["todas.mp4"].exact, rows["todas.mp4"].group, rows["todas.mp4"].coverage, rows["todas.mp4"].problem) == (True, None, None, None)
    assert (rows["falta.mp4"].outcome, rows["falta.mp4"].observed) == ("SIN_RESULTADO", None)
    assert "| todas.mp4 | — | — | — | — | EVALUADO |" in to_markdown(list(rows.values()))
