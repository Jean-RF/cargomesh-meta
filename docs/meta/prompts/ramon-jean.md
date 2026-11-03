> Guía activa para ramon-jean. Leer primero [contexto común](00-contexto-comun.md), [estructura](../../../ESQUEMA_PROYECTO.md) y [AGENTS](../../../AGENTS.md). Las historias y APIs descritas siguen pendientes salvo evidencia de implementación. Los prompts recibidos se preservan en `docs/meta/reference/prompts-recibidos/`.

# Ramón/Jean — dueño de visión (DockMind)

## Rama y PR de este frente

- **Responsable:** Ramón/Jean.
- **Rama fija:** `codex/meta-ramon`; base de arranque `origin/main` en `6f70f50`.
- **PR:** borrador a `main` del repositorio de trabajo `Chujutak2024/meta-hackathon`, titulado «DockMind, jobs y conteo de carga».
- **Alcance:** RA: vídeo propio, SAM, contador, worker y evidencia.
- **Vínculos:** Consume sesión y revisión de Juan; produce observaciones con unidad, intervalo, timecodes, dirección y calidad. Validar viabilidad primero.
- Mantener este PR abierto mientras se construye el frente; varios commits y una historia activa a la vez. Un PR mergeado queda cerrado y no integra automáticamente commits posteriores.
- Este commit prepara instrucciones: no implementa funciones ni acredita pruebas, credenciales o despliegues.

Los acuerdos comunes y el manifiesto de ramas se preparan en la rama de Cristhian. Leer [el manifiesto](https://github.com/Chujutak2024/meta-hackathon/blob/codex/meta-cristhian/docs/meta/PR_INTEGRANTES.md) y [el acuerdo de entrega/reintegración](https://github.com/Chujutak2024/meta-hackathon/blob/codex/meta-cristhian/docs/meta/ENTREGA_Y_REINTEGRACION.md). Antes de integrar funcionalidad, sincronizar las decisiones aceptadas desde `main`.

Este frente corresponde a la entrega Indie de Cristhian, Axel, Juan y Ramón/Jean. Mantener separada la aportación de Luis al producto general; conservar procedencia y autoría reales.


Eres dueño de **DockMind**: clips propios, worker en Modal, SAM 3.1, conteo de cruces y video anotado. También montas el proyecto Modal y editas el video del demo. Tus historias empiezan con **RA**. Tienes el riesgo más alto del plan, así que el conteo se prueba la primera noche.

## Cómo usar este archivo con tu agente

1. Tu agente debe leer `00-contexto-comun.md` y este archivo (ya están en `docs/meta/prompts/`).
2. Usa el prompt de abajo cambiando `<ID>`; conserva la rama fija del frente y añade los commits al mismo PR abierto.
3. Revisa el plan de 5 líneas que te devuelva antes de dejarlo implementar.

## Prompt para tu agente

```text
Eres el agente de código de Ramón/Jean (dueño de visión: DockMind) en CargoMesh, para el hackathon de Meta, track Indie. Repo: Chujutak2024/meta-hackathon.

Historia: <ID>. Rama fija: codex/meta-ramon, basada en origin/main de meta-hackathon. Usa el mismo PR del frente; no abras otra rama por historia. El PR va a main de meta-hackathon. No hagas push directo a main ni modifiques el repositorio Amazon.

Antes de escribir código:
1. Lee AGENTS.md, docs/meta/prompts/00-contexto-comun.md y docs/meta/prompts/ramon-jean.md (sección de la historia <ID>).
2. Revisa la documentación de SAM 3.1 que aplique (https://dev.meta.ai/docs/sam/overview, sam/segmenting, sam/reading-segmentation, sam/client-libraries) y la de Modal si tocas el worker. Si algo del código no coincide con la doc, gana la doc y me avisas.
3. Resúmeme en 5 líneas qué vas a cambiar, la entrada y la salida con un ejemplo, los casos negativos y los archivos que vas a tocar. Espera mi OK.

Mientras implementas:
- Trabaja solo en <ID>. Si necesitas algo de otra historia, usa el fixture del contrato y avísame.
- El worker vive en cargomesh/dockmind-worker/ (Python 3.12). El conteo es una función pura con pruebas pytest, separada de las llamadas a la API.
- Nunca escribas un conteo a mano ni lo ajustes para que coincida con el guion. Si el clip no permite concluir, el resultado es REQUIRES_REVIEW o INSUFFICIENT_EVIDENCE.
- Cuenta cruces de la línea, no IDs distintos ni detecciones por cuadro.
- La referencia manual de cada clip sirve para evaluar; nunca se envía al modelo ni al resultado.
- Conserva el origen de cada clip (OWN_CAPTURE o SYNTHETIC_RENDER) y nunca presentes un render como cámara real.
- Claves solo en el secret de Modal o en .env local; nunca en el repo ni en logs. Los archivos subidos a la Files API llevan vencimiento.

Al terminar:
- Corre pytest del worker y, si tocaste la app, las pruebas del área; pega el resultado real. Las corridas reales contra SAM se anotan aparte con clip, conteo, referencia, tiempo y costo.
- Entrégame el resumen del diff, los comandos con su resultado, los límites y lo que queda pendiente.
- Propón la línea para BUILT_DURING_HACKATHON.md.
- No hagas push, merge, modal deploy ni deploy sin que te lo pida.
```

## Tu paquete

- **Produces:** `analysis_job`, `loading_observation` y `media_evidence` de clips y videos anotados.
- **Consumes:** `loading_session` de Juan (sede, manifiesto, configuración de la línea).
- **Te consumen:** Juan (conciliación y Passport) y Luis (explicación).
- **Revisas a:** Juan (la sesión trae lo que el worker necesita). **Te revisa:** Luis.

## Plan día por día

| Día | Qué entregas |
| --- | --- |
| 27 oct (P0) | RA-00: grabar los clips de prueba y anotar el conteo manual. Prueba de humo de `sam-3.1` con un clip corto |
| 28 oct (I1) | RA-01: SAM sobre tu clip, con trayectorias inspeccionables y decisión sobre el respaldo. RA-10: proyecto Modal con `POST /jobs` protegido |
| 29–30 oct (I2) | RA-02: función de conteo de cruces con manejo de dudas |
| 31 oct–1 nov (I3) | RA-03: worker integrado a la sesión, video anotado y estados del job |
| 2–3 nov (I4) | RA-04: evaluación con los clips de referencia y límites del conteo |
| 3 nov (entrega) | RA-11: edición del video del demo |

## Notas técnicas

### RA-00: cómo grabar los clips

- Celular fijo en trípode, horizontal, 1280×720 a 30 fps, con buena luz y fondo despejado.
- Encuadra de lado la puerta del camión o el borde de la rampa: solo la zona de paso, porque SAM sigue como máximo 16 objetos por cuadro.
- Para probar en casa usa cajas de cartón y el concepto "cardboard box". Usa "pallet" solo si grabas en una bodega real con pallets.
- Evita caras: graba a la altura de la carga o de espaldas.
- Graba al menos estos casos:
  1. Entran todas las cajas.
  2. Una caja se queda afuera.
  3. Oclusión: una persona pasa por delante o entran dos cajas juntas.
  4. Una caja sale y vuelve a entrar.
- Anota la referencia manual en `clips/referencia.csv` con las columnas `clip`, `segundo`, `direccion` y `total_esperado`.
- Cada clip debe pesar menos de 50 MB. Por encima de 6 MB, súbelo con la subida reanudable.

### Normalizar con ffmpeg

```bash
ffmpeg -i entrada.mov -vf "scale=-2:720,fps=10" -c:v libx264 -preset veryfast -crf 26 -an -movflags +faststart salida.mp4
```

A 10 fps, un clip de 30 s son 300 cuadros: cerca de USD 0,06 en SAM.

### Llamada a SAM 3.1

- Sube el MP4 a la Files API de Meta (`purpose=user_data`, con `expires_after`) y usa el `file_id`.
- Llama a la Responses API con `model: "sam-3.1"`, un `input_text` con un solo concepto y un `input_video`. Hazlo en streaming: llega una línea por cuadro.
- Parsea con `meta-sam-parser` (pip) y quédate con las cajas y el ID de cada objeto por cuadro. Las máscaras no hacen falta para contar.
- Verifica la forma exacta del request en https://dev.meta.ai/docs/sam/segmenting antes de escribir el cliente.

### Conteo de cruces: `count_crossings(tracks, line, inside, band_px, min_frames, fps)`

1. Para cada ID, toma el centro de su caja en cada cuadro.
2. Calcula de qué lado de la línea está cada centro: +1 adentro, −1 afuera, 0 dentro de la banda de tolerancia.
3. Ignora las trayectorias con menos de `min_frames` cuadros.
4. Un cruce cuenta cuando el último lado distinto de 0 pasa de −1 a +1 (entra) o de +1 a −1 (sale). Guarda el cuadro y el segundo.
5. Conteo neto = entradas − salidas.
6. Marca REQUIRES_REVIEW, con su segundo, cuando:
   - un ID desaparece dentro de la banda y aparece otro nuevo cerca en pocos cuadros (posible cambio de ID);
   - hay cuadros con 16 objetos (el límite de SAM);
   - el clip termina con un objeto dentro de la banda.

Prueba con pytest cada caso de la matriz: cruce único, objeto quieto sobre la línea, salida y reingreso, pérdida de ID y trayectoria corta.

### Video anotado

Dibuja con OpenCV la línea, las cajas con su ID y el contador. Después re-codifica a H.264 con ffmpeg para que se reproduzca en el navegador. Súbelo a `org/<organizationId>/<sessionId>/<evidenceId>-overlay.mp4` y crea su fila en `media_evidence`.

### Worker en Modal

```python
import modal

app = modal.App("cargomesh-dockmind")
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg")
    .pip_install("openai", "meta-sam-parser", "opencv-python-headless", "supabase", "fastapi[standard]")
)
secret = modal.Secret.from_name("cargomesh-meta-worker")


@app.function(image=image, secrets=[secret], timeout=900)
def analyze(job_id: str) -> None:
    ...  # RUNNING -> baja el clip -> ffmpeg -> SAM -> conteo -> video anotado -> SUCCEEDED o FAILED


@app.function(image=image, secrets=[secret])
@modal.fastapi_endpoint(method="POST", requires_proxy_auth=True)
def jobs(body: dict) -> dict:
    call = analyze.spawn(body["job_id"])
    return {"call_id": call.object_id}
```

- La API de la app crea el `analysis_job` en QUEUED y llama a `POST /jobs` con el token de proxy (headers `Modal-Key` y `Modal-Secret`).
- El worker marca RUNNING al empezar y SUCCEEDED o FAILED al terminar, con la clave secreta de Supabase.
- Si llega dos veces el mismo `job_id` ya en curso o terminado, no relanza nada.
- Verifica los decoradores en https://modal.com/docs/guide/webhooks y https://modal.com/docs/guide/webhook-proxy-auth.

### Respaldo con GPU (RA-05, solo si el gate de I1 lo pide)

Usa los pesos abiertos `facebook/sam3.1` (acceso aprobado en Hugging Face) con el repo `facebookresearch/sam3`, en una función GPU de Modal (L40S o A100) o en local. La interfaz de trayectorias es la misma, así que el conteo no cambia. Revisa la SAM License antes de usarlo.

### RA-04: evaluación

Arma una tabla por clip con esperado, observado, diferencia, eventos marcados para revisión, tiempo de proceso y costo. Reporta la precisión solo sobre esos clips, sin generalizar.

### RA-11: video del demo

Usa el guion de la sección "Demo y entrega" del plan, de unos 170 s. Cada dueño graba su tramo y tú editas. Rotula lo que ya existía como "existing CargoMesh" y no uses música con derechos de terceros.

## Tus historias

Compromiso MUST: 7 historias, 13 horas.

### RA-00 · Preparar clip propio y referencia manual

Sprint P0 · MUST · 0,5 h · Depende de: nada · La usan: RA-01

- **Objetivo:** Disponer de un vídeo corto con unidad logística y conteo de referencia claros.
- **Lógica:** El vídeo puede ser captura propia o render propio; su fuente se conserva. La referencia manual evalúa el modelo y no se envía como respuesta esperada.
- **Backend:** Definir metadatos de clip, duración, tasa de frames, timecodes y versión; conservar original por hash.
- **Frontend:** Elegir encuadre fijo con zona de entrada visible y un caso sencillo; preparar otro caso con oclusión.

Pruebas unitarias:

- RA-00-UT-01: Clip sin frames -> rechazo.
- RA-00-UT-02: Referencia manual separada del input del modelo.
- RA-00-UT-03: Fuente de render -> etiqueta SIMULATED conservada.

Aceptación:

- Derechos y unidad logística anotados.
- Archivo reproducible y conteo manual disponibles.

Archivos de partida:

- `cargomesh/src/features/logistics-3d/depot-cycle.ts`
- `cargomesh/src/features/logistics-3d/depot-coordinator.ts`

Evidencia para el PR: Clip, manifiesto de referencia y registro de procedencia; rostros/documentos personales fuera del dataset.

### RA-01 · Validar SAM 3.1 de la Meta API sobre un clip propio

Sprint I1 · MUST · 2 h · Depende de: RA-00 · La usan: RA-02, RA-05

- **Objetivo:** Resolver temprano la viabilidad de detectar y seguir la unidad del caso de demo.
- **Lógica:** Registrar tracks y timecodes de objetos visibles. No contar todos los frames como objetos nuevos ni tratar un track como identidad física certificada.
- **Backend:** Normalizar con ffmpeg (MP4 H.264, 720p, 10 fps), subir a la Files API de Meta con vencimiento y llamar a sam-3.1 por Responses API en streaming con un concepto; parsear con meta-sam-parser. Anotar costo y tiempo. Si falla, probar pesos abiertos de SAM 3.1 en GPU.
- **Frontend:** Producir reproducción mínima con overlays sobre el clip para revisar errores; no requiere integrarse aún al dashboard.

Pruebas unitarias:

- RA-01-UT-01: Respuesta vacía -> observación insuficiente.
- RA-01-UT-02: Mismo track en diez frames -> una trayectoria.
- RA-01-UT-03: Frame fuera de duración -> rechazado.
- RA-01-UT-04: Contrato de proveedor cambiado -> error explícito.

Aceptación:

- Clip procesado realmente y trayectorias inspeccionables.
- Decisión go/no-go de vía SAM al cierre; limitaciones anotadas.

Archivos de partida:

- `cargomesh/src/features/logistics-3d/depot-cycle.ts`

Evidencia para el PR: Vídeo/frames con resultado real, comparación manual y tiempos de proceso; mantener separado el conteo de referencia.

### RA-10 · Proyecto Modal y endpoint protegido del worker

Sprint I1 · MUST · 1 h · Depende de: JU-12 · La usan: aceptación final

- **Objetivo:** Poder lanzar el análisis de clips desde la app sin bloquear Vercel.
- **Lógica:** POST /jobs con requires_proxy_auth lanza spawn y responde de inmediato; el estado vive en analysis_job.
- **Backend:** Secret con claves de Meta y Supabase; función solo CPU con timeout de 15 minutos; código en cargomesh/dockmind-worker/.
- **Frontend:** No aplica.

Pruebas unitarias:

- RA-10-UT-01: Llamada sin token -> 401.
- RA-10-UT-02: Mismo job dos veces -> un solo spawn.
- RA-10-UT-03: Clip inexistente -> FAILED con error estable.

Aceptación:

- Un job de prueba pasa de QUEUED a SUCCEEDED en el entorno Meta.
- Ninguna clave en el repo.

Evidencia para el PR: ID del deploy de Modal y log de un job de prueba.

### RA-02 · Contar cruces con dirección y manejo de incertidumbre

Sprint I2 · MUST · 3 h · Depende de: RA-01, JU-02 · La usan: AX-03, JU-03, RA-03

- **Objetivo:** Transformar trayectorias en observaciones de carga útiles para comparar.
- **Lógica:** Configurar región/línea y dirección. Agregar eventos de entrada/salida sin repetir frames; si se pierde identidad o hay oclusión irresoluble marcar incertidumbre.
- **Backend:** Crear función pura de conteo sobre tracks normalizados, eventos y calidad; limitar alcance al clip. No afirmar cantidad dentro del camión por una máscara aislada.
- **Frontend:** Overlay con línea y trayectoria; contador por unidad; permitir revisar timecodes. No ajustar manualmente el resultado ocultando la corrección.

Pruebas unitarias:

- RA-02-UT-01: Track estable cruza una vez -> una entrada.
- RA-02-UT-02: Objeto se queda cerca de línea -> no sumar repetidamente.
- RA-02-UT-03: Salida/reingreso -> eventos diferenciados y saldo explicado.
- RA-02-UT-04: Pérdida de identidad -> REQUIRES_REVIEW, no éxito silencioso.

Aceptación:

- Conteo coincide con referencia del clip simple y explica el clip difícil.
- Se conserva unidad PALLET/BOX según el dataset.

Evidencia para el PR: Fixtures de trayectorias y resultados del vídeo con línea/timecodes; la precisión aún no se generaliza.

### RA-03 · Integrar el worker de Modal y el trabajo asíncrono

Sprint I3 · MUST · 3 h · Depende de: RA-02, JU-02 · La usan: RA-04, RA-06

- **Objetivo:** Entregar resultados al dashboard sin bloquear la carga de página.
- **Lógica:** Un trabajo procesa una evidencia/revisión/configuración concreta; repetir polling no crea otra inferencia. Original, frames y resultado conservan relaciones.
- **Backend:** POST /jobs del worker (proxy auth) lanza el análisis con spawn; el worker actualiza analysis_job con la clave secreta; la app consulta el estado cada 3 s; deduplicación por clave; reintento manual si el job sigue en QUEUED después de 2 minutos.
- **Frontend:** Estado queued/running/review/failed, progreso solo cuando exista, reintento explícito y enlace a timecode. No usar una barra ficticia de precisión.

Pruebas unitarias:

- RA-03-UT-01: Polling repetido -> un job.
- RA-03-UT-02: Resultado de manifiesto antiguo -> no aplicarlo a la revisión nueva.
- RA-03-UT-03: Callback sin autorización -> rechazo.
- RA-03-UT-04: Timeout -> trabajo fallido o pendiente conocido, sin éxito inventado.

Aceptación:

- Clip real integrado en sesión y reabierto con evidencia.
- Una pérdida de red no duplica facturación por reenvío automático.

Evidencia para el PR: Job ID, clave de deduplicación, fuente/versión y vínculo a frames; sin tokens ni enlaces permanentes privados.

### RA-04 · Evaluar clips y cerrar límites del conteo

Sprint I4 · MUST · 2 h · Depende de: RA-03 · La usan: CR-10, RA-11, RA-07, RA-09

- **Objetivo:** Demostrar el desempeño del caso acotado y sus condiciones de fallo.
- **Lógica:** Comparar predicción y referencia manual sobre clips reservados; registrar error de conteo, duplicaciones, pérdidas de tracks y abstenciones.
- **Backend:** Conjunto reproducible de entradas/resultados con versión/configuración; medir duración total y fallos reales sin generalizar exactitud.
- **Frontend:** Preparar grabación de overlays/timecodes y mensaje claro para el caso ambiguo; aportar material propio al vídeo.

Pruebas unitarias:

- RA-04-UT-01: Cruce único -> esperado manual.
- RA-04-UT-02: Oclusión -> resultado/revisión según política.
- RA-04-UT-03: Objeto no cruza -> no sumar.
- RA-04-UT-04: Procesar clip cerrado dos veces -> misma asociación, no duplicado.

Aceptación:

- Al menos caso correcto, discrepancia y observación insuficiente registrados.
- No se presenta una animación como cámara real ni un único clip como precisión universal.

Evidencia para el PR: Dataset con referencia separada, informe pass/fail/bloqueado/no ejecutado y vídeo del resultado.

### RA-11 · Video del demo

Sprint ENTREGA · MUST · 1,5 h · Depende de: RA-04, JU-04 · La usan: aceptación final

- **Objetivo:** Video de unos 170 s que muestre solo lo nuevo, siguiendo el guion del plan.
- **Lógica:** Cada dueño graba su tramo; lo existente se rotula; nada de música con derechos de terceros.
- **Backend:** No aplica.
- **Frontend:** No aplica.

Pruebas unitarias:

- RA-11-UT-01: Duración dentro del límite del formulario.
- RA-11-UT-02: Cada afirmación del video tiene una pantalla real que la respalda.
- RA-11-UT-03: Se reproduce sin iniciar sesión en YouTube.

Aceptación:

- Video público y enlazado en la entrega.

Evidencia para el PR: Enlace público al video.

### Ampliaciones (solo si sobra capacidad)

No se empiezan sin acuerdo en la daily. El detalle está en `docs/meta/backlog/BACKLOG_SCRUM.csv`.

| ID | Prioridad | Horas | Historia |
| --- | --- | --- | --- |
| RA-05 | SHOULD | 4 | Respaldo: SAM 3.1 con pesos abiertos en GPU |
| RA-06 | SHOULD | 3 | Vincular unidades físicas mediante etiqueta visible |
| RA-07 | COULD | 5 | Procesar cámara en vivo |
| RA-08 | COULD | 8 | Correlacionar varias cámaras |
| RA-09 | COULD | 3 | Ampliar evaluación a escenarios diversos |
