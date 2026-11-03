# Auditoría de las tres secciones de Luis — 28-oct-2026

Repo Meta, rama `codex/meta-luis`, sobre la sincronización autorizada `c085d07`. Revisión solicitada por el usuario; correcciones locales, sin push ni nuevas mutaciones remotas. Autor del incremento: Luis, asistido por Codex; producto general, fuera de Indie.

**Conclusión:** había preparación y núcleos probados, pero no tres historias cerradas de punta a punta. Se corrigió una brecha implementable de AX-10 y defectos de plazo/cancelación. Las pruebas inyectadas no sustituyen aceptación real, autorización/RLS de medios, Passport ni despliegue. No se anuncian estos pendientes como completados.

## Sección 1 — AX-09, entorno y humo

| Requisito | Evidencia actual / límite |
| --- | --- |
| Separar repo/proyecto Meta de Amazon | El CLI comprueba repo, raíz y rama; no hubo comandos de despliegue ni modificaciones al repo Amazon. No se certificó la configuración remota del proyecto Amazon. |
| Secretos solo en servidor | Cliente/configuración con server-only, arquitectura aprobada y canario ficticio ausente en 230 archivos del navegador tras un build nuevo. El canario solo se asignó al proceso hijo de build; no se creó .env.local. |
| Variables faltantes -> NOT_CONFIGURED | Chequeo real sin credenciales y sin llamadas, también al solicitar humo de voz. No se presenta como un fallo funcional ni como un proveedor comprobado. |
| Humo texto/voz/imagen | Texto delegado al adaptador de Axel. Se añadió humo de voz con opt-in; imagen sigue pendiente del adaptador AX-02, no se duplicó ese módulo. Ninguno se ejecutó contra Meta. |
| Proyecto Vercel separado, claves, alertas y dominio/SHA | No provisionados ni verificados. Siguen pendientes acceso, claves, target Supabase Meta y autorización específica del entorno remoto. |

Correcciones: se añadió la distinción `voiceReady`, independiente del modelo/token budget de texto, manteniendo los controles comunes de seguridad. Se alinearon los límites de modelo entre configuración y preflight. Se bloquean claves de servidor copiadas bajo nombres públicos y service-role/`sb_secret_` disfrazados de anon. Un chequeo de nombres/valores no acredita permisos reales.

Uso futuro, solo después de configurar y autorizar la llamada:

```powershell
pnpm smoke:meta --live-text
pnpm smoke:meta --live-voice "C:\ruta\a\una-nota-propia.wav"
```

Sin flags o con `--check` no hay llamadas. El modo voz valida y lee un archivo con tamaño acotado; no imprime audio, transcript ni ruta. Su proyección local de evidencia se rotula `OPERATOR_LOCAL_FILE_NOT_TENANT_INTEGRATION`: no demuestra acceso a Storage ni RLS. PASS_VOICE_TRANSPORT significa transporte y envelope válidos; exactitud y revisión humana quedan sin certificar (`accuracyVerified: false`). Coste desconocido permanece null.

## Sección 2 — AX-10, transcripción

**Brecha encontrada y corregida:** antes solo existía el puerto `SpeechProvider`; no había ASR real compuesto. Ahora `metaSpeechProvider()` usa `requestMetaTranscription()` del mismo `client.ts` y la misma fábrica SDK/configuración de Axel. La interpretación de texto conserva su razonamiento low y sus pruebas.

Se comprobó el contrato de [Meta ASR](https://dev.meta.ai/docs/api-reference/voice/transcribe) y [sus schemas](https://dev.meta.ai/docs/api-reference/voice/schemas): POST `/asr/transcribe`, campo JSON `request` sin filename, archivo `audio` WAV, PUSH_TO_TALK y sesgo `Spanish`/`English`. El SDK conserva autenticación de servidor, origen fijado, logging off y cero reintentos. La respuesta JSON se lee con techo de 64 KiB, se valida y nunca se devuelve cruda.

| Criterio de AX-10 | Resultado local |
| --- | --- |
| Estéreo/44,1 kHz -> MEDIA_INVALID antes de llamar | PASS, bytes reales y cero peticiones HTTP inyectadas. |
| Más de diez minutos -> rechazo | PASS, calculado desde muestras PCM, no desde metadatos del navegador. |
| Texto vacío explícitamente marcado | PASS: EMPTY sin inventar contenido. Un campo obligatorio ausente se rechaza como salida inválida. |
| Clave ausente -> NOT_CONFIGURED sin invocar | PASS, sin leer audio de Storage ni hacer HTTP. |
| Misma evidencia/revisión y revisión humana | PASS contra contratos; la evidencia resultante valida con DeclarationInputSchema de Axel. No significa que su interfaz/interpretación multimodal ya la consuma. |
| Audio propio en español/modelo real | PENDIENTE: no hay clave Meta ni grabación de aceptación autorizada. |

Se preservan autorización por puerto de servidor, copia/hash de bytes y checks de vigencia antes/después. Se corrigieron deadlines no finitos/fraccionarios y una carrera donde una dependencia rechazaba justo al cancelar, para que no quede un rechazo sin manejar. El cuerpo ASR bloqueado se cancela con la señal.

No se implementó un repositorio paralelo de evidencias, un upload grande vía Vercel ni un endpoint que acepte un ID como si fuera autorización. Falta conectar el servicio de medios y la interfaz con sus dueños.

## Sección 3 — AX-03, explicación

El núcleo consume hechos suministrados, no hace restas ni modifica cantidades. El modelo selecciona motivos/acciones/referencias de un plan estricto y el servidor redacta texto verificable; no se expone prosa arbitraria, causas físicas, pérdidas ni comandos del modelo. Usa medium en el SDK compartido y rechaza referencias/timecodes ajenos o una revisión desfasada.

Los cuatro casos pedidos están cubiertos: 12/11 cerrado con diferencia recibida de uno, sesión abierta como progreso, unidad incompatible como revisión y referencia inexistente rechazada. La guía incierta es `DOMAIN_STATUS`, sin llamada a Meta. Un error devuelve ausencia de explicación, sin escrituras ni sustitución de cifras. La conservación visual de la comparación deberá verificarse al conectar Passport: hoy no existe esa integración.

**Defectos corregidos:** el plazo configurado dejaba de limitar la comprobación final de acceso tras volver el proveedor. Ahora permanece activo hasta terminar, probado con reloj simulado. También se corrigió la carrera de cancelación/rechazo. La huella incluye manifiesto, observación, calidad/suficiencia, cierre y eventos; no sustituye la autorización ni acredita el cálculo de Juan.

PR #5 de Juan seguía abierto en `cc45634` al revisar y su contrato/read model/Passport ejecutables no están publicados allí. PR #3 de Cristhian seguía abierto en `fadf20f`; medios aún no aporta un adaptador de acceso autorizado ejecutable para este frente. La proyección de Luis y sus fixtures siguen propuestos, no se atribuyen a los productores. No se mezclaron otras ramas por esta revisión.

## Verificación nueva y reproducible

| Orden | Resultado |
| --- | --- |
| `pnpm test:meta-base` | 32 PASS, configuración/contratos/humos; sin inferencia real. |
| `pnpm test:meta-voice` | 30 PASS, núcleo/WAV/SDK con HTTP inyectado. |
| `pnpm test:meta-explanation` | 29 PASS, núcleo/SDK con HTTP inyectado, plazo y cancelación. |
| `pnpm test:meta-ai` | 37 PASS de Axel; regresión del cliente compartido. |
| `pnpm test:release` | PASS: 574 + 4 pruebas y nueve recetas LOCAL_ONLY; sin activar datos. |
| `pnpm test:v2-conversation` | PASS, ambas etapas del comando. |
| `pnpm test:v2-chat-workflow` | 104 PASS. |
| `pnpm typecheck` | PASS. |
| `pnpm check:architecture` | PASS, 790 módulos y 236 entradas de cliente. |
| `pnpm build` | PASS con canario ficticio del lado servidor; ausente en 230 archivos de navegador. |
| Humo de voz sin credenciales | NOT_CONFIGURED esperado; dependencias presentes, cero llamadas. |

Durante la actualización del humo cambió el estado de voz de PENDING_AX_10 a NOT_RUN; se actualizó esa expectativa y se reejecutó la suite completa. Los avisos npm sobre configuración de pnpm no hicieron fallar release; no se cambiaron dependencias/lockfile para ocultarlos.

La revisión de CI detectó que el workflow solo ejecutaba las pruebas Meta de Axel. Se añadieron las tres suites de Luis al application-gate, sin humo live, secretos ni despliegues. Sus órdenes ya pasan localmente; este cambio aún no se publicó y no se afirma que GitHub CI ya lo ejecutó. No se repitieron pgTAP/migraciones: no hay cambios de base de datos en este incremento.

No se ejecutaron pruebas visuales/de punta a punta ni se desplegó. Faltan credenciales/proyecto y aceptación real; conexión autorizada a medios; contrato/read model de conciliación y presentación del Passport; humo de imagen de AX-02. Estas dependencias no se sustituyen con fixtures ni se consideran aprobadas por tener pruebas locales verdes. Las extensiones del cliente deben revisarse con Axel antes de integrar el PR.
