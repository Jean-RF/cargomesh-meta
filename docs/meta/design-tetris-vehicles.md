# Tetris: selección de vehículo y distribución visual

Extensión del Tetris existente, modo Operate. El usuario fija el flujo y aporta una imagen: lista categorizada antes de seleccionar, conductor/precio por vehículo y detalle del camión con carga e indicadores en3D. La referencia fija esa organización, no reemplaza la identidad CargoMesh.

## Direction contract

THESIS: elegir el vehículo adecuado y entender su carga asignada. La lista permite comparar capacidad, conductor y contrato; el camión muestra dónde están los grupos y la tabla justifica sus cantidades.

OWN-WORLD: conservar Inter y los tokens CargoMesh claros de DESIGN.md/globals.css. Filas compactas, superficies blancas, texto azul oscuro, controles teal y selección de carga ámbar en el visor. Sin shell nuevo ni decoración de marca ajena.

STORY: filtrar por categoría/peso, buscar conductor, abrir vehículo, seleccionar grupos en el camión o la tabla y volver a la lista. Las sesiones autenticadas, comparación y Passport continúan accesibles. Precios por viaje ficticios, sin repetir etiqueta por fila; aviso general de demostración visible también en móvil. Ningún contrato se crea.

FIRST VIEWPORT: cabecera CargoMesh/Tetris, título y total, búsqueda/peso/orden, categorías y lista con conductor/precio/CTA. En detalle: modelo3D dominante y ficha de conductor/contrato, métricas compactas y desglose por grupo. En móvil, filas de comparación y paneles apilados; tabla con desplazamiento interno y controles táctiles.

FORM: extensión local sobre el sistema existente, código primero, sin torneo de conceptos. Las anotaciones se proyectan sobre el modelo3D; peso asignado/carga útil es una razón de masa, no conteo observado ni ocupación volumétrica. Datos y modelos provienen de la colección existente; WebGL se carga al seleccionar.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Límites de integración

`/tetris` abre el catálogo visual de demostración. `/tetris?view=sessions` y los enlaces existentes `?session=…` conservan LoadingOperation y su autorización. `/tetris/demo` conserva los escenarios de conciliación. No se altera el esquema de sesiones para atribuirle vehículos o contratos que no contiene; la vista visual no publica observaciones, ofertas ni reservas.

## Evidencia del resultado

Implementación y dos rondas de capturas desktop1440/móvil390 completas. Pruebas41meta-loading/54operaciones/188logística, build/tipos y arquitectura840/245 correctos. Detector una vez sin hallazgos; revisión independiente ship al alcance de esta extensión. [Capturas, informe y límites](evidence/juan-tetris-vehicles-2026-10-31/README.md). Se conserva DESIGN.md sin cambiar tokens o identidad; no hubo publicación o contrato real.