# Integración Meta — 31 de octubre de 2026

Revisión autorizada por Cristhian: integrar entregas de Ramón, Luis y Juan que pasen el gate. Repositorio de trabajo: Chujutak2024/meta-hackathon. No se modifica el repositorio Amazon, ni se promueve código a cargomesh-dockmind, ni se despliega infraestructura.

## Resultado

| Entrega | Head revisado | Resultado |
| --- | --- | --- |
| Juan, PR #9 | 3810a589f75e4d4b9c7b7a7f2797cecffc791209 | Integrado en main mediante merge 86e45026e257cd75b966383bdbc340d077ad92e5 |
| Ramón, PR #6 | 462978678fedd5e45d64d3fb8a1df77a80b252f8 | Sigue en draft; corregir evidencia anotada compartida por reintentos |
| Luis, PR #10, continuación de #7 | bda1c22e440755981567ab3dd23b24e3c6019f02 | Draft abierto en la misma rama; corregir inicialización no idempotente y sincronizar con main (GitHub indica conflicto) |

Enlaces: [Juan #9](https://github.com/Chujutak2024/meta-hackathon/pull/9), [Ramón #6](https://github.com/Chujutak2024/meta-hackathon/pull/6), [Luis #10](https://github.com/Chujutak2024/meta-hackathon/pull/10).

La rama local codex/meta-cristhian conserva c3e8162 (expediente documental), incorpora main mediante 23a5e4c y mantiene los cambios locales de IA, dashboard y documentación. Los registros de ambos autores se conservaron al resolver el conflicto de BUILT_DURING_HACKATHON.md. No se publicaron los cambios locales pendientes.

## Hallazgo funcional P2 — Ramón

Archivos: cargomesh/src/server/modules/analysis-jobs/service.ts (dispatch y overlayUrl), supabase-storage.ts:51-55, memory-repository.ts (overlayPath) y supabase-v2/supabase/migrations/20261031120000_meta_dockmind_jobs.sql (overlay_path y retry_job).

El destino del video anotado contiene clip y job, pero no el intento. retry_job incrementa attempt conservando overlay_path; el adaptador crea una URL de subida con upsert:true. El token tiene 2 horas de vigencia, mientras que un RUNNING permite reintento después de 20 minutos. Un trabajo anterior demorado en cola o una subida tardía puede reemplazar el video del intento nuevo aunque su callback sea rechazado como STALE_ATTEMPT. El conteo persistido y el video mostrado pueden dejar de corresponder.

Reproducción aislada con el arnés real: crear clip y job, adelantar el reloj 21 minutos y reintentar con expectedAttempt:1. Los despachos 1 y 2 conservan el mismo overlay_upload_url. Un espía del adaptador real confirma upsert:true. No se accedió a Modal, Storage real ni GPU.

Corrección a cargo de Ramón: objeto de salida distinto e inmutable por intento, referencia exacta en lectura/resultado y transición SQL coherente. Aceptación: ejecutar intento 2 y luego subir/callback del 1; nunca cambia el video ni la observación del 2. Cubrir también callbacks repetidos y recuperación de entrega. Conservar migraciones ya aplicadas; usar transición aditiva cuando corresponda.

## Hallazgo funcional P2 — Luis

Archivos: cargomesh/src/server/modules/media-evidence/declaration-media.ts:76-144, src/shared/schemas/meta/declaration-media.ts:10 y migración 20261031090000_meta_declaration_media.sql.

initializeMedia genera un randomUUID por llamada sin clave idempotente ni huella canónica. Si se pierde la respuesta de initialize, seleccionar/reintentar el mismo archivo crea otro registro PENDING. Para audio, el segundo intento se rechaza con MEDIA_LIMIT porque el primero ocupa su único cupo. La recuperación de lista ayuda a eliminar pendientes, pero no convierte el comando en idempotente. Las cuotas se verifican antes del insert sin una exclusión atómica, por lo que también falta probar concurrencia.

Reproducción aislada invocando initializeMedia real con REST y Storage simulados: dos payloads idénticos de foto producen IDs diferentes y dos filas; dos de audio producen MEDIA_LIMIT en el segundo. Se bloquearon todas las conexiones fuera del origen simulado. Sharp se resolvió desde la dependencia transitiva ya instalada; no se reinstalaron paquetes.

Corrección a cargo de Luis: clave estable por operación, huella canónica y persistencia/replay atómicos antes de consumir cuota. Misma clave/payload devuelve el mismo adjunto; otra huella con la misma clave devuelve conflicto estable. Probar respuesta perdida y dos inicializaciones concurrentes, tanto foto como audio. Actualizar la misma rama/PR #10 y sincronizar desde main conservando autoría.

## Evidencia y límites

- PR #9: tres checks remotos SUCCESS sobre el head revisado; prueba adicional CARLA reference-asset: 1/1. Atribución y hash embebidos/documentados; no se certifica realismo ni capacidad física del camión.
- PR #6: tres checks remotos SUCCESS sobre el head revisado; test:meta-dockmind: 49/49. La reproducción adicional confirma la brecha de salida por intento, no cubierta por esos casos.
- Luis: test:meta-draft-media: 14/14. La reproducción adicional confirma la falta de idempotencia; no es una prueba de inferencia o de base real. El PR #10 indica conflicto y no tiene gate integrado aprobado.
- CI de main tras el merge: run 41271075373, inicialmente en progreso. No confundir gate del PR con finalización de este run.
- Fuentes revisadas en copias aisladas; respaldo de 38 archivos locales y parche en salida/meta-hackathon-integration/review-integration-20261031-225349. Se conservaron los resguardos.
- Docker, frontend y backend Meta siguen apagados. No se aplicaron migraciones en esta revisión ni se ejecutó inferencia pagada. La revisión visual permanece a cargo de Cristhian.

Los defectos funcionales vuelven a sus dueños según AGENTS.md; no se reasignó su implementación al integrador ni se fusionaron entregas con estos hallazgos pendientes.

Comprobación posterior a la sincronización local: TypeScript (`tsc --noEmit --incremental false`) terminó con exit 0; diff --check sin errores y ningún conflicto Git pendiente. El gate completo de main, run 41271075373, terminó SUCCESS: TypeScript/release/build, V1 y V2.
