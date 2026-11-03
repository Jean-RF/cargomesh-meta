# Contratos de Luis v1 — propuesta para revisión

**Actualización 1-nov-2026:** la proyección de explicación ya consume los puertos autorizados de Juan, con endpoint y Passport visibles y persistentes en Meta local. El contrato HTTP añadido vive en `cargomesh/src/shared/schemas/meta/passport-explanation.ts`; [aceptación y fronteras](../LUIS_PASSPORT_ACCEPTANCE_2026_11_01.md). Las menciones a consumidores aún no conectados en el corte siguiente son históricas; no se presume aprobación humana del contrato ni despliegue remoto.

Sección 1 del producto general, AX-09 con preparación de AX-10/AX-03. Rama `codex/meta-luis`, PR #7. **No es un acuerdo ya aprobado por los consumidores, una API registrada ni una inferencia real.** No promueve este trabajo a la candidata Indie.

Fuentes ejecutables: `cargomesh/src/shared/schemas/meta/transcription.ts` y `reconciliation-explanation.ts`. Los fixtures `fixtures/luis-v1.json` son sintéticos y están rotulados. Los schemas estructurales generan JSON Schema estricto mediante el helper ya instalado; las comprobaciones cruzadas se ejecutan con Zod después. No duplican `ModelProposal` ni el comparador de Juan.

## Transcripción -> Cristhian/Axel

Entrada: `schemaVersion: "1.0"`, `evidenceId`, `inputRevision` entero no negativo e idioma `es|en`. No recibe organización, storage key, URL privada ni audio base64. El servicio de Cristhian debe resolver autorización y revisión desde el actor y las relaciones; parsear este JSON no concede acceso.

Salida: misma evidencia/revisión, estado `TRANSCRIBED|EMPTY`, texto de hasta 6000 caracteres, duración y `requiresHumanConfirmation: true`. El texto vacío se identifica como EMPTY, no se inventa contenido. Una revisión o evidencia distinta se rechaza. `transcriptionEvidence()` produce exactamente `{ evidenceId, kind: "audio", text }`. Se comprobó su aceptación por el `DeclarationInputSchema` real de `origin/codex/meta-axel@74bfe46`, evaluado en memoria contra el fixture propio, sin copiar archivos ni fusionar ramas. La integración del servicio y autorización reales sigue pendiente. No se guarda ni confirma el manifiesto.

El límite de diez minutos es un techo del contrato; no certifica el contenido del WAV. Validar cabecera/bytes, formato, tamaño y presupuesto de ejecución pertenece a AX-10. El metadata de proveedor/coste se añadirá desde el adaptador compartido aceptado; no crear un segundo catálogo de errores. Usar los códigos existentes que Axel exporta en `model-proposal.ts`, no asumir que un archivo `errors.ts` ya existe.

El JSON Schema de transcripción describe **nuestro envelope**, no un `response_format` que se envíe al ASR. La API de voz devuelve su JSON documentado y AX-10 lo valida antes de formar este resultado. Desde la sección 3, `ExplanationPlanShapeSchema` es el formato estructurado del modelo de texto; `ExplanationShapeSchema` es el envelope que redacta el servidor para el consumidor.

## Hechos de Juan -> explicación -> Passport

`ExplanationInput` es una proyección de consumo, no otra tabla o implementación de `Reconciliation`. Incluye IDs y revisiones, estado suministrado, cantidades/unidades suministradas, cierre/suficiencia y eventos autorizados con evidencia y milisegundo. No calcula ninguna resta. PALLET/BOX se mantienen separados y null significa desconocido, no cero. MATCH/DIFFERENCE_PROPOSED requieren alcance cerrado, suficiente y compatible; el resto no expone una diferencia final. Esta política de proyección requiere revisión de Juan antes de conectarse a su read model.

La salida no acepta conteos nuevos ni comandos. Conserva ID/versión/estado, resumen, motivos (`reasons`, añadido al borrador v1 aún sin consumidores), limitaciones, acciones de una lista cerrada, referencias exactas a eventos y revisión humana obligatoria. Rechaza eventos ajenos, timecodes alterados, duplicados y respuestas de otra revisión. La capa de acceso debe suministrar únicamente hechos autorizados y comprobar la vigencia al consumir una respuesta: el schema no implementa RLS ni evita por sí solo una carrera de ediciones.

La validación estructural **no demuestra que el texto libre sea veraz**. La sección 3 implementa un plan de motivos/acciones acotados y redacción del servidor; el texto libre del modelo no se expone. La incertidumbre y las sesiones abiertas reciben guía de dominio sin llamada al modelo. Detalle, puertos y pruebas: [AX03_EXPLANATION.md](../AX03_EXPLANATION.md). Si falla el modelo, los números y la revisión humana siguen perteneciendo a Juan. No hay todavía una explicación visible ni un endpoint conectado.

## Puntos que requieren revisión, sin duplicar módulos

- Axel: tras la sincronización autorizada de main, `requestMetaJson` acepta `reasoningEffort?: low|medium`, conserva `low` por defecto y se reutiliza desde la explicación con `medium`. La auditoría añade `requestMetaTranscription` y `readMetaSpeechConfig` en ese mismo cliente/configuración, con validación del JSON ASR; no crea otro SDK ni modifica la rama de Axel. Revisar las extensiones locales con Axel. El humo de texto sigue delegado y el de voz requiere opt-in y WAV propio.
- Cristhian: autorización/vida de `evidenceId`, revisión y upload directo a Storage; nunca un upload grande vía la función Vercel ni URL arbitraria recibida del usuario.
- Juan: proyección de estados/versiones, signo/unidad de la diferencia, acciones permitidas y referencias a eventos. No se sustituye su contrato por este borrador sin acuerdo.
- Ramón/Jean: los timecodes autorizados los produce la observación; no son coordenadas inventadas por el modelo.

No se enviaron mensajes de coordinación ni se presume aceptación por publicar estos archivos.
