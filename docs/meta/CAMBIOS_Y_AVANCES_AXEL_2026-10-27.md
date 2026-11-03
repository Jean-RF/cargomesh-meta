# CargoMesh Meta — cambios y avances de Axel

> Corte histórico del 27 de octubre. La aceptación real posterior está en [AX-01, 29 de octubre](AX01_LIVE_ACCEPTANCE_2026-10-29.md) y el incremento de fotos/etiquetas en [AX-02](AX02_MULTIMODAL.md). Las menciones de falta de clave y aceptación pendiente de este corte no describen el estado posterior.

**Fecha del corte:** 27 de octubre de 2026, hora de Perú.
**Responsable:** Axel, con implementación asistida por Codex.
**Repositorio:** [Chujutak2024/meta-hackathon](https://github.com/Chujutak2024/meta-hackathon).
**Rama publicada:** [codex/meta-axel](https://github.com/Chujutak2024/meta-hackathon/tree/codex/meta-axel).
**Último commit publicado y verificado en esta sesión:** [74bfe46](https://github.com/Chujutak2024/meta-hackathon/commit/74bfe467758000de30bc80a70c956d91c02c07c9).
**Destino de integración:** main del repositorio Meta.

## 1. Resumen del avance

Se implementaron el contrato de propuestas de IA **AX-00** y la integración de texto de **AX-01**. El código está publicado en la rama de Axel y tiene pruebas locales aprobadas.

El chatbot incorpora el modo META, un adaptador SDK para Meta Model API, validaciones de las propuestas y protección frente a respuestas antiguas que podrían sobrescribir cambios del formulario. Si la IA no está configurada o falla, se conserva la alternativa por reglas y el formulario manual.

**La conexión con el modelo real sigue pendiente:** Axel confirmó que todavía no dispone de la clave de Meta Model API. Las pruebas del adaptador usan respuestas sintéticas y transporte HTTP inyectado. No constituyen inferencia real ni una demo Meta desplegada.

## 2. Separación del proyecto anterior

CargoMesh se reutilizó como base desde el commit **4482d3a9a51bcc8c7c151996862ac5d43c96db8f**. La aplicación, sus workflows logísticos, SQL, MCP y adapters Amazon existentes son código heredado; no se presentan como desarrollo nuevo de esta hackatón.

El incremento se publica exclusivamente en meta-hackathon. Se preservaron el repositorio y los servicios de la entrega Amazon: no se actualizaron su gateway ECS, IAM, configuración de Vercel ni base alojada.

La rama remota de Axel ya contenía la organización más reciente del equipo. Se conservaron su historial, instrucciones, prompts, backlog, SQL y cambios ajenos; únicamente se incorporó el incremento de IA. La subida fue normal, **sin force-push ni merge a main**.

## 3. AX-00 — contrato de propuestas

Se creó ModelProposal v1.0 como intercambio entre la IA y los módulos de la aplicación.

| Cambio | Resultado |
| --- | --- |
| Validación Zod y JSON Schema | Entrada y salida cerradas; campos extra o comerciales no admitidos se rechazan. |
| Procedencia de cada dato | Las propuestas incluyen fuente, evidencia cuando corresponde y revisión de entrada. |
| Datos incompletos | Se devuelven faltantes y advertencias; lo desconocido no se sustituye por cero. |
| Unidades | PALLET y BOX permanecen separados; no se convierten ni suman automáticamente. |
| Fotos sin escala | El contrato rechaza peso, dimensiones o requisitos de manejo inferidos por apariencia. Esto es validación del contrato, no una integración de imágenes ya operativa. |
| Revisiones y acceso | Se comprueban referencias autorizadas y revisiones; estas comprobaciones no sustituyen la autenticación ni RLS. |
| Confirmación | Toda propuesta requiere revisión humana; no contiene autorización para guardar o contratar. |
| Fixtures | Se incluyen casos sintéticos de éxito, faltantes, rechazo, indisponibilidad y campo comercial inválido. |

El contrato cubre descripción, tipo/cantidad de unidades, peso y dimensiones por unidad y requisitos de manejo. Los totales pertenecen al código de dominio.

**Evidencia:** [contrato](contracts/MODEL_PROPOSAL.md), [JSON Schema](contracts/model-proposal.schema.json) y [validación original AX-00](AX00_VALIDATION.md).

## 4. AX-01 — adaptador Meta y chatbot

### Adaptador de texto

- Se usa el SDK existente con el endpoint de Meta Model API.
- El modelo se configura mediante META_MUSE_MODEL; las pruebas verifican la solicitud con muse-spark-1.3.
- Se envían JSON Schema, razonamiento low, límite de salida y store=false.
- La clave permanece en el servidor. Los registros del SDK se deshabilitan incluso si OPENAI_LOG solicita debug.
- El trabajo del modelo comparte un plazo máximo de 45 segundos y admite como máximo dos intentos de validación en total.
- Los errores de autenticación, rate limit, red o timeout no provocan reintentos internos ilimitados.
- No hay cambio automático a AWS ni Baseten si falla Meta.
- El adaptador independiente de AX-01 es de texto: rechaza medios antes de llamar al proveedor.

### Integración con el sistema actual

- Se agregó META junto a BEDROCK y DETERMINISTIC.
- Se reutiliza la API de conversación con sus controles existentes de sesión, pertenencia y origen.
- Las propuestas se adaptan a los campos del formulario actual:
  - unitType → packaging.
  - unitWeightKg → unitWeightPerUnitKg.
  - handlingRequirements → requirements.
- Las correcciones explícitas y los comandos comerciales conservan el manejo determinístico existente.
- La IA no guarda solicitudes, reserva, selecciona ofertas, paga ni crea incidencias.

### Experiencia del chatbot

- El chat identifica el modo Meta y explica cuándo falta configuración o falla el análisis.
- Se mantiene disponible la guía por reglas y el formulario manual.
- Se compara el estado del borrador, el ámbito de la conversación y la revisión de la petición antes de aplicar una respuesta.
- Una respuesta antigua se descarta si hubo una edición manual, navegación o una petición posterior.
- El formulario elige el siguiente campo. En PROVIDE/CORRECT, la respuesta de Meta no debe añadir otra pregunta; HELP puede responder una duda y hacer una pregunta útil.

**Límite del contexto:** se usan el último mensaje y datos acotados del borrador. No se implementó memoria persistente ni el envío de todo el historial. Tampoco se realizó una aceptación visual nueva.

**Detalle:** [AX01_META_TEXT.md](AX01_META_TEXT.md).

## 5. Verificaciones realizadas

Los siguientes resultados se comprobaron localmente, también después de sincronizar con la rama remota:

| Verificación | Resultado |
| --- | --- |
| pnpm test:meta-ai | 37 pruebas aprobadas; transporte simulado. |
| pnpm test:v2-conversation | 106 + 32 pruebas aprobadas. |
| pnpm test:v2-chat-workflow | 104 pruebas aprobadas. |
| **Total de estas suites** | **279 aprobadas, 0 fallidas.** |
| pnpm typecheck | Aprobado. |
| pnpm check:architecture | Aprobado: 782 módulos y 236 entradas de cliente comprobadas. |
| Comparación del código tras sincronizar | Sin diferencias semánticas respecto a la implementación local probada. |
| Preservación del trabajo remoto | Instrucciones, skills, SQL y código ajeno protegido sin cambios del incremento. |

La compilación de producción local también pasó **antes de la sincronización de publicación**. El primer intento encontró un problema de permisos en archivos generados; se repitió con acceso local suficiente y terminó correctamente. No se repitió esa compilación después de resolver los conflictos documentales. No se certifica aquí un gate remoto ni un despliegue.

Las pruebas cubren, entre otros casos: falta de clave sin llamada, salidas inválidas, campos comerciales, fuentes inventadas, evidencia ajena o revocada, revisión obsoleta, timeout, errores 401/429/500, salida truncada, modelo incorrecto y exclusión de datos privados de los logs.

## 6. Commits publicados del incremento

| Commit | Contenido |
| --- | --- |
| [3d1c8fe](https://github.com/Chujutak2024/meta-hackathon/commit/3d1c8fe) | Contrato, límites, validaciones y fixtures AX-00. |
| [93d34c6](https://github.com/Chujutak2024/meta-hackathon/commit/93d34c6) | Adaptador SDK, modo META, chat y pruebas AX-01. |
| [fe78b15](https://github.com/Chujutak2024/meta-hackathon/commit/fe78b15) | Registro de la rama solicitada por Axel. |
| [74bfe46](https://github.com/Chujutak2024/meta-hackathon/commit/74bfe46) | Alineación con la estructura compartida y documentación del incremento. |

Las versiones iniciales locales 94d0f05 y d16b77b se reaplicaron sobre la rama remota; no deben confundirse con los SHA publicados indicados arriba. Se atribuye el trabajo a Axel como responsable, asistido por Codex; el campo Author de Git no demuestra ejecución manual.

## 7. Archivos principales

Rutas relativas a la raíz del repositorio:

| Área | Archivos |
| --- | --- |
| Contrato compartido | cargomesh/src/shared/schemas/meta/model-proposal.ts |
| Cliente/configuración | cargomesh/src/server/ai/meta/client.ts y config.ts |
| Validación de propuestas | proposal-boundary.ts, proposal-validation.ts y schemas.ts en el mismo directorio |
| Declaración y chat | interpret-declaration.ts y conversation.ts en el mismo directorio |
| Integración existente | cargomesh/src/server/conversation/interpret.ts |
| Contrato de conversación | cargomesh/src/features/v2-conversation-prep/interpretation.ts |
| Estado y protección de ediciones | provider-status.ts en el mismo directorio |
| Interfaz del chat | cargomesh/src/features/v2-intake/conversation-chat.tsx |
| Prueba real preparada | cargomesh/scripts/meta-text-smoke.ts |
| Evidencia y coordinación | docs/meta/ y BUILT_DURING_HACKATHON.md |

## 8. Pendientes y siguiente paso

| Pendiente | Condición de cierre |
| --- | --- |
| Acceso a Meta Model API | Disponer de clave y configurar el entorno privado del repositorio nuevo. |
| Aceptación real AX-01 | Ejecutar el smoke autorizado y obtener PASS con modelo, request y uso reales. |
| Revisión del contrato | Revisión de Cristhian y Juan antes de conectar persistencia. |
| Integración en main | Revisión de PR y autorización del responsable; publicar la rama no equivale a integrarla. |
| AX-02 y declaración multimodal | Conectar foto/etiqueta/transcripción a evidencias autorizadas; preservar correcciones. |
| Manifiesto y medios | Implementación e integración del frente de Cristhian. |
| Voz, explicación y entorno | Coordinación con Luis según los prompts activos. |
| Sesión, comparación y Passport | Integración con los frentes de Juan y Ramón/Jean. |

SAM, vídeo, conteo de cruces, conciliación, almacenamiento de medios y Passport **no se consideran implementados por este incremento de IA**.

### Cómo validar cuando exista la clave

Configurar en cargomesh/.env.local, sin incluir el archivo ni el valor de la clave en Git:

```dotenv
CARGOMESH_AI_PROVIDER=META
META_MODEL_API_KEY=<clave-privada>
META_MUSE_MODEL=muse-spark-1.3
```

Desde cargomesh:

```powershell
pnpm smoke:meta-text --live
```

La prueba envía una declaración sintética propia: 12 pallets de piezas de maquinaria y 100 kg por pallet. Comprueba esos valores, las dimensiones pendientes y el contrato. No guarda datos comerciales.

Sin --live devuelve LIVE_OPT_IN_REQUIRED. Sin configuración devuelve NOT_CONFIGURED; ambos terminan con exit 2 y sin llamada. Una prueba real válida debe terminar en **PASS / exit 0**. Esa aceptación sigue pendiente.

## 9. Documentación relacionada

- [Registro de rama y sincronización](WORK_REGISTER.md).
- [Contrato ModelProposal](contracts/MODEL_PROPOSAL.md).
- [Detalle y configuración AX-01](AX01_META_TEXT.md).
- [Base heredada e incremento nuevo](../../BUILT_DURING_HACKATHON.md).

Este informe documenta el corte publicado 74bfe46. La creación de este Markdown no modifica la aplicación ni constituye una prueba adicional o un despliegue.
