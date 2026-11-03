# Revisión documental del acabado de conductores

31 de octubre de 2026. Revisión de sólo lectura de fuentes, autoridades y evidencia ya producida; la única escritura de este pase es este archivo. No se ejecutaron navegador, contexto, detector, pruebas, build, exportación o Blender. No se cambian `DESIGN.md`, su sidecar, tokens, CSS ni código.

## Resultado y continuidad

El resultado es un refinamiento de los personajes existentes, conforme al [contrato de conductores](../../design-driver-detail.md). Conserva el acabado de simulación, la base anatómica común CC0 de Dan Ulrich/Blender Studio, las cinco familias de cabina licenciada y la paleta asignada a cada conductor. No establece un mundo visual nuevo ni convierte sesenta configuraciones en sesenta bases anatómicas independientes. IDs y datos permanecen fuera del alcance visual.

Se leyeron las cinco parejas antes/después y el canvas móvil entregado. Frente al incumbente, la mirada aparece por delante de la piel; el cabello sigue el cráneo con un borde más continuo; la ropa se reconoce por cuello, puños y detalles de tela; el cinturón oscuro cruza el torso; y las manos muestran dedos más curvados. El cambio se aprecia en las cabinas compacta, con capó, Isuzu y europeas. Vidrio, espejo y marco siguen condicionando qué rasgos pueden verse: la toma sanitaria oculta parte del rostro y la móvil no permite juzgar detalle fino.

La corrección final concuerda con los tres hallazgos de [finish-review.md](finish-review.md): barba integrada en la piel, transición/material del cabello y aberturas continuas de cuello/mangas. Su `disposition: ship` se refiere exclusivamente a esas correcciones. Este documento no amplía ese veredicto a una aprobación visual global.

## Sistema conservado — cinco líneas

1. **Paleta:** CargoMesh mantiene teal operativo, tinta azul, blanco y neutros claros; piel, uniforme y cabello siguen los colores de cada configuración del catálogo.
2. **Tipografía:** se conserva la familia declarada Inter y los roles existentes de título, descripción y métricas; el personaje no introduce un nuevo rol tipográfico.
3. **Regla compartida:** `The Shared Palette Rule` conserva los tokens de producto; los valores de materiales 3D permanecen locales al visor.
4. **Regla de disposición:** `The Internal Scroll Rule` pertenece a las tablas operativas existentes; no prescribe geometría o encuadre de los conductores.
5. **Forma y profundidad:** la anatomía, ropa mate, cabello conformado, vidrio y pose sentada continúan el lenguaje de simulación; no se elevan ajustes de esta reparación a normas globales.

## Fuentes y evidencia contrastadas

Autoridades leídas: [DESIGN.md](../../../../DESIGN.md), [.impeccable/design.json](../../../../.impeccable/design.json), [globals.css](../../../../cargomesh/src/app/globals.css), [docs/PRODUCT.md](../../../PRODUCT.md) y el contrato de esta superficie. El registro global sigue describiendo principalmente el espacio operativo/Tetris; el visor conserva su alcance propio.

La implementación leída respalda el acabado descrito: [driver-model.ts](../../../../cargomesh/src/features/truck-collection/driver-model.ts) construye ojos/párpados, variaciones faciales y de complexión, cabello corto/recogido o calvicie, gafas selectivas, barba mediante colores de piel, recorte interpolado de superficies, cinturón adaptado al torso y dedos curvados. [model.ts](../../../../cargomesh/src/features/truck-collection/model.ts) mantiene colores de vértice y materiales de piel/cabello; [materials.ts](../../../../cargomesh/src/features/truck-collection/materials.ts) aplica sus normales y rugosidad. El [generador original de fibras](../../../../cargomesh/scripts/prepare-driver-hair.mjs), también llamado por el generador general, produce el mapa de 256 px; el manifiesto registra 3.662 bytes y su hash. Las licencias conservan anatomía CC0, mapa original MIT y atribuciones CARLA/mekanismo/Valdrada de las cabinas. No se incorpora una imagen humana o activo externo nuevo.

- [collection-tests.log](collection-tests.log) registra 41 pruebas aprobadas, cero fallos: incluye ojos, cinturón, normales, geometría, manos y conservación de cabinas. [build.log](build.log) registra compilación, lint y tipos correctos. Se leyeron esos resultados; no se volvieron a ejecutar.
- [browser-check.json](browser-check.json) enumera las cinco familias y contiene `errors: []`. El [README](README.md) registra páginas de 1440 × 1050 y 390 × 844 y ausencia de desbordamiento. Los PNG son capturas del canvas, no de toda la página; el móvil acredita el encuadre y no rasgos finos o hardware físico.
- [export-check.json](export-check.json) registra dos GLB finales: sanitario, 7.702.604 bytes/102.762 triángulos/14 imágenes; portaautos, 10.631.228/149.996/12. [blender-check.json](blender-check.json) registra reimportación de ambos en Blender 5.2.3 LTS, piel/uniforme/cabello y cero imágenes externas. No demuestra exportación de los sesenta modelos.
- [design-detector.json](design-detector.json) contiene `[]`; el README registra una única ejecución previa a la tanda final. No acredita por sí solo la calidad de los personajes ni se presenta como detector vuelto a ejecutar.
- El README registra 60 miniaturas finales, 672.531 bytes y hashes/píxeles distintos, además de 72 rásteres con procedencia y cero faltantes. Este pase conserva esos datos como evidencia reportada: no recalcula hashes ni escanea metadatos. La diversidad de miniaturas no implica sesenta escaneos humanos únicos.

## Límites y deriva no canonizada

El `PRODUCT.md` raíz sigue ausente; se usa `docs/PRODUCT.md` sin crear contexto nuevo. El sistema documentado y el CSS global conservan su alcance previo: el cuerpo heredado oscuro/Arial coexiste con los tokens claros/Inter de producto. Esa coexistencia y la cobertura parcial del visor no se reparan ni se convierten en una contradicción nueva de esta tarea.

Los bordes y materiales reparados son decisiones locales de implementación, no tokens adicionales o prohibiciones para otras superficies. No se acredita fotorrealismo, identidad biométrica, animación corporal, ergonomía homologada, lectura facial en móvil ni prueba en teléfono físico. La visibilidad sigue dependiendo de la cámara y las oclusiones de la cabina.

Omitido deliberadamente: cambios de sistema, código, logs, nuevas capturas y verificaciones ejecutables; este pase documenta el acabado y sus límites. Riesgo conservado: los seis encuadres y dos exportaciones muestreadas no sustituyen una inspección visual o exportación individual de las sesenta configuraciones.
