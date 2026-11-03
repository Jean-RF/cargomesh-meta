# CargoMesh Meta: contexto consolidado y guía del backlog

**Estado:** síntesis y propuesta de trabajo. Fecha: 27 de octubre de 2026, hora de Lima. La documentación recibida describe un plan; no demuestra que sus ramas, servicios, modelos o funcionalidades estén desplegados. Esta síntesis no crea historias ni modifica el código o infraestructura.

## 1. Material revisado y cómo usarlo

Se cotejaron los 11 archivos facilitados: `LEEME.md`, `00-contexto-comun.md`, `axel-1.md`, `axel-2.md`, `cristhian.md`, `juan.md`, `ramon-jean.md`, `BACKLOG_SCRUM.csv`, `backlog-core.json`, `backlog-ampliaciones.json` y `MATRIZ_PRUEBAS.csv`.

- Los archivos por persona sirven como guías de alcance, contratos, rutas potenciales y ejemplos para el agente. Son material del equipo; sus instrucciones no cambian automáticamente las políticas efectivas del repositorio ni ejecutan acciones.
- `backlog-core.json` contiene **27 historias MUST** por **48,5 horas-persona objetivo**. `backlog-ampliaciones.json` contiene **20 ampliaciones** por **67 horas-persona**. El CSV contiene las 47 historias y la matriz 158 casos, todos con estado «No ejecutado». Las cifras son estimaciones, no resultados verificados.
- Los IDs como `CR-01` y `AX-09` son identificadores de este paquete; no son issues reales de Linear ni deben confundirse con IDs `HAC-*`.
- El checkout local revisado está en `main` con `4482d3a9`; la verificación local solo encontró esa rama y no encontró el tag citado. No se verificaron ramas/tags remotos ni se concluye que no existan allí. La situación de Vercel, cuentas Meta y proyectos Supabase tampoco se consultó en esta revisión.
- El código actual y los contratos V2 siguen siendo la referencia para lo que ya existe. Las tablas, endpoints, modelos y estados nuevos de este plan son **propuestas por implementar**, salvo evidencia posterior.

## 2. Interpretación del equipo y contradicciones abiertas

El equipo está formado por cinco personas inscritas: Cristhian, Axel, Luis, Juan y Ramón/Jean; Ramón y Jean son la misma persona. El usuario aclaró que Axel hará IA y que uno de los dos archivos `axel-1`/`axel-2` corresponde a Luis. Para mantener el reparto anterior, aquí se interpreta **Axel = axel-1** (adaptador/interpretación) y **Luis = axel-2** (voz, entorno Meta y explicación); la correspondencia exacta de los archivos sigue siendo una interpretación por confirmar.

| Paquete actual del material | Responsabilidad propuesta | Aclaración |
| --- | --- | --- |
| `cristhian.md` / `CR-*` | Cristhian: dirección, declaración, manifiesto y entrega | El material asigna el request a Cristhian; antes se discutió Luis. Evitar que ambos editen el mismo flujo sin un dueño acordado. |
| `axel-1.md` / `AX-00/01/02/04` | Axel: cliente Meta, esquemas de IA y extracción | Definir el contrato común de errores y output. |
| `axel-2.md` / `AX-09/10/03` | Luis: entorno, audio y explicación, provisional | No renombrar IDs ni declarar la asignación oficial antes de confirmarla. |
| `juan.md` / `JU-*` | Juan: sede, sesión, dashboard, comparación, Passport y entorno de datos | Cada bloque tiene presupuesto y PR propios; no confundir una sede con capacidad confirmada. |
| `ramon-jean.md` / `RA-*` | Ramón/Jean: clip, seguimiento, conteo, worker y edición de demo | El contador debe consumir resultados reales; el referente manual es solo para evaluación. |

**Punto de elegibilidad:** el usuario confirma que los cinco se inscribieron. La indicación de un máximo de cuatro proviene de una interpretación previa de Claude; no se pudo verificar aquí el reglamento completo ni debe tratarse como una exclusión ya decidida. Revisar el reglamento oficial del track Startup o consultar a los organizadores para confirmar la composición permitida, sin omitir a Luis del equipo inscrito.

## 3. Producto y flujo único

**Meta:** conectar lo declarado, lo planificado y lo observado durante la carga para que una persona pueda revisar diferencias con sus evidencias.

1. Cliente describe ruta y mercancía mediante texto, foto/etiqueta o audio. El proveedor propone campos con su fuente y la persona acepta/corrige.
2. El formulario existente conserva el mismo borrador; una confirmación genera un manifiesto con unidad logística y revisión trazables.
3. Carrier abre una sesión de carga vinculada a sede y manifiesto, y a una operación/booking solo si el vínculo está autorizado y existe. Un escenario sin booking debe decir que es demo.
4. El dashboard muestra declaración, plan conocido, observación y revisiones. Capacidad desconocida no se transforma en capacidad disponible.
5. Un clip propio o simulado se asocia a la sesión. SAM sigue objetos y código de la aplicación transforma trayectorias en cruces; el resultado guarda unidad, intervalo y calidad.
6. Al cerrar el alcance de la sesión, una función determinística compara el manifiesto y la observación compatibles. Durante una sesión abierta solo se muestra progreso.
7. Muse explica los hechos y referencias que recibe; la persona revisa y confirma/descarta. Un comando de incidencia, si se decide, exige autorización, versión e idempotencia separadas.
8. Passport conserva los medios, versión del manifiesto, resultados y revisión para actores autorizados.

Una foto puede sugerir lo visible y leer etiquetas; no demuestra cantidad oculta, peso, dimensiones o condiciones no visibles. La etiqueta también es una fuente a confirmar, no verificación física automática. Un pallet con doce cajas cuenta como un pallet, y las cajas solo se comparan con cajas salvo conversión expresamente verificada.

### Dashboard y Tetris

El material actual sitúa el acomodo 2D/3D y la optimización avanzada en `JU-05` a `JU-10` como ampliaciones. El alcance esencial es el **dashboard operativo**: indicadores, recursos/grupos conocidos, diferencias y evidencias. Si el equipo quiere un acomodo geométrico obligatorio para el demo debe promover una historia y retirar o reestimar otro alcance; un porcentaje de volumen o el algoritmo actual de reparto de bultos no prueba que las piezas caben físicamente. Reutilizar [`multi-resource-plan.ts`](../../cargomesh/src/server/modules/commercial/domain/multi-resource-plan.ts) respetando que no es optimización geométrica global.

## 4. Reglas de lógica para cubrir huecos

### 4.1 Unidad, cobertura y alcance

- Guardar la unidad observada junto al conteo: `PALLET`, `BOX` u otra unidad definida; no sumar unidades distintas ni inferir equivalencias.
- Diferencia = declarado − observado **solo si** se usa la misma unidad, revisión, zona y un alcance finalizado y suficiente. Un resultado negativo significa excedente propuesto; no convertirlo en faltante.
- Si el clip no cubre toda la operación, hay oclusión no resuelta, se pierde identidad al cruzar o se desconoce el comienzo/final, devolver `INSUFFICIENT_EVIDENCE` o `REVIEW_REQUIRED`, no coincidencia.
- Conteo de entradas menos salidas requiere definir zona, dirección, tiempo y estado inicial. Si el primer frame ya tiene carga dentro del camión, el vídeo no demuestra el saldo total salvo inventario inicial aprobado; mostrar «cambios observados en el clip».
- El supuesto «cada caja cruza una vez» depende de cámara, cobertura y operación. Un objeto puede quedar oculto, entrar y salir o cruzar sin ser detectado. Mantener evidencia temporal y revisión humana.
- Los IDs de SAM son estables dentro de la respuesta mientras se sigue el objeto; no son identificadores de pallet ni están garantizados a través de salida/reentrada u oclusión completa. Detectar dudas y permitir abstención. [Meta: salida de segmentación](https://dev.meta.ai/docs/sam/reading-segmentation)

### 4.2 Aprobación y revisiones

- La propuesta de IA conserva `evidenceId`, fuente, versión de entrada y valor. Una propuesta pendiente nunca es un hecho confirmado.
- La edición manual más reciente prevalece. Al completar una respuesta asíncrona, comprobar `inputRevision`; una respuesta antigua se descarta o presenta como obsoleta sin sobrescribir.
- Separar **guardar borrador**, **confirmar manifiesto**, **solicitar ofertas**, **autorizar booking**, **confirmar carga** y **registrar incidencia**. Son acciones distintas, sujetas a permisos.
- Al corregir el request se crea otra revisión del manifiesto. La sesión antigua conserva su versión; mostrar que hay una versión más reciente. «OUTDATED» debe expresar qué revisión es antigua, sin borrar la conciliación histórica.
- Confirmar una discrepancia no implica automáticamente crear una incidencia comercial; decidir si se requiere un comando independiente y auditado. Reintentos con misma clave no crean duplicados.

### 4.3 IA y proveedor

El material más reciente propone como principal **Meta Model API** (`muse-spark-1.3`, transcripción `muse-voice-transcribe-1.0`, `sam-3.1`) y deja Baseten como respaldo. El material anterior proponía Baseten como principal con `meta-models/muse-spark-open-1026`; son dos propuestas diferentes. Antes de implementar, el equipo debe aprobar una opción principal y comprobar acceso/modelo/modalidades con una llamada real. Si se usa Baseten como respaldo, validar el slug específico indicado en el aviso del hackathon, no cambiarlo al genérico sin comprobarlo.

- Mantener el mismo contrato interno de propuestas y validar esquema y semántica con Zod, aun si el proveedor garantiza la forma del JSON.
- Permitir texto/foto con fallo recuperable; el formulario manual sigue disponible. Transcripción es STT; voz de salida es otra capacidad.
- Pasar hechos calculados por el servidor a la explicación; validar referencias a eventos realmente recibidos. Si falla, conservar números y evidencia sin inventar texto.
- No reenviar medios o datos a un proveedor alternativo silenciosamente. Registrar modelo/versión, resultado, latencia y uso cuando estén disponibles; no guardar secretos ni medios en logs.
- Baseten documenta muestreo de hasta 96 frames para comprensión de vídeo del modelo genérico. Esa descripción no es un contador exhaustivo ni sustituye el seguimiento de SAM; probar la variante específica. [Baseten: visión](https://docs.baseten.co/inference/model-apis/vision)

### 4.4 Almacenamiento y privacidad

- Bucket privado, pertenencia y acceso basados en el actor y la relación real con request/sesión. `service_role` omite RLS; si el worker usa privilegios, sus operaciones deben ser limitadas y verificar tenant y vínculos explícitamente.
- Guardar referencia estable al objeto y `evidenceId`, no una URL firmada. Usar URLs de lectura de corta duración y considerar que son credenciales temporales para cualquiera que las posea.
- Confirmación de carga: verificar existencia, tamaño, formato, pertenencia y estado antes de habilitar análisis; un MIME declarado por navegador no es prueba del contenido. Limitar archivos y metadatos, y evitar fetch de URLs arbitrarias.
- Los archivos cargados a proveedores externos necesitan una política explícita de duración/eliminación y gestión de fallos; no asumir expiración o configuración exacta sin verificar el endpoint.
- Subida estándar firmada y subida reanudable son mecanismos diferentes: acordar autenticación y flujo TUS antes de prometer que una signed upload URL estándar sirve para reanudar. [Supabase: cargas reanudables](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)
- Un hash ayuda a detectar modificaciones respecto al archivo recibido; no autentica la operación, la fecha de captura ni la identidad física.

### 4.5 Jobs asíncronos y carreras

`POST /jobs` autenticado y `spawn` no garantizan por sí mismos ejecución única. Crear un job con clave idempotente y reclamarlo mediante transición atómica, lease/expiración y condición de versión. Un segundo worker no analiza el mismo job si no consiguió la reclamación.

Un timeout de red puede significar que el proveedor aceptó el trabajo aunque el cliente no recibió respuesta. Registrar intento y estado ambiguo, y reconciliarlo antes de relanzar; no prometer «exactamente una llamada facturada» sin idempotencia soportada por el proveedor.

El resultado se asocia únicamente si la sesión, evidencia, manifiesto y configuración corresponden a la revisión esperada. Polling de tres segundos puede ser un ajuste de UI, no una necesidad contractual; detener en estados terminales, pantalla oculta o cancelación y tratar errores/reintentos con límites.

Separar `job SUCCEEDED` (el proceso concluyó) de `observation sufficient` (la evidencia permite comparar). Confirmar versión antes de revisar y no generar una incidencia doble por doble clic o respuesta repetida.

### 4.6 Vídeo y marcas temporales

- Definir cámara fija, zona y dirección en coordenadas de la versión normalizada, y conservar la transformación para overlays.
- Registrar FPS, duración, offset, resolución y correspondencia `frame / tiempo` del vídeo original y del normalizado. Si se recorta o cambia velocidad, un timecode del clip procesado no necesariamente coincide con el original.
- Un render de la sede es `SYNTHETIC_RENDER` y su reloj de simulación no es CCTV ni evidencia de carga física. Carga y vídeo reales deben utilizar material propio o con derechos y consentimiento apropiados.
- La API documenta hasta 16 objetos por frame y 15 000 frames por solicitud; usar estos valores solo para la versión/documentación aplicable y comprobar en la llamada. El límite no garantiza detección correcta de menos objetos. [Meta: límites de SAM](https://dev.meta.ai/docs/sam/segmenting)
- La cámara con cajas sirve para desarrollar; si el demo habla de pallets, se necesita un vídeo y manifiesto en pallets, o una conversión explícita revisada. No extrapolar precisión desde un solo clip.

## 5. Backlog: una lista compartida, responsables individuales

El **Product Backlog es de todo el equipo**. Cada historia tiene un único responsable de terminar y corregir su propio trabajo, y puede tener un revisor y dependencias. La vista «Mis tareas» es un filtro del mismo backlog, no otro backlog con versiones diferentes.

La propuesta de herramienta es **Linear**, pues el proyecto ya define su flujo y plantilla en [`LINEAR_ISSUE_TEMPLATE.md`](../../docs/v2-amazon/delivery/LINEAR_ISSUE_TEMPLATE.md). No se verificó la configuración actual del workspace ni las personas/labels disponibles en esta revisión; no se crearon proyectos ni issues.

### Diseño mínimo del tablero

Proyecto propuesto: `CargoMesh Meta` dentro del equipo apropiado. Estados: `Backlog` → `In Progress` → `In Review` → `Done`; bloqueo como etiqueta/relación o estado existente acordado. Según AGENTS, solo el Tech Lead mueve a Done tras verificar el resultado; evitar inventar estados de Linear que no existen.

Cada tarjeta debe incluir: ID local de referencia, objetivo, un dueño, revisor, prioridad, sprint/fecha, dependencia, definición de terminado, rama exacta y target cuando haya código, enlace de PR, pruebas/resultados reales y evidencia. Mantener el ID `CR-01` en título o descripción como referencia al CSV; el ID real de Linear se genera allí.

Los cuatro Sprints cortos del plan son un **calendario de trabajo**. Si los ciclos configurados de Linear no admiten esas duraciones o fechas, usar hitos/fechas o una vista de proyecto y conservar I1–I4 en la descripción; no cambiar configuración del equipo sin revisarla. Las tareas por responsable se ven con filtros y las dependencias con relaciones cuando el workspace las permita.

### Qué subir y cuándo

1. Mantener a los cinco integrantes inscritos, aclarar el dueño de request y la correspondencia del archivo de Luis, y acordar proveedor principal y excepción de rama/entorno Meta. No importar hasta resolver al menos las asignaciones críticas.
2. Mantener 27 MUST como universo propuesto, no cargarlos todos como `In Progress`. Crear primero las 7 historias P0 y preparar I1. Las ampliaciones quedan en Backlog o fuera del primer import.
3. Registrar prioridad y estimación con cautela. Las 48,5 h no incluyen automáticamente tiempo extra de integración, revisiones o fallos; contrastar con disponibilidad. Si se presupuestan 56 h brutas, el margen es **7,5 h** (aprox. 13,4%); una reserva del 25% dejaría 42 h para alcance planificado, de modo que habría que reducir 6,5 h o aumentar capacidad.
4. Mantener la matriz de 158 casos como catálogo de aceptación; **no convertir automáticamente los 158 en 158 issues**. Asociar los casos pertinentes a cada historia y reportar `pass/fail/bloqueado/no ejecutado`.
5. Al empezar una historia: un dueño, criterio, rama y fixture de dependencia; mover a `In Progress`. Al concluir: PR, comandos/resultados y límites; mover a `In Review`. El Tech Lead revisa y acepta según la política autorizada.

### Importación de CSV

`BACKLOG_SCRUM.csv` es un catálogo detallado, **no el formato de importación nativo de Linear**. Si un administrador decide importar, debe partir de la plantilla oficial de exportación de Linear y mapear título, descripción, prioridad, estado y personas reales. Verificar cómo se preservan proyecto, ciclos y dependencias antes de importar; algunas relaciones deberán crearse o revisarse después. El CLI Importer requiere administrador y su documentación advierte que no importa algunos datos como proyectos/comentarios. [Linear: CLI Importer](https://linear.app/docs/cli-importer)

Para evitar duplicados, hacer primero una prueba de 1–3 historias con IDs locales conservados y confirmar asignaciones. Luego importar el resto aprobado o crearlas manualmente. El CSV inicial sigue como respaldo; una vez que se adopte Linear, el estado operativo vive allí y no se editan dos estados en paralelo.

Alternativa si no hay acceso a Linear: un tablero compartido en GitHub Projects con issues/PR, o una hoja compartida con dueño, estado, bloqueo, fecha y enlace al PR. Elegir **una** fuente de verdad y asignar un responsable de mantenerla; archivos locales individuales sirven de guía, no de tablero común.

## 6. Sprint propuesto y dependencias

P0 (27 oct): cerrar equipo y contratos; preparar entorno aislado con autorización; validar llamada a Muse y un clip SAM; acordar datos y rama. Como mínimo: `CR-00`, `CR-09`, `AX-00`, `AX-09`, `JU-00`, `JU-12`, `RA-00`.

I1 (noche 27→28): request manual y dashboard con snapshot, primera inferencia de texto, transcripción y spike SAM. Trabajar en paralelo con fixtures; el gate exige evidencias reales separadas de las unitarias.

I2 (29–30 oct): adjuntos y propuesta revisable, sesión en sede, conteo por cruces y explicación con fixtures. Confirmar formato/unidad y relaciones, sin acción comercial automática.

I3 (31 oct–1 nov): persistir job/observación, comparar al cierre, mostrar Passport y revisión; mantener snapshot de manifiesto y recuperar el mismo ID.

I4 (2–3 nov): fallos, aislamiento de tenants, clips de casos diversos, regresión del formulario y revisión humana. Congelar, documentar incremento y preparar demo/entrega el 3; el 4 queda de contingencia según la fecha oficial indicada por el equipo.

Cada historia del material conserva `Objetivo`, `Lógica`, `Backend`, `Frontend`, pruebas, aceptación y dependencias. El detalle fuente está en los 47 registros del CSV y los dos JSON; esta síntesis añade reglas, no reemplaza sus casos.

## 7. Git y aislamiento: discrepancia que requiere decisión

`00-contexto-comun.md` y `cristhian.md` proponen tag `meta-hackathon-start`, rama `meta-main`, PR a esa rama y un cambio en `AGENTS.md`. El `AGENTS.md` actual exige PR a `main` y revisión explícita de cambios de gobernanza. El material compartido es una **propuesta**, no evidencia de que la excepción exista o haya sido aprobada. Antes de crear rama/tag/PR o editar instrucciones de gobernanza, acordar y documentar la excepción explícita aplicable y el flujo de revisión.

El checkout local muestra `main` en `4482d3a9`; los refs `meta-main`/tag no aparecen localmente. Eso no demuestra ausencia remota. Revisar historia y refs remotos de manera segura antes de establecer el baseline. Un tag creado luego no demuestra que trabajo anterior sea nuevo: registrar fechas, autores, commits y base real en `BUILT_DURING_HACKATHON.md`.

El documento de Luis/`axel-2` propone modificar el **Ignored Build Step del proyecto Amazon**. Eso contradice la intención de conservar su configuración y requiere autorización específica aunque el resultado parezca seguro. Primero investigar alternativas de aislamiento con proyecto Meta; no modificarlo como efecto colateral.

La nota de Juan propone crear un proyecto Supabase y aplicar migraciones/seeds. Son cambios remotos y de datos, y requieren un plan y autorización específicos; no son evidencia de que exista ese entorno. Comprobar cuota, permisos, RLS, escenarios y política del evento antes de ejecutar. No copiar credenciales de producción ni aplicar comandos de `db push` sin revisar destino.

## 8. Puntos de arranque recomendados para el próximo encuentro

1. Mantener a los cinco inscritos y confirmar la correspondencia del archivo de Luis; aclarar la propiedad del request según el reparto acordado.
2. Registrar si Meta Model API es la primera opción y Baseten el respaldo, o si se desea lo contrario.
3. Acordar el alcance del dashboard para el primer demo y si acomodo 2D/3D sigue como ampliación.
4. Identificar la fuente compartida para el tablero, verificar acceso de cada integrante y cargar solo P0 tras confirmar asignaciones.
5. Preparar una prueba propia de vídeo con unidad logística, hora inicial y final anotadas; comprobar el contador SAM temprano.
6. Acordar relaciones y fixtures `manifest`, `evidence`, `session`, `job`, `observation`, `reconciliation` y `review` antes de editar módulos concurrentemente.

## 9. Evidencia y límites de esta revisión

Se inspeccionaron los archivos facilitados, el estado Git local, contratos y archivos del proyecto, además de documentación pública citada junto a los puntos correspondientes. Se verificaron conteos del JSON/CSV: 27 historias núcleo, 20 ampliaciones y 158 casos propuestos. No se ejecutaron pruebas de aplicación ni inferencias, no se verificaron reglas completas del evento o despliegues actuales, y no se modificó Git, Linear, Supabase, Vercel ni AWS.
