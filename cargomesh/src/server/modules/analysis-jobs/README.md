# Jobs de análisis DockMind (RA-03) — Ramón/Jean

Conecta un clip privado con la sesión de carga de Juan: clip → job persistente → worker → observación de Juan → dashboard. Está en el PR #6 (abierto, sin merge a `main`); la base alojada y Modal todavía no están configurados.

El servicio no conoce Supabase ni Modal: depende de puertos (`ports.ts`). Las pruebas usan un almacén en memoria con la misma semántica que las tablas.

| Archivo | Qué hace |
| --- | --- |
| `clip-service.ts` | Registra el clip en PENDING con una URL firmada de subida directa al bucket. Al terminar comprueba tamaño, SHA-256 y formato real (`media-format.ts`): pasa a READY o queda REJECTED con el motivo |
| `service.ts` | Crear el job (deduplicado por organización y payload canónico), enviarlo al worker, consultar, reintentar, recibir el callback, entregar la observación a Juan y recuperar una entrega pendiente |
| `retry-policy.ts` | Cuándo se puede reintentar: falló, nunca salió de la cola (2 min) o el worker no avisó a tiempo (20 min). La base aplica la misma regla |
| `view.ts` | Lo que ve la UI, sin URLs firmadas, rutas del bucket ni datos de otra organización |
| `callback-signature.ts` | Firma HMAC del callback, con el mismo vector que el worker en Python |
| `modal-dispatcher.ts` | `POST` al endpoint `jobs` de Modal con `Modal-Key` y `Modal-Secret` |
| `config.ts` | Variables `DOCKMIND_*` y `MODAL_PROXY_TOKEN_*`; duración de la URL del clip para el worker |
| `supabase-repositories.ts`, `supabase-storage.ts` | Puentes a las RPC `meta_dockmind_v1` (miembro) y `meta_dockmind_server_v1` (servidor) y al bucket `meta-dockmind` |
| `wiring.ts` | Arma las dependencias por petición autenticada, con el lector de sesión de Juan |
| `memory-repository.ts`, `test-support.ts` | Almacén en memoria y arnés de pruebas |

Rutas: `src/server/hono/routes/meta/dockmind.ts`, montadas en `createHonoApp`. Migraciones: `supabase-v2/supabase/migrations/20261031120000_meta_dockmind_jobs.sql` y la aditiva `20261101180000_meta_dockmind_attempt_overlays.sql` (video anotado por intento), con prueba pgTAP en `supabase/tests/54_meta_dockmind_jobs.test.sql`. Interfaz: `src/features/meta-dockmind/`, en el slot `evidenceContent` del dashboard de Juan.

## Reglas que garantiza

**Clips privados**
- El clip queda ligado a la organización y a una sesión abierta. La ruta del bucket se deriva de IDs estables; nadie la elige.
- Solo MP4 o MOV de hasta 50 MB. El servidor lee el objeto subido y exige el tamaño y el SHA-256 declarados y un contenedor de video real (no una foto HEIC ni un audio M4A).
- Solo un clip READY se analiza. Original y video anotado viven en un bucket privado: el navegador recibe URLs de 5 minutos y el worker una de 1 hora para el clip (cubre los 20 minutos de cola más los 15 de timeout de Modal) y una de subida para el video anotado (Supabase la fija en 2 horas).
- Una sesión VERIFICATION solo acepta captura propia. DEMO admite un render sintético, que siempre queda rotulado.

**Jobs**
- Mismo payload canónico (sesión, clip y sus bytes, revisión, grupo, cobertura declarada y configuración efectiva) devuelve el mismo job. Los valores por defecto del worker van explícitos, así que omitirlos o mandarlos iguales es el mismo job.
- Cada cambio de estado es atómico en la base: aplica solo si el job sigue en el intento y en el estado esperados. SUCCEEDED y FAILED no se pisan. Cada intento se despacha una vez: lo despacha quien ganó el insert o el cambio de intento.
- El reintento lleva `expectedAttempt`: dos reintentos simultáneos crean un solo intento.
- El callback exige firma válida sobre el cuerpo crudo y su timestamp (5 minutos). Compara la identidad exacta (organización, sesión, evidencia, grupo, revisión e intento) y lo que el worker dice haber usado (unidad, línea, concepto, `margin`, `min_track_frames`, procedencia y SHA-256 del clip). Un resultado de otro job o configuración se rechaza con `INPUT_REVISION_MISMATCH` y no reemplaza nada; el de un intento viejo no pisa al nuevo.

**Video anotado por intento**
- Cada intento tiene su propio objeto: `org/<org>/<sesión>/<clip>-<job>-a<intento>-overlay.mp4`, una columna que la base deriva del job y del intento. Un reintento cambia la ruta.
- La URL firmada de subida solo crea (sin upsert). Un worker viejo solo alcanza la ruta de su intento, y un envío repetido del mismo intento no reemplaza un video ya guardado: Storage responde 400 con `statusCode` 409 (`Duplicate`).
- El worker declara el SHA-256 del video que subió. Al guardar el resultado del intento abierto, el servidor lee el objeto de esa ruta y anota `overlay`: VERIFIED si coincide y es MP4; MISSING o MISMATCH si no. Solo un video VERIFIED se reproduce, y la URL corta apunta a la ruta del intento actual.
- Un callback de un intento viejo se descarta como STALE_ATTEMPT antes de mirar el video. Uno repetido del intento actual es ALREADY_RECORDED y no vuelve a leerlo ni lo cambia.
- Juan recibe `overlayUploaded` según la verificación del servidor, no según lo que declaró el worker.

**Entrega a Juan**
- "Análisis SUCCEEDED" y "observación entregada" son estados distintos (`delivery`: NOT_REQUIRED, PENDING, DELIVERED, REJECTED, SUPERSEDED), guardados en la base con intentos y último error.
- La entrega usa `recordLoadingObservation` de Juan con el cliente de servicio y siempre con la observación guardada, nunca con el cuerpo del callback. Juan guarda una vez por organización, job e intento, así que repetirla devuelve la misma observación.
- Si Juan falla después de guardar SUCCEEDED, el callback responde 503 y el worker reenvía. Un callback repetido (`ALREADY_RECORDED`) vuelve a intentar la entrega pendiente; no se la salta.
- Agotados los reenvíos, la entrega sigue PENDING y se recupera con `POST /meta/dockmind/jobs/:jobId/delivery`. La recuperación no vuelve a llamar al worker ni a SAM.
- Un rechazo de Juan que repetir no arregla (por ejemplo `REAL_EVIDENCE_REQUIRED` o `STALE_MANIFEST`) queda REJECTED con su código. DockMind no cambia selección, cierre ni Passport.

## Variables

| Variable | Dónde | Para qué |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | App web | Cliente del usuario: Juan y las RPC del miembro autorizan con su sesión |
| `SUPABASE_SERVICE_ROLE_KEY` | App web, solo servidor | Bucket privado, resultado del worker y entrega a Juan. Nunca `NEXT_PUBLIC_` |
| `DOCKMIND_WORKER_MODE` | App web | `MODAL` (por defecto): todo por https. `LOCAL_LOOPBACK`: lanzador local `dockmind serve-local`, solo fuera de producción y con Supabase, app y worker en `http://127.0.0.1` |
| `DOCKMIND_WORKER_URL` | App web | Endpoint `jobs` de la app de Modal `cargomesh-dockmind` (o `http://127.0.0.1:<puerto>/jobs` del lanzador local) |
| `MODAL_PROXY_TOKEN_ID`, `MODAL_PROXY_TOKEN_SECRET` | App web | Proxy auth de Modal (`Modal-Key`, `Modal-Secret`) |
| `DOCKMIND_CALLBACK_URL` | App web | `https://<host de la app>/api/v2/meta/dockmind/callback` |
| `DOCKMIND_CALLBACK_SECRET` | App web y secret de Modal | El mismo valor en los dos lados, 32 caracteres o más |
| `META_MODEL_API_KEY`, `DOCKMIND_ALLOWED_HOSTS` | Secret de Modal `cargomesh-meta-worker` | SAM 3.1 y hosts permitidos (`<ref>.supabase.co` y el host del callback) |

## Despliegue (requiere autorización del Tech Lead para cada paso remoto)

1. Base: aplicar, en orden y después de las de CR-01 y Juan, `20261031120000_meta_dockmind_jobs.sql` (bucket privado `meta-dockmind`, tablas y RPC) y `20261101180000_meta_dockmind_attempt_overlays.sql` (video anotado por intento).
2. Modal: secret `cargomesh-meta-worker`, `modal deploy modal_app.py` y un token de proxy, como indica [OPERACION.md](../../../../dockmind-worker/OPERACION.md).
3. App (Vercel): cargar las variables de la tabla y volver a desplegar.
4. Comprobación alojada: un clip propio en una sesión VERIFICATION hasta la observación en el dashboard. Hasta hacer esta comprobación, el flujo alojado no está cerrado.

## Recorrido local

`scripts/meta-dockmind-launcher-e2e.ts` (`pnpm e2e:meta-dockmind-launcher`) hace la prueba de aceptación por HTTP real, sin sustituir nada de la app. El recorrido va así: job desde la sesión, despacho con proxy auth al lanzador local, Storage, callback firmado, resultado persistido, observación de Juan y video del intento correcto. Después repite el callback, la recuperación y el despacho, y comprueba que no haya duplicados. Evidencia: `docs/meta/evidence/dockmind-local-launcher/`. `scripts/meta-dockmind-evidence.ts` (`pnpm evidence:meta-dockmind`) arma el paquete de evidencia de jobs reales.

`scripts/meta-dockmind-local-e2e.ts` recorre Auth local, solicitud, manifiesto CR-01, sesión de Juan, clip privado, job, worker Python, callback firmado, entrega, recuperación y aislamiento contra la Supabase local del perfil V2. Usa el FIXTURE del clip sintético, sin inferencia real. Evidencia: `docs/meta/evidence/dockmind-local-e2e/`.
