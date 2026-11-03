# Pruebas del worker

`pytest` desde `cargomesh/dockmind-worker` con el venv activo.

- `test_sam_output.py`: gramática de SAM 3.1 (ejemplo de la documentación de Meta), salida vacía y contrato roto.
- `test_tracks.py`: trayectorias por ID y cuadros fuera del clip.
- `test_counting.py`: cruce único, objeto sobre la línea, ida y vuelta rápida, salida y reingreso, cambio de ID, pérdida sobre la línea, trayectoria corta, límite de 16 objetos, fin sobre la línea, segmento dibujado y caja montada.
- `test_pipeline.py`: punta a punta con clips sintéticos y fixtures rotulados (necesita ffmpeg).
- `test_jobs.py`: contrato del job, hosts permitidos, callback firmado y fallos del proveedor con HTTP simulado; entrega con confirmación (reenvío acotado ante 5xx, 429 o timeout, sin reenvío ante 4xx), reentrega de un resultado ya calculado sin volver a llamar a SAM, y valores por defecto iguales a los del contrato web.

Los fixtures son `SYNTHETIC_RENDER` / `FIXTURE`: prueban el código, no la precisión de SAM. La validación con video real se registra aparte, con `dockmind evaluate`.
