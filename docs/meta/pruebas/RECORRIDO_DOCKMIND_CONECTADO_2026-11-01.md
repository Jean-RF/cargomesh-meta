# Pedido documental → DockMind → comparación → Passport local

1-nov-2026, 22:00 PET. Base `7d185dc` más trabajo local sin commit de Cristhian. API Meta 64321, PostgreSQL 64322, frontend 8080. Sin despliegues, migraciones alojadas o inferencia pagada.

## Caso conservado

Pedido `8b0fed7d-4cc3-4cc3-b819-8f68fdeefebe`, manifiesto `163cd0cc-a0d2-4f8e-bcde-310c689fcafd` rev1. Se reutilizó el expediente documental; no se creó otro pedido ni se reinterpretaron sus PDF.

| Grupo | UUID estable | Declarado | Observado | Comparación |
| --- | --- | ---: | ---: | --- |
| A | 879dc96b-3c00-43e1-b772-619996b2b713 | 8 BOX | 8 BOX | MATCH |
| B | d1b2aab3-29d2-4b90-8a70-d369c0dd1f6c | 4 BOX | 3 BOX | DIFFERENCE_PROPOSED, diferencia 1 BOX |

Sesión DEMO `9c332d9c-506a-45ed-a7d1-1df48c848269`; Passport `ceee5506-476c-48ba-a78d-81ff742ea5b2`.

Dos clips separados del renderizador de Ramón. Las detecciones FIXTURE se calculan desde la geometría; el parser/contador real calcula cruces, entradas, salidas y neto. El resultado esperado solo comprueba la salida posterior. No se inyectó el total declarado como respuesta ni se reutilizó un conteo global para ambos grupos.

## Recorrido ejecutado

1. Auth local y Hono/RPC reales: abrir sesión con ambos grupos del manifiesto vigente.
2. Registrar, subir y verificar cada MP4 privado por tamaño, formato y SHA-256.
3. Ejecutar dos jobs en Python, subir overlays y enviar callback HMAC al router real mediante puente loopback de prueba.
4. Persistir SUCCEEDED, DELIVERED y overlay VERIFIED. Repetir solicitud devuelve el mismo job; una observación por job. SHA del overlay descargado coincide con el recibo del worker.
5. Seleccionar cobertura y cerrar como actor QA autenticado. Son acciones automatizadas de aceptación de evidencia sintética; no una revisión física por Cristhian.
6. Guardar Passport, comparación por grupo y dos explicaciones estructuradas con proveedor INJECTED, validadas contra los eventos reales de esos jobs.
7. Reabrir el Passport vigente con ambas explicaciones. Lectura adicional por HTTP a través de Next8080: dos jobs disponibles y página Tetris HTTP200. Sin aceptación visual.

Jobs A `5689cdc1-2787-4502-93cd-cfaa2f1214ef`, B `213404a9-10d6-4c13-8fee-753c370d1887`.

## Verificaciones y reproducción

- Respaldo previo `before-dockmind-20261101-214501/database.dump`, fuera de Git.
- Migraciones locales: `20261031120000_meta_dockmind_jobs.sql` y `20261101180000_meta_dockmind_attempt_overlays.sql`; recibos registrados.
- 62 comprobaciones pgTAP DockMind aprobadas.
- Python: 41 pruebas puras de contador/ROI/parser/tracks y 30 de jobs aprobadas. Los intentos iniciales de jobs fallaron por temporales/procesos del sandbox; pasaron usando TEMP/TMP del workspace y ejecución local autorizada. No se relajaron controles del producto.
- TypeScript sin errores.
- FFmpeg portátil, sin instalación del sistema ni PATH permanente. SHA-256 del archivo verificado contra su publicación: `60f467265b1e312373dbcd92200c2618a74850f98d3d078e94296bb3fa2047ba`.
- Arnés `cargomesh/scripts/meta-connected-demo.ts`, con API64321 obligatoria y estado explícito bajo `meta-hackathon-integration/tmp`. Requiere entorno privado, venv Python y FFmpeg. Sin URLs firmadas o secretos en la evidencia.
- [Resultado saneado](dockmind-conectado-2026-11-01/result.json) y [lectura HTTP](dockmind-conectado-2026-11-01/http-readback.json).

## Límites y pendientes

La integración es local con `SYNTHETIC_RENDER`, segmentador `FIXTURE`, `realInference=false` y explicaciones `transport=INJECTED`. No acredita precisión SAM, captura propia ni Modal desplegado. El frontend lee los resultados persistidos; crear nuevos análisis desde la web sigue requiriendo configuración/worker. El dispatcher de prueba no queda instalado como servicio de producción.

[Entrega requerida a Ramón](../PROMPT_RAMON_CIERRE_WORKER_Y_CLIPS.md): clips propios por grupo, worker/configuración y conectividad HTTPS. Modal no puede descargar desde esta base loopback ni enviar callbacks a8080.

El comparador conectado mantiene `planned=null`: este recorrido compara declarado/observado y no certifica el acomodo/optimización Tetris. El booking conserva sus estados propios; el Passport no crea incidentes, confirma capacidad, entrega ni booking. Las explicaciones usan el módulo de Luis del producto general; no se promueven automáticamente al alcance Indie.

Revisión visual y decisión humana sobre la diferencia pendientes. Sin push, merge o despliegue de este incremento.
