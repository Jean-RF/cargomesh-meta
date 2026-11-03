# Miniaturas de los60camiones en Tetris

31oct2026, working tree local sobre HEAD3810a58, sin commit/push/PR. Se añade una miniatura junto al nombre de cada vehículo en el catálogo del carrier y Tetris independiente, conservando nombre, conductor, tarifa y acción3D.

Se capturaron los60modelos actuales, versión visual9, en `/truck-lab`: perspectiva uniforme y carrocería cerrada. Los controles superpuestos no forman parte de la imagen final. Archivos JPEG locales, carga diferida,112×70px en escritorio y96×60px en móvil. El marco del render es360×225CSS; Chrome captura361×226píxeles al redondear sus bordes. No hay retoque de imágenes ni nueva dependencia. Las licencias de las cabinas y materiales se conservan en [créditos](../../../../cargomesh/public/truck-thumbnails/CREDITS.md).

Los60JPEG finales decodifican, tienen píxeles distintos, origen registrado y hashes en [manifest](../../../../cargomesh/public/truck-thumbnails/manifest.json);658460bytes en total, menos de1MiB. La lista sigue sin montar un visor WebGL por fila. El icono queda como respaldo si una miniatura falla. Regenerar las capturas cuando cambien geometría, carga o pintura; no son fotografías de vehículos registrados.

Verificado:3/3pruebas del modelo y TypeScript correctos. Chrome:60imágenes específicas y60respuestas200, cero canvas en la lista, tarjeta390px sin desbordamiento y apertura del3D correspondiente;0erroresJS. [Escritorio](desktop.png), [tarjeta móvil](mobile-card.png), [recorrido](browser-check.json). Las imágenes del producto y de evidencia llevan procedencia. El servidor local se reinició porque estaba detenido y quedó escuchando en127.0.0.1:3000.

No se repitió build completo o benchmark en móvil físico. No cambian contratos, permisos, geometría o registros operativos.
