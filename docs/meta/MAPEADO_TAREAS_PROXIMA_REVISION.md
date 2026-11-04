# Reparto de tareas y próxima revisión — CargoMesh Meta

Preparado el 29 de octubre de 2026. Revisión propuesta: **30 de octubre**, hora por acordar (Perú). Este documento resume el siguiente incremento de cada frente; no reemplaza el backlog ni certifica avances remotos no revisados.

## Objetivo compartido

Conectar un recorrido: el cliente declara la carga y revisa la propuesta → confirma un manifiesto → el carrier abre una sesión en una sede → se analiza el vídeo de carga → se compara lo observado con lo declarado → una persona revisa el resultado en el Passport.

Los documentos respaldan el trámite; la confirmación del manifiesto no crea una contratación. El trabajo se hace en paralelo sobre contratos comunes, sin que Cristhian implemente el backend de todos.

## Con qué contamos

| Base | Evidencia disponible | Límite |
| --- | --- | --- |
| Aplicación CargoMesh existente | Formulario, Organización, sedes y superficies de Carrier reutilizables | No son funcionalidades nuevas de Meta |
| Formulario y manifiesto CR-01 | Backend Hono, migración y guardado/revisión/confirmación/reapertura probados en Meta local; incremento `e0c55f8`, PR #3 | Nuestra rama; aceptación visual y revisión de consumidores pendientes, sin despliegue alojado acreditado |
| IA de texto de Axel | AX-00/01 incorporados desde main `a5c2a4d`: contrato y adaptador | No acredita una llamada real, imágenes o audio; aceptación con proveedor pendiente en la evidencia consultada |
| Documentación de demo | Plantillas de ficha de empresa y lista de empaque; criterios del expediente | No hay biblioteca privada, subida ni reutilización implementadas; los PDF finales aún requieren revisión |
| Sesiones, DockMind y Passport | Guías, contratos y tareas definidos | Cada dueño debe aportar su SHA, resultado ejecutable y bloqueos; aquí no se declaran terminados |

## Qué hace cada uno ahora

| Persona | Próximo incremento | Pantallas o superficie | Qué debe mostrar en la revisión |
| --- | --- | --- | --- |
| **Cristhian** | Punto 4: biblioteca documental mínima en Organización y vínculo al pedido. Punto 5: base de captura de fotos, evidencia privada y revisión de propuestas; consumir la IA de Axel y el audio de Luis | Organización → Documentos; formulario de nueva solicitud → adjuntos/revisión | Primer corte: subir un documento, vincular su revisión al pedido y reabrirlo. Acordar contrato de evidencia y propuestas antes de conectar IA |
| **Axel** | AX-02/04: recibir foto/etiqueta/texto autorizado y devolver propuestas válidas por campo y grupo; proteger revisiones y errores | Adaptador/API IA compartidos; salida consumida por el formulario | Una interpretación real si hay acceso al proveedor, con evidencia de origen y campos pendientes; casos de imagen ilegible, respuesta antigua y proveedor ausente |
| **Luis** | AX-09/10: verificar configuración Meta y transcribir audio autorizado. Preparar AX-03 contra hechos de conciliación de Juan | Adaptador de voz/servidor y contrato de explicación | Audio → texto revisable con evidenceId; error claro si falta configuración. Ejemplo de explicación sin recalcular ni inventar la diferencia |
| **Juan** | JU-00/01/02: consumir el manifiesto confirmado, abrir sesión desde sede y presentar Tetris como dashboard. Preparar JU-03 de comparación/Passport | Sede → sesión de carga → dashboard → Passport | Sesión ligada a manifestId/revision y grupos reales, reabierta sin perder identidad; estados sin observación y carga en curso claros |
| **Ramón / Jean** | RA-00/01/02: clip propio, prueba real de seguimiento y contador de cruces. Preparar RA-03 de job asíncrono | Worker y reproducción del clip con línea, tracks y timecodes | Clip, referencia manual separada, salida observada y limitaciones; una entrada no se cuenta otra vez en cada frame |

Estos son objetivos del siguiente corte, no promesas de terminar todos los módulos en un día. Cada persona identifica qué parte llega funcionando y qué queda bloqueada.

## Límites para no duplicar trabajo

### Cristhian — declaración y documentos

- Preparar almacenamiento privado y metadatos reutilizables para documentos y fotos, manteniendo propósitos y permisos separados.
- Empezar con dos tipos: ficha de organización reutilizable y lista de empaque específica del envío. No son certificados oficiales ni requisitos universales.
- Guardar revisiones de archivos y vínculos al pedido. Cambiar el manifiesto debe señalar qué documentación necesita revisión.
- Capturar/subir una foto, previsualizarla y asociarla al borrador y al grupo cuando corresponda. La API valida archivo y acceso; eso no verifica la carga física.
- La aplicación de propuestas de Axel requiere revisión humana y coincidencia de inputRevision. Una edición manual posterior prevalece.
- La evaluación documental por el carrier se prepara como incremento posterior: falta decidir el momento comercial exacto y quién puede acceder/aceptar. No bloquea construir la biblioteca privada.

### Axel — interpretación

- Usar el cliente compartido existente; no crear otro formulario ni persistir cambios al pedido desde el modelo.
- Proponer embalaje, texto visible, categoría o cantidad visible con su procedencia. Peso, dimensiones y contenido oculto quedan pendientes si no hay evidencia suficiente.
- Identificar el grupo y la revisión a los que corresponde cada propuesta; no usar solo la posición de la fila como identidad.
- Entregar errores estables, límites y cancelación/reintento controlado. Si el proveedor no está disponible, permitir continuar manualmente y distinguir los ejemplos simulados.

### Luis — voz, explicación y entorno

- Consumir el audio privado autorizado de Cristhian y el cliente de proveedor de Axel; no duplicar captura, manifiesto o interpretación de imágenes.
- Devolver texto revisable y referencias de origen; la transcripción no confirma automáticamente datos del formulario.
- La explicación consume los hechos calculados por Juan, conservando unidad, revisión y evidencias. No decide por sí sola una incidencia ni una acción comercial.
- Documentar configuración faltante sin compartir secretos. Los cambios remotos de infraestructura requieren autorización específica.

### Juan — sesión, dashboard y comparación

- Acordar con Cristhian el consumo del manifiesto y con Ramón el contrato sesión/job/observación.
- Reutilizar sedes y datos autorizados; no crear otro manifiesto ni otra base por conveniencia. La base Meta local ya existe: coordinar migraciones y bucket con Cristhian.
- Tetris es primero un dashboard: declarado, observado, pendiente y estado de la sesión. Acomodo físico 2D/3D y optimización avanzada quedan para después del núcleo.
- Comparar solo unidades, revisión y alcance compatibles. Una sesión abierta muestra progreso; la ausencia de observaciones no demuestra cero unidades cargadas.
- El Passport conserva evidencias, discrepancias y decisiones humanas; Luis explica los hechos, no los calcula.

### Ramón / Jean — observación

- Priorizar la viabilidad del clip antes de pulir el vídeo final o animaciones.
- Contar cruces con dirección, entradas/salidas y manejo de incertidumbre; no sumar detecciones de cada cuadro.
- Conservar clip original, fuente, unidad, configuración y timecodes. La referencia manual evalúa el resultado y no se usa como respuesta del modelo.
- El job pertenece a una sesión, evidencia y revisión específicas; evitar análisis duplicados por reintento o polling.
- Una pérdida de identidad u oclusión insuficiente debe pedir revisión, no producir un conteo seguro inventado.

## Contratos que intercambiamos primero

| Productor → consumidor | Datos mínimos a acordar | Entregable independiente para avanzar |
| --- | --- | --- |
| Cristhian → Axel | evidenceId, tipo, acceso autorizado, borrador, inputRevision y vínculo al grupo | Contrato y foto propia de ejemplo; sin URL privada permanente en Git |
| Axel → Cristhian | Propuesta por campo/grupo, revisión de entrada, fuente y errores | Ejemplos válido, incompleto, obsoleto y fallido |
| Cristhian ↔ Luis | Audio/evidencia autorizado, revisión y transcripción revisable | Contrato y audio de prueba; ninguna confirmación automática |
| Cristhian → Juan | requestId, manifestId, revisión y groupIds estables | Manifiesto confirmado de Meta local y contrato CR-01 |
| Juan → Ramón | sessionId, revisión, clip, unidad, línea/dirección y alcance | Contexto de sesión válido y rechazado |
| Ramón → Juan | Job, eventos, conteo por unidad, timecodes e incertidumbre | Observación de un clip real y fixture explícitamente rotulado |
| Juan ↔ Luis | Hechos determinísticos y referencias → explicación fundamentada | Caso cerrado, caso abierto y evidencia insuficiente |

Cada consumidor revisa el ejemplo antes de conectar. Si el productor aún no está listo, usar un fixture identificado; no presentar esa conexión como inferencia real.

## Cómo revisamos los avances el 30 de octubre

Cada integrante trae una demostración breve y este resumen:

```text
Responsable:
Historia / incremento:
Rama y SHA:
Qué funciona ahora:
Cómo reproducirlo:
Entrada y resultado observado:
Pruebas ejecutadas y resultado / pruebas pendientes:
Dependencia o bloqueo:
Siguiente incremento:
```

Para código, mostrar también un caso negativo pertinente: archivo inválido/acceso ajeno, propuesta obsoleta, audio fallido, sesión incompatible o clip ambiguo. Las nuevas pruebas se ejecutan dentro del alcance autorizado; una prueba no ejecutada se registra como pendiente. La aceptación visual corresponde a Cristhian.

La revisión no exige que todo el recorrido esté acabado: exige una pieza ejecutable, su contrato y el bloqueo concreto. Cerramos la reunión acordando qué puede conectarse y quién corrige cada fallo.

## Forma de trabajar y fuentes

- Un backlog común y un dueño por historia. Cada uno actualiza su rama/PR de frente conforme al [manifiesto de ramas](PR_INTEGRANTES.md); no abrir otro PR por ajuste menor ni asumir que un PR cerrado recibe nuevos commits.
- No se han consultado PRs/CI remotos para este resumen; verificar su estado antes de publicar o integrar. Sin push, merge o despliegue implícitos.
- El reparto incluye a los cinco en el producto general. La candidata pública se selecciona por separado según el [acuerdo de entrega y reintegración](ENTREGA_Y_REINTEGRACION.md), conservando autoría real.
- Este archivo está preparado para compartir manualmente; no se ha enviado por WhatsApp u otro canal ni publicado en GitHub.

Referencias: [estado de nuestra entrega](ENTREGA_ACTUAL.md), [objetivo y conexiones](OBJETIVO_Y_CONEXIONES.md), [criterios documentales](contracts/EXPEDIENTE_DOCUMENTAL_MVP.md), [backlog](backlog/README.md) y [guías individuales](prompts/README.md).
