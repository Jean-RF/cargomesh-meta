> Guía activa para Axel. Leer primero [contexto común](00-contexto-comun.md), [estructura](../../../ESQUEMA_PROYECTO.md) y [AGENTS](../../../AGENTS.md). Las historias y APIs descritas siguen pendientes salvo evidencia de implementación. Los prompts recibidos se preservan en `docs/meta/reference/prompts-recibidos/`.

# Axel — núcleo del proveedor e interpretación

## Rama y PR de este frente

- **Responsable:** Axel.
- **Rama fija:** `codex/meta-axel`; base de arranque `origin/main` en `6f70f50`.
- **PR:** borrador a `main` del repositorio de trabajo `Chujutak2024/meta-hackathon`, titulado «Cliente Meta e interpretación de la declaración».
- **Alcance:** AX-00, AX-01, AX-02, AX-04.
- **Vínculos:** Cliente/errores y propuestas validadas -> Cristhian. Acordar schemas con Cristhian y Juan; empezar con fixtures, no copiar implementación de otras ramas.
- Mantener este PR abierto mientras se construye el frente; varios commits y una historia activa a la vez. Un PR mergeado queda cerrado y no integra automáticamente commits posteriores.
- Este commit prepara instrucciones: no implementa funciones ni acredita pruebas, credenciales o despliegues.

Los acuerdos comunes y el manifiesto de ramas se preparan en la rama de Cristhian. Leer [el manifiesto](https://github.com/Chujutak2024/meta-hackathon/blob/codex/meta-cristhian/docs/meta/PR_INTEGRANTES.md) y [el acuerdo de entrega/reintegración](https://github.com/Chujutak2024/meta-hackathon/blob/codex/meta-cristhian/docs/meta/ENTREGA_Y_REINTEGRACION.md). Antes de integrar funcionalidad, sincronizar las decisiones aceptadas desde `main`.

Este frente corresponde a la entrega Indie de Cristhian, Axel, Juan y Ramón/Jean. Mantener separada la aportación de Luis al producto general; conservar procedencia y autoría reales.


El paquete de IA se divide en dos frentes que trabajan en paralelo. **Axel** es dueño del **núcleo del proveedor**: el cliente de la Meta API, el modo META dentro de la interpretación existente, la propuesta a partir de texto, foto y etiqueta, y el manejo de errores y límites de todas las llamadas. **Luis** se encarga de la infraestructura, la voz y la explicación (ver `luis.md`).

## Cómo usar este archivo con tu agente

1. Tu agente debe leer `00-contexto-comun.md` y este archivo (ya están en `docs/meta/prompts/`).
2. Usa el prompt de abajo cambiando `<ID>`; conserva la rama fija del frente y añade los commits al mismo PR abierto.
3. Revisa el plan de 5 líneas que te devuelva antes de dejarlo implementar.

## Prompt para tu agente

```text
Eres el agente de código de Axel (núcleo del proveedor e interpretación) en CargoMesh, para el hackathon de Meta, track Indie. Repo: Chujutak2024/meta-hackathon.

Historia: <ID>. Rama fija: codex/meta-axel, basada en origin/main de meta-hackathon. Usa el mismo PR del frente; no abras otra rama por historia. El PR va a main de meta-hackathon. No hagas push directo a main ni modifiques el repositorio Amazon.

Antes de escribir código:
1. Lee AGENTS.md, docs/meta/prompts/00-contexto-comun.md y docs/meta/prompts/axel.md (sección de la historia <ID>).
2. Revisa la documentación de la Meta Model API que aplique (https://dev.meta.ai/docs/overview, structured-output, reasoning, image-understanding). Si algo del código no coincide con la doc, gana la doc y me avisas.
3. Resúmeme en 5 líneas qué vas a cambiar, la entrada y la salida con un ejemplo, los casos negativos y los archivos que vas a tocar. Espera mi OK.

Mientras implementas:
- Trabaja solo en <ID>. Si necesitas algo de otra historia, usa el fixture del contrato y avísame.
- Eres dueño de src/server/ai/meta/client.ts, schemas.ts, interpret-declaration.ts y errors.ts, y de los cambios a interpret.ts, interpretation.ts y conversation-chat.tsx. No edites transcribe.ts ni explain-reconciliation.ts: son de Luis.
- Usa el SDK openai que ya está en el repo, con baseURL de Meta. El modelo sale de META_MUSE_MODEL.
- No rompas los modos BEDROCK ni DETERMINISTIC: agrega META como una opción más.
- Toda salida del modelo pasa por JSON Schema en la llamada y por validación Zod en el servidor. Si falla, un reintento y después MODEL_OUTPUT_INVALID. Nada se guarda sin confirmación humana.
- El modelo propone; nunca reserva, crea incidencias, calcula diferencias ni cambia estados.
- No uses variantes "contributor" ni Muse Image.
- Claves solo en servidor; nada de NEXT_PUBLIC_ para secretos. En logs: modelo, latencia, tokens e ID de request; nunca claves, audio ni datos personales.

Al terminar:
- Corre las pruebas unitarias de la historia y test:v2-conversation; pega el resultado real. Las llamadas reales a Meta van aparte y se anotan con modelo, latencia y costo.
- Entrégame el resumen del diff, los comandos con su resultado, los límites y lo que queda pendiente.
- Propón la línea para BUILT_DURING_HACKATHON.md.
- No hagas push, merge ni deploy sin que te lo pida.
```

## Tu frente

- **Produces:** el cliente compartido de la Meta API, `model_proposal` (campos propuestos con su fuente) y el módulo de errores que usan todas las llamadas.
- **Consumes:** evidencias de Cristhian (fotos y etiquetas) y la transcripción de Luis.
- **Te consumen:** Cristhian (aplica tus propuestas) y Luis (usa tu cliente y tus errores).
- **Revisas a:** Luis. **Te revisa:** Cristhian.
- **Coordinación con Luis:** publica `client.ts` y `errors.ts` en la primera noche (I1), aunque sea mínimos, para que Luis no tenga que crear su propio cliente.

## Plan día por día

| Día | Qué entregas |
| --- | --- |
| 27 oct (P0) | AX-00: contrato de `model_proposal` y de errores, con fixtures de éxito, faltantes, rechazo y proveedor caído |
| 28 oct (I1) | AX-01: cliente Meta, modo META e interpretación real de texto con `muse-spark-1.3` |
| 29–30 oct (I2) | AX-02: foto, etiqueta y transcripción → propuesta, sin pisar ediciones |
| 31 oct–1 nov (I3) | Integración con Cristhian (CR-02 y CR-03): que las propuestas reales lleguen bien al borrador. Si sobra tiempo, empezar AX-04 |
| 2–3 nov (I4) | AX-04: fallos, límites, trazabilidad y modo manual en todas las llamadas |

## Notas técnicas

### Dónde enchufar META

- **`interpret.ts`:** la unión `endpoint` (línea 8), la configuración en `conversationBedrockConfig()` (línea 37), el `switch` de `invoke()` (línea 102) y la telemetría (línea 172).
- **`src/features/v2-conversation-prep/interpretation.ts:48`:** el enum `mode`.
- **`src/features/v2-intake/conversation-chat.tsx`:** los textos de interfaz que dicen "Amazon Bedrock".
- **Llamadores:** `app/api/v2/conversation/interpret/route.ts`, `preview/route.ts` y `scripts/certify-bedrock.ts`.

Lo nuevo va en `src/server/ai/meta/`. Tuyos son `client.ts`, `schemas.ts` (Zod más JSON Schema), `interpret-declaration.ts` y `errors.ts`.

### Cliente

```ts
import OpenAI from "openai";

export const metaClient = new OpenAI({
  apiKey: process.env.META_MODEL_API_KEY,
  baseURL: process.env.META_MODEL_BASE_URL ?? "https://api.meta.ai/v1",
  timeout: 45_000,
  maxRetries: 1,
});
```

- **Salida estructurada:** con Chat Completions va en `response_format` de tipo `json_schema`. Verifica la forma exacta en https://dev.meta.ai/docs/structured-output. Profundidad máxima 10 y sin `$ref` recursivos.
- **Imágenes:** URL firmada corta de Storage o data URL base64. Solo JPEG, PNG, WebP o GIF.
- **Razonamiento:** `low` para extraer campos; el nombre del parámetro cambia según el endpoint (ver docs/reasoning). `none` da error 400. Deja margen en el máximo de salida, porque el razonamiento lo consume.
- **Herramientas:** `tool_choice` solo acepta `"auto"`. Para este flujo no hacen falta.
- **Duración:** en las rutas de Next.js que llaman a Muse, `export const maxDuration = 60`.

### Propuesta de la declaración

- Cada campo propuesto lleva su valor, la fuente (`photo`, `label`, `audio` o `text`), la referencia a la evidencia y el `inputRevision`.
- La transcripción que entrega Luis entra como fuente `audio`. El audio nunca se manda a Muse directamente.
- La propuesta incluye una lista de faltantes y advertencias, como "foto sin escala: no se pueden verificar medidas".
- La IA puede proponer la cantidad visible; peso y medidas, solo si vienen escritos en la etiqueta o los dice el audio.

### Errores (AX-04)

| Situación | Código |
| --- | --- |
| Falta la clave o el modelo | `NOT_CONFIGURED`, sin llamar al proveedor |
| 429 | Un reintento respetando `Retry-After`, después aviso |
| 5xx o timeout | `PROVIDER_UNAVAILABLE`, y el formulario manual sigue disponible |
| JSON inválido | Un reintento, después `MODEL_OUTPUT_INVALID` |

Este módulo lo usan también la transcripción y la explicación de Luis, así que su contrato se fija en AX-00.

### Respaldo con Baseten (AX-06, opcional)

Usa el mismo cliente con `baseURL` `https://inference.baseten.co/v1`. Confirma el slug con `GET /v1/models`: el documentado es `meta-models/muse-spark-open`. Ahí el modelo no garantiza el JSON Schema, así que la validación con Zod y el reintento son obligatorios.

## Tus historias

Compromiso MUST: 4 historias, 6,5 horas.

### AX-00 · Cerrar contrato del proveedor y límites

Sprint P0 · MUST · 0,5 h · Depende de: nada · La usan: AX-01, AX-10

- **Objetivo:** Acordar una interfaz de IA consumible por los otros módulos y una prueba de acceso sin filtrar secretos.
- **Lógica:** Separar entrada validada, llamada de proveedor y propuesta. La salida no ejecuta comandos de negocio; las variantes de modelo se configuran explícitamente.
- **Backend:** Definir DTO de interpretación, error estable y metadatos de proveedor; decidir timeout y máximos iniciales como parámetros, no cifras comerciales.
- **Frontend:** Entregar al equipo ejemplos de éxito, dato faltante, rechazo y proveedor caído; Cristhian puede usarlos como fixtures rotulados.

Pruebas unitarias:

- AX-00-UT-01: Campo fuera del esquema -> rechazo.
- AX-00-UT-02: Configuración sin clave -> NOT_CONFIGURED sin invocar.
- AX-00-UT-03: Texto/modelo en logs -> sin claves, audio ni datos privados.

Aceptación:

- Contrato y ejemplos revisados por Cristhian y Juan.
- Modelos configurados por variable: muse-spark-1.3, muse-voice-transcribe-1.0 y sam-3.1; Baseten queda solo como respaldo.

Archivos de partida:

- `cargomesh/src/server/conversation/interpret.ts`
- `cargomesh/src/features/v2-conversation-prep/interpretation.ts`

Evidencia para el PR: Contrato versionado y captura de configuración redactada; no se requiere exponer una clave.

### AX-01 · Obtener interpretación real con la Meta Model API

Sprint I1 · MUST · 2 h · Depende de: AX-00 · La usan: AX-02, AX-03

- **Objetivo:** Probar que la cuenta llama a muse-spark-1.3 y devuelve una propuesta estructurada válida.
- **Lógica:** El texto produce hechos propuestos y faltantes. Una instrucción del usuario no puede cambiar reglas de autorización ni completar un booking.
- **Backend:** Adaptador servidor con el SDK openai apuntando a https://api.meta.ai/v1; modelo por variable (META_MUSE_MODEL); response_format json_schema; razonamiento low; timeout y errores tipados; registrar request ID y uso cuando el proveedor lo entregue. Agregar META al enum mode y a CARGOMESH_AI_PROVIDER sin romper BEDROCK ni DETERMINISTIC.
- **Frontend:** Exponer a Cristhian estado de análisis, indisponibilidad y mensaje útil. No añadir un panel de credenciales a la interfaz.

Pruebas unitarias:

- AX-01-UT-01: JSON inválido -> MODEL_OUTPUT_INVALID y sin escritura.
- AX-01-UT-02: Campo no soportado -> rechazado.
- AX-01-UT-03: Timeout -> estado recuperable.
- AX-01-UT-04: Petición de booking dentro del texto -> sin ejecución comercial.

Aceptación:

- Llamada real con caso propio, modelo/respuesta identificados y secretos ocultos.
- Formulario manual sigue disponible si falla IA.

Archivos de partida:

- `cargomesh/src/server/conversation/interpret.ts`
- `cargomesh/src/app/api/v2/conversation/interpret/route.ts`
- `cargomesh/src/features/v2-intake/conversation-chat.tsx`

Evidencia para el PR: Resultado de una llamada autorizada, modelo devuelto, duración y límites; no basta un HTTP 200 sin esquema válido.

### AX-02 · Interpretar foto, etiqueta y transcripción sin sobrescribir hechos

Sprint I2 · MUST · 2 h · Depende de: AX-01, CR-00, AX-10 · La usan: CR-02, AX-04, CR-05

- **Objetivo:** Proponer campos de carga a partir de medios revisables y conservar cambios recientes del usuario.
- **Lógica:** Extraer texto legible/embalaje/cantidad visible; diferenciar contenido de pallet y contenedor. La corrección explícita tiene prioridad y los medios no dictan autorizaciones.
- **Backend:** Ampliar adaptador multimodal con entradas acotadas y validación; devolver evidenceId, inputRevision y campos propuestos. Alinear error de audio incompatible con Cristhian. El texto que transcribe AX-10 entra como fuente audio, junto con la imagen.
- **Frontend:** Entregar estados por medio y respuestas cortas en el idioma del usuario. Una salida larga de razonamiento no se expone como prueba del hecho.

Pruebas unitarias:

- AX-02-UT-01: Foto sin escala -> peso/dimensiones no verificados.
- AX-02-UT-02: Audio cambia doce por diez -> propuesta de corrección.
- AX-02-UT-03: Respuesta de revisión antigua -> identificable y descartable.
- AX-02-UT-04: Etiqueta ilegible -> campo pendiente.

Aceptación:

- Foto/audio propio genera propuesta revisable; ningún campo se guarda automáticamente.
- El modelo real y sus modalidades quedan registrados.

Archivos de partida:

- `cargomesh/src/server/conversation/interpret.ts`
- `cargomesh/src/features/v2-conversation-prep/interpretation.ts`

Evidencia para el PR: Inputs permitidos y salidas redactadas del mismo caso; errores separados por modalidad.

### AX-04 · Cerrar fallbacks, límites y trazabilidad del proveedor

Sprint I4 · MUST · 2 h · Depende de: AX-02, AX-03 · La usan: CR-10, AX-06, AX-08

- **Objetivo:** Conservar un producto utilizable cuando falle el proveedor y dejar evidencia honesta de la integración.
- **Lógica:** Errores de configuración, cuota, timeout y salida inválida se distinguen. No caer a otro proveedor sin informar/corroborar permiso y modelo.
- **Backend:** Auditoría mínima de modelo/latencia/consumo conocido; redacción de logs; cancelación y límites de coste por trabajo cuando el proveedor lo permita.
- **Frontend:** Mensajes recuperables y modo manual. La explicación puede omitirse manteniendo datos determinísticos.

Pruebas unitarias:

- AX-04-UT-01: 429 -> reintento acotado/aviso.
- AX-04-UT-02: Cancelación -> sin actualizaciones tardías.
- AX-04-UT-03: Consumo ausente -> desconocido, no cero.
- AX-04-UT-04: Error con secretos -> salida/log redactados.

Aceptación:

- La demo funciona con el proveedor disponible y explica claramente el fallo.
- Acceso/versión/costo conocido registrados sin afirmar benchmark.

Archivos de partida:

- `cargomesh/src/server/conversation/interpret.test.ts`

Evidencia para el PR: Ficha de integración y test de fallos con dobles; una inferencia real de aceptación separada.

### Ampliaciones (solo si sobra capacidad)

No se empiezan sin acuerdo en la daily. El detalle está en `docs/meta/backlog/BACKLOG_SCRUM.csv`.

| ID | Prioridad | Horas | Historia |
| --- | --- | --- | --- |
| AX-06 | COULD | 2 | Respaldo explícito con Baseten (Muse Spark Open) |
| AX-08 | COULD | 2 | Comparar latencia y coste con benchmark reproducible |
