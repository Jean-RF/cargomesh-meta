# Códigos de mercancía — 1 noviembre 2026

Cada unidad manipulada de los 60 diseños conserva un identificador interno distinto. Los pallets de cartones y fármacos añaden códigos propios para sus ocho cajas: 498 unidades + 432 cajas = 930 códigos únicos. Botellas, frutas, ladrillos y otras piezas contenidas no reciben identificación individual en esta revisión. Los líquidos y graneles reciben un código de lote en una placa del vehículo.

Se sustituyen rayas decorativas por Code 128 C, con checksum y zonas libres laterales. Las etiquetas usan geometría y el atlas de impresión compartido, sin una textura por código. Sus posiciones siguen superficies o bases del producto; las de bidones, cilindros y macetas se curvan. Cada etiqueta viaja con su unidad durante la carga y se conserva en GLB. La lista «Ver códigos» permite consultar los identificadores; la fábrica muestra el de la unidad actual. No se escriben observaciones, sesiones, inventario ni Passport. Los identificadores no son registros GS1.

La geometría de las cajas de cartón/fármacos y paquetes textiles omite el bisel de 3 mm para compensar el coste de las etiquetas; conserva dimensiones, posición, cantidad, color, cintas y envolturas. No se amplía el límite de 200.000 triángulos.

## Evidencia

- [Decodificación geométrica](geometry-decode.json): 930/930 patrones de barras emitidos por `addBarcodeLabel`, proyectados a PNG a resolución suficiente y leídos con zxing-cpp 3.0.0. Unicidad y valor exacto comprobados. No son 930 fotografías de etiquetas ya montadas sobre los camiones.
- [Decodificación de interfaz](ui-decode.json): cinco capturas de símbolos SVG del navegador, leídas independientemente como Code 128. [Lista de códigos](desktop-codes.png), [fábrica escritorio](desktop-factory.png), [fábrica móvil](mobile-factory.png) y [etiquetas sobre cajas 3D](model-detail.png).
- [Navegador](browser-checks.json): panadería, semirremolque seco, sanitario, bidonero y cisterna. Coinciden códigos impresos/de consulta; avanzar, reiniciar y mover cámara conserva identidad. Chrome 1106×778 y 390×844, sin errores JavaScript ni scroll exterior/overflow horizontal. La primera captura móvil se descartó por transición del menú; la definitiva está asentada y sin superposición.
- [Presupuestos](budgets.json): los 60 modelos sin cabina licenciada adicional quedan por debajo de 200.000 triángulos; máximo 194.468. Se mantiene la comprobación de importación en las exportaciones completas.
- [GLB](glb-checks.json): sanitario y semirremolque seco con cabinas/texturas licenciadas, 8 y 216 etiquetas. Conservan identificadores en metadatos y geometría, sin referencias externas; tamaños 4,83 y 10,21 MB. El inspector existente acepta ambos. No se reexporta toda la colección.
- [Detector](detector.json): una ejecución, `[]`. Nueve PNG con procedencia incorporada y escaneo sin faltantes.
- [Comprobaciones finales](checks.json), verificadas el 2 de noviembre: 208/208 logística, 43/43 dashboard, 54/54 operaciones, typecheck, build con lint/tipos y arquitectura 851 módulos/247 entradas cliente. Localhost responde HTTP 200; HEAD continúa en 3810a58. La prueba inicial detectó exceso de geometría, corregido antes de esta tanda final.

El encodificador es [JsBarcode 3.12.3](https://github.com/lindell/JsBarcode), MIT; licencia incluida en `public/truck-materials/LICENSE.md`. La verificación usa las [bindings oficiales de zxing-cpp](https://github.com/zxing-cpp/zxing-cpp/tree/master/wrappers/python) instaladas fuera del proyecto; no incorpora un lector ni un servicio nuevo a la aplicación.

La lectura desde una vista general 3D depende del zoom, perspectiva y resolución; la consulta ampliada evita depender del tamaño de la etiqueta en pantalla. Sin prueba de escáner o cámara físicos, certificación de impresión ni registro externo. Sólo local, sin commit, push o PR.

[Revisión independiente](finish-review.md): **ship** para esta extensión local; cinco secciones completas y ningún hallazgo material observado. El primer intento falló por un límite de uso antes de producir dictamen; el único reintento fresco completó la revisión sobre evidencia guardada, sin navegador ni repetición de pruebas. Su alcance no equivale a validar 930 etiquetas montadas con un lector físico.

[Cierre documental](documentation-review.md): extensión comparada con el sistema existente; DESIGN, sidecar, PRODUCT y estilos globales conservados. La dependencia queda declarada en el contrato de esta extensión. El desfase previo de la descripción global del shell se registra sin modificarlo.
