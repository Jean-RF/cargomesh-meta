# Revisión de camiones 3D — 30 octubre 2026

**Actualización posterior:** el usuario rechazó también el aspecto de v5. Los resultados siguientes son históricos y técnicos; no equivalen a aceptación visual. Se replanteó la base de modelado con [un prototipo CARLA/Valdrada](../juan-truck-reference-2026-10-30/README.md), sin presentar una nueva transformación de los 60 como terminada.

Encargo: el usuario rechazó el acabado geométrico de v4 y pidió estudiar camiones reales en Internet. Esta revisión conserva 60 identidades, 20 por tamaño, en el laboratorio local `/truck-lab`.

## Referencias revisadas

- IVECO Daily: https://www.iveco.com/uk/Daily/Daily-Chassis-Cab — morro urbano, huecos y acceso.
- Scania P: https://www.scania.com/uk/en/home/products/trucks/p-series.html — cabina adelantada, esquinas y ópticas integradas.
- Isuzu N-Series: https://isuzutruck.co.uk/sales/ — proporciones de cabina ligera, espejos e interior.
- Volvo FH: https://www.volvotrucks.co.uk/en-gb/trucks/models/volvo-fh-aero/specifications.html — techo alto y superficies del frontal.
- Foto oficial Volvo examinada localmente: https://assets.volvo.com/is/image/VolvoInformationTechnologyAB/volvo-fh-diesel-cgi-exterior-1?wid=1000
- Foto oficial Scania examinada localmente: https://www.scania.com/adobe/dynamicmedia/deliver/dm-aid--acf24af2-3a83-46d5-9e76-ac22311ed91b/17320-028.jpg

Las fotos sirven como referencia visual; no se incluyen en las texturas o en Git. Los vehículos conservan nombres originales CM y datos de muestra, sin logos OEM.

## Cambios comprobables

El conductor usa la topología anatómica CC0 de Dan Ulrich/Blender Studio, con pose sentada y variaciones faciales. Se corrigieron proporciones del capó y cabinas altas, arco en la puerta, eje delantero, depósitos atravesados y llantas simuladas con discos negros. La chapa y sus normales se curvan; parrilla y faros tienen construcción propia. Las etiquetas incorporan los datos sintéticos del vehículo.

La carga distingue paquete/cajón individual de pallet con bultos interiores. Se sustituyeron cajas cerradas con rayas por cajones abiertos con contenido, añadieron cinta/film y tensores, y se reconstruyó el granel como superficie irregular continua. Se mantienen los límites de masa/dimensiones de muestra y las unidades explícitas.

## Alcance de la evidencia

Capturas y reportes corresponden al laboratorio local, no al dashboard operativo de Tetris ni a una fuente real de inventario. Una captura, hash o prueba de geometría no certifica realismo fotográfico, homologación, seguridad de estiba o aceptación del usuario. V4 queda como historial rechazado; v5 requiere revisión estética humana.

Procedencia de anatomía y materiales, scripts reproducibles y licencias: `cargomesh/public/truck-materials/LICENSE.md`. Los GLB completos se generan fuera de Git.

## Verificación

Fuente de implementación: `7882e53298dd33dd29b43ace4e95bb5649627e4a`, sobre `main@df12172` (PR #8 fusionado por el equipo). El siguiente PR conserva la rama `codex/meta-juan`. Esta revisión no modifica Tetris, la base de datos ni los módulos de otros responsables.

- **21/21 pruebas** de colección, carga e importación GLB. Incluyen 60 ensamblados distintos con geometría/normales finitas, rostros visibles, manos junto al volante, apoyo del piso, disposición y envolventes de mercancía, líquidos, liberación de recursos y fronteras de importación. La regresión de dedos se reprodujo con aristas de piel de 0,615m y se corrigió; el caso ahora exige menos de 0,12m.
- **Tipos y build de producción correctos**; arquitectura: 830 módulos y 241 entradas cliente. No se atribuye esto al CI remoto.
- **60 modelos en navegador**, más nueve muestras de cabina/carga, tres primeros planos adicionales, filtros 20/20/20, exportación descargada y documento sin desbordamiento a 1600/390px. Cero errores de página y peticiones HTTP fallidas. La pose final se volvió a revisar en tres familias de cabina. `browser-verification.json` conserva alcance y fechas; no es una evaluación en móviles físicos.
- **60 GLB exportados/importados en Blender 5.2.3**, escala métrica y cero imágenes externas. Máximos: 197.471 triángulos, 19 meshes y 8.734.144 bytes por archivo. El límite compartido de 200k/16 imágenes/12MiB se conserva. Los hashes de los archivos y el recuento de imágenes están en `export-verification.json`.
- Paquete local `cargomesh-60-camiones-v5.zip`: 116.427.700 bytes, 60 GLB y comprobación CRC correcta. SHA-256 `d1ea7fb059cc0fcbd48e7ef5558e4316639cc475faa676fb48c3fc5095503c0f`. Los archivos binarios completos permanecen fuera de Git; se adjunta `package-verification.json`.

Las láminas `*-color-20.png` muestran cada clase; `*-cab.png`, `*-driver.png` y `*-cargo.png` permiten inspeccionar detalles. `desktop.png` y `mobile.png` documentan el visor. Son capturas reales del navegador, sin retoque generativo.

Se comprobaron funcionamiento y problemas visibles de esta revisión. El acabado sigue siendo una visualización 3D para web: no se declara fotorrealismo, una réplica exacta del fabricante, aceptación de Cristhian/usuario o seguridad física de las cargas.
