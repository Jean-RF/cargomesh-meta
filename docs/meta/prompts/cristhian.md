> Guía activa para cristhian. Leer primero [contexto común](00-contexto-comun.md), [estructura](../../../ESQUEMA_PROYECTO.md) y [AGENTS](../../../AGENTS.md). Las historias y APIs descritas siguen pendientes salvo evidencia de implementación. Los prompts recibidos se preservan en `docs/meta/reference/prompts-recibidos/`.

# Cristhian — Tech Lead y dueño de la declaración

Leer el [plan completo de declaración e integración](../PLAN_CR_DECLARACION_E_INTEGRACION.md): contiene el mapa CR-00 del formulario actual, los acuerdos pendientes con Axel/Juan, las pantallas afectadas y los incrementos CR-01 a CR-04. Es planificación; no acredita implementación ni pruebas ejecutadas.

## Rama y PR de este frente

- **Responsable:** Cristhian.
- **Rama fija:** `codex/meta-cristhian`; base de arranque `origin/main` en `6f70f50`.
- **PR:** borrador a `main` del repositorio de trabajo `Chujutak2024/meta-hackathon`, titulado «Declaración revisada, manifiesto e integración».
- **Alcance:** CR: formulario, medios de declaración, revisión, manifiesto e integración. Luis conserva AX-09, AX-10 y AX-03; consumir sus contratos sin duplicar la implementación.
- **Vínculos:** Manifiesto y revisión -> Axel/Juan; audio autorizado -> Luis; consume transcripción de Luis y propuestas de Axel. Juan recibe la explicación de Luis sobre sus hechos calculados. Estas son conexiones del producto general; la candidata Indie se delimita por separado.
- Mantener este PR abierto mientras se construye el frente; varios commits y una historia activa a la vez. Un PR mergeado queda cerrado y no integra automáticamente commits posteriores.
- Este commit prepara instrucciones: no implementa funciones ni acredita pruebas, credenciales o despliegues.

Los acuerdos comunes y el manifiesto de ramas se preparan en la rama de Cristhian. Leer [el manifiesto](https://github.com/Chujutak2024/meta-hackathon/blob/codex/meta-cristhian/docs/meta/PR_INTEGRANTES.md) y [el acuerdo de entrega/reintegración](https://github.com/Chujutak2024/meta-hackathon/blob/codex/meta-cristhian/docs/meta/ENTREGA_Y_REINTEGRACION.md). Antes de integrar funcionalidad, sincronizar las decisiones aceptadas desde `main`.

Este frente corresponde a la entrega Indie de Cristhian, Axel, Juan y Ramón/Jean. Mantener separada la aportación de Luis al producto general; conservar procedencia y autoría reales.


Eres Tech Lead y Product Owner, y además dueño del paquete **Declaración**: foto, etiqueta y audio → propuesta revisada → manifiesto confirmado y versionado. Tus historias empiezan con **CR** (antes eran las LU de Luis, con el mismo número).

## Cómo usar este archivo con tu agente

1. Tu agente debe leer `00-contexto-comun.md` y este archivo. Los prompts ya están en `docs/meta/prompts/`; CR-09 verifica origen, estructura y política de PRs.
2. Usa el prompt de abajo cambiando `<ID>`; conserva la rama fija del frente y añade los commits al mismo PR abierto.
3. Revisa el plan de 5 líneas que te devuelva antes de dejarlo implementar.

## Prompt para tu agente

```text
Eres el agente de código de Cristhian (Tech Lead y dueño de la declaración) en CargoMesh, para el hackathon de Meta, track Indie. Repo: Chujutak2024/meta-hackathon.

Historia: <ID>. Rama fija: codex/meta-cristhian, basada en origin/main de meta-hackathon. Usa el mismo PR del frente; no abras otra rama por historia. El PR va a main de meta-hackathon. No hagas push directo a main ni modifiques el repositorio Amazon.

Antes de escribir código:
1. Lee AGENTS.md, docs/meta/prompts/00-contexto-comun.md y docs/meta/prompts/cristhian.md (sección de la historia <ID>).
2. Resúmeme en 5 líneas qué vas a cambiar, la entrada y la salida con un ejemplo, los casos negativos y los archivos que vas a tocar. Espera mi OK.

Mientras implementas:
- Trabaja solo en <ID>. Si necesitas algo de otra historia, usa el fixture del contrato y avísame.
- Reutiliza el borrador, los grupos de carga, la revisión y las correcciones que ya existen en src/features/v2-intake y src/server/modules/freight-requests. No crees otro formulario ni otro modelo de request.
- La organización sale del usuario autenticado. Toda mutación usa Idempotency-Key y versión esperada.
- Una propuesta de la IA solo se aplica si su inputRevision coincide con la versión actual del borrador, y el usuario la acepta campo por campo. Una edición manual posterior siempre gana.
- Nunca inventes peso, medidas ni cantidades: si faltan, quedan pendientes, nunca en 0.
- Unidades: un pallet con 12 cajas es 1 PALLET, no 12.
- Claves solo en servidor; nada de NEXT_PUBLIC_ para secretos; nada de claves en código ni en logs.

Al terminar:
- Corre las pruebas unitarias de la historia y las suites del área (test:v2-conversation, test:v2-chat-workflow y test:client-operations si tocaste Cliente) y pega el resultado real.
- Entrégame el resumen del diff, los comandos con su resultado, los límites y lo que queda pendiente.
- Propón la línea para BUILT_DURING_HACKATHON.md.
- No hagas push, merge ni deploy sin que te lo pida.
```

## Tu paquete

- **Produces:** `declared_manifest` y `media_evidence` de la declaración (fotos, etiquetas y WAV).
- **Consumes:** `model_proposal` de Axel y la transcripción de las notas de voz de Luis.
- **Te consumen:** Juan (abre la sesión con tu manifiesto), Axel (usa tus fotos y etiquetas) y Luis (usa tus WAV).
- **Revisas a:** Axel. **Te revisa:** Juan.
- **Como Tech Lead:** apruebas los merges al `main` de este repositorio Meta, mantienes intacta la configuración Amazon y cierras la entrega (CR-10).

## Plan día por día

| Día | Qué entregas |
| --- | --- |
| 27 oct (P0) | CR-09: origen del snapshot, estructura, `AGENTS.md`, CI y prompts de este repositorio Meta. CR-00: mapa de campos del borrador al manifiesto y fixture de `declared_manifest`. Cotejar la elegibilidad de los cinco inscritos con las Official Rules; no omitir a ningún integrante |
| 28 oct (I1) | CR-01: declaración manual confirmada y reabierta con el mismo ID |
| 29–30 oct (I2) | CR-02: subida de foto, etiqueta y audio, y aplicación de propuestas revisadas |
| 31 oct–1 nov (I3) | CR-03: versiones del manifiesto sin duplicados |
| 2–3 nov (I4) | CR-04: aceptación de Cliente y regresión del request |
| 3 nov (entrega) | CR-10: `BUILT_DURING_HACKATHON.md` y envío del formulario |

## Notas técnicas

### CR-09: origen y estructura ya preparados

El snapshot CargoMesh `4482d3a` entró a este repositorio mediante el PR #1. La rama de integración es `main` de `Chujutak2024/meta-hackathon`. No crear `meta-main` ni ejecutar los comandos de migración del plan inicial. El tag de corte aún requiere verificar su propósito y autorización; un tag nuevo no convierte código anterior en trabajo nuevo.

La estructura activa está en `ESQUEMA_PROYECTO.md`. El backlog vive en `docs/meta/backlog/`, los prompts en `docs/meta/prompts/`, la infraestructura por preparar en `infra/meta/` y la evidencia de novedad en `BUILT_DURING_HACKATHON.md`. Aportar los deltas que falten a CR-09; no volver a importar CargoMesh ni marcar la historia completa solo por encontrar estos archivos.

### Subida de archivos

1. `POST` a una ruta nueva (por ejemplo `/api/v2/meta/evidence/upload-url`). La ruta valida al usuario y el request, crea la fila `media_evidence` en estado PENDING y devuelve `createSignedUploadUrl`, que vale 2 horas.
2. El navegador sube con `uploadToSignedUrl`. Por encima de 6 MB conviene la subida reanudable (TUS).
3. `POST` de confirmación: el servidor verifica que el objeto existe y que tipo y tamaño son válidos, calcula el SHA-256 y marca la evidencia como READY.
4. Para mostrar o enviar a la IA, el servidor emite una URL firmada corta. Nunca la guardes.

### Audio

- Graba con `MediaRecorder` (WebM/Opus) o acepta el `.ogg`/`.opus` de WhatsApp.
- Decodifica con `AudioContext.decodeAudioData`, re-muestrea a 16 kHz mono con `OfflineAudioContext` y codifica WAV PCM de 16 bits (encabezado RIFF de 44 bytes).
- Límite sugerido: 2 minutos. Si el micrófono se deniega, el texto y la foto siguen funcionando.

### Fotos

- Usa `accept="image/jpeg,image/png,image/webp"`. Si llega una HEIC que el navegador no puede dibujar, pide un JPEG.
- Reduce la foto a unos 1600 px de lado con canvas antes de subirla: ahorra tokens sin perder la lectura de etiquetas.

### Manifiesto

- Se publica al confirmar la declaración. Cada corrección crea una versión nueva.
- La sesión de Juan guarda la versión que evaluó. Si el request cambia después, muestra un aviso, sin reescribir lo evaluado.

## Tus historias

Compromiso MUST: 7 historias, 12 horas.

### CR-00 · Mapear el borrador y el manifiesto

Sprint P0 · MUST · 0,5 h · Depende de: nada · La usan: CR-01, AX-02

- **Objetivo:** Identificar qué puede precargarse y qué necesita confirmación antes de guardar el request.
- **Lógica:** Conservar unidades logísticas, revisión del borrador y distinción entre dato observado y confirmado.
- **Backend:** Mapear campos actuales al nuevo manifiesto sin duplicar la solicitud; acordar con Juan el contrato del adjunto.
- **Frontend:** Marcar dónde entrarán foto/audio y cómo se revisarán propuestas sin abrir otro formulario paralelo.

Pruebas unitarias:

- CR-00-UT-01: Pallet con doce cajas -> una unidad PALLET, no doce pallets.
- CR-00-UT-02: Medida vacía -> pendiente, nunca cero.
- CR-00-UT-03: Revisión de solicitud -> referencia estable.

Aceptación:

- Mapa de campos y caso de prueba manual disponible.
- IDs reales y referencias de pantalla separados.

Archivos de partida:

- `cargomesh/src/features/v2-intake/cargo-groups.ts`
- `cargomesh/src/shared/schemas/v2/freight-request.ts`

Evidencia para el PR: Ficha de campos: origen, unidad, validación, confirmación y destino.

### CR-09 · Verificar origen, estructura y política de PRs del repositorio Meta

Sprint P0 · MUST · 0,5 h · Depende de: nada · La usan: AX-09, JU-12

- **Objetivo:** Separar con evidencia lo construido en el hackathon y proteger la versión de Amazon.
- **Lógica:** Snapshot de CargoMesh 4482d3a importado por PR #1; ramas codex/meta-* desde origin/main y PR al main de meta-hackathon. No cambiar el repositorio Amazon.
- **Backend:** AGENTS y CI coherentes con este repositorio Meta; referencias de origen y separación del incremento en BUILT_DURING_HACKATHON.md. Tags nuevos solo tras revisión específica.
- **Frontend:** No aplica.

Comprobaciones propuestas (no son tests de runtime):

- CR-09-UT-01: La referencia del snapshot importado identifica 4482d3a sin atribuirle funcionalidad Meta nueva.
- CR-09-UT-02: El PR de la rama Meta tiene como base main de Chujutak2024/meta-hackathon.
- CR-09-UT-03: El workflow existente contempla PRs a main de este repositorio.

Aceptación:

- Origen, estructura, responsables y política de PR documentados sin cambiar Amazon.
- BUILT_DURING_HACKATHON.md separa la base existente del incremento Meta.

Archivos: `AGENTS.md`, `.github/workflows/v2-qa-gate.yml`, `ESQUEMA_PROYECTO.md`, `BUILT_DURING_HACKATHON.md`.

Evidencia para el PR: Enlaces al PR de importación y al PR de estructura; diff revisable de instrucciones y carpetas.

### CR-01 · Confirmar una declaración mínima en el mismo request

Sprint I1 · MUST · 2 h · Depende de: CR-00 · La usan: JU-01, CR-02, JU-02, JU-05

- **Objetivo:** Completar el camino manual verificable que luego recibirá las propuestas visuales.
- **Lógica:** El cliente revisa cantidad, unidad, contenido, ruta y medidas requeridas. Una revisión modifica el mismo borrador y exige consentimiento para persistir.
- **Backend:** Reutilizar servicio de draft y validadores actuales; crear snapshot de manifiesto confirmado y su revisión con tenant derivado del actor.
- **Frontend:** Agregar sección Declarado por ti y lista de campos pendientes dentro del intake actual; reutilizar controles y resumen.

Pruebas unitarias:

- CR-01-UT-01: Cantidad fraccionaria de pallets -> inválida.
- CR-01-UT-02: Total no coincide con suma -> rechazado.
- CR-01-UT-03: Guardar dos veces con misma clave/payload -> mismo resultado.
- CR-01-UT-04: Otro tenant -> acceso denegado.

Aceptación:

- Manifiesto guardado y reabierto en el mismo ID.
- Datos faltantes explicados sin invención.

Archivos de partida:

- `cargomesh/src/features/v2-intake/intake-controller.ts`
- `cargomesh/src/server/modules/freight-requests/application/draft-service.ts`

Evidencia para el PR: Captura/pasos del mismo identificador antes y después, más casos negativos del servicio.

### CR-02 · Añadir adjuntos y aplicar propuestas revisadas al formulario

Sprint I2 · MUST · 3 h · Depende de: CR-01, AX-02, AX-10 · La usan: CR-03, CR-05, CR-06

- **Objetivo:** Completar foto/audio/etiqueta -> propuesta -> confirmación -> borrador.
- **Lógica:** Cada propuesta conserva su evidencia y revisión de entrada. El usuario puede aceptar un campo o corregirlo; un análisis tardío no pisa la edición.
- **Backend:** Implementar el ciclo privado de subida y asociación de evidencia de declaración, con autorización y límites. Validar que evidenceId pertenezca al actor/request. Subida directa del navegador a Supabase Storage con URL firmada (createSignedUploadUrl); el audio se convierte a WAV de 16 kHz y las fotos HEIC se reenvían como JPEG antes de subir.
- **Frontend:** Previsualización, progreso, revisión por campo, estados de error/reintento y eliminación de adjunto antes de confirmación; usar componentes compartidos.

Pruebas unitarias:

- CR-02-UT-01: MIME no permitido -> rechazo antes de inferencia.
- CR-02-UT-02: Adjunto ajeno -> 403/404 estable.
- CR-02-UT-03: Rechazar sugerencia -> mantener campo manual.
- CR-02-UT-04: Cancelar/reintentar -> sin duplicar asociación.

Aceptación:

- Caso visual llega al mismo borrador; el usuario sabe qué confirmó.
- Sin permisos de micrófono sigue disponible texto/foto.

Archivos de partida:

- `cargomesh/src/features/v2-intake/v2-intake-prototype.tsx`
- `cargomesh/src/features/v2-intake/client-assistant.tsx`

Evidencia para el PR: Recorrido de aceptación y log de asociaciones por ID sin publicar URLs privadas.

### CR-03 · Conservar revisión del manifiesto y corregir sin duplicados

Sprint I3 · MUST · 3 h · Depende de: CR-02, JU-02 · La usan: JU-03, CR-04, CR-08

- **Objetivo:** Evitar que una corrección posterior cambie silenciosamente la base observada.
- **Lógica:** Una nueva revisión del request genera un nuevo manifiesto; una sesión existente conserva la anterior. La actualización requiere revisión explícita y respeta versiones.
- **Backend:** Reutilizar idempotencia y expectedVersion; exponer vínculo de manifiesto vigente y anterior cuando exista sesión. No migrar cantidades por defecto.
- **Frontend:** Cliente ve última revisión y advertencia sobre sesiones basadas en una anterior; historial acotado y acceso al mismo envío.

Pruebas unitarias:

- CR-03-UT-01: Guardar/reabrir -> mismo request ID.
- CR-03-UT-02: Repetición con payload distinto/misma clave -> conflicto.
- CR-03-UT-03: Sesión con rev1 y draft rev2 -> no sobrescribir rev1.
- CR-03-UT-04: Datos de otra organización -> nunca precargar.

Aceptación:

- Corrección visible sin perder trazabilidad de lo evaluado.
- El caso del demo conserva la misma cadena de IDs.

Archivos de partida:

- `cargomesh/src/features/v2-intake/draft-review.ts`
- `cargomesh/src/server/modules/freight-requests/application/draft-service.ts`

Evidencia para el PR: Cadena request/revisión/manifiesto/sesión y casos de concurrencia reproducibles.

### CR-04 · Cerrar aceptación de Cliente y regresión del request

Sprint I4 · MUST · 2 h · Depende de: CR-03 · La usan: CR-10, CR-07

- **Objetivo:** Validar que los adjuntos nuevos no rompan el recorrido actual de solicitud.
- **Lógica:** Texto/foto/audio son entradas al mismo borrador; el usuario revisa antes de guardar y puede continuar manualmente.
- **Backend:** Completar pruebas del servicio, validadores y permisos; ejecutar suite pertinente descubierta del repo. No usar conteos heredados como gate.
- **Frontend:** Teclado, foco, móvil, errores por campo y revisión de cantidades. Solicitar la revisión visual humana del usuario.

Pruebas unitarias:

- CR-04-UT-01: Edición durante análisis -> gana edición vigente.
- CR-04-UT-02: Micrófono denegado -> resto usable.
- CR-04-UT-03: Volver y reabrir -> datos conservados.
- CR-04-UT-04: Envió fallido -> no anunciar creación.

Aceptación:

- Ficha humana del camino principal y un negativo.
- Defectos corregidos por Cristhian y resultados reales adjuntos.

Archivos de partida:

- `cargomesh/src/features/v2-intake/intake-controller.test.ts`
- `cargomesh/src/features/v2-intake/conversation-fields.test.ts`

Evidencia para el PR: Comandos/resultados reales y observación humana separada de tests automatizados.

### CR-10 · BUILT_DURING_HACKATHON.md y formulario de entrega

Sprint ENTREGA · MUST · 1 h · Depende de: CR-04, AX-04, JU-04, RA-04 · La usan: aceptación final

- **Objetivo:** Que los jueces identifiquen sin dudas qué se construyó durante el hackathon.
- **Lógica:** Separar la base existente (hasta 4482d3a) de lo nuevo, con commits, autores, funcionalidades y límites; el texto describe solo lo que funciona.
- **Backend:** No aplica.
- **Frontend:** No aplica.

Pruebas unitarias:

- CR-10-UT-01: Cada funcionalidad nueva enlaza a sus commits.
- CR-10-UT-02: Ninguna funcionalidad previa aparece como nueva.
- CR-10-UT-03: Los enlaces de demo y video abren en una ventana de incógnito.

Aceptación:

- Formulario enviado el 3 de noviembre.
- Track Indie y tema Build for Your World.

Evidencia para el PR: Captura del envío y enlace al archivo en el repo.

### Ampliaciones (solo si sobra capacidad)

No se empiezan sin acuerdo en la daily. El detalle está en `docs/meta/backlog/BACKLOG_SCRUM.csv`.

| ID | Prioridad | Horas | Historia |
| --- | --- | --- | --- |
| CR-05 | SHOULD | 2 | Revisar lectura de etiquetas y unidades por paquete |
| CR-06 | SHOULD | 2 | Optimizar captura móvil de medios |
| CR-07 | COULD | 2 | Añadir ayuda contextual de primera visita |
| CR-08 | COULD | 2 | Importar manifiesto por archivo CSV |
