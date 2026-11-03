# Revisión documental: ensamblaje de semirremolques largos

Fecha: 2026-10-31. Alcance: corrección local de activos 3D dentro del visor existente, después del dictamen `ship` de [finish-review.md](finish-review.md).

## Resultado

El resultado conserva el sistema visual incumbente. Este pase sólo escribe esta revisión: mantiene `DESIGN.md`, `.impeccable/design.json`, los tokens de `cargomesh/src/app/globals.css` y el código. El [contrato de ensamblaje](../../design-trailer-fit.md) describe una extensión del modelo compartido, sin nuevo mundo visual ni cambio de identidad.

Las seis capturas del usuario fijan el problema de separación, piso ausente y estructura incompleta; su lectura directa por el revisor fresco queda registrada en el dictamen. Este pase documental compara las fuentes con los dos before disponibles y las siete capturas finales, sin atribuirse una segunda lectura de los seis originales.

## Comparación con el sistema existente

| Aspecto | Resultado observado |
| --- | --- |
| Paleta y materiales | Se conservan las cabinas licenciadas, pinturas, conductores y cargas, sobre el estudio gris con sombra de apoyo. El piso metálico continuo y la estructura añadida son geometría del vehículo; sus colores no se convierten en tokens de interfaz. Se mantiene Shared Palette. |
| Tipografía y controles | El visor conserva el rail «Grupos de carga», cantidades en kg, porcentajes y la instrucción de giro/zoom. Las etiquetas usan la pila `cm-font-sans`, números tabulares, superficie blanca, tinta azul, borde fino y foco teal; la selección ámbar es un estado local existente. No se introduce una escala tipográfica ni un componente global nuevo. |
| Unión tractor–remolque | `catalog.ts` fija 0,62 m detrás de la cabina para los veinte grandes; `model.ts` sitúa el enganche sobre el grupo de tracción. El lateral final del aero reduce el tramo descubierto del before manteniendo cabina, carga y plataforma. La medida procede del modelo, no de los píxeles. |
| Piso y apoyo | La vista superior del coil sustituye los huecos entre travesaños del before por piso opaco continuo alrededor de las tres bobinas. Las vistas de excavadora, tractor y transformador mantienen la carga apoyada sobre una cama conectada. El estado de inspección del aero abre paredes y conserva el piso. |
| Camas bajas y portaautos | `layout.ts` reserva cuellos de 2,4/3,5 m; el catálogo extiende el cuerpo por la misma diferencia para conservar longitud útil. El modelo coloca vigas bajo el piso e incorpora laterales, anillas y estribos. El portaautos conserva dos niveles y cuatro coches con columnas, diagonales, hidráulicos, rampas y calzos; no reemplaza las cargas originales. |
| Encuadre y adaptación | Se conserva la lógica de cámara y los controles. La niebla de los grandes se ajusta a la distancia de encuadre para no borrar el vehículo en el visor estrecho. `mobile.png` muestra el transformador completo y visible, aunque pequeño: acredita integridad del conjunto, no lectura de herrajes a esa escala. |
| Miniaturas y procedencia | Se recapturan los veinte grandes y se conservan las otras cuarenta imágenes. El manifiesto mantiene ID, archivo, bytes, SHA-256 y hash de píxeles; los créditos distinguen esta actualización. Las licencias existentes siguen atribuyendo las bases CARLA/mekanismo y sus adaptaciones, sin presentar las cabinas como obra original de Juan. |

La regla Internal Scroll sigue perteneciendo a las tablas de la operación; esta reparación del canvas no la sustituye ni amplía su alcance.

## Evidencia revisada

Se leyeron `DESIGN.md`, `.impeccable/design.json`, `globals.css`, `docs/PRODUCT.md`, el contrato local y las fuentes `catalog.ts`, `layout.ts`, `model.ts`, `viewer.tsx`, `load-annotations.module.css` y `catalog.test.ts`. Se consultaron los créditos/licencias y la estructura del manifiesto de miniaturas. No se editó ninguna de esas autoridades.

Se abrieron los nueve PNG del paquete: dos before y seis finales de escritorio a 827 × 491, más `mobile.png` a 341 × 391. Son capturas del componente en páginas de 1440 × 1050 y 390 × 844, no capturas de página completa. Corresponden al aero lateral, coil superior, excavadora en perspectiva, tractor lateral, portaautos en perspectiva y transformador en perspectiva/escritorio y móvil. Los vehículos y etiquetas se ven completos, sin regiones negras ni avisos de carga pendiente. La comparación directa before/final se limita al aero y coil.

La evidencia existente registra:

- [Colección/carga/licencias](collection-tests.log): 38/38; [operación Tetris](meta-tests.log): 43/43. Incluye holgura, rayos de piso, separación cuello/ruedas y ajuste métrico de cargas. El [README](README.md) informa build de producción, tipos/lint y arquitectura correctos: 842 módulos y 245 entradas cliente. Son resultados registrados, no ejecutados de nuevo por este pase.
- [Navegador](browser-check.json): veinte modelos grandes `ready`, siete vistas y `errors: []`. Cargar veinte modelos no equivale a veinte inspecciones estéticas detalladas. La cifra `triangles` del renderer incluye sus pases y no mide el GLB.
- [Exportación](export-check.json): coil 8.227.028 bytes/115.280 triángulos; portaautos 10.511.724/146.407; transformador 9.367.880/102.485. El paquete registra los tres como importables y menores de 12 MiB; no acredita las sesenta exportaciones.
- [Detector](design-detector.json): `[]`; no constituye una evaluación del modelado. El README registra 60 hashes de archivo y píxeles distintos, 667.744 bytes de miniaturas y procedencia en 69 rásteres sin ausencias. El origen incrustado se conserva; no se volvió a ejecutar el escaneo ni se reescribieron los metadatos.

## Observaciones conservadas y límites

La ausencia previa de `PRODUCT.md` en la raíz permanece; `docs/PRODUCT.md` aporta contexto histórico y no reasigna responsables. `DESIGN.md` y su sidecar describen los tokens compartidos y componentes de la operación anterior, no un inventario exhaustivo del laboratorio 3D. También conservan su cautela sobre la fuente realmente entregada al navegador y el hover primario local. Estas observaciones no justifican regenerar el sistema durante una reparación de geometría.

No se canonizó ningún defecto, material del modelo o ajuste de niebla como regla global. Se conserva la distinción entre ilustración sintética y vehículo registrado, fotorrealismo o CAD homologado.

No se repitieron pruebas, build, detector, navegador, escaneo de procedencia ni exportaciones. No se inspeccionaron visualmente las veinte variantes o cada miniatura, no hubo teléfono físico, simulación de giro/articulación ni nueva reimportación en Blender. El trabajo permanece local, sin commit, push, PR o despliegue.
