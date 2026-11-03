# Fondo negro al desplazar Tetris — 1 noviembre

Corrección localizada de layout; se conserva el shell, identidad, modelos, estados y controles existentes. El usuario aportó una captura de panadería con la mitad inferior negra. No era una superficie negra de la escena3D.

Causa reproducida: el caption accesible de la tabla está posicionado de forma absoluta y el contenedor carrier carecía de contexto de posición. El caption tomaba body como offsetParent y escapaba del recorte del workspace: documento2153px frente a viewport778px. Al desplazar la página400px, el shell terminaba en y378 y quedaba visible el fondo oscuro global. La etiqueta invisible de Language también tomaba body como referencia.

Se añade únicamente `position:relative` al frame carrier existente. Sus descendientes absolutos quedan contenidos y recortados dentro del workspace; la página mide778px y scrollY permanece0. Se conserva el desplazamiento independiente de contenido, menú, tabla y sus textos accesibles. No se pinta el fondo para ocultar el fallo ni se bloquea el scroll de otras rutas.

[Comprobación navegador](checks.json): Chrome1106x778 y390x844; controles de fábrica alcanzables, avance de bandeja, tabla al final, lista de60 y menú móvil abierto/cerrado. Intentar desplazar window400px mantiene0; en `/truck-lab` window sí desplaza400px. Sin errores JavaScript. Navegación7/7, detector`[]`;4PNG con procedencia.

[Antes](before.png), [controles después](desktop.png), [tabla final](table.png), [móvil](mobile.png). La captura anterior se reprodujo con el desplazamiento exterior; las nuevas son viewports completos y contienen interfaz hasta el borde inferior.

Sólo local,sincommit/push/PR. No build de producción, prueba de hardware móvil o nueva suite de geometría: el único cambio de producto es una declaración CSS del contenedor.

[Revisión independiente](finish-review.md): ship para la corrección del fondo negro y su alcance de scroll. No modifica la aprobación ni límites de los modelos3D.

[Comparación documental](documentation-review.md): sistema visual conservado, archivos normativos intactos; cierre limitado al fallo de scroll.
