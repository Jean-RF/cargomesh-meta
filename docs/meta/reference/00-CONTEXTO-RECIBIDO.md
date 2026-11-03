> **Nota para esta copia:** el equipo inscrito es Cristhian, Axel, Luis, Juan y Ramón/Jean. Axel 1 se interpreta como Axel y Axel 2 como Luis; confirmar esa correspondencia. Las referencias a `meta-main`, al tag y a infraestructura son propuestas que deben cotejarse con [INICIO.md](INICIO.md) y [CONTEXTO_CONSOLIDADO.md](CONTEXTO_CONSOLIDADO.md).

# CargoMesh Meta — contexto común del equipo

Este archivo lo leen los 5 integrantes y sus agentes de código antes de empezar cualquier historia. El plan completo está en el doc "Plan CargoMesh Meta"; el detalle de cada historia, en `BACKLOG_SCRUM.csv` y `backlog-core.json`.

## 1. Qué construimos

Un solo recorrido, dentro del CargoMesh actual:

1. **Declaración.** El embarcador declara su carga con texto, foto, foto de etiqueta o nota de voz. Muse Spark propone los campos y la persona confirma. Resultado: un manifiesto confirmado y versionado.
2. **Sesión de carga.** En Carrier se abre una sesión ligada a la sede y al manifiesto.
3. **DockMind.** Se graba un clip fijo de la carga del camión. SAM 3.1 sigue los bultos y nuestro código cuenta los cruces de una línea.
4. **Conciliación.** Código puro compara lo declarado con lo observado. Muse Spark solo explica la diferencia.
5. **Reality Passport.** Línea de tiempo con evidencias. Una persona confirma o descarta la diferencia.

Regla de oro: **la IA propone, la persona confirma.** Ningún modelo guarda datos, reserva, crea incidencias ni calcula la diferencia.

## 2. Reglas del hackathon que afectan el código

- **Equipo:** Cristhian, Axel, Luis, Juan y Ramón/Jean se inscribieron. El límite y la composición permitida están pendientes de comprobar en el reglamento oficial.
- **Repo público.** Nada de secretos en el repo, ni en el historial.
- **Solo trabajo nuevo.** Podemos partir de CargoMesh, pero el demo solo muestra lo hecho durante el hackathon y tiene que quedar claro qué es nuevo. Si no, descalifican.
- **Derechos.** Solo clips, fotos y música propios o con licencia. Nada bajado de internet.
- **Proyectos a evitar:** "Simple Image Analyzers". La foto es solo una entrada del flujo, nunca el producto.

## 3. Fechas (hora de Lima; ese día es igual a ET)

| Sprint | Días de trabajo | Historias |
| --- | --- | --- |
| P0 | 27 oct | CR-00, CR-09, AX-00, AX-09, JU-00, JU-12, RA-00 |
| I1 | 28 oct (noche 27→28) | CR-01, AX-01, AX-10, JU-01, RA-01, RA-10 |
| Gate | 28 oct | SAM y Muse responden con datos reales; si SAM no sirve, se decide el respaldo ese día |
| I2 | 29–30 oct | CR-02, AX-02, AX-03 (con fixtures), JU-02, RA-02 |
| I3 | 31 oct–1 nov | CR-03, AX-03, JU-03, RA-03 |
| I4 | 2–3 nov | CR-04, AX-04, JU-04, RA-04, y después se congela |
| Entrega | 3 nov | CR-10, RA-11 |
| Cierre oficial | 4 nov, 21:00 | Solo contingencias |

Rutina diaria: daily a las 23:00, trabajo de 00:00 a 02:00. De 01:40 a 02:00 hay revisión cruzada y merge.

## 4. Git

- Base: tag `meta-hackathon-start` sobre `4482d3a` (último commit de `main`, entregado a Amazon).
- Rama de integración: `meta-main`. Ramas de trabajo: `codex/meta-<tema>` desde `meta-main`. Los PR van a `meta-main`.
- **Nunca** hacer merge ni PR a `main` antes del 20 de noviembre. `main` y `cargomesh.vercel.app` siguen en evaluación de Amazon.
- `AGENTS.md` dice "PR a main". En `meta-main` hay una excepción documentada solo para este hackathon; respeta todo lo demás de `AGENTS.md` (idempotencia, versiones, un dueño por issue, evidencia).
- Cada PR: pequeño, con diff, pruebas ejecutadas y su resultado real, y evidencia. Lo revisa una persona del anillo y lo aprueba Cristhian (los de Cristhian los aprueba Juan).
- Anillo de revisión: Cristhian revisa a Axel → Axel revisa a Luis → Luis revisa a Ramón/Jean → Ramón/Jean revisa a Juan → Juan revisa a Cristhian.
- El paquete de IA tiene dos frentes: **Axel** (cliente de la Meta API, interpretación y errores) y **Luis** (Vercel, voz y explicación).
- Cada historia terminada se anota en `BUILT_DURING_HACKATHON.md` con sus commits y su autor.

## 5. Arquitectura

| Componente | Qué hace |
| --- | --- |
| Navegador (Cliente y Carrier) | Declara, graba y sube archivos directo a Supabase Storage con URL firmada; revisa y confirma |
| Vercel `cargomesh-meta` (rama `meta-main`) | Next.js y API Hono; adaptador Meta; comparador puro; revisión y Passport |
| Supabase (proyecto nuevo para Meta) | Postgres con RLS; Storage privado `meta-evidence`; estado de los jobs |
| Meta Model API | `muse-spark-1.3`, `muse-voice-transcribe-1.0` y `sam-3.1` |
| Modal (worker de Python, solo CPU) | ffmpeg, SAM 3.1, conteo de cruces, video anotado; escribe el resultado en Supabase |
| Respaldos | Baseten con Muse Spark Open (texto e imagen); SAM 3.1 con pesos abiertos en GPU |
| No se toca | Rama `main`, `cargomesh.vercel.app`, Supabase original y gateway Nova en ECS |

Flujo del video: navegador sube el clip → API crea `analysis_job` → llama a `POST /jobs` del worker (spawn) → el worker baja el clip, lo normaliza, llama a SAM, cuenta y guarda → la app consulta el estado cada 3 s.

## 6. Lo que ya existe en el repo (commit `4482d3a`)

- **Stack:** Next.js 15.5, React 19.2, TypeScript 5.9, Hono 4.7, Zod 3.25, `@supabase/supabase-js` 2.x, `openai` 7.x, Three.js y React Three Fiber. Node 24.20 y pnpm 11.19 (fijados en `README.md` y en CI).
- **API:** Hono en `cargomesh/src/server/hono/app.ts`, montado en `cargomesh/src/app/api/v2/[[...route]]/route.ts` con base `/api/v2`. Algunas rutas son handlers de Next.js (`api/v2/conversation/*`).
- **Identidad:** `requireAuthenticatedMember()` en `cargomesh/src/server/auth/member.ts` y el middleware `cargomesh/src/server/hono/middleware/v2-auth.ts`. La organización sale del usuario, nunca del navegador. Una organización distinta se rechaza con `FORBIDDEN_TENANT`.
- **Idempotencia:** header `Idempotency-Key` (UUID) y hash SHA-256 del JSON canónico (`hashV2Draft` en `draft-service.ts`). Un payload distinto con la misma clave da `IDEMPOTENCY_CONFLICT` (409).
- **Concurrencia:** versión esperada (`expectedDraftVersion`) y `STALE_DRAFT` (código `PT409`) en las funciones SQL.
- **IA actual:** `cargomesh/src/server/conversation/interpret.ts` llama a Bedrock. No hay interfaz de proveedor: hay una unión `endpoint`, un `invoke()` y un enum `mode: BEDROCK | DETERMINISTIC` en `cargomesh/src/features/v2-conversation-prep/interpretation.ts`.
- **Datos:** la cadena activa de migraciones es `supabase-v2/supabase/migrations/`. Los escenarios sintéticos están en `supabase/scenarios/v2-*` y las pruebas pgTAP en `supabase/tests/`.
- **No existe todavía:** Supabase Storage, trabajos en segundo plano ni modelos de archivos o adjuntos.
- **Pruebas:** `node:test` con tsx. `release:verify` no corre `test:carrier-operations`, `test:carrier-closeout` ni `test:client-operations`: hay que correrlos aparte si tocas esas áreas.

## 7. Contratos nuevos (nombres propuestos)

Cada dueño publica el día 1 un fixture válido y uno inválido de su contrato. Un fixture nunca se muestra en el demo como inferencia real.

| Tabla | Dueño | Consumidores |
| --- | --- | --- |
| `declared_manifest` | Cristhian | Juan (sesión), Luis (explicación) |
| `media_evidence` | Cristhian (declaración), Ramón/Jean (clips y videos anotados) | Axel, Luis, Juan |
| `model_proposal` | Axel | Cristhian |
| `loading_session` | Juan | Ramón/Jean |
| `analysis_job` | Ramón/Jean | Juan |
| `loading_observation` | Ramón/Jean | Juan, Luis |
| `reconciliation` y `human_review` | Juan | Luis (explicación), Cristhian (Passport del cliente) |

Estados:

- **Sesión:** DRAFT → OPEN → CLOSED → REVIEW_REQUIRED o REVIEWED.
- **Job:** QUEUED → RUNNING → SUCCEEDED, FAILED o CANCELLED. Un job exitoso puede traer una observación insuficiente.
- **Conciliación:** NOT_READY, MATCH, DIFFERENCE_PROPOSED, INSUFFICIENT_EVIDENCE, INCOMPATIBLE_SCOPE u OUTDATED.
- **Revisión:** PENDING, ACCEPTED o DISMISSED.

Errores nuevos: `NOT_CONFIGURED`, `PROVIDER_UNAVAILABLE`, `MODEL_OUTPUT_INVALID`, `MEDIA_INVALID`, `INPUT_REVISION_MISMATCH`, `SESSION_SCOPE_INCOMPLETE`, `INCOMPATIBLE_UNIT` y `OBSERVATION_INSUFFICIENT`. No renombres los códigos existentes.

Archivos en Storage: `org/<organizationId>/<requestId o sessionId>/<evidenceId>.<ext>`, bucket privado `meta-evidence`. Nunca guardes una URL firmada como referencia: guarda el `evidenceId` y emite una URL temporal al leer.

Unidades: PALLET y BOX nunca se suman entre sí. Un pallet con 12 cajas es 1 PALLET, no 12.

## 8. Meta Model API: lo que hay que saber

- Base `https://api.meta.ai/v1`, header `Authorization: Bearer <clave LLM_…>`. Compatible con el SDK `openai` cambiando `baseURL`. Responses API es la recomendada; Chat Completions también funciona.
- **Salida estructurada:** `response_format: { type: "json_schema", … }` en Chat Completions, o `text.format` en Responses. Profundidad máxima 10 y sin `$ref` recursivos. Igual valida con Zod.
- **Razonamiento:** niveles `minimal`, `low`, `medium`, `high`, `xhigh`, `max`; `none` da error 400. Los tokens de razonamiento se cobran como salida, así que deja margen en el máximo de salida.
- **Herramientas:** `tool_choice` solo acepta `"auto"`.
- **Imágenes:** JPEG, PNG, WebP o GIF por URL https, data URL base64 o `file_id`. No acepta HEIC.
- **Audio:** usamos `POST /v1/asr/transcribe` (multipart con una parte `request` en JSON y una parte `audio`). Solo WAV mono PCM de 16 bits a 16 o 24 kHz, hasta 32 MB y 10 minutos. Pasa el idioma español como sesgo.
- **SAM 3.1:** Responses API con `model: "sam-3.1"`, un `input_text` con un solo concepto ("pallet" o "cardboard box") y un `input_video` (URL o `file_id`). MP4 o MOV en H.264/H.265; no acepta WebM ni VP9. Hasta 15 000 cuadros y 16 objetos por cuadro. La respuesta es texto con tokens especiales, una línea por cuadro: usa `meta-sam-parser` (pip) o `@meta-sam/parser` (npm). Los IDs son estables dentro de una respuesta, pero pueden cambiar si un objeto entra, sale o queda tapado del todo.
- **Archivos:** lo que subes a la Files API no vence solo. Usa `expires_after` o bórralo.
- **No usar** las variantes "contributor" (usan los datos para entrenar) ni Muse Image.
- Documentación: https://dev.meta.ai/docs/overview

## 9. Variables de entorno del proyecto Meta

Los nombres nuevos son propuestas; los existentes salen de `cargomesh/.env.example`.

| Variable | Dónde |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clave publicable) | Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` (clave secreta) | Vercel |
| `CARGOMESH_AI_PROVIDER` = `META` (también `BEDROCK` o `DETERMINISTIC`) | Vercel |
| `META_MODEL_API_KEY`, `META_MODEL_BASE_URL` | Vercel y Modal |
| `META_MUSE_MODEL`, `META_TRANSCRIBE_MODEL`, `META_SAM_MODEL` | Vercel y Modal |
| `DOCKMIND_WORKER_URL`, `MODAL_PROXY_TOKEN_ID`, `MODAL_PROXY_TOKEN_SECRET` | Vercel |
| `BASETEN_API_KEY`, `BASETEN_MODEL` (opcional) | Vercel |

Ninguna clave secreta lleva el prefijo `NEXT_PUBLIC_`. En local, cada uno usa su propio `.env.local`, que nunca se commitea.

## 10. Lista para empezar y terminada

Una historia está **lista para empezar** cuando tiene un dueño y un revisor, entrada y salida con un ejemplo y sus unidades, el fixture de lo que consume, casos negativos y una aceptación observable.

Una historia está **terminada** cuando:

- Está en `meta-main` y desplegada en `cargomesh-meta.vercel.app`.
- Sus pruebas se ejecutaron y el resultado real está en el PR. "No ejecutado" no cuenta como aprobado.
- Muestra estados de carga, vacío, error y reintento.
- No expone secretos, URLs privadas permanentes ni datos de otra organización.
- Está anotada en `BUILT_DURING_HACKATHON.md`.

## 11. Prohibido

- Tocar `main`, `cargomesh.vercel.app`, el Supabase de Amazon o el gateway Nova.
- Escribir a mano un conteo, un resultado de IA o una evidencia, o presentar un fixture como si fuera real.
- Inventar peso, medidas, precios, capacidad o estados que nadie confirmó.
- Usar clips, fotos o música de internet.
- Subir claves, `.env.local` o URLs firmadas al repo.
- Enviar a la Meta API videos con caras en primer plano: seguimos la carga, no a las personas.
