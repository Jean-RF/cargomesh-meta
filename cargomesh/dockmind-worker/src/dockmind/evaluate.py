"""Compara las observaciones con la referencia manual de cada clip (RA-04).

La referencia solo se lee aquí; el análisis nunca la recibe.

Lee dos tipos de resultado:
- `observation.json` de `dockmind analyze` (análisis local de un archivo);
- `evidencia.json` de `scripts/meta-dockmind-evidence.ts` (un job de la app: trae grupo, cobertura y procedencia).

Contrato del informe:
- Cada clip de la referencia es un clip esperado y siempre aparece, con uno de estos resultados:
  - EVALUADO: hay un conteo;
  - FAILED: el job terminó sin observación;
  - PENDIENTE: el job sigue en cola o corriendo;
  - SIN_RESULTADO: no hay archivo para ese clip.
  Solo un EVALUADO tiene cantidades; para los demás no se inventa ninguna.
- Una fila con `grupo` es de una evaluación por grupo (RA-00) y exige `sha256` y `cobertura`. El resultado tiene que
  ser un job de ese grupo, con esa misma cobertura declarada, sobre captura propia y con SAM real. Si no, la fila
  lleva un `problema` y no cuenta como exacta. La cobertura que se muestra es la del job; si el job no la trae, queda
  desconocida: la referencia nunca la reemplaza.
- Una fila sin `grupo` ni `cobertura` es del formato anterior (análisis local): se identifica por `sha256` si lo
  trae, y si no por el nombre, sin exigencias de grupo ni cobertura.
- Si un clip tiene más de un resultado, ninguno cuenta como exacto: no se elige el que coincide.
"""

from __future__ import annotations

import csv
import json
import re
from dataclasses import dataclass
from pathlib import Path

COVERAGES = ("COMPLETE", "PARTIAL")
OUTCOMES = ("EVALUADO", "FAILED", "PENDIENTE", "SIN_RESULTADO")


@dataclass(frozen=True)
class Reference:
    clip: str
    total: int
    sha256: str | None = None
    group: str | None = None
    coverage: str | None = None

    @property
    def by_group(self) -> bool:
        return self.group is not None


@dataclass(frozen=True)
class EvaluationRow:
    clip: str
    expected: int
    outcome: str
    """EVALUADO, FAILED, PENDIENTE o SIN_RESULTADO."""
    expected_group: str | None = None
    expected_coverage: str | None = None
    group: str | None = None
    """Grupo del job; None si no hay job o si el análisis es local."""
    coverage: str | None = None
    """Cobertura declarada en el job; None si no hay job o si el job no la trae. Nunca sale de la referencia."""
    source: str | None = None
    segmenter: str | None = None
    observed: int | None = None
    status: str | None = None
    flags: int = 0
    seconds: float = 0.0
    cost_usd: float = 0.0
    problem: str | None = None
    """SIN_GRUPO, GRUPO_DISTINTO, COBERTURA_DESCONOCIDA, COBERTURA_DISTINTA, SIN_INFERENCIA_REAL, NO_ES_CAPTURA_PROPIA
    o VARIOS_RESULTADOS: el conteo no prueba lo que dice la referencia."""
    error: str | None = None
    """Código del error del job FAILED."""

    @property
    def difference(self) -> int | None:
        return None if self.observed is None else self.expected - self.observed

    @property
    def exact(self) -> bool:
        return self.outcome == "EVALUADO" and self.difference == 0 and self.status == "OK" and self.problem is None


def _optional(row: dict, name: str) -> str | None:
    value = (row.get(name) or "").strip()
    return value or None


def load_reference(path: Path) -> dict[str, Reference]:
    """Lee `clip,[sha256,grupo,cobertura,]segundo,direccion,total_esperado`; devuelve una referencia por clip.

    La clave es el SHA-256 si la fila lo trae y si no, el nombre del clip.
    """
    references: dict[str, Reference] = {}
    with path.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            clip = row["clip"].strip()
            sha, group, coverage = _optional(row, "sha256"), _optional(row, "grupo"), _optional(row, "cobertura")
            if sha and not re.fullmatch(r"[0-9a-fA-F]{64}", sha):
                raise ValueError(f"El sha256 de {clip} no es un SHA-256 de 64 caracteres hexadecimales")
            if group and (not sha or coverage not in COVERAGES):
                raise ValueError(f"La fila de {clip} es por grupo: necesita sha256 y cobertura COMPLETE o PARTIAL")
            if coverage and not group:
                raise ValueError(f"La fila de {clip} trae cobertura sin grupo")
            reference = Reference(clip=clip, total=int(row["total_esperado"]), sha256=sha.lower() if sha else None, group=group, coverage=coverage)
            key = reference.sha256 or reference.clip
            known = references.setdefault(key, reference)
            if known.total != reference.total:
                raise ValueError(f"La referencia de {clip} tiene dos totales distintos")
            if known.group != reference.group:
                raise ValueError(f"El clip {clip} aparece con dos grupos: cada clip prueba un solo grupo")
            if known.coverage != reference.coverage:
                raise ValueError(f"La referencia de {clip} tiene dos coberturas distintas")
    return references


def _from_observation(data: dict) -> dict:
    return {
        "outcome": "EVALUADO", "clip": data["clip"]["file"], "sha256": data["clip"]["sha256"], "source": data["clip"]["source"],
        "segmenter": data["segmentation"]["segmenter"], "real_inference": data["segmentation"]["real_inference"],
        "observed": data["result"]["net"], "status": data["result"]["status"], "flags": len(data["result"]["flags"]),
        "seconds": data["segmentation"]["seconds"], "cost_usd": data["segmentation"]["estimated_cost_usd"],
        "group": None, "coverage": None, "error": None, "from_job": False,
    }


def _from_evidence(data: dict) -> dict:
    identity = data.get("identity") or {}
    base = {
        "clip": identity.get("evidenceId"), "sha256": data["clip"]["sha256Uploaded"], "source": data["clip"].get("source"),
        "group": identity.get("groupId"), "coverage": identity.get("coverage"), "from_job": True,
    }
    count, provenance, usage = data.get("count"), data.get("provenance"), data.get("providerUsage")
    if count and provenance and usage:
        return {
            **base, "outcome": "EVALUADO", "segmenter": provenance["segmenter"], "real_inference": provenance["realInference"],
            "observed": count["net"], "status": count["status"], "flags": len(count["reviewFlags"]),
            "seconds": usage["seconds"], "cost_usd": usage["estimatedCostUsd"], "error": None,
        }
    job_status = data.get("status")
    error = (data.get("error") or {}).get("code")
    if job_status in ("QUEUED", "RUNNING"):
        return {**base, "outcome": "PENDIENTE", "status": job_status, "error": None}
    # FAILED, o un paquete sin observación: no hay conteo y no se inventa.
    return {**base, "outcome": "FAILED", "status": job_status, "error": error or "SIN_OBSERVACION"}


def _results(observations_dir: Path) -> list[dict]:
    found = []
    for path in sorted(observations_dir.rglob("observation.json")):
        found.append(_from_observation(json.loads(path.read_text(encoding="utf-8"))))
    for path in sorted(observations_dir.rglob("evidencia.json")):
        found.append(_from_evidence(json.loads(path.read_text(encoding="utf-8"))))
    return found


def _matches(reference: Reference, result: dict) -> bool:
    if reference.sha256:
        return result["sha256"] == reference.sha256
    return result["clip"] == reference.clip


def _problem(reference: Reference, result: dict) -> str | None:
    if not reference.by_group:
        return None  # formato anterior: sin exigencias de grupo ni cobertura
    if result["group"] is None:
        return "SIN_GRUPO"
    if result["group"] != reference.group:
        return "GRUPO_DISTINTO"
    if result["coverage"] not in COVERAGES:
        return "COBERTURA_DESCONOCIDA"
    if result["coverage"] != reference.coverage:
        return "COBERTURA_DISTINTA"
    if result["outcome"] != "EVALUADO":
        return None
    if not result["real_inference"]:
        return "SIN_INFERENCIA_REAL"
    if result["source"] != "OWN_CAPTURE":
        return "NO_ES_CAPTURA_PROPIA"
    return None


def evaluate(reference: Path, observations_dir: Path) -> list[EvaluationRow]:
    """Una fila por resultado de cada clip esperado; un clip sin resultado da una fila SIN_RESULTADO."""
    results = _results(observations_dir)
    rows = []
    for ref in load_reference(reference).values():
        mine = [result for result in results if _matches(ref, result)]
        expected = {"clip": ref.clip, "expected": ref.total, "expected_group": ref.group, "expected_coverage": ref.coverage}
        if not mine:
            rows.append(EvaluationRow(**expected, outcome="SIN_RESULTADO"))
            continue
        for result in mine:
            evaluated = result["outcome"] == "EVALUADO"
            rows.append(EvaluationRow(
                **expected, outcome=result["outcome"],
                group=result["group"], coverage=result["coverage"] if result["coverage"] in COVERAGES else None,
                source=result["source"], segmenter=result.get("segmenter"), status=result.get("status"),
                observed=result["observed"] if evaluated else None, flags=result.get("flags", 0),
                seconds=result.get("seconds", 0.0), cost_usd=result.get("cost_usd", 0.0), error=result["error"],
                problem="VARIOS_RESULTADOS" if len(mine) > 1 else _problem(ref, result),
            ))
    return rows


def _clip_outcome(rows: list[EvaluationRow]) -> str:
    """Con varios resultados, el clip cuenta como evaluado si alguno trae conteo (aunque ninguno sea exacto)."""
    for outcome in ("EVALUADO", "PENDIENTE", "FAILED"):
        if any(row.outcome == outcome for row in rows):
            return outcome
    return "SIN_RESULTADO"


def summary(rows: list[EvaluationRow]) -> dict[str, int]:
    """Cuenta por clip esperado: un clip con varios resultados cuenta una vez."""
    clips: dict[tuple[str, str | None], list[EvaluationRow]] = {}
    for row in rows:
        clips.setdefault((row.clip, row.expected_group), []).append(row)
    outcome = {key: _clip_outcome(mine) for key, mine in clips.items()}
    return {
        "esperados": len(clips),
        "evaluados": sum(1 for value in outcome.values() if value == "EVALUADO"),
        "exactos": sum(1 for mine in clips.values() if len(mine) == 1 and mine[0].exact),
        "fallidos": sum(1 for value in outcome.values() if value == "FAILED"),
        "pendientes": sum(1 for value in outcome.values() if value == "PENDIENTE"),
        "sin_resultado": sum(1 for value in outcome.values() if value == "SIN_RESULTADO"),
    }


def _summary_line(counts: dict[str, int]) -> str:
    return (
        f"esperados {counts['esperados']}, evaluados {counts['evaluados']} (exactos {counts['exactos']}), "
        f"fallidos {counts['fallidos']}, pendientes {counts['pendientes']}, sin resultado {counts['sin_resultado']}"
    )


def _cell(value: object) -> str:
    return "—" if value is None else f"{value:g}" if isinstance(value, float) else str(value)


def to_markdown(rows: list[EvaluationRow]) -> str:
    lines = [
        "| Clip | Grupo esperado | Grupo del job | Cobertura esperada | Cobertura del job | Resultado | Fuente | Segmentador "
        "| Esperado | Observado | Diferencia | Estado | Marcas | Problema | Error | Segundos SAM | Costo USD |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for row in rows:
        # En una fila por grupo con resultado, una cobertura que el job no trae se muestra como desconocida.
        job_coverage = row.coverage or ("desconocida" if row.expected_group and row.outcome != "SIN_RESULTADO" else None)
        cells = [
            row.clip, row.expected_group, row.group, row.expected_coverage, job_coverage, row.outcome, row.source, row.segmenter,
            row.expected, row.observed, row.difference, row.status, row.flags, row.problem, row.error, row.seconds, row.cost_usd,
        ]
        lines.append("| " + " | ".join(_cell(cell) for cell in cells) + " |")
    counts = summary(rows)
    all_exact = counts["esperados"] > 0 and counts["exactos"] == counts["esperados"]
    lines.append("")
    lines.append(f"Clips: {_summary_line(counts)}.")
    lines.append(
        ("Todos los clips esperados tienen un conteo exacto, sin marcas y válido para su grupo. " if all_exact
         else "No todos los clips esperados tienen un conteo exacto y válido: la evaluación no está completa. ")
        + "Resultado válido solo para estos clips; no generaliza."
    )
    for group in sorted({row.expected_group for row in rows if row.expected_group}):
        lines.append(f"- Grupo {group}: {_summary_line(summary([row for row in rows if row.expected_group == group]))}.")
    return "\n".join(lines)
