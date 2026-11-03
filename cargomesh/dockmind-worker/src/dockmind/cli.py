"""Línea de comandos del worker.

Ejemplos:
  dockmind analyze clips/todas.mp4 --line 0.5,0,0.5,1 --inside 0.8,0.5 --concept "cardboard box" --unit BOX
  dockmind analyze clips/todas.mp4 ... --replay out/todas      (reusa la salida de SAM ya pagada)
  dockmind evaluate --reference clips/referencia.csv --observations out
  dockmind local-credentials --out <fuera del repo>/dockmind-local.env --storage http://127.0.0.1:64321 --app http://127.0.0.1:8080
  dockmind serve-local --config <ese archivo> --segmenter fixture --fixture clips/sinteticos/sintetico_todas.fixture.txt
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from .evaluate import evaluate, to_markdown
from .models import ClipSource, CountConfig, CountingLine, Unit
from .pipeline import analyze_clip
from .sam_client import FixtureSegmenter, MetaSamClient

WORKER_ROOT = Path(__file__).resolve().parents[2]


def _load_env(path: Path) -> None:
    """Carga KEY=VALUE de un .env local sin pisar lo que ya está en el entorno."""
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def _floats(text: str, count: int, name: str) -> list[float]:
    parts = [p.strip() for p in text.split(",")]
    if len(parts) != count:
        raise argparse.ArgumentTypeError(f"{name} necesita {count} números separados por coma")
    values = [float(p) for p in parts]
    if any(v < 0 or v > 1 for v in values):
        raise argparse.ArgumentTypeError(f"{name} va en fracciones del cuadro, entre 0 y 1")
    return values


def _analyze(args: argparse.Namespace) -> int:
    x1, y1, x2, y2 = _floats(args.line, 4, "--line")
    ix, iy = _floats(args.inside, 2, "--inside")
    config = CountConfig(
        line=CountingLine(x1, y1, x2, y2, ix, iy),
        unit=Unit(args.unit),
        concept=args.concept,
        margin=args.margin,
        min_track_frames=args.min_track_frames,
    )
    clip = Path(args.clip)
    out_dir = Path(args.out) if args.out else WORKER_ROOT / "out" / clip.stem

    if args.fixture:
        segmenter = FixtureSegmenter(Path(args.fixture), name="FIXTURE")
    elif args.replay:
        replay = Path(args.replay)
        run_info = json.loads((replay / "sam_run.json").read_text(encoding="utf-8"))
        if run_info.get("concept") != args.concept:
            print(f"La salida guardada es del concepto {run_info.get('concept')!r}, no de {args.concept!r}", file=sys.stderr)
            return 2
        segmenter = FixtureSegmenter(replay / "sam_raw.txt", name=run_info["segmenter"])
    else:
        segmenter = MetaSamClient()

    observation = analyze_clip(
        clip, config, ClipSource(args.source), segmenter, out_dir,
        fps=args.fps, overlay=not args.no_overlay, crop_to_line=not args.no_roi,
    )
    result = observation["result"]
    print(f"Clip: {clip.name} ({observation['clip']['source']}, {observation['segmentation']['segmenter']})")
    if observation["clip"]["roi"]:
        print(f"Ventana alrededor de la línea (fracciones del cuadro): {observation['clip']['roi']}")
    print(f"Estado: {result['status']}  entran {result['entries']}  salen {result['exits']}  neto {result['net']} {config.unit.value}")
    for flag in result["flags"]:
        print(f"  Revisar {flag['seconds']:.1f} s: {flag['kind']} — {flag['detail']}")
    seg = observation["segmentation"]
    print(f"SAM: {seg['seconds']} s, {seg['boxes']} cajas, costo estimado USD {seg['estimated_cost_usd']}")
    print(f"Resultados en {out_dir}")
    return 0


def _evaluate(args: argparse.Namespace) -> int:
    rows = evaluate(Path(args.reference), Path(args.observations))
    if not rows:
        print("La referencia no tiene clips esperados", file=sys.stderr)
        return 1
    # El informe se escribe también si faltan resultados: cada clip esperado sale con su estado.
    table = to_markdown(rows)
    print(table)
    target = Path(args.observations) / "evaluacion.md"
    target.write_text(table + "\n", encoding="utf-8")
    print(f"\nGuardado en {target}")
    return 0


def _frame(args: argparse.Namespace) -> int:
    from .frame_grid import first_frame_with_grid

    clip = Path(args.clip)
    target = Path(args.out) if args.out else WORKER_ROOT / "out" / f"{clip.stem}_cuadricula.png"
    first_frame_with_grid(clip, target)
    print(f"Primer cuadro con cuadrícula en {target}. Lee ahí las fracciones para --line y --inside.")
    return 0


def _synthetic(args: argparse.Namespace) -> int:
    from .synthetic import generate  # solo este comando necesita renderizar

    reference = generate(Path(args.out), args.only)
    print(f"Clips SYNTHETIC_RENDER, fixtures y referencia en {reference.parent}")
    return 0


def _local_credentials(args: argparse.Namespace) -> int:
    from .local_server import LocalSetupError, write_local_config

    try:
        path = write_local_config(Path(args.out), storage=args.storage, app=args.app, port=args.port)
    except LocalSetupError as error:
        print(error, file=sys.stderr)
        return 2
    print(f"Archivo privado creado en {path}.")
    print("Copia sus líneas a cargomesh/.env.local de la app local (reemplaza las DOCKMIND_* y MODAL_PROXY_* anteriores),")
    print("reinicia la app y arranca `dockmind serve-local --config` con el mismo archivo. No pegues los valores en chat, PR ni capturas.")
    return 0


def _serve_local(args: argparse.Namespace) -> int:
    from .local_server import LocalLauncher, LocalSetupError, PaidCallBudget, make_server, read_local_config

    try:
        config = read_local_config(Path(args.config))
    except (LocalSetupError, OSError) as error:
        print(error, file=sys.stderr)
        return 2
    if args.segmenter == "fixture":
        if not args.fixture or args.paid_calls is not None:
            print("--segmenter fixture necesita --fixture y no lleva --paid-calls", file=sys.stderr)
            return 2
        fixture = Path(args.fixture)
        if not fixture.is_file():
            print(f"No existe el fixture {fixture}", file=sys.stderr)
            return 2
        factory = lambda: FixtureSegmenter(fixture, name="FIXTURE")  # noqa: E731
        label = "FIXTURE rotulado (real_inference: false, sin costo)"
    else:
        if args.fixture or not args.paid_calls:
            print("--segmenter sam necesita --paid-calls N (llamadas pagadas autorizadas) y no lleva --fixture", file=sys.stderr)
            return 2
        if not (os.environ.get("META_MODEL_API_KEY") or os.environ.get("MODEL_API_KEY")):
            print("SAM real necesita META_MODEL_API_KEY en dockmind-worker/.env", file=sys.stderr)
            return 2
        try:
            factory = PaidCallBudget(MetaSamClient, args.paid_calls)
        except LocalSetupError as error:
            print(error, file=sys.stderr)
            return 2
        label = f"META_SAM_API, inferencia real y pagada (USD 0,20 por cada 1 000 cuadros, mínimo 50), cupo {args.paid_calls}"
    server = make_server(LocalLauncher(config, factory))
    print(f"Lanzador local DockMind en {config.worker_url}")
    print(f"Segmentador: {label}")
    print(f"Orígenes permitidos: {', '.join(sorted(config.origins))}. Ctrl+C para cerrar.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


def main(argv: list[str] | None = None) -> int:
    _load_env(WORKER_ROOT / ".env")
    parser = argparse.ArgumentParser(prog="dockmind", description="Cuenta bultos que cruzan una línea con SAM 3.1")
    sub = parser.add_subparsers(dest="command", required=True)

    analyze = sub.add_parser("analyze", help="Analiza un clip")
    analyze.add_argument("clip")
    analyze.add_argument("--line", required=True, help="x1,y1,x2,y2 del segmento de cruce (p. ej. el ancho de la puerta), en fracciones del cuadro")
    analyze.add_argument("--inside", required=True, help="x,y de un punto del lado de adentro, en fracciones")
    analyze.add_argument("--concept", required=True, help='Un solo concepto, p. ej. "cardboard box" o "pallet"')
    analyze.add_argument("--unit", required=True, choices=[u.value for u in Unit])
    analyze.add_argument("--source", default=ClipSource.OWN_CAPTURE.value, choices=[s.value for s in ClipSource])
    analyze.add_argument("--out", help="Carpeta de salida (por defecto out/<nombre del clip>)")
    analyze.add_argument("--fps", type=int, default=10)
    analyze.add_argument("--margin", type=float, default=0.01, help="Margen de las esquinas a la línea, en fracción del ancho")
    analyze.add_argument("--min-track-frames", type=int, default=3)
    analyze.add_argument("--no-overlay", action="store_true")
    analyze.add_argument("--no-roi", action="store_true", help="Analiza el cuadro completo en vez del corredor alrededor de la línea")
    source = analyze.add_mutually_exclusive_group()
    source.add_argument("--fixture", help="Salida en formato SAM rotulada como FIXTURE (no es inferencia real)")
    source.add_argument("--replay", help="Carpeta de un análisis anterior: reusa su salida de SAM sin volver a pagar")
    analyze.set_defaults(handler=_analyze)

    evaluation = sub.add_parser("evaluate", help="Compara observaciones con la referencia manual")
    evaluation.add_argument("--reference", required=True)
    evaluation.add_argument("--observations", required=True)
    evaluation.set_defaults(handler=_evaluate)

    frame = sub.add_parser("frame", help="Guarda el primer cuadro con una cuadrícula de décimas para elegir la línea")
    frame.add_argument("clip")
    frame.add_argument("--out", help="PNG de salida (por defecto out/<clip>_cuadricula.png)")
    frame.set_defaults(handler=_frame)

    synthetic = sub.add_parser("synthetic", help="Genera clips sintéticos rotulados, con fixture y referencia")
    synthetic.add_argument("--out", default=str(WORKER_ROOT / "clips" / "sinteticos"))
    synthetic.add_argument("--only", nargs="*", help="Escenarios: todas, falta_una, reingreso, oclusion")
    synthetic.set_defaults(handler=_synthetic)

    credentials = sub.add_parser("local-credentials", help="Crea el archivo privado del lanzador local (fuera del repositorio)")
    credentials.add_argument("--out", required=True, help="Archivo nuevo, fuera de cualquier repositorio")
    credentials.add_argument("--storage", required=True, help="Origen de la Supabase local, p. ej. http://127.0.0.1:64321")
    credentials.add_argument("--app", required=True, help="Origen de la app local, p. ej. http://127.0.0.1:8080")
    credentials.add_argument("--port", type=int, default=8765, help="Puerto del lanzador en 127.0.0.1")
    credentials.set_defaults(handler=_local_credentials)

    serve = sub.add_parser("serve-local", help="Lanzador local: recibe jobs de la app local como el endpoint de Modal")
    serve.add_argument("--config", required=True, help="Archivo de `dockmind local-credentials`")
    serve.add_argument("--segmenter", required=True, choices=["fixture", "sam"], help="Sin valor por defecto: se elige siempre")
    serve.add_argument("--fixture", help="Salida en formato SAM rotulada FIXTURE (con --segmenter fixture)")
    serve.add_argument("--paid-calls", type=int, help="Máximo de llamadas a SAM real que autorizas en esta sesión (con --segmenter sam)")
    serve.set_defaults(handler=_serve_local)

    args = parser.parse_args(argv)
    return args.handler(args)


if __name__ == "__main__":
    raise SystemExit(main())
