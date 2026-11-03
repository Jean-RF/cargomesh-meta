# Tetris operativo: ampliación del sistema existente

Modo Operate, extensión del dashboard CargoMesh existente. Alcance: `/tetris` operativo y `/tetris/demo` sintético; componentes en `cargomesh/src/features/meta-loading-dashboard/`. No cambia la identidad del producto ni los camiones.

## Direction contract

THESIS: seguir una sesión desde el manifiesto confirmado hasta la comparación y su Passport; la lista de sesiones abre el trabajo y las fuentes justifican cada lectura.

OWN-WORLD: conservar Inter y los tokens CargoMesh de globals.css: canvas #f5f7f8, tinta #163349, texto secundario #536b78, primario #00747c, líneas #dce5e8. Formularios, tablas, estados y foco usan ese mismo vocabulario. Sin arte nuevo ni claims.

STORY: elegir solicitud/sede, confirmar unidades por grupo, abrir sesión, revisar observación/cobertura, cerrar alcance y guardar/reabrir Passport. Los estados desconocidos y los datos sintéticos permanecen visibles.

FIRST VIEWPORT: cabecera existente, título Tetris/dashboard y acciones; debajo, lista/formulario o controles de la sesión. En una sesión, contexto y cuatro lecturas existentes preceden la tabla y sus fuentes. En móvil, una columna y tablas con desplazamiento interno. La interacción propia es revisar un conteo y ver su efecto, sin simular guardado.

FORM: extensión funcional de una interfaz de operaciones ya establecida; código primero, sin reemplazo de mundo visual ni comp nueva. Estado de guardado explícito, foco visible, acciones de 44px, sin coreografía de entrada.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

Al comenzar, no había PRODUCT.md/DESIGN.md ni sidecar Impeccable en la raíz de este checkout. `docs/PRODUCT.md` aporta contexto histórico, no autoridad para reasignar el alcance del equipo. La documentación final debe describir la extensión comprobada y distinguir cualquier deriva preexistente, sin imponer un sistema nuevo.


## Documentación final y evidencia de la extensión

Verificación documental: 2026-10-30. Resultado: la extensión conserva el sistema CargoMesh claro observado; el finish review registra `ship`, sin correcciones materiales. La revisión documental contrastó el contrato, los dos componentes y sus estilos, los tokens globales, CarrierKpis compacto y las cuatro capturas originales. No sustituye las pruebas funcionales del constructor.

El alcance vigente de Juan es sesiones, Tetris/comparación y Passport en la rama de Juan, PR8 como continuación del PR5 ya fusionado. Manifiesto, worker y explicación conservan sus dueños e interfaces de suministro. Este registro no reasigna módulos ni toma `docs/PRODUCT.md` como una aprobación nueva. La identidad CargoMesh y el acceso a los 60 camiones se conservan en las vistas inspeccionadas.

Se creó [DESIGN.md](../../DESIGN.md) como extracción del sistema CargoMesh V2 claro existente y [.impeccable/design.json](../../.impeccable/design.json) como sidecar. La etiqueta descriptiva de ese baseline no representa una dirección creativa nueva ni una aprobación anterior. Los tokens compartidos, la familia declarada, el foco, los estados y la variante compacta proceden del código; no se inventó una escala de espaciado ni una paleta de reemplazo. Los ejemplos del sidecar son HTML/CSS autónomos de patrones existentes.

| Evidencia original | Dimensiones | Lectura comprobada |
| --- | --- | --- |
| [desktop.png](evidence/juan-operation/desktop.png) | 1440 × 3012 | Sesión sintética cerrada, contexto, cuatro lecturas, comparación, fuentes, cobertura y Passport guardado. |
| [mobile.png](evidence/juan-operation/mobile.png) | 390 × 4430 | La misma sesión en una columna, lecturas en dos por dos, comparación y Passport con desplazamiento interno indicado. |
| [open-desktop.png](evidence/juan-operation/open-desktop.png) | 1440 × 1000 | Apertura con solicitud, sede, modo de demostración y confirmación explícita de unidad por grupo. |
| [open-mobile.png](evidence/juan-operation/open-mobile.png) | 390 × 1201 | Apertura en una columna, controles etiquetados y CTA dentro del viewport. |

Cada PNG contiene un chunk `tEXt` con clave `impeccable:prompt`: captura Playwright Chrome de CargoMesh Tetris en `http://localhost:3000`, datos locales sintéticos aislados, fecha 2026-10-30, nombre de la vista y declaración de que no hay imagen generada. Se verificó el contenido del chunk en el archivo original; las capturas no se modificaron en esta fase.

El [finish review](evidence/juan-operation/finish-review.md) inspeccionó las cuatro vistas y registró `ship`. El [registro del constructor](evidence/juan-operation/browser-check.json) informa ancho de documento igual al viewport a 1440 y 390, lista de errores vacía y verificaciones de apertura, recarga, cierre y Passport. Ese registro se leyó como evidencia suministrada; no se volvió a ejecutar aquí. El [detector suministrado](evidence/juan-operation/design-detector.json) contiene `[]`; no se afirma una segunda pasada.

Deriva no canonizada: globals mantiene una base oscura anterior, Tailwind conserva otra paleta y el hover primario local de operación difiere del token compartido. Se documentan como límites observados, sin repararlos ni promoverlos a reglas nuevas. La fuente Inter está declarada en el stack; no se verificó el archivo tipográfico efectivamente cargado. Esta fase no comprueba inferencia real, despliegue alojado, reproducción de clips ni modificaciones en los 60 camiones.


Confirmación final de rutas: las cuatro capturas se renovaron con los fixtures sintéticos finales y conservan las dimensiones y el sistema visual descritos. Sus copias en `docs/meta/evidence/juan-operation/` son idénticas a los originales locales y conservan la procedencia embebida. El [resultado de integración suministrado](evidence/juan-operation/integration-result.json) declara datos sintéticos, sin inferencia real ni cambios alojados. El [informe documental final](evidence/juan-operation/documentation-review.md) registra la comprobación de rutas, integridad y paridad con los patrones de UI existentes. La preservación backend de `clipSha256` no requiere cambios en este contrato visual ni en la interfaz.
