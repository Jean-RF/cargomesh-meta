# Paquete `dockmind`

| Módulo | Qué hace |
| --- | --- |
| `sam_output.py` | Lee la salida de texto de `sam-3.1` (una línea `<Nf>` por cuadro) y extrae las cajas; rechaza salidas que no respetan la gramática |
| `tracks.py` | Agrupa las cajas por ID, separa los IDs que SAM reutiliza y rechaza cuadros fuera del clip |
| `roi.py` | Corredor alrededor de la línea que se manda a SAM y configuración traducida a esa ventana |
| `counting.py` | Conteo puro de cruces con marcas de revisión (4 esquinas y segmento, como `LineZone` de roboflow/supervision) |
| `video.py` | `ffprobe` y normalización con `ffmpeg` (MP4 H.264, 10 fps, máx. 720p) |
| `sam_client.py` | Cliente de la Meta API (Files con vencimiento + Responses en streaming) y segmentador de fixtures |
| `overlay.py` | Video anotado con línea, cajas, IDs, contador y marcas |
| `pipeline.py` | Análisis completo de un clip y `observation.json` |
| `jobs.py` | Contrato `dockmind.job.v2` / `dockmind.result.v2`, descarga, subida y callback firmado |
| `evaluate.py` | Comparación con la referencia manual (solo aquí se usa) |
| `synthetic.py` | Clips `SYNTHETIC_RENDER` con referencia y fixture rotulado `FIXTURE` |
| `cli.py` | Comandos `analyze`, `evaluate` y `synthetic` |

Nunca se descarga una URL que no esté en `DOCKMIND_ALLOWED_HOSTS`. Uso y estado: `../../README.md`.
