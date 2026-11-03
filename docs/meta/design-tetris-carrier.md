# Tetris dentro del portal carrier

Extensión Operate del catálogo de Tetris existente. El usuario aporta una captura de la barra lateral CargoMesh y pide añadir ahí Tetris para el carrier. Se reutiliza la navegación del portal; no cambia la identidad global.

THESIS: el carrier encuentra Tetris en Operaciones de transporte y puede revisar los vehículos y sus cargas sin abandonar el menú del portal.

OWN-WORLD: conservar CarrierNavigation, marca CargoMesh, fondo lateral claro, grupos de enlaces, iconos lineales y fila activa blanca. Mantener los tokens y controles actuales; no copiar las secciones de cliente de la captura al rol carrier.

STORY: abrir el menú carrier, elegir Tetris, filtrar los60vehículos, abrir una carga3D y volver al catálogo o a Flota. La entrada activa y el menú móvil pertenecen al shell existente.

FIRST VIEWPORT: barra lateral a la izquierda, Tetris activo bajo Operaciones de transporte y contenido existente a la derecha. La cabecera de marca anterior de Tetris se omite al embeberlo para evitar dos shells. Móvil reutiliza el cajón, Escape, foco y cierre al navegar del portal.

FORM: `/carriers/tetris` es una sección del mismo documento carrier, reconocida por su registro de rutas. Se carga el componente existente con `embedded`; usa consultas de contenedor para responder al espacio que deja la barra lateral, también cuando se contrae. `/tetris` sigue accesible por separado y las sesiones/comparación/Passport no cambian.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

La selección y sus precios siguen siendo una demostración, identificada una vez en la vista. No se alteran membresías, permisos, base alojada, contratos o datos operativos. Las comprobaciones de acceso se mantienen en el layout existente. Sin commit, push o PR.
