# Plan completo de Cristhian: declaración, manifiesto e integración

Fecha: 27 de octubre de 2026. Responsable: Cristhian, asistido por Codex. Rama: `codex/meta-cristhian`. PR de trabajo: [#3](https://github.com/Chujutak2024/meta-hackathon/pull/3), destino `main` de `Chujutak2024/meta-hackathon`.

**Lectura del estado vigente, 28-oct:** [Entrega actual](ENTREGA_ACTUAL.md) distingue planificación e implementación. El flujo manual tiene evidencia local en `e0c55f8`; las secciones de inicio siguientes conservan su corte histórico. Para aceptar la UI usa la [guía de usuario](pruebas/GUIA_USUARIO_CR01.md); el expediente aún pendiente tiene [criterios propios](contracts/EXPEDIENTE_DOCUMENTAL_MVP.md).

**Estado:** plan y mapa basados en lectura del código, con incrementos parciales CR-00 y backend CR-01 descritos debajo. El resto sigue planificado; no acredita pruebas del producto, un flujo completo ni acuerdos de Axel/Juan/Luis todavía no recibidos. No crear otra rama ni otro PR para ejecutar estas historias.

**Inicio de ejecución CR-00:** se ha añadido [el contrato candidato 0.1 y mapper puro](contracts/DECLARED_MANIFEST_CR00.md), con ejemplos sintéticos. Persistencia, aplicación de propuestas, confirmación, revisión de consumidores y validación ejecutable continúan pendientes. El resto de este archivo mantiene el plan de trabajo; no es evidencia de funcionalidades terminadas.

**Inicio de ejecución CR-01:** a petición de Cristhian se preparan [servicio y endpoints Hono](contracts/MANIFEST_HTTP_CR01.md), con persistencia por RPC y migración local sin aplicar. No se ejecutaron pruebas/typecheck/build/SQL y no se conectó UI. Axel y Juan mantienen sus entregas aparte; la implementación de nuestra base puede avanzar con contratos explícitos sin dar por aceptado su trabajo. El expediente documental queda como incremento separado, no incluido silenciosamente en estos endpoints.

**Registro del 28-oct:** backend guardado en `3b7b544`; flujo documental y evidencia de publicación en `351562d`; entrada directa de la vista previa local y Organización sin consultas autenticadas en `5b30f8c`. La sincronización de la rama incorpora main `a5c2a4d` y mantiene el PR #3 como entrega en revisión. Este corte no aplica SQL, no conecta la confirmación al formulario y no ejecuta pruebas adicionales. La vista previa utiliza datos de ejemplo y no guarda manifiestos.

**Incremento posterior autorizado, 28-oct:** [validación local y formulario conectado](VALIDACION_CR01_2026-10-28.md). Pasos 2 y 3 implementados y comprobados en la base aislada Meta elegida por el usuario: migración, permisos/idempotencia/versiones y guardar → preparar → revisar → confirmar → reabrir. Sustituye el estado pendiente del corte anterior solo para ese entorno y recorrido manual; la base alojada, expediente, medios, IA real y conexiones de otros módulos siguen fuera de este cierre.

**Ampliación documental solicitada el 27-oct:** [flujo de pedido, expediente documental y carga](FLUJO_PEDIDO_DOCUMENTOS_Y_CARGA.md). Separa solicitud de orden/Booking, documentos corporativos reutilizables de los específicos del envío y del carrier, requisitos por etapa y permisos para compartir. Incluye estados, casos y contratos propuestos. CR-DOC-01/02 son alcance adicional pendiente de estimación/acuerdo; no se añaden silenciosamente al compromiso original ni se da por implementado el expediente.

## 1. Objetivo y límite de nuestro frente

Conseguir que texto, fotografía, etiqueta o audio alimenten el mismo borrador del formulario actual; que el usuario revise las propuestas; y que su confirmación produzca un manifiesto versionado vinculado al mismo pedido. Juan utilizará ese manifiesto en su sesión/dashboard y Ramón lo usará indirectamente como referencia de lo esperado.

Secuencia del producto completo:

```text
Texto / imagen / etiqueta / audio
    -> evidencia privada y captura del borrador (Cristhian)
    -> transcripción, cuando haya audio (Luis)
    -> interpretación y propuesta validada (Axel)
    -> revisión humana y manifiesto confirmado (Cristhian)
    -> sesión / Tetris dashboard (Juan)
    -> vídeo / observaciones / conteo (Ramón)
    -> comparación determinística (Juan)
    -> explicación (Luis) / Passport y revisión (Juan)
```

| Dueño | Implementa | Nosotros hacemos |
| --- | --- | --- |
| Cristhian | Captura, medios privados, revisión, manifiesto e integración | Implementar y comprobar este frente |
| Axel | Cliente IA, contrato y adaptadores de interpretación | Consumir el contrato y presentar la propuesta |
| Luis | Entorno, transcripción y explicación | Entregar audio autorizado y conectar su transcripción al borrador |
| Juan | Sesiones, Tetris/dashboard, comparación y Passport | Entregar manifiesto/revisión y resolver el vínculo con el pedido |
| Ramón/Jean | Vídeo, SAM, contador y worker | Acordar con Juan las unidades y evidencias del manifiesto |

No duplicaremos el módulo de Luis, el cliente de Axel o la comparación de Juan. Tetris es una superficie de Juan; no forma parte de la implementación de nuestro formulario. El [objetivo común](OBJETIVO_Y_CONEXIONES.md) y el [acuerdo de entrega/reintegración](ENTREGA_Y_REINTEGRACION.md) gobiernan la integración y la publicación; el producto general de cinco módulos no equivale automáticamente a una candidata elegible Indie.

## 2. Base realmente inspeccionada

Aplicación de nuestra rama: snapshot CargoMesh importado y preparación compartida sobre `main` `6f70f50`. Contrato de Axel inspeccionado: [PR #4, revisión 74bfe46](https://github.com/Chujutak2024/meta-hackathon/tree/74bfe467758000de30bc80a70c956d91c02c07c9).

| Área | Archivo existente | Observación relevante |
| --- | --- | --- |
| Formulario y pasos | [v2-intake-prototype.tsx](../../cargomesh/src/features/v2-intake/v2-intake-prototype.tsx) | Cuatro pasos y resumen; reutilizar esta superficie |
| Estado local | [prototype-model.ts](../../cargomesh/src/features/v2-intake/prototype-model.ts) | Inputs numéricos representados como texto; admite pendientes durante la captura |
| Grupos | [cargo-groups.ts](../../cargomesh/src/features/v2-intake/cargo-groups.ts) | Primer grupo más grupos adicionales; IDs locales como `group-0`; totales derivados |
| Controlador | [intake-controller.ts](../../cargomesh/src/features/v2-intake/intake-controller.ts) | Creación/revisión, relectura, concurrencia local y recuperación de request |
| Sesión compartida | [intake-session.tsx](../../cargomesh/src/features/v2-intake/intake-session.tsx) | Formulario y asistente comparten estado |
| Asistente | [client-assistant.tsx](../../cargomesh/src/features/v2-intake/client-assistant.tsx) y [conversation-chat.tsx](../../cargomesh/src/features/v2-intake/conversation-chat.tsx) | Entradas y revisión sobre el mismo borrador |
| Contrato persistido | [freight-request.ts](../../cargomesh/src/shared/schemas/v2/freight-request.ts) | Cantidades enteras y medidas positivas, contactos y ventanas válidas |
| Creación del pedido | [draft-service.ts](../../cargomesh/src/server/modules/freight-requests/application/draft-service.ts) | Actor/tenant, idempotencia y huella del payload |
| Detalle de pedido | [request-workspace.tsx](../../cargomesh/src/features/shipper-portal/request-workspace.tsx) | Su editor expone datos de la primera unidad; hay que preservar todos los grupos al conectar revisiones |
| Propuesta de Axel | [MODEL_PROPOSAL.md en 74bfe46](https://github.com/Chujutak2024/meta-hackathon/blob/74bfe467758000de30bc80a70c956d91c02c07c9/docs/meta/contracts/MODEL_PROPOSAL.md) | Contrato 1.0 de propuestas; no es el manifiesto confirmado ni un servicio de persistencia |

AX-00 y el adaptador de texto de AX-01 están integrados en main por el PR #4 (`a5c2a4d`) y se incorporan a nuestra rama mediante sincronización de esa base el 28-oct. Eso no acredita foto/audio multimodal, acceso real al modelo ni conexión de propuestas con la confirmación del manifiesto. Se conserva el cliente de Axel sin duplicarlo.

## 3. Pantallas que modificaremos

| Ruta/superficie actual | Cambio de nuestro frente | Alcance |
| --- | --- | --- |
| `/clients` | Continuar la declaración desde la entrada al asistente sin perder el borrador; enlazar al formulario existente | Adaptación acotada |
| `/clients/freight-request/new` | Adjuntos, propuestas revisables, pendientes y confirmación del manifiesto en los cuatro pasos | Pantalla principal |
| Asistente flotante/lateral | Imagen/audio, transcripción revisable y propuestas asociadas al mismo borrador | Componente compartido, no nueva ruta |
| `/clients/requests` | Retomar el mismo pedido y mostrar revisión de la declaración cuando esté disponible | No inventar nuevos estados comerciales |
| `/clients/requests/[id]` | Declaración confirmada, evidencias autorizadas, revisiones y edición consistente | Conservar todos los grupos |

No se requiere una nueva página completa para crear un envío. Se proponen bloques reutilizables dentro de las superficies anteriores: adjuntos de declaración, revisión de propuesta, resumen del manifiesto e historial acotado de revisiones. Sus nombres de componente y ubicación concreta se fijan durante CR-01/CR-02.

| Paso existente del formulario | Qué añadiremos o reutilizaremos |
| --- | --- |
| Selector de transporte | Mantener ROAD disponible y continuidad del borrador; no activar AIR/SEA por presentación |
| 1. Sedes | Mantener selector/mapa. Una ubicación mencionada por el usuario debe resolverse a una sede autorizada o a un formato manual válido; no elegir arbitrariamente una sede |
| 2. Carga y unidades | Adjuntos y revisión de embalaje, cantidad, contenido y medidas por grupo; mantener condiciones, divisibilidad y apilamiento |
| 3. Ventanas y contactos | Mostrar datos conocidos y pedir lo que falta; aplicar una transcripción no inventa horarios ni correos |
| 4. Crear y evaluar | Resumen de datos revisados, consentimiento y guardado coherente; separar manifiesto confirmado de evaluación comercial |

Las nuevas superficies de sesión, Tetris y Passport pertenecen a Juan. Nuestra integración no autoriza un rediseño general de Flota, Comercial, Órdenes, sedes 3D, login o navegación.

## 4. CR-00 explicado: mapa de traducción y acuerdo de significado

**CR-00 no es llenar una tabla por trámite. Es acordar qué significa cada dato y cómo pasa de una parte del sistema a otra sin cambiar su sentido.** La misma información tiene nombres y formatos distintos en la pantalla, en la propuesta de Axel y en el pedido persistido. Juan necesita después una referencia confirmada y estable.

Ejemplo: «12 pallets de repuestos industriales, de 100 kg cada uno».

| Punto del recorrido | Representación | Significado |
| --- | --- | --- |
| Propuesta de Axel | `unitType = PALLET`, `unitQuantity = 12`, `unitWeightKg = 100` | Sugerencias extraídas del texto, pendientes de confirmación |
| Formulario actual | `unitPackageType`, `unitQuantity = "12"`, `unitWeightPerUnitKg = "100"` | Inputs editables del grupo seleccionado |
| Pedido válido | `cargoSpecification.units[i].packageType`, `.quantity = 12`, `.weightPerUnitKg = 100` | Valores tipados, validados y guardados |
| Total calculado | `totalWeightKg = 1200` | 12 por 100, calculado por código; no otro valor inventado por el modelo |
| Manifiesto de Juan | Grupo confirmado, unidad PALLET, cantidad 12, revisión identificada | Base esperada de una sesión de carga |

Si dentro de cada pallet hay 12 cajas, siguen siendo **12 pallets** y, si se declaró esa relación, 144 cajas contenidas. No se suman como 156 unidades ni se comparan 12 pallets declarados con 144 cajas observadas como si fueran la misma unidad.

Si no se dieron dimensiones o volumen, permanecen pendientes durante la captura. El esquema actual de creación del pedido exige esas medidas válidas: el texto del ejemplo por sí solo no forma un payload completo ni autoriza rellenar ceros.

### 4.1 Matriz de campos del formulario actual

`i` representa el índice del grupo objetivo, cuya identidad debe resolverse explícitamente. Los campos del manifiesto nuevo siguen propuestos hasta acordarlos con Juan; los nombres de formulario y pedido de esta tabla proceden del código existente.

| Dato | Formulario actual | Propuesta de Axel 1.0 | Pedido/uso persistido | Regla de CR-00 |
| --- | --- | --- | --- | --- |
| Origen | `originFacilityId` | No está entre los campos de carga permitidos | `origin.facilityId` y ubicación canónica | Resolver sede autorizada; una ciudad no es un UUID de sede |
| Destino | `destinationFacilityId` | No está entre esos campos | `destination.facilityId` | No confundir etiqueta visible e identidad |
| Categoría | `categoryCode` | No está entre esos campos | `cargoSpecification.categoryCode` | Catálogo válido; no aceptar un texto libre como código |
| Contenido | `cargoDescription` | `cargoDescription` | `cargoSpecification.description` | Propuesta con procedencia, revisada por el usuario |
| Embalaje global | `packaging` | No es un campo independiente | `cargoSpecification.packaging` | Distinguirlo del embalaje de cada grupo; resolver compatibilidad con catálogo |
| Tipo de unidad del grupo | `unitPackageType` | `unitType`, solo PALLET/BOX | `units[i].packageType` | Mapeo explícito; no tratar PALLET/BOX como todo el catálogo soportado |
| Cantidad | `unitQuantity` | `unitQuantity` | `units[i].quantity` | Entero positivo; nunca totalizar unidades incompatibles |
| Peso por unidad | `unitWeightPerUnitKg` | `unitWeightKg` | `units[i].weightPerUnitKg` | kg de cada unidad declarada, no peso total |
| Volumen por unidad | `unitVolumePerUnitM3` | No está en la salida 1.0 | `units[i].volumePerUnitM3` | m³; dato revisado. No inferirlo de una foto sin escala |
| Largo | `unitLengthCm` | `unitLengthCm` | `units[i].dimensionsCm.length` | cm por unidad; convertir metros solo con entrada explícita y regla conocida |
| Ancho | `unitWidthCm` | `unitWidthCm` | `units[i].dimensionsCm.width` | cm por unidad |
| Alto | `unitHeightCm` | `unitHeightCm` | `units[i].dimensionsCm.height` | cm por unidad |
| Peso total | `totalWeightKg` | No es un campo de la salida 1.0 | `cargoSpecification.totalWeightKg` | Derivar de todos los grupos completos; una suma parcial no es el total |
| Volumen total | `totalVolumeM3` | No es un campo de esa salida | `cargoSpecification.totalVolumeM3` | Derivar de cantidad por volumen por unidad de cada grupo |
| Condiciones | `requirements` | `handlingRequirements` | `cargoSpecification.requirements` | Traducir a códigos admitidos; texto no reconocido requiere revisión |
| Temperatura | `temperatureMinCelsius`, `temperatureMaxCelsius` | Sin rango numérico específico | `cargoSpecification.temperatureRange` | No inventar valores al detectar «refrigerado» |
| División de carga | `divisible` | No está entre esos campos | `cargoSpecification.divisible` | Decisión explícita; un checkbox inicial no demuestra consentimiento |
| Pieza indivisible | `unitIndivisible` | No está entre esos campos | `units[i].indivisible` | Distinto de permitir dividir el conjunto entre vehículos |
| Apilamiento | `unitStackable` | No está entre esos campos | `units[i].stackable` | No deducir resistencia o apilamiento seguro de apariencia |
| Grupos adicionales | `additionalUnits` y `primaryGroupId` | La salida 1.0 no lleva un grupo destino | `cargoSpecification.units[]` | Acordar selección/identidad del grupo antes de aplicar una propuesta |
| Recojo | `pickupWindowStartsAt/EndsAt` | Fuera del contrato de carga 1.0 | `pickupWindow` | Hora local presentada, instantes con zona/offset al persistir |
| Entrega | `deliveryWindowStartsAt/EndsAt` | Fuera de ese contrato | `deliveryWindow` | Ventanas válidas y orden temporal coherente |
| Otras fechas | `pickupAlternatives`, `deliveryAlternatives`, `planningTimeZone` | Fuera de ese contrato | `planningPreferences`, cuando aplique | Conservar alternativas; no inventar recurrencias |
| Contactos | `pickupContact*`, `recipientContact*` | Fuera de la propuesta de carga 1.0 | `contacts.pickup`, `contacts.recipient` | Teléfono normalizado y correo opcional; no crear correos de relleno |
| Equipo requerido | `requiredEquipment` | No está entre esos campos | `requiredEquipment` | Requisito distinto de un camión asignado o capacidad confirmada |
| Prioridad/tamaño | `urgency`, `loadSize` | Fuera de ese contrato | `planningPreferences`, según el mapper vigente | No usarlos como oferta, reserva o capacidad disponible |

El hecho de que la propuesta de carga de Axel no incluya fechas/contactos/sedes no demuestra que el chat completo carezca de esos caminos: AX-01 conserva rutas de manejo existentes. CR-00 debe identificar qué fuente real entrega cada valor y evitar atribuirlo a `ModelProposal` cuando no pertenece a ese contrato.

### 4.2 Identificadores y revisiones que no se pueden mezclar

| Identidad/revisión | Qué representa | Regla |
| --- | --- | --- |
| `request.id` / `requestId` | UUID del pedido persistido existente | Mantenerlo al revisar; no crear otro pedido por corregir cantidad |
| `referenceCode`, por ejemplo PED-… | Referencia visible | No sustituye el UUID en APIs o autorización |
| `draftVersion` | Versión persistida del pedido | Comparación de concurrencia al guardar |
| `inputRevision` | Revisión de la captura/turno usada para interpretar | Sirve para descartar respuestas antiguas; no equivale automáticamente a `draftVersion` |
| `evidenceId` | Evidencia autorizada | No es URL firmada, ruta de Storage ni credencial |
| `group-0`, `group-1` actuales | Identidad local del editor | No asumir que ya son IDs persistentes o UUIDs |
| Identidad de grupo del manifiesto | Identidad estable propuesta para revisiones y consumidores | Acordar cómo se conserva al reordenar, editar, añadir o quitar grupos, sin insertar propiedades no admitidas en el request actual |
| `manifestId` y revisión de manifiesto | Contrato nuevo por acordar con Juan | Propuesta: identidad lógica y revisión inmutable con unicidad por pedido/revisión; no confundir con versión comercial |
| `sessionId` de carga | Sesión creada por Juan | Conserva la revisión del manifiesto que se evaluó |
| Captura temporal | Contexto autorizado antes de existir un pedido | Diseño pendiente; no crear un pedido comercial vacío para tener un ID |

### 4.3 Acuerdos concretos con Axel

1. Reutilizar su schema 1.0 y sus errores; no crear una respuesta alternativa de IA en nuestro frontend.
2. Su input actual contiene texto y hasta cuatro referencias únicas de evidencia; la aplicación resuelve acceso y contexto autorizado. No introducir URLs firmadas o datos de organización en la salida del modelo.
3. Sus ocho campos de carga permitidos se mapean explícitamente a los nombres del formulario; peso/dimensiones son por unidad. Los totales se calculan en dominio.
4. Falta definir el grupo objetivo en el caso multigrupo: la salida 1.0 no lleva esa identidad. Propuesta de MVP: una propuesta se vincula a un grupo seleccionado y a una revisión; si el contexto es ambiguo, se pide aclaración. Acordar el contexto/envoltorio con Axel; no ampliar silenciosamente su schema.
5. El valor propuesto y su procedencia siguen siendo revisables. Una advertencia o JSON válido no certifica la verdad física de la carga.
6. Antes de aplicar, comprobar revisión vigente y que el grupo/evidencia siguen disponibles. Una edición manual posterior prevalece.
7. Probar la interfaz con fixtures rotulados mientras AX-02 no entregue transporte multimodal real. No presentar esos fixtures como inferencia.

### 4.4 Acuerdos concretos con Juan

1. Qué snapshot confirmado necesita su sesión: pedido, revisión fuente, grupos, unidades, cantidades, medidas verificadas/pendientes, evidencia y autor/fecha de confirmación.
2. Qué identidad de manifiesto/revisión se conserva. Una sesión abierta con rev1 no se actualiza silenciosamente a rev2.
3. Qué unidad cuenta el vídeo y cómo se segmenta su alcance. PALLET, BOX y cajas contenidas no son equivalentes.
4. Cómo se enlaza el mismo pedido desde Cliente a la operación/sesión, sin inventar booking o ejecución.
5. Quién escribe cada migración: Cristhian es dueño del dominio de manifiestos/medios; coordinar con Juan la integración SQL, RLS y entorno sin duplicar tablas. La aplicación remota requiere autorización específica.
6. Qué lectura indicará evidencia parcial, revisión obsoleta o unidades no comparables; Luis explica los hechos de Juan, no los recalcula.

### 4.5 Acuerdo adicional con Luis

Nosotros capturamos y subimos audio autorizado; Luis transcribe; Axel interpreta el texto resultante. Conservar `evidenceId`, revisión y origen audio hasta la revisión humana. Acordar formato, límites y errores del audio con Luis antes de fijar la captura; su servicio no debe recibir cualquier URL arbitraria suministrada por el navegador.

### 4.6 Cuándo termina CR-00

| Entregable | Responsable | Evidencia/estado al escribir el plan |
| --- | --- | --- |
| Mapa formulario -> propuesta -> pedido -> manifiesto | Cristhian | Primera versión documental en este archivo; no validada funcionalmente |
| Adaptación de los ocho campos de carga y manejo multigrupo | Cristhian + revisión de Axel | Acuerdo pendiente |
| Identidades y snapshot de manifiesto para sesión | Cristhian + revisión de Juan | Acuerdo pendiente |
| Flujo audio/evidencia/transcripción | Cristhian + revisión de Luis | Acuerdo pendiente |
| Ejemplos completo, incompleto, corrección y rechazo | Productor de cada contrato; consumidores revisan | Ejemplos y futuros fixtures por cerrar |
| Decisiones abiertas resueltas sin reglas contradictorias | Cristhian coordina | Pendiente |

CR-00 se cierra cuando los consumidores pueden implementar el mismo significado con ejemplos compartidos. Este documento por sí solo no acredita la aceptación de los otros responsables ni permite marcar la historia Done.

## 5. Ejecución por incrementos

### Incremento A — CR-00: contratos y mapa

- **Objetivo:** cerrar los acuerdos de la sección 4 antes de extender el formulario.
- **Backend:** identificar schemas, servicios, errores y persistencia existentes; proponer el contrato nuevo de manifiesto/medios sin implementar un segundo request.
- **Frontend:** localizar cada campo y su grupo objetivo; definir procedencia, datos pendientes y confirmación.
- **Dependencias:** AX-00 de Axel y JU-00 de Juan; audio con Luis.
- **Salida verificable:** matriz acordada, ejemplos y decisiones de revisión/identidad, con responsables que los revisaron.

### Incremento B — CR-01: declaración manual confirmada

- **Objetivo:** formulario manual -> revisión -> pedido/manifiesto -> reapertura del mismo pedido.
- **Backend:** reutilizar validadores, autorización, idempotencia y control de versión; crear servicio/repositorio de manifiesto y relación con el request. Diseñar una operación consistente para guardar revisión y snapshot; si hay escrituras separadas, acordar estado recuperable e idempotente antes de anunciar confirmación.
- **Frontend:** bloque «Declarado por ti», pendientes y revisión dentro del intake; una acción coherente de confirmar/guardar evita tres confirmaciones redundantes. Reutilizar controles actuales.
- **Persistencia:** migraciones aditivas para el nuevo dominio, con restricciones, índices y RLS por organización. Separar datos sintéticos de estructura. Prepararlas no autoriza ejecutarlas remotamente.
- **Dependencias:** base CR-00 de nuestro frente. Por la indicación posterior de Cristhian, la implementación backend avanza de forma independiente; la compatibilidad con Axel/Juan se revisa al integrar sus entregas, sin darla por aceptada. No requiere una llamada real de IA.
- **Salida verificable:** mismo `requestId` al reabrir, grupos conservados, manifiesto/revisión identificables y errores recuperables.

### Incremento C — CR-02, parte 1: medios privados y captura

- **Objetivo:** foto/etiqueta/audio asociados a una captura o pedido autorizado.
- **Backend:** alta de evidencia pendiente, subida autorizada, verificación del objeto, estado utilizable y acceso temporal. Verificar tamaño y tipo real; diseñar retención/limpieza de subidas abandonadas y revocación antes de confirmar. Los nombres concretos de rutas son propuestas, no APIs disponibles.
- **Antes del request:** usar captura temporal autorizada por actor/organización; al guardar, vincular las evidencias de forma consistente. No romper el schema del request para aceptar registros vacíos.
- **Frontend:** selector de imagen, previsualización, progreso, cancelar/quitar y reintentar sin duplicar asociaciones; grabación de nota de voz, detener/cancelar y alternativa de texto.
- **Dependencias:** límites de entrada acordados con Axel y Luis; entorno de medios autorizado/configurado.
- **Salida verificable:** evidencia privada vinculada al contexto correcto y resto del formulario usable ante fallo de cámara/micrófono/subida.

### Incremento D — CR-02, parte 2: propuestas revisables

- **Objetivo:** medios/texto -> interpretación -> propuesta -> aceptación/corrección -> mismo borrador.
- **Backend:** entregar referencias autorizadas al adaptador de Axel; consumir transcripción de Luis; validar propuesta y correlación. No duplicar el SDK de IA ni guardar automáticamente su respuesta como un hecho.
- **Frontend:** mostrar origen de cada sugerencia, pendientes y advertencias; aceptar/corregir valores y elegir grupo cuando sea necesario. Descartar resultados tardíos tras edición, reset, navegación o cambio de grupo.
- **Dependencias:** AX-02 para medios reales y AX-10 para transcripción; hasta entonces los fixtures son solo desarrollo rotulado.
- **Salida verificable:** foto/audio llegan al mismo borrador y no pisan decisiones recientes. La confirmación humana sigue siendo necesaria para persistir la declaración.

### Incremento E — CR-03: revisión, reapertura y continuidad

- **Objetivo:** corregir un pedido sin duplicarlo ni alterar el manifiesto ya observado.
- **Backend:** snapshot por revisión, lectura vigente/anterior y conflicto estable ante versión obsoleta. Distinguir reintento del mismo comando de una revisión nueva. Aplicar el ciclo de vida existente: no asumir que un pedido ya enviado o reservado admite el mismo comando que un DRAFT.
- **Frontend:** listado/detalle muestran revisión y acceso a evidencias; edición consistente de todos los grupos, incluida la conexión con el editor del detalle. Avisar cuando una sesión usa otra revisión.
- **Continuidad:** abrir/cerrar asistente, navegar y reabrir no deben duplicar pedidos ni perder grupos. Distinguir dato guardado, edición pendiente y subida pendiente.
- **Dependencias:** CR-02 y vínculo de sesión de JU-02.
- **Salida verificable:** cadena estable pedido -> revisión -> manifiesto -> sesión, sin reescritura silenciosa de lo evaluado.

### Incremento F — conexión del producto completo

- **Objetivo:** sustituir fixtures por módulos reales conforme sus dueños los entreguen, sin esperar a terminar los detalles visuales de todos.
- **Orden:** manifiesto manual -> propuestas/transcripción -> sesión/dashboard -> observaciones del worker -> comparación -> explicación/Passport.
- **Responsabilidades:** Juan crea la sesión y la comparación; Ramón produce observaciones; Luis transcribe/explica; nosotros resolvemos la continuidad del pedido y sus evidencias. Un error funcional vuelve al dueño de su módulo.
- **Revisiones:** registrar los SHAs/componentes usados en cada ensayo; sincronizar cambios aceptados desde main, sin merges oportunistas de funcionalidad entre ramas de integrantes.
- **Salida verificable:** el mismo envío recorre el producto con IDs, revisiones, unidades y evidencia compatibles. El alcance presentable en el evento se selecciona por separado conforme al acuerdo de entrega.

### Incremento G — CR-04 y CR-10: aceptación, mejoras y evidencia

- **Objetivo:** cerrar permisos, recuperación y recorrido completo; después pulir estados, textos, accesibilidad y transiciones.
- **Backend:** verificaciones proporcionales de servicios, RLS, reintentos y concurrencia; llamadas reales al proveedor se autorizan/configuran y registran aparte.
- **Frontend:** revisión humana de escritorio/móvil, foco, teclado, progreso, vacíos, error y reintento. La revisión visual queda a cargo de Cristhian; no atribuirla a una captura o un test de datos.
- **Entrega:** actualizar el cuerpo del PR, registro de funcionalidades nuevas y evidencias por commit; conservar lo pendiente sin inventar métricas o aprobaciones. El trabajo completo de los cinco conserva el compromiso de publicación posterior.
- **Salida verificable:** aceptación real documentada y candidato de entrega identificado; no prometer que todas las incidencias restantes serán solo visuales.

## 6. Pruebas propuestas para cuando se implemente

No ejecutadas como parte de este plan. Descubrir comandos vigentes en `cargomesh/package.json` al implementar; no copiar conteos históricos como criterio de aprobación.

| Área | Casos mínimos propuestos | Dueño de la comprobación |
| --- | --- | --- |
| Unidades | Pallets con cajas contenidas; grupos PALLET/BOX separados; cantidad fraccionaria rechazada | CR y consumidor Juan |
| Medidas | Peso por unidad frente a peso total; conversión explícita de unidades; falta una medida y total pendiente | CR |
| Propuesta | Campo no admitido; grupo ambiguo; evidencia ajena; respuesta de revisión antigua | Axel en su límite; CR al aplicar |
| Edición | El usuario corrige mientras llega el modelo; quita el grupo objetivo; reinicia el formulario | CR |
| Guardado | Doble envío; misma clave con payload distinto; versión obsoleta; fallo intermedio recuperable | CR |
| Reapertura | Mismo ID y todos los grupos; snapshot anterior conservado por una sesión | CR y Juan |
| Medios | Tipo/tamaño incorrecto; upload cancelado; asociación repetida; acceso entre organizaciones | CR |
| Audio | Micrófono denegado; archivo incompatible; transcripción pendiente/fallida; continuar manualmente | CR y Luis |
| Proveedor | Configuración ausente; indisponibilidad; reintento acotado y mensaje recuperable | Axel; CR en UI |
| Operación | Unidad distinta; vídeo parcial; revisión distinta; doble callback no duplica observaciones | Juan y Ramón |
| Interfaz | Teclado/foco, móvil, progreso, error y preservación del borrador | CR; revisión visual de Cristhian |

## 7. Decisiones abiertas que deben cerrarse en CR-00

| Decisión | Propuesta de arranque | Quién la revisa |
| --- | --- | --- |
| Grupo objetivo de una propuesta 1.0 | Contexto explícito para un grupo; aclaración si hay ambigüedad | Axel + Cristhian |
| Identidad de grupos entre revisiones | Identidad persistente en manifiesto; mapa con IDs locales, sin modificar payload estricto por accidente | Juan + Cristhian |
| Identidad/revisión de manifiesto | Snapshot inmutable vinculado al pedido y su `draftVersion`; regla de versiones explícita | Juan + Cristhian |
| Evidencia antes de guardar el pedido | Captura temporal autorizada y asociación posterior consistente | Cristhian; consumidores Axel/Luis |
| Aplicación y confirmación | Aceptar sugerencias edita borrador; confirmar guarda un snapshot auditado | Cristhian + Axel/Juan |
| Qué datos faltantes bloquean persistir | Mantener el contrato actual hasta un cambio de dominio explícitamente revisado | Cristhian + Juan |
| Cambios después de DRAFT | Seguir ciclo de vida existente; no usar revisión DRAFT sobre otro estado | Cristhian + Juan |
| SQL nuevo y entorno | Un dueño por recurso; revisión cruzada y autorización remota separada | Cristhian + Juan/Luis |

## 8. Próximo paso concreto y criterio de cierre

Continuar la base CR-01 manual y sus endpoints Hono, según la indicación posterior de Cristhian. Las decisiones de la sección 7 siguen como contratos explícitos para revisar al integrar las entregas separadas de Axel y Juan; su aceptación no se presume y no bloquea preparar nuestra base. La integración multimodal se conecta después, sin bloquear el formulario manual.

Para el recorrido comercial completo, revisar además la propuesta documental enlazada: la organización precarga candidatos y el envío revalida requisitos según servicio y etapa. El manifiesto no sustituye una guía oficial; una sesión de demo sin booking sigue identificada como interna. Falta validar el catálogo con un responsable operativo y acordar el incremento mínimo antes de implementar archivos/políticas.

Este plan no marca historias Done, no da por aceptado el PR de Axel y no autoriza merges, despliegues, publicación de repositorios o migraciones remotas. Mantiene un único módulo por dueño y utiliza el PR #3 existente para nuestro trabajo.
