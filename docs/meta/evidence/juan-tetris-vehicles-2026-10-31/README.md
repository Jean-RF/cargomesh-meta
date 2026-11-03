# Tetris: catálogo de vehículos y detalle 3D

Implementación local del 31 de octubre de 2026 sobre `codex/meta-juan`, HEAD `3810a589f75e4d4b9c7b7a7f2797cecffc791209`. No se creó commit, push o PR.

La petición fija un catálogo previo por categoría y peso con conductor/precio, seguido de un dashboard de carga sobre el camión en 3D. Se conserva el sistema visual CargoMesh; [contrato de diseño](../../design-tetris-vehicles.md). La imagen del usuario guía la organización de información, sin copiar su marca o inventar mercancía observada.

## Resultado

- `/tetris`: 60 vehículos en seis categorías; filtros combinables de carga útil y búsqueda por modelo, placa o conductor; orden por capacidad, precio o nombre; estado sin resultados y limpieza de filtros.
- Cada fila muestra conductor, experiencia, capacidad y tarifa en PEN por viaje. Los importes se generan localmente para la demostración y no proceden de contratos registrados. La indicación general «Demostración» permanece visible en escritorio y móvil, sin etiquetas repetidas junto a cada precio. No se crea oferta, reserva o contrato.
- Al seleccionar un camión, `?truck=…` conserva un enlace directo al detalle. Se reutilizan las mallas, licencias y cantidades de la colección existente. WebGL y los GLB sólo se cargan al abrir el detalle.
- El visor permite girar, acercar, cambiar cámara y abrir/cerrar carrocería. Los grupos seleccionables muestran kg y porcentaje de carga útil; la selección se sincroniza con la tabla. En móvil se mantiene visible la etiqueta del grupo seleccionado y todos los grupos se pueden elegir en la tabla.
- Cuatro métricas: peso asignado, capacidad restante, grupos y unidades del plan. El desglose conserva cantidades enteras y masa total de las unidades representadas. El porcentaje es masa asignada/carga útil máxima: no es ocupación volumétrica, detección o conteo observado.
- `/tetris?view=sessions` y enlaces existentes `?session=…` mantienen las sesiones autenticadas, comparación y Passport. `/tetris/demo` conserva los escenarios anteriores. La nueva vista no escribe en esos servicios.

## Verificación

- `test:meta-loading`: 41/41; incluye tres pruebas nuevas sobre las 60 identidades/conductores/precios, filtros combinados sin mutación y conservación de cantidad/masa/envolventes de todos los grupos.
- `test:carrier-operations`: 54/54. `test:logistics`: 188/188; cubre también consumidores de las funciones de disposición extraídas a `layout.ts` sin cambiar su algoritmo.
- TypeScript y build de producción correctos. Arquitectura: 840 módulos y 245 entradas cliente comprobadas.
- Navegador Chrome: 60 filas, cero peticiones de cabinas GLB en la lista, filtros/casos vacíos, selección grupo/tabla, cámaras/carrocería, recarga y navegación atrás, enlace desconocido, móvil 390 px sin desbordamiento del documento, ruta operativa con 401 controlado, enlace antiguo con sesión, demo y visor compartido `/truck-lab`. Cero errores JavaScript o solicitudes fallidas en el recorrido.
- Detector de diseño ejecutado una sola vez: `[]`. Dos rondas visuales en escritorio 1440 px y móvil 390 px. Correcciones entre rondas: pista de desplazamiento horizontal de tabla, precisión de toneladas y tamaño del texto de la acción.

Capturas finales directas de Playwright, con metadatos de origen incrustados: [catálogo](directory-viewport.png), [detalle](detail-viewport.png), [móvil](mobile.png), [detalle móvil](detail-mobile.png). Se conservan también capturas completas de escritorio y reportes.

## Revisión de acabado

Revisor independiente, contexto nuevo: **ship** al alcance del catálogo/detalle de esta extensión, sin correcciones materiales. Comprobó las seis capturas, el contrato de diseño, el sistema existente y el código relevante; no repitió las pruebas de navegador. [Informe completo](finish-review.md). No es una aprobación estética de todos los modelos 3D previos ni una validación de proveedores externos.

Documentación independiente completada: [comparación con el sistema existente](documentation-review.md). Se preservan DESIGN.md, tokens y componentes compartidos; las diferencias documentales anteriores quedan registradas sin reparación ajena al encargo.

## Límites

La selección es un catálogo visual de demostración y no vincula estos vehículos o tarifas a una sesión real. No se reejecutó el flujo completo con productores externos, clips privados o inferencia real. Los modelos 3D anteriores se reutilizan: esta tarea no modifica su geometría ni afirma fotorrealismo. No se midió rendimiento o interacción en un móvil físico. No se desplegó ni modificó una base alojada.
