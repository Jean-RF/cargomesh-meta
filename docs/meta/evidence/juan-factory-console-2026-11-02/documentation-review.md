# Documentation review — consola de fábrica

**Documentación conforme al alcance; SHIP de la consola, con F1 resuelto.** Se conserva la [revisión inicial FIX](finish-review.md) y se aplica el [veredicto posterior](verdict.md), que cierra su único ajuste material. Esta revisión documental no autoriza publicar ni extiende el veredicto a toda la aplicación, geometría o maquinaria física.

La petición fue mejorar diseño y animaciones a partir de la [captura del usuario](user-reference.png). La dirección vigente es «Consola de simulación» en el [contrato de fábrica](../../design-factory-loading.md). La captura y [before.png](before.png) son antecedentes del problema, no un comp aprobado que deba reproducirse. El resultado y sus límites quedan accesibles en el [README](README.md).

## Extensión e identidad

Se contrastaron [PRODUCT](../../../PRODUCT.md), [DESIGN](../../../../DESIGN.md), el [sidecar](../../../../.impeccable/design.json), el contrato y FactoryPlayer TSX/CSS. El refinamiento conserva el espacio de trabajo CargoMesh claro/teal, la pila tipográfica declarada, numerales tabulares, superficies blancas, controles de 44 px y límites visibles entre datos. La banda oscura reutiliza `cm-color-ink` como superficie de transporte y `cm-color-surface` para las acciones: es un énfasis local dentro de la identidad existente. Los tonos positivos ya disponibles señalan el final. No se crean tokens globales ni una identidad industrial alternativa.

El visor compacto, cámara agrupada, transporte, avance, conteos, código y medidas siguen una secuencia de lectura propia de esta superficie. Los hitos de sólidos derivan de `releaseAt`; los líquidos conservan llenado continuo sin marcas de unidades. «% del tiempo» permanece separado del porcentaje de llenado. La extensión respeta la distinción de PRODUCT entre demostración sintética y ejecución operativa: terminar o repetir no registra una observación ni modifica la sesión de carga.

La comparación con HEAD `3810a58` confirma que DESIGN.md, `.impeccable/design.json` y `docs/PRODUCT.md` no tienen cambios de contenido, normalizando CRLF. Se preservan el frontmatter normativo y sus referencias; esta revisión sólo escribe este informe. La prohibición de sobrescribir DESIGN sin elección del usuario no se activa, porque no se regenera el sistema ni el sidecar.

## Movimiento y estados

Se usa el criterio de Emil: cada movimiento comunica una respuesta o estado, las acciones frecuentes de teclado responden inmediatamente y no se bloquea la interacción. La lectura del código respalda el comportamiento; las imágenes estáticas no demuestran la fluidez temporal.

| Antes | Después | Por qué |
| --- | --- | --- |
| Controles blancos de peso similar y final apagado en la referencia. | Banda de tinta, acción principal clara, reloj destacado y «Continuar carga» al pausar; al finalizar, «Repetir carga» reinicia y reproduce en modo normal. | El siguiente paso se identifica en cada estado sin una secuencia de entrada. |
| Avance sin hitos de depósito visibles. | Barra con `transform: scaleX`, transición lineal de 150 ms y marcas en los tiempos reales; líquidos sin marcas discretas. | El movimiento explica el tiempo y los depósitos, sin presentarlos como ocupación física. |
| El depósito comparte jerarquía con código y cifras. | Conteos en banda y acento de opacidad/desplazamiento de 180 ms al cambiar la cifra colocada. | Reconoce la actualización del dato sin añadir un bucle ambiental. |
| Final con poca confirmación de resultado. | Mensaje positivo y confirmación de icono de 280 ms, subordinados a la finalización. | Da cierre al evento; no comunica una operación registrada. |
| En la primera revisión, el final reducido dejaba «Siguiente paso» deshabilitado. | F1: «Volver al inicio» habilitado ejecuta `jump(0)`; restaura cero y pausa. «Siguiente paso» vuelve a estar disponible, sin autoplay. | Mantiene un cierre accionable y conserva el avance manual elegido por la preferencia de movimiento. |
| Riesgo de transiciones en acciones repetidas. | Foco visible suprime transición de barra/estado y animación de depósito/cierre; movimiento reducido elimina animaciones/transiciones y la pulsación desplazada. | Conserva respuesta inmediata por teclado y una alternativa por pasos. |

No se añaden librerías, bucles decorativos ni tiempos nuevos al plan. El feedback de botones utiliza propiedades explícitas y pulsación breve; la preferencia reducida también anula ese desplazamiento. Las verificaciones nuevas del implementador tras F1 cubren final → volver al inicio y ausencia de autoplay; no se exige una ronda nueva de pulido.

## Evidencia, enlaces e historia

Se verificaron por lectura los diez PNG del [manifiesto actual](verification.json): los diez SHA-256 coinciden y cada archivo contiene `impeccable:prompt`. Dimensiones: 1280×900 para desktop/overview/flow; 1106×778 para before/user-1106/keyboard-focus; 390×844 para mobile/mobile-complete/mobile-reset; 818×262 para la referencia del usuario. Se inspeccionaron visualmente before, desktop y las dos capturas móviles de F1: [final](mobile-complete.png) y [vuelta al inicio](mobile-reset.png).

La referencia declara origen en la captura aportada por el usuario; los otros nueve archivos declaran capturas locales de Chrome de la escena Three.js existente del 2 de noviembre. La procedencia común menciona el estado final F1 incluso en `before.png`; esto no convierte esa imagen anterior en una captura del resultado. No hay imagen generada o stock declarados en este paquete. Los metadatos identifican origen y contexto, no certifican una operación física.

Los enlaces locales de README, DESIGN y PRODUCT resuelven; los archivos de revisión, manifiestos y detector citados están presentes. Se mantiene [verification-before-F1.json](verification-before-F1.json) como registro histórico de nueve hashes. Sus hashes no son el control de integridad actual: se actualizaron PNG/procedencia y se añadió `mobile-reset.png`. La revisión FIX describe correctamente aquel estado anterior; el veredicto posterior y el manifiesto de diez archivos describen el cierre actual. Ninguno se reescribe para borrar la historia.

Los [controles y contrastes](checks.json) registran inicio, pausa, velocidad 2×, cámara sin cambiar reloj, final, repetición normal, reinicio, teclado inmediato, sólidos y llenado continuo. En móvil reducido registran vuelta a cero y sin autoplay; la comprobación temporal a 250 ms pertenece a la evidencia del implementador y no se repitió aquí. Se documentan cero errores, ancho de documento/viewport de 390 px y contenido del panel de 341 px sin overflow. Los contrastes medidos son 13,09:1 para acciones, 6,06:1 para ayuda y 6,09:1 para cierre.

El manifiesto registra typecheck y build final con lint/tipos después de F1, 43/43 pruebas de dashboard y arquitectura 852 módulos/247 entradas cliente. Son resultados guardados del implementador, no ejecuciones independientes de este documenter. [detector.json](detector.json) contiene `[]`, obtenido una sola vez antes de F1; no se ejecutó de nuevo.

## Deriva previa y límites

DESIGN y el sidecar siguen siendo el scan del espacio de trabajo de operaciones, con sidecar fechado el 30 de octubre. No pretenden catalogar cada estado de fábrica del 2 de noviembre. La cobertura local añadida queda en el contrato y este paquete, sin promover composición, alturas, breakpoint de contenedor o animaciones puntuales a reglas globales. El hover primario local de operaciones que DESIGN ya identifica como variación previa continúa documentado como tal; no se corrige ni se adopta como nuevo token. La declaración de Inter tampoco certifica qué fuente/fallback entrega cada navegador.

El alcance atribuido a este refinamiento de producto es FactoryPlayer TSX/CSS, más contrato y evidencia. El árbol de trabajo contiene cambios de tareas anteriores; este informe no los atribuye a la consola ni los audita. Según el alcance y evidencia revisados, no se alteran destinos, geometría, dimensiones, pesos, códigos, tiempos de carga, dependencias, API, autenticación ni archivos globales del sistema visual. No se hicieron commit, push, PR o publicación.

No se abrió navegador ni se repitieron suites, detector o pruebas geométricas/físicas en esta revisión. Siguen sin comprobarse móvil físico, otros motores y FPS; las capturas no certifican suavidad temporal ni rendimiento real.
