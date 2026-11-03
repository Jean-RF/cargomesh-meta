# Juan · 60 diseños estructurales de camión

Trabajo iniciado el 29 de octubre de 2026; cierre documental el 30 de octubre. Rama fija `codex/meta-juan`, [PR #5](https://github.com/Chujutak2024/meta-hackathon/pull/5). Implementación asistida con Codex; datos, vehículos y personas sintéticos. Esta reconstrucción responde al rechazo humano de cabinas básicas compartidas y recoloreados. La [revisión3 anterior](../juan-2026-10-29/README.md) es historia rechazada de la galería, no aceptación humana. Tetris no se modifica en este incremento.

## Resultado e inspección

[Visor local](http://localhost:3000/truck-lab). Sesenta filas de diseño originales en `vehicle-designs.ts`, con habitáculo, cofre, techo, frente, ópticas y acceso propios. Cabinas adelantadas, con capó, de acceso bajo, dobles, de trabajo, dormitorios y capós largos. Ejes y longitud del bastidor siguen esas proporciones. Chapa formada, huecos/pilares, juntas y herrajes, guardabarros con espesor, asientos/tablero, anatomía y peinados del conductor. Secciones de caja, medio tubo, volquete trilateral, cisternas y silo de tres conos; mercancía ajustada al espacio interior.

**Comparar formas** elimina pintura y mercancía; conserva el vehículo y su equipo fijo. Cámara/escala comunes por clase. **Detalle de cabina** acerca la construcción y al conductor; puede recortar intencionalmente ruedas o parte de la carrocería. La exportación conserva el conjunto completo a color. Las nueve láminas muestran los sesenta en el mismo orden de catálogo; las neutrales no llevan nombres.

| Clase | A color y con carga | Neutral sin mercancía | Lateral neutral |
|---|---|---|---|
| 20 pequeños | [Color](small-color-20.png) | [Formas](small-neutral-20.png) | [Lateral](small-side-20.png) |
| 20 medianos | [Color](medium-color-20.png) | [Formas](medium-neutral-20.png) | [Lateral](medium-side-20.png) |
| 20 grandes | [Color](large-color-20.png) | [Formas](large-neutral-20.png) | [Lateral](large-side-20.png) |

[Escritorio](desktop.png) · [Móvil](mobile.png) · [Datos de los sesenta](catalogo.csv). Los doce primeros planos de familias y el silo/volquete curvo acompañan esta carpeta. La diferencia de hash evita regresiones accidentales; no demuestra por sí sola variedad o realismo visual.

## Validación de este corte

| Comprobación | Resultado |
|---|---|
| `pnpm test:logistics` | 166/166, incluidas 14 pruebas de catálogo/cargas |
| `pnpm test:carrier-operations` | 54/54 |
| TypeScript y `pnpm build` | aprobados; Next.js compila `/truck-lab` |
| `pnpm check:architecture` | 799 módulos / 239 entradas cliente |
| Chrome, 1600×1100 y 390×844 | 60 modelos PBR/HDR; siete cámaras, comparación sin mercancía, filtros 20/20/20, búsqueda vacía, inspección y descarga GLB; cero errores de página o desbordamiento |
| Cabinas aisladas | 60 geometrías diferentes sin cuerpo, mercancía o persona; >=4 arquitecturas por clase; 60 rostros con línea de vista libre de chapa/asiento |
| Graneles | vértices dentro de la sección curva/trapezoidal de cinco volquetes/tolvas; puentes de ejes fuera del piso bajo y cierre de corona frontal comprobados |
| Exportación GLB v4 | 60, máximo 166.252 triángulos / 17 mallas; 258.752.720 bytes sin comprimir en total |
| Texturas/buffers | embebidos en los 60, cero URI externas |
| Blender 5.2.3 LTS | 60 importados en metros, dimensiones finitas, cero imágenes externas sin empacar |
| Detector visual | una ejecución; cero hallazgos; no sustituye la revisión de geometría |
| Procedencia raster | 292 capturas/láminas con origen incrustado; scan sin faltantes |

Informes mecánicos: [resumen](verificacion.json), [navegador](browser-verification.json), [Blender](blender-verification.json), [texturas](embedded-textures.json). Tras el cierre de la esquina del capó, se confirmaron de nuevo los 25 diseños afectados; el informe de navegador combina esas recapturas con el pase completo de 60 y lo identifica en targetedConfirmation. Los 35 sin capó no cambiaron.

Los resultados de Tetris/Meta AI del corte anterior siguen históricos; no se presentan como pruebas nuevas de este trabajo visual.

## Archivos grandes y reproducción

Desde `cargomesh/`: `node --import tsx scripts/export-truck-collection.mjs <directorio>` exporta las sesenta geometrías/materiales e inventario con SHA-256. Los GLB se conservan fuera de Git. El paquete local `cargomesh-60-disenos-estructurales.zip` contiene 60 GLB, catálogo, CSV, nueve láminas y verificaciones; 86.102.311 bytes; SHA-256 `8ff39f51fbc2b67eaa0f0b9d7fd5ec28b8f1eacddfc1ad8416f2fe7eb43a252a`. [Verificación del paquete](package-verification.json), incluidos CRC y hashes por GLB.

PBR/HDR local CC0: [Poly Haven](https://polyhaven.com/license), sin descargas remotas al renderizar. Referencias de proporción/construcción: [IVECO Daily](https://www.iveco.com/uk/Daily/Daily-Chassis-Cab) y [Scania P](https://www.scania.com/uk/en/home/products/trucks/p-series.html), además de las ya documentadas. No hay dependencia nueva, réplica certificada OEM ni escaneo de vehículos.

La aceptación visual del usuario/Cristhian sigue pendiente. No se acreditan homologación, reparto por eje, estabilidad o seguridad de estiba. Este laboratorio no implementa el acomodo operativo JU-08/JU-09, ni realiza mutaciones comerciales, cambios de base o despliegues.


La revisión FULL independiente de esta reconstrucción pidió cuatro fixes: remolques lowbed dedicados, cierre de unión/corona del capó, grúa articulada y apoyos/mecanismo de bobinas/extensible. El lote posterior se recapturó en los mismos encuadres: piso bajo separado del puente de ejes, remolques con rampas/bancada/cunas propios, capó cerrado, brazos perfilados con pasadores/cilindros/gancho y cunas/telescópicos sin mercancía. La [revisión FULL](visual-review.md) produjo `fix`. El [primer veredicto](visual-verdict-round1.md) resolvió remolques, grúa y cunas/telescópico y dejó parcial una rendija lateral del capó. Se cerró esa unión en las variantes con capó y se añadió una aserción por esa línea de vista. El [veredicto final](visual-verdict.md) devuelve `ship` para los arreglos puntuados, sin regresiones observadas; no equivale a aceptación humana de toda la superficie. La comparación no se acredita con un hash.

Pruebas visuales del cierre: [cabina de furgón](courier-cab.png), [furgón completo](courier-color.png), [excavadora sin carga](neutral-cm-excavator-lowbed.png), [agrícola](neutral-cm-tractor-stepdeck.png), [modular](neutral-cm-transformer-modular.png), [cuna de barco](neutral-cm-boat-cradle.png), [cunas de bobinas](neutral-cm-coil-well.png), [extensible](neutral-cm-steel-extendable.png) y [grúa](neutral-cm-tile-knuckle.png). [Detector](detector.json) y [procedencia raster](raster-scan.log); una ejecución del detector, sin repetición tras fixes. Se versionan 34 PNG seleccionados de los 292 locales.


[Revisión documental final](documentation-review.md): alcance, cifras, reportes, selección visual y enlaces contrastados; sin nueva identidad ni reparación del drift heredado.
