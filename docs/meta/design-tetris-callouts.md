# Tetris: grupos fijos y señalador de carga

Refinamiento Operate dentro del sistema CargoMesh. El usuario rechaza las etiquetas flotantes sobre el camión y pide cuadros a la izquierda y una flecha al objeto seleccionado que no tape la vista. Su captura es autoridad sobre el fallo anterior.

THESIS: escoger un grupo de carga sin cubrir el vehículo ni perseguir etiquetas móviles.

OWN-WORLD: conservar el visor, la paleta clara, botones nativos y lectura de kg/porcentaje del Tetris existente. Columna izquierda estable, selección con estado pulsado, un único señalador ámbar y el contorno del grupo; sin nueva identidad global.

STORY: escoger G01–G04 en la columna o la tabla; resaltar el mismo grupo y conectar su cuadro con un borde de su envolvente. La flecha se recalcula al girar, acercar o cambiar cámara. Sin selección inicial no hay señalador. Si la carga queda oculta, se omite el conector y se ofrece un aviso para girar o mostrar la carga.

FIRST VIEWPORT: los cuatro cuadros permanecen fuera del canvas, alineados a la izquierda; imagen a la derecha. La columna se reduce de140a100px al estrecharse el componente y no oculta grupos en móvil. No se modifica la ficha del conductor, las miniaturas o las métricas.

FORM: ruta por los márgenes del modelo, con perímetro 3D detrás de su profundidad y aproximación al borde seleccionado a su profundidad real. El cabezal SVG se muestra sólo cuando sus tres vértices pasan comprobaciones de oclusión; no recibe eventos de puntero. Se mantienen controles de cámara y sincronización con la tabla. El resto de consumidores de CollectionViewer conserva el visor sin columna.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

No se altera el acomodo, la masa, la geometría o la exportación GLB. El cabezal apunta a la envolvente del grupo, que puede reunir varias unidades; no es detección física o seguimiento por vídeo. Sin PR/push. La geometría oculta o fuera de encuadre no se convierte en una flecha falsa sobre el vehículo.
