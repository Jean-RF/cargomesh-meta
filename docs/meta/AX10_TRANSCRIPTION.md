# AX-10 — Luis, núcleo de transcripción

28-oct-2026. Producto general, fuera de Indie. Cambios locales en `codex/meta-luis`; no publicados ni desplegados.

## Estado real

Implementados el inspector de WAV, el servicio `transcribeEvidence()` y su proveedor predeterminado `metaSpeechProvider()`, compuesto con el SDK/configuración compartidos. Valida evidencia/actor, hash, revisión, cancelación y timeout. Las pruebas usan audio sintético y HTTP inyectado: **no demuestran transcripción real**. No se registró un endpoint HTTP ni se construyó una segunda interfaz, cliente SDK o almacenamiento paralelo. Auditoría actual: [LUIS_AUDIT_2026_10_28.md](LUIS_AUDIT_2026_10_28.md).

Al preparar esta sección faltaba sincronizar el cliente de Axel. El usuario autorizó incorporar main mediante el merge local `c085d07`, conservando las tres secciones. En la auditoría posterior se cerró la brecha ASR: `requestMetaTranscription()` reutiliza la única fábrica OpenAI de `client.ts` y `readMetaSpeechConfig()` amplía su configuración. La voz no exige configurar el modelo Muse de texto. La salida sigue aceptándose por `DeclarationInputSchema` de Axel; no se modifica su política de interpretación multimodal ni se presume que la interfaz ya la consuma.

No hay claves Meta ni Supabase Meta en este corte. AX-10 no se declara cerrada: siguen pendientes el acceso real a medios de Cristhian, la integración de interfaz y la aceptación con audio propio/modelo real. La composición del cliente ASR sí está implementada y verificada con HTTP inyectado.

## Entrada y salida

`transcribeEvidence(input, member, { evidence, provider? }, options)` recibe el contrato de la sección 1. `member` es contexto autenticado de servidor; no sale del JSON del navegador. El proveedor no recibe IDs tenant, identidad, correo ni rutas de Storage: solo el audio, idioma y señal. Una revisión desfasada se rechaza; organización o URL añadidas al JSON no conceden acceso.

`AudioEvidenceAccess` es una proyección de lectura que debe implementar el dueño de medios, no otra tabla/repositorio de Luis. Debe autorizar la relación actor/organización/evidencia/revisión, entregar bytes y hash persistido, e indicar `CURRENT|DENIED|STALE` al comprobar vigencia. El hash detecta cambios de contenido; no prueba autenticidad física ni sustituye RLS.

El servicio verifica los bytes y el hash de una copia del audio, comprueba vigencia antes y después del proveedor, y devuelve una transcripción revisable con la misma evidencia/revisión. Nunca guarda datos, interpreta carga, cambia el formulario ni crea reservas o incidentes. Una respuesta antigua o revocada se descarta, incluso si el proveedor ya la procesó.

Salida sin texto: `EMPTY` con cadena vacía y revisión humana. No se convierte en carga cero ni se inventa una descripción. Texto de más de 6000 caracteres o duración incoherente se rechazan, sin truncar silenciosamente. Metadatos de coste desconocido permanecen null.

## Límites y protección

- Solo RIFF/WAVE PCM entero, mono, 16 bits, 16/24 kHz. Se comprueban cabecera, tamaños/chunks, alineación y duración real de muestras. No basta el MIME/extensión enviados por el navegador.
- Máximo de aplicación: 30 000 000 bytes por archivo y diez minutos, dejando margen para el límite multipart del proveedor. Se limita también el número de chunks de cabecera.
- Upload directo al Storage privado por el módulo de Cristhian; la futura ruta recibe un `evidenceId`, no un audio grande o URL arbitraria.
- Una sola invocación por intento, sin reintento automático ni cambio a otro proveedor. Deadline global de hasta 45 s, reducible al presupuesto restante de la ruta; acota también dependencias que ignoren la señal.
- Cancelar no devuelve un resultado tardío. Después de invocar, un fallo conserva `processingMayHaveOccurred: true`; timeout no significa que el proveedor no procesó/cobró el audio.
- No se imprimen audio, transcript, claves, excepciones crudas ni motivos privados de cancelación. Las salidas de error usan los códigos existentes como proyección de consumo, no otro catálogo de proveedor.

## Composición con el cliente compartido y humo opt-in

ASR reutiliza el mismo SDK, origen, clave, timeout, `maxRetries: 0` y logging desactivado. Envía multipart con campo `request` JSON sin filename y archivo `audio`, modo `PUSH_TO_TALK`, `audioEncoding: WAV` y `languageBias: ["Spanish"]` para `es` (`English` para `en`). El idioma es un sesgo, no una garantía de traducción. Lee hasta 64 KiB de JSON y valida `sessionId`, `transcript`, `audioDurationMs` y `turns: []`. No manda `response_format` al ASR. Un transcript vacío es EMPTY; un campo obligatorio ausente es una respuesta inválida.

El humo `pnpm smoke:meta --live-voice <WAV propio>` exige configuración segura y opt-in manual. Lee un archivo con tamaño acotado y ejercita el núcleo con una proyección local de evidencia, marcada `OPERATOR_LOCAL_FILE_NOT_TENANT_INTEGRATION`; no acredita RLS ni crea datos. Devuelve metadatos y longitud, nunca el transcript/filename/audio. PASS_VOICE_TRANSPORT no certifica exactitud (`accuracyVerified: false`). No se ejecutó con credenciales ni grabación real.

Referencias: [speech-to-text Meta](https://dev.meta.ai/docs/speech-to-text), [petición ASR](https://dev.meta.ai/docs/api-reference/voice/transcribe), [schemas de voz](https://dev.meta.ai/docs/api-reference/voice/schemas). Ver también la revisión de Vercel en `infra/meta/vercel.md`.

## Verificación

`pnpm test:meta-voice`: 30 casos locales. Cubren formato, tamaño/duración, chunks/padding, hash, tenant/evidencia/revisión, acceso revocado, silencio, salida inválida, configuración, cancelación, timeout, respuesta tardía y el contrato HTTP/multipart del SDK. `INJECTED` se conserva en metadata; no se presenta como inferencia real.

Resultados actuales: voz 30/30, base/humo 32/32, typecheck, arquitectura, release, conversación, chat y build aprobados. El canario privado ficticio no aparece en los 230 archivos del navegador. Las pruebas de humo usan proveedor o HTTP inyectado; el humo real quedó sin ejecutar por falta de credenciales. El cierre integral requiere la aceptación real y las conexiones pendientes indicadas arriba.
