# DockMind: recorrido local de punta a punta (corrida del 1-nov-2026)

Ramón/Jean, PR #6. Datos en [recorrido-local.json](recorrido-local.json), generado por `cargomesh/scripts/meta-dockmind-local-e2e.ts`.

## Entorno

- Supabase local del perfil V2 (`supabase-v2`, CLI 2.117.0, 127.0.0.1:58321): toda la cadena de migraciones de `main` más `20261031120000_meta_dockmind_jobs.sql` y `20261101180000_meta_dockmind_attempt_overlays.sql`, con el seed sintético `v2-road-baseline`. Solo Auth, PostgREST, Storage y Kong encendidos; ningún banco histórico.
- Rutas Hono V2 en proceso (`createHonoApp` para solicitud, manifiesto y sesión; `createDockMindRouter` con `dockmindRequestDeps` y `dockmindServerDeps`). Llamadas con el Bearer de los usuarios sintéticos A y B.
- Worker: `dockmind-worker/scripts/local_e2e_job.py`, que corre `parse_job` y `run_job` como en Modal.

## Qué es real y qué no

| Real | Sustituido y rotulado |
| --- | --- |
| Auth, solicitud, manifiesto CR-01 confirmado y sesiones DEMO y VERIFICATION de Juan | Segmentador: el FIXTURE del clip sintético `sintetico_todas` (`real_inference: false`). No hay llamada a SAM |
| Migración, RLS, RPC del miembro y del servidor, bucket privado y URLs firmadas | Las URLs https del host de prueba `local.dockmind.test` se traducen a 127.0.0.1 dentro del ejecutor local |
| Worker Python: descarga, análisis, video anotado, callback firmado y reenvío ante 503 | La falla de Juan de los pasos 4 y 5 se inyecta en el servidor del recorrido; el registro posterior es el real. En el paso 7, el despacho del intento 1 se corta a propósito (la API ve un timeout) y ese intento se corre después |
| `recordLoadingObservation` de Juan y la lectura de su sesión | Modal no participa |

## Resultado

| Paso | Resultado |
| --- | --- |
| Clip | Registrado en PENDING, replay con la misma clave, `UPLOAD_INCOMPLETE` antes de subir, READY (MP4) tras la subida firmada. La lectura pública del bucket falla |
| Job 1 | SUCCEEDED y DELIVERED en un envío; neto 6, `SYNTHETIC_RENDER`, sin inferencia real; video anotado privado de 83 KB. El mismo payload canónico devuelve el mismo job y un SUCCEEDED no se reintenta |
| Job 2, caso obligatorio | Juan falla una vez: el callback responde 503, el worker reenvía y la entrega pasa a DELIVERED en el segundo envío. Una sola observación y un solo despacho |
| Job 3 | Juan falla tres veces: el worker agota los envíos (UNREACHABLE) y la entrega queda PENDING con 3 intentos. `POST .../delivery` la registra sin nuevo despacho |
| Aislamiento | La organización B recibe 404 al leer el job y el clip, una lista vacía y 404 al adjuntar un clip a la sesión de A |
| Procedencia | La sesión VERIFICATION rechaza el render sintético con `REAL_EVIDENCE_REQUIRED` |
| Intento tardío (prueba obligatoria del 1-nov) | El despacho del intento 1 se corta; la API lo deja en cola y se reintenta. El intento 2 sube a `...-a2-overlay.mp4`, queda VERIFIED y su observación llega a Juan. Después corre el worker del intento 1: sube a `...-a1-overlay.mp4` y su callback recibe 202 `STALE_ATTEMPT`. Un PUT con otros bytes a la URL del intento 2 recibe HTTP 400 `statusCode` 409 (Duplicate). El video que se reproduce sigue con el mismo SHA-256 y Juan tiene una sola observación, del intento 2. Los dos videos tienen el mismo contenido porque usan el mismo FIXTURE: la separación se comprueba por ruta y por el rechazo del reemplazo |

## Fuera de este recorrido

- Modal desplegado, SAM real y la base alojada: no se usaron. El flujo alojado no está cerrado.
- Captura propia en VERIFICATION: faltan los clips propios (RA-00).
- La interfaz se probó en un navegador local el 31-oct, antes de esta corrección, y no después. La revisión visual corresponde a Cristhian.
