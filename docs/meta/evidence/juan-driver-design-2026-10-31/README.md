# Conductores: rasgos, ropa y postura

31 de octubre de 2026. Rama `codex/meta-juan`, working tree sobre `3810a589f75e4d4b9c7b7a7f2797cecffc791209`. Sólo local, sin commit, push o PR.

El usuario pidió mejorar el diseño de los conductores. Se revisa el constructor compartido de los sesenta personajes, con la misma anatomía base CC0 de Dan Ulrich/Blender Studio. Se conservan sus IDs, nombres, datos, tonos de piel y uniformes; no se sustituyen las cabinas o las fotografías de stock de las fichas.

- Ojos colocados delante de la piel, con iris, pupila, párpados, cejas y pequeños reflejos; rasgos y coloración de labios/mejillas más definidos.
- Variación de mandíbula y complexión, cabello corto/recogido/calvicie, barba integrada en los colores de la piel y gafas selectivas. El cabello se recorta sobre la superficie anatómica, con transición hacia la piel y un mapa original de fibras. La camisa se recorta en aberturas continuas de cuello y mangas.
- Cuello de tela, mangas con puños, bolsillo, costuras y botones, con materiales de piel/cabello ajustados.
- Cinturón plano con hebilla, adaptado a la superficie del torso mediante rayos; dedos ligeramente curvados hacia el volante. Se mantiene la pose sentada y la posición dentro de cada cabina.
- Sesenta miniaturas recapturadas; 60 hashes de archivo/píxeles distintos, 672.531 bytes totales. Sin nuevas dependencias, imágenes de rostros o texturas externas. El nuevo mapa de normales de cabello es original del proyecto, generado por `scripts/prepare-driver-hair.mjs` y llamado también por el generador general de materiales.

## Comparación en las cinco familias de cabina

| Caso | Antes | Después |
| --- | --- | --- |
| Furgón sanitario / Sprinter | [Antes](before-cm-medical-van.png) | [Después](cm-medical-van.png) |
| Floricultor / cabina con capó | [Antes](before-cm-florist-glass.png) | [Después](cm-florist-glass.png) |
| Frigorífico pesquero / Isuzu | [Antes](before-cm-fish-reefer.png) | [Después](cm-fish-reefer.png) |
| Frigorífico cárnico / europea diurna | [Antes](before-cm-meat-rail.png) | [Después](cm-meat-rail.png) |
| Portaautos / europea alta | [Antes](before-cm-auto-doubledeck.png) | [Después](cm-auto-doubledeck.png) |

[Móvil a 390 px](mobile.png). Capturas directas del canvas en Detalle de cabina, orbitado hacia lateral y acercado para mostrar la persona sin el espejo frontal por delante; páginas 1440 × 1050 y 390 × 844. La vista móvil acredita integridad y ausencia de desbordamiento, no lectura de rasgos finos. Todas conservan procedencia incrustada, sin retoque.

## Verificación

Las regresiones iniciales reprodujeron ojos enterrados y ausencia de cinturón. [41 pruebas de colección/carga/licencias](collection-tests.log) correctas: ojos visibles en los sesenta, cinturón, normales válidas en cabello/ropa, manos junto al volante, ausencia de deformación de piel, geometría finita y límites del importador. La comprobación existente de pies ahora respeta las transformaciones de las nuevas piezas, conservando el mismo límite geométrico.

[Build de producción](build.log) con tipos/lint correcto. Arquitectura: 842 módulos y 245 entradas cliente. [Navegador](browser-check.json): cinco familias y móvil, sin errores JavaScript ni desbordamiento. Tras las rondas de construcción, el revisor pidió integrar la barba, suavizar la transición/material del cabello y cerrar los bordes dentados de la camisa. Se corrigieron en una tanda y se recapturaron las mismas vistas. [Veredicto del revisor](finish-review.md): los tres hallazgos `resolved`; su `ship` cubre únicamente esas correcciones. [Detector mecánico](design-detector.json): una ejecución, sin hallazgos; no se repitió durante la tanda ni sustituye la evaluación de los personajes.

[GLB finales exportados](export-check.json): sanitario 7.702.604 bytes/102.762 triángulos/14 imágenes; portaautos 10.631.228/149.996/12 imágenes. Ambos pasan el importador existente bajo 12 MiB y 16 imágenes embebidas. [Reimportación Blender 5.2.3 LTS](blender-check.json): piel, uniforme y cabello presentes, coordenadas finitas, colores de vértice y cero imágenes externas. No se reexportaron/reimportaron sesenta GLB en esta tarea.

Procedencia: 72 rásteres escaneados (60 miniaturas, once capturas y el mapa de fibras), cero faltantes. La licencia de anatomía y las modificaciones se conservan en `public/truck-materials/LICENSE.md`; cabinas CC BY 4.0 en `public/truck-cabs/LICENSE.md`. El mapa original mantiene la licencia MIT, origen y hash en `generated-assets.json`. [Contrato](../../design-driver-detail.md).

## Límites

[Revisión documental](documentation-review.md): sistema CargoMesh conservado, evidencia y alcance contrastados sin redefinir sus autoridades.

Son personajes de visualización derivados de una base anatómica común, con variaciones; no sesenta escaneos o retratos de las personas nombradas. No se acredita fotorrealismo, animación corporal, ajuste ergonómico homologado o una prueba en teléfono físico. El detalle visible depende del ángulo, los espejos y el tamaño del visor; los controles de cámara existentes se conservan.
