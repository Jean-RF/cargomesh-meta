disposition: ship

Alcance: refinamiento del componente existente; sin comp, QUALITY BAR de concepto ni diff de reproducción aplicables. Revisión estática de las cinco capturas, captura original, contrato, DESIGN.md, PRODUCT.md, evidencia runtime y fuentes indicadas; sin navegador ni segundo detector.

## persistence

pass. Existen `docs/PRODUCT.md`, `DESIGN.md` y `docs/meta/design-tetris-callouts.md`; el resultado conserva el sistema CargoMesh claro. Las cinco capturas existen, muestran el componente completo y son válidas: escritorio/lateral/superior/oculto de 827 × 491 px y móvil de 341 × 391 px. Cada PNG contiene procedencia `tEXt` bajo `impeccable:prompt`; las copias están en `docs/meta/evidence/juan-tetris-callouts-2026-10-31/`. `design-detector.json` está vacío; no repetí el detector. No se necesita estado de build comp-led para esta corrección localizada.

## fidelity

| Elemento / promesa | Estado | Evidencia |
| --- | --- | --- |
| Cuatro cuadros a la izquierda, fuera del vehículo | match | Desktop, side, top y mobile mantienen G01–G04 en una columna estable. La captura original tenía los cuadros sobre cabina y carga; ese fallo ya no aparece. |
| Selección y una sola flecha desde el cuadro elegido | match | La conexión nace de G02 en desktop/mobile, G03 en side y G04 en top. El estado pulsado sigue siendo visible. `browser-check.json` respalda selección lista ↔ tabla; `viewer.tsx` usa botones nativos con `aria-pressed`. |
| Flecha que no tapa el camión | match | El recorrido largo usa el espacio superior y lateral; el cabezal pequeño termina junto al borde del grupo. Ninguna de las vistas aportadas muestra una línea pintada encima de cabina/carrocería. La fuente usa profundidad real y depth testing para el trazado, más raycasting de los tres vértices del cabezal. |
| Identificar el objeto seleccionado | adaptation | Señala la envolvente del grupo, que puede contener varias unidades, conforme al contrato y a la selección G01–G04 existente. No se presenta como detección física ni como selección de una unidad individual. |
| Giro, lateral y superior | match | Las tres vistas cambian el destino sin desplazar los cuadros ni multiplicar conectores; el runtime registra órbita y cámaras. |
| Grupo oculto | match | Occluded conserva G02 seleccionado, elimina la flecha y muestra «Grupo oculto. Gira o muestra la carga.». Evita una indicación falsa sobre la carrocería cerrada. |
| Composición móvil | adaptation | A 390 px de página se conservan los cuatro cuadros y un vehículo completo, más pequeño por compartir ancho con la columna. Es la adaptación explícita del FIRST VIEWPORT; no hay textos cortados ni superposición en la captura. |
| TYPE | match | Tipografía compacta de interfaz, jerarquía grupo/porcentaje/peso y lectura de 12–13 px coherentes con DESIGN.md; no hay nueva voz de display. |
| MATERIAL | match | Se conserva el modelo 3D y sus materiales. La flecha es geometría funcional, no una ilustración que sustituya al vehículo. |
| GROUND | match | El gris claro del visor y las superficies blancas/teal de los cuadros siguen la implementación existente y el OWN-WORLD; no se introduce una nueva paleta global. |

La ausencia inicial de flecha y el visor compartido sin columna se respaldan por la condición `annotated`, el estado inicial sin selección y el paquete runtime; no tienen una captura dedicada. `pointer-events:none`, botones nativos, foco visible y estados de carga/error están presentes en las fuentes. La revisión no reproduce esos comportamientos por separado.

## ceiling

reached al alcance del encargo. La profundidad sirve para preservar la lectura del camión; el señalador es discreto, único y recuperable cuando la carga está oculta. El producto no necesita nueva ornamentación, tipografía o motion para resolver esta corrección. No se observan fallos materiales del craft floor dentro del componente revisado.

## material_fixes

Ninguno.

## keep

Mantener los cuatro cuadros externos, un solo conector con oclusión real y el aviso de recuperación; conservar la semántica de grupo y la interacción compartida con la tabla. No se revisaron visualmente los 60 modelos ni un teléfono físico; el veredicto cubre el componente y las vistas entregadas.
