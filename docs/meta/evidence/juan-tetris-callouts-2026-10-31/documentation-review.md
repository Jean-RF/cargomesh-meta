# Revisión documental: grupos y señalador de Tetris

31 de octubre de 2026. Pase fresco de `impeccable_documenter`, posterior a la revisión final con `disposition: ship`. Extensión del componente existente, sin reemplazo de identidad ni cambio del sistema CargoMesh.

## Autoridad y decisión

Se contrastaron `DESIGN.md`, `.impeccable/design.json`, los tokens de `cargomesh/src/app/globals.css`, el contrato `docs/meta/design-tetris-callouts.md` y el contexto `docs/PRODUCT.md` (no existe `PRODUCT.md` en la raíz). Se leyeron las fuentes de anotaciones, ruta, visor y selección de `vehicle-workspace.tsx`, además de las reglas compartidas de controles necesarias para explicar la apariencia capturada.

El sistema incumbente sigue describiendo el resultado: superficies claras, tinta azul oscura, acciones y selección teal, tipografía compacta de interfaz y datos con unidades explícitas. El rail y el señalador son comportamiento local del visor. No justifican nuevos tokens, una nueva prohibición global, ni regenerar el catálogo de componentes. `DESIGN.md`, su sidecar y `globals.css` se conservan.

## Resumen del sistema en cinco líneas

1. Paleta: blanco y grises claros, tinta `#163349`, teal `#00747c`; el ámbar `#a46a0b` identifica localmente el señalador y la envolvente elegida.
2. Tipografía: familia declarada `--cm-font-sans` con Inter al inicio; etiquetas de 12 px, grupo de 13 px y números tabulares. No se certifica qué archivo de fuente seleccionó el navegador.
3. Forma: cuatro botones nativos de al menos 60 px de alto, borde fino, esquina local de 7 px y columna estable de 100–140 px separada del canvas.
4. Profundidad: un recorrido 3D periférico con prueba de profundidad y aproximación al grupo a su profundidad real; el cabezal SVG exige tres raycasts libres y no recibe eventos de puntero.
5. Reglas conservadas: **The Shared Palette Rule** e **The Internal Scroll Rule**; selección por `aria-pressed`, unidades y estado de recuperación legibles siguen el lenguaje operativo existente.

## Evidencia comprobada

| Evidencia | Comprobación de este pase |
| --- | --- |
| `desktop.png`, `side.png`, `top.png` | Inspección visual directa: G01–G04 quedan a la izquierda, fuera del vehículo. Sólo G02, G03 o G04, respectivamente, tiene un conector, cuyo recorrido largo utiliza el perímetro sin dibujarse encima de la cabina o la carga visible. |
| `mobile.png` | Inspección visual directa: los cuatro cuadros caben y permanecen legibles, sin superposición con el camión. El vehículo se reduce al compartir ancho con el rail; es la adaptación prevista por el contrato. |
| `occluded.png` | Inspección visual directa: G02 conserva su estado, no hay conector y aparece «Grupo oculto. Gira o muestra la carga.». |
| Tamaño y procedencia PNG | Lectura directa de chunks: cuatro imágenes de 827 × 491 px y una móvil de 341 × 391 px. Las cinco contienen `tEXt` con clave `impeccable:prompt` posterior a `IDAT`; declara captura directa de Playwright Chrome, fecha, ruta `/carriers/tetris?truck=cm-medical-van`, vistas, datos sintéticos y ausencia de retoque/composición. La procedencia declarada concuerda con el contenido observado; el chunk por sí solo no autentica el proceso de captura. |
| Fuente de interacción | `vehicle-workspace.tsx` comparte `groupId` entre cuadros y tabla, parte sin selección y reinicia el grupo al cambiar vehículo. `viewer.tsx` crea la columna sólo cuando recibe etiquetas, usa botones nativos y deshabilita la selección durante carga/error. |
| Fuente del conector | `load-annotations.tsx` recalcula la ruta con la cámara, conserva oclusión 3D y comprueba los tres vértices del cabezal. Si no encuentra destino visible, no dibuja el conector y publica el estado de recuperación. La ruta y el destino pertenecen a la envolvente del grupo, no a cada unidad individual. |
| Registros existentes | Se leyeron `browser-check.json` (`errors: []`, tres comprobaciones de selección/cámaras/móvil/oclusiones), `design-detector.json` (`[]`) y `.impeccable/review/tetris-load-leaders/finish-review.md` (`ship`, sin correcciones materiales). No se repitieron estas ejecuciones. |

El README registra páginas de 1440 × 1050 y 390 × 844 px, 43/43 pruebas de `test:meta-loading`, build con tipos/lint y arquitectura de 842 módulos/245 entradas cliente. Este pase confirma el contenido del registro; no vuelve a ejecutar esas verificaciones. La ausencia inicial de flecha y la galería compartida sin columna tienen respaldo de fuente y del registro de entrega, sin captura dedicada en este paquete.

## Variaciones y drift no canonizados

La selección capturada es teal claro. Las reglas preexistentes de `brand-controls.css` para botones pulsados dentro de `[data-carrier-ui]` prevalecen con `!important` sobre el fondo ámbar declarado por el módulo; también prevalecen sobre su foco local de 3 px. El porcentaje/peso y el señalador mantienen su acento ámbar. Se registra la cascada observada, sin convertir el fondo ámbar del módulo ni su foco aislado en una promesa del sistema global.

El sidecar, generado el 30 de octubre, conserva muestras de la operación anterior. Su muestra de métrica compacta mantiene descripción de 11 px sin la regla de 12 px que el CSS existente aplica bajo 460 px de contenedor; es una diferencia preexistente de la muestra, fuera del componente pedido. No se repara ni se promueve a norma. El shell oscuro general y sus tokens coexisten con el espacio de producto claro y tampoco cambian la autoridad visual de este refinamiento.

No se observaron defectos materiales nuevos en las cinco imágenes revisadas. No se canoniza como regla global ninguna particularidad de este señalador ni se usa la documentación para legitimar una discrepancia.

## Límites y alcance de escritura

La evidencia visual cubre el componente del furgón médico; la compatibilidad del visor compartido se respalda en fuente y registros. No cubre visualmente los 60 modelos, todo el documento, un teléfono físico, todos los ángulos/zooms posibles, ni una auditoría independiente de contraste o lector de pantalla. La carga oculta o fuera de encuadre requiere recuperación de vista; la flecha no es detección física ni seguimiento por vídeo.

Único archivo escrito en este pase: este informe. No se ejecutaron context, navegador, detector, build o pruebas; no se editaron código, tokens, `DESIGN.md`, sidecar ni otras evidencias, y no se creó commit, PR o push.
