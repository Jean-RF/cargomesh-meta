# Finish review — códigos de mercancía

Disposición: **ship** para la extensión de códigos internos de la colección sintética local. Revisión del 2 de noviembre de 2026, acotada a `/carriers/tetris`, FactoryPlayer y su geometría/exportación. Se reutiliza la dirección CargoMesh y el criterio de acabado Impeccable; no hay un comp aprobado con el que medir fidelidad visual exacta.

## persistence

La identidad se deriva del diseño y del ordinal de la unidad/caja. `layout`, inventario, plan de fábrica y etiqueta comparten el mismo valor; la ordenación de carga conserva el ID. Las etiquetas sólidas pertenecen al grupo que se anima y los lotes líquidos/graneles permanecen en una placa del vehículo. Las pruebas de los 60 diseños cubren correspondencia, unicidad, movimiento, búsqueda temporal, reinicio y emisión física de cada etiqueta. La muestra de navegador confirma código actual, final, reinicio y cámara en cinco vehículos. Los dos GLB comprobados conservan geometría y metadatos. No se introduce persistencia operativa.

## fidelity

Inspeccionados los nueve PNG: `desktop-codes.png`, `desktop-factory.png`, `mobile-factory.png`, `model-detail.png` y los símbolos de aero-dryvan, bakery-shutter, drum-rail, medical-van y mini-bowser. Todos incorporan `impeccable:prompt`; sus nueve hashes coinciden con `checks.json`.

La consulta usa la superficie blanca, tinta azul y acento teal existentes. Los símbolos negros sobre blanco, las zonas libres y los diez dígitos son claros. La lista plegable mantiene el peso visual de la escena; el código actual ocupa una franja bajo los controles. En 390 px se apila con espacio suficiente, sin tapar controles ni desbordar el documento. El código aporta `role="img"` y nombre accesible; el `summary` nativo conserva foco visible y altura mínima de 44 px. `model-detail.png` muestra una integración discreta en la mercancía, aunque su encuadre general no permite leer los dígitos impresos. La consulta ampliada cubre esa limitación de escala.

## ceiling

El refinamiento cumple su objetivo sin pedir una nueva estética: 498 unidades y 432 cajas producen 930 identificadores distintos. `geometry-decode.json` acredita 930/930 patrones emitidos por `addBarcodeLabel`, proyectados a resolución suficiente y leídos con ZXing; `ui-decode.json` acredita cinco símbolos SVG capturados. La lectura de cada etiqueta ya montada en las 60 escenas y el escaneo físico quedan sin comprobar.

Los 60 presupuestos sin cabina licenciada adicional permanecen bajo 200.000 triángulos, con máximo de 194.468. Los GLB sanitario y semirremolque seco aceptados contienen 8 y 216 etiquetas. Los logs finales registran 208/208 pruebas logísticas, 43/43 de dashboard y 54/54 de operaciones, además de typecheck, build y arquitectura 851/247. `detector.json` contiene `[]` en la ejecución única indicada. Estos resultados respaldan el alcance local; no certifican impresión ni registro GS1.

## material_fixes

Ninguno bloqueante observado en esta extensión. No hace falta rediseñar ni recapturar el paquete para el alcance declarado. Mantener explícita la distinción entre unidad manipulada, caja interna y lote evita presentar los 930 códigos como conteo operativo.

## keep

Conservar la asociación estable ID/código, la geometría con atlas compartido, las quiet zones laterales de diez módulos, la consulta plegable, la franja de código actual y los controles fuera del visor. Mantener cantidades, dimensiones y pesos del catálogo, el límite de exportación y la ausencia de escrituras operativas.

No abrí navegador ni repetí pruebas o detector; revisé código, capturas y resultados guardados. No se editó producto ni se hizo commit, push o PR.
Riesgo pendiente: la legibilidad 3D depende de zoom, perspectiva y resolución; no hay validación con cámara o escáner físicos.
