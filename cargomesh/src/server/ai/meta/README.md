# IA Meta — Axel y Luis

AX-00/AX-01 incorporan texto/chat; AX-02 añade interpretación de fotos, etiquetas y transcripciones resueltas. Véanse docs/meta/AX01_META_TEXT.md, docs/meta/AX02_MULTIMODAL.md y docs/meta/contracts/MODEL_PROPOSAL.md desde la raíz.

| Dueño | Archivos / alcance | Estado |
| --- | --- | --- |
| Axel | client.ts, config.ts, schemas.ts, proposal-validation.ts, proposal-boundary.ts, interpret-declaration.ts, interpret-media-declaration.ts, media-input.ts, conversation.ts | Implementados; pruebas con HTTP inyectado y aceptación real texto/medios sobre datos sintéticos en su rama; revisión humana/UI pendiente |
| Luis | transcribe.ts, explain-reconciliation.ts, wave.ts, environment-readiness.ts y humo de texto/voz/explicación | Implementados; aceptación real del 30-oct sobre datos sintéticos en docs/meta/LUIS_LIVE_ACCEPTANCE_2026-10-30.md; medios/Passport y despliegue pendientes |

Los adapters devuelven propuestas sin guardar, reservar, seleccionar ni crear incidencias. El frontend conserva el borrador y descarta respuestas antiguas. El cliente usa configuración exclusiva de servidor, JSON Schema/Zod, cancelación y reintentos acotados. Logs SDK deshabilitados; claves, prompts y respuestas no van a diagnóstico.

AX-01 sigue siendo texto: una referencia a un archivo no implica haberlo inspeccionado y no conecta por sí sola la nueva transcripción con el chat. Luis amplía este mismo cliente/configuración con ASR y razonamiento medium para explicación, conservando low por defecto para interpretación. Auditoría, contratos y límites: `docs/meta/LUIS_AUDIT_2026_10_28.md` desde la raíz. Baseten no es un failover silencioso. Las pruebas de HTTP inyectado no acreditan inferencia real ni despliegue.

AX-02 recibe bytes de imágenes PNG/JPEG previamente autorizadas por el servicio de medios; no descarga URLs ni expone upload/endpoint. Recibe audio como transcripción resuelta por Luis. La aceptación real de Axel está en `docs/meta/AX02_MULTIMODAL.md` y la de esta copia en `docs/meta/LUIS_LIVE_ACCEPTANCE_2026-10-30.md`; ninguna implica despliegue ni integración de todo el flujo.
