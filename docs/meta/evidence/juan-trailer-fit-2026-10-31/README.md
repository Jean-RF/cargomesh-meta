# Semirremolques: enganche, plataformas y estructura

31 de octubre de 2026. Trabajo local sobre `3810a589f75e4d4b9c7b7a7f2797cecffc791209`, rama `codex/meta-juan`. Sin commit, push, PR o despliegue.

Las seis capturas del usuario identifican separación excesiva cabina/remolque, portabobinas sin plataforma y estructuras incompletas en semicama, excavadora, portaautos y transformador. Se corrige el ensamblaje compartido de los veinte modelos grandes y se conservan las cabinas licenciadas, conductores, colores, cargas, masa y cantidades.

- Holgura cabina/remolque de 2,12 a 0,62 m. El enganche se coloca sobre los ejes de tracción.
- En camas bajas, cuello de 2,4 o 3,5 m según ejes de tracción. Se amplía el cuerpo por la misma diferencia para conservar la longitud útil de la carga. Las ruedas del tractor quedan bajo el cuello elevado, fuera del piso rebajado.
- Portabobinas con plataforma metálica continua. Camas bajas con vigas y travesaños bajo la superficie, laterales, estribos y anillas; luces traseras a la altura de la plataforma elevada.
- Portaautos con columnas, arriostramientos, soportes hidráulicos, rampas, calzos y sujeciones. Se conservan sus dos niveles y cuatro automóviles.
- La niebla del estudio se adapta a la distancia de cámara en los vehículos grandes, evitando que desaparezcan cuando el visor estrecho aleja el encuadre.
- Veinte miniaturas de camiones grandes recapturadas; las otras cuarenta se conservan. Manifiesto actualizado: 60 hashes de archivo/píxeles distintos, 667.744 bytes totales. Fuentes y licencias permanecen en `public/truck-cabs/LICENSE.md` y `public/truck-thumbnails/CREDITS.md`.

## Capturas del componente

| Caso | Antes de la corrección | Resultado |
| --- | --- | --- |
| Semirremolque seco | [Antes](before-cm-aero-dryvan.png) | [Lateral](cm-aero-dryvan.png) |
| Portabobinas | [Antes](before-cm-coil-well.png) | [Superior, piso cerrado](cm-coil-well.png) |
| Excavadora | Captura aportada por el usuario | [Perspectiva](cm-excavator-lowbed.png) |
| Tractor agrícola | Captura aportada por el usuario | [Lateral](cm-tractor-stepdeck.png) |
| Portaautos | Captura aportada por el usuario | [Perspectiva](cm-auto-doubledeck.png) |
| Transformador | Captura aportada por el usuario | [Perspectiva](cm-transformer-modular.png), [móvil](mobile.png) |

Capturas directas del visor completo en páginas 1440 × 1050 y 390 × 844; origen incrustado, sin retoque. En Tetris se conserva la inspección de carga: el lateral del furgón puede estar abierto sin retirar su piso.

## Comprobación

Las dos regresiones iniciales reprodujeron el hueco de 2,12 m y el piso ausente. [Colección/carga/licencias](collection-tests.log): 38/38. Incluye holgura de los veinte, rayos sobre el piso del portabobinas y camas bajas, separación entre cuello/ruedas y ajuste de las cargas métricas. [Tetris](meta-tests.log): 43/43. Build de producción con tipos/lint y arquitectura 842 módulos/245 entradas cliente correctos.

[Navegador](browser-check.json): los veinte modelos grandes terminan de cargar, siete vistas de los seis casos y móvil, selección y ausencia de errores JavaScript/desbordamiento. La captura móvil conserva 1.649 píxeles oscuros del vehículo en la región del canvas comprobada; la primera ronda lo perdía en la niebla y se corrigió. Las estadísticas `triangles` del renderer incluyen múltiples pases y no equivalen a la geometría del GLB.

[Tres descargas GLB comprobadas](export-check.json): portabobinas 8.227.028 bytes/115.280 triángulos; portaautos 10.511.724/146.407; transformador 9.367.880/102.485. Todas pasan el importador existente, sin superar 12 MiB. [Detector mecánico](design-detector.json): una ejecución, sin hallazgos; no acredita la calidad del modelado. Procedencia: escaneo de 69 rásteres (60 miniaturas y nueve capturas), cero ausentes. [Contrato de alcance](../../design-trailer-fit.md).

## Límites

[Revisión visual independiente](finish-review.md): `ship` en los seis casos y móvil, sin hallazgos materiales. [Revisión documental](documentation-review.md): conserva el sistema existente y delimita la reparación de activos.

La revisión visual corresponde a seis modelos grandes y el transformador a 390 px; los veinte se recorren en navegador y se comprueban mediante geometría, no son veinte inspecciones estéticas detalladas. No se rehace la maquinaria transportada ni las cabinas originales. Sin prueba en teléfono físico, simulación de articulación/giro, certificación CAD o nueva reimportación en Blender. No se presenta como fotorrealismo.
