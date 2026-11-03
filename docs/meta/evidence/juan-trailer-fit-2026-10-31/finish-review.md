disposition: ship

No aplican comp aprobada, QUALITY BAR, seed de concepto ni gates de reproducción: es reparación del ensamblaje existente. No revisé cada miniatura ni las veinte variantes visualmente, ni ejecuté de nuevo las pruebas; móvil es captura de navegador, no dispositivo físico.

## persistence

pass — Existen docs/PRODUCT.md, DESIGN.md y docs/meta/design-trailer-fit.md; el contrato conserva el mundo y limita el cambio a geometría y activos. Leí las seis capturas originales del usuario, las seis capturas finales de componentes a 827×491, mobile.png a 341×391 y los dos before. Todas muestran el vehículo y estado que declaran, completos, sin regiones negras ni evidencia de carga pendiente. El recorte de componente es el alcance de captura declarado; no se presenta como página completa. design-detector.json contiene []; browser-check.json registra veinte modelos ready y cero errores, sin convertir ese dato en veinte aprobaciones visuales. export-check.json registra tres GLB por debajo de 12 MiB; sus triángulos no se confunden con los pases del renderer.

## fidelity

| Elemento / promesa | Estado | Evidencia visible |
| --- | --- | --- |
| Aero: unión cabina–semirremolque | match | cm-aero-dryvan.png reduce claramente el tramo descubierto del before y del recorte del usuario; el frente de la caja queda próximo a la cabina y el conjunto conserva ruedas y plataforma. La medida de 0,62 m procede del modelo compartido, no de una medición en píxeles. |
| Coil: piso continuo | match | cm-coil-well.png superior muestra superficie metálica opaca a ambos lados de las tres bobinas y hasta los extremos; desaparecen los huecos del before que dejaban ver el fondo entre travesaños. |
| Tractor: plataforma útil y cuello | match | cm-tractor-stepdeck.png lateral muestra piso continuo bajo las dos ruedas de la carga, larguero inferior y escalones delantero/trasero conectados. El cuello elevado pasa por encima del grupo de tracción sin la separación frontal del recorte original. |
| Excavadora: apoyo y estructura | match | cm-excavator-lowbed.png conserva excavadora y cabina, presenta cama continua bajo las orugas y estructura inferior; la transición del cuello y el módulo trasero se leen conectados. |
| Portaautos: dos niveles construidos | match | cm-auto-doubledeck.png conserva cuatro coches y dos niveles, añade postes, diagonales y carriles; las cubiertas dejan de parecer dos láminas sostenidas por varillas aisladas del recorte del usuario. |
| Transformador: apoyo y enganche | match | cm-transformer-modular.png muestra bancada apoyada, cama conectada a los módulos de ejes y cuello junto al tractor. mobile.png conserva el vehículo completo y su contraste; a esa escala no prueba pequeños herrajes. |
| Inspección de carga | adaptation | La caja abierta del aero expone los bultos; es el estado de inspección exigido en el paquete, no la desaparición accidental de la carrocería o del piso. |
| TYPE | match | Se conserva la tipografía de controles y grupos de carga del visor incumbente; no se introdujo una nueva voz de interfaz. |
| MATERIAL | match | Permanecen cabinas y cargas 3D originales, metal y plataformas modeladas. El piso coil es superficie de geometría continua; no se sustituyó el modelo por una imagen ni se promete fotografía/CAD homologado. |
| GROUND | match | El fondo gris de estudio y el apoyo/sombra se conservan respecto a los recortes y before; no hay una nueva autoridad cromática que requiera otro campo. |

## ceiling

reached — Las seis variantes solicitadas y la vista estrecha sostienen la reparación de unión, piso y estructura dentro del visor existente. No hay dispositivo expresivo nuevo pendiente dentro de este encargo; cabinas, cargas, interfaz y encuadre anteriores fijan el límite. La captura estrecha acredita integridad y ausencia de desvanecimiento, no inspección detallada de herrajes ni uso en móvil físico.

## material_fixes

Ninguno en el alcance y las vistas examinadas.

## keep

Conservar piso coil continuo, cuellos elevados sobre los ejes de tracción, plataformas apoyando la carga, arriostramiento del portaautos y las cabinas/cargas originales; mantener la distinción entre modelo ilustrativo y CAD homologado.
