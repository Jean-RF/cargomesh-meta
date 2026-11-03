# Finish review — consola de fábrica

**Disposition: fix.** Revisión nueva de `/carriers/tetris?truck=cm-medical-van`, modo fábrica, sobre el rechazo del usuario al transporte anterior. La dirección visual funciona; queda un cierre puntual en movimiento reducido. No corresponde reconstruir el panel ni su mundo visual.

## persistence

Se leyeron el contrato «Consola de simulación», `docs/PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, TSX/CSS actuales, README y los tres JSON de evidencia. Se inspeccionaron visualmente los nueve PNG: `user-reference`, `before`, `overview`, `desktop`, `user-1106`, `keyboard-focus`, `flow`, `mobile` y `mobile-complete`.

Los nueve hashes SHA-256 coinciden con `verification.json`; los nueve PNG contienen procedencia `impeccable:prompt`. La referencia declara origen en la captura del usuario; los demás declaran capturas locales de Chrome del 2 de noviembre. La procedencia identifica la captura y el origen sintético de la escena; no autentica una operación física. Las dimensiones concuerdan con 1280×900, 1106×778 y 390×844; el recorte del usuario mide 818×262.

## fidelity

Es una extensión dirigida por código sin comp aprobado. La captura del usuario y `before.png` representan el estado rechazado, no una referencia estética que deba copiarse.

| Before | After | Why |
| --- | --- | --- |
| Transporte blanco con acciones poco diferenciadas y botón apagado al final. | Banda de tinta, acción principal clara, reloj con escala mayor y «Repetir carga» en `user-1106.png`. | Mejora jerarquía y siguiente acción conservando la tinta CargoMesh. |
| Cinco botones de cámara dispersos entre texto. | Navegación agrupada en superficie secundaria y objetivos de 44 px. | Separa explorar la escena de controlar la simulación. |
| Línea de avance sin hitos. | Ocho marcas de depósito, fase y porcentaje rotulado «del tiempo». | La lectura se conecta con `releaseAt`, sin convertir tiempo en ocupación. |
| Código y cifras compiten sin una secuencia clara. | Conteos en banda, identificación de unidad/lote y medidas separadas. | El ojo lee avance, resultado e identidad en ese orden. |
| Final reducido aún sin siguiente acción principal. | Corrección pendiente descrita abajo. | La última captura móvil conserva el patrón de CTA deshabilitado que motivó el refinamiento. |

`flow.png` separa correctamente 50% del tiempo y 47,5% de llenado, sin marcas discretas. `keyboard-focus.png` muestra un contorno exterior claro alrededor del deslizador y un anillo en el thumb: el foco sigue visible en esa captura. Móvil conserva jerarquía y cifras en dos columnas sin recorte horizontal visible. `overview.png` mantiene shell, vehículo, producto y método; el visor sigue protagonizando la página.

## ceiling

Una pasada de revisión sobre evidencia existente; sin navegador, detector ni suites nuevas. `checks.json` registra controles, pausa, velocidad 2×, cámara sin alterar reloj, final, repetición normal, reinicio, teclado inmediato y móvil reducido por pasos, con cero errores. Sus contrastes declarados son 13,09:1 en acciones, 6,06:1 en ayuda y 6,09:1 en cierre. `verification.json` registra typecheck, build con lint/tipos, 43 pruebas y arquitectura 852/247; se leen como resultados del implementador, no como ejecuciones independientes de esta revisión. `detector.json` contiene `[]`.

El código respalda movimiento acotado a avance, cambio de estado, depósito y cierre: transformación lineal de la barra, cifra depositada de 180 ms y confirmación de 280 ms, sin bucles ni entrada bloqueante. Las reglas de foco y movimiento reducido suprimen sus transiciones/animaciones. El contador de sólidos deriva de `releaseAt`; llenado/peso de líquidos derivan de su fracción. Las capturas estáticas no prueban suavidad temporal, FPS, latencia física ni cinemática. No se certifican móvil físico, otros motores, toda la geometría o todos los vehículos.

## material_fixes

**P2 — ofrecer un cierre accionable también en movimiento reducido.** En `factory-player.tsx:49`, la rama `reduced` se evalúa antes del estado final y deshabilita «Siguiente paso» con `pose.finished`. `mobile-complete.png` lo confirma; el mensaje de `factory-player.tsx:65` invita simultáneamente a repetir. «Reiniciar» permite recuperar el flujo, pero la acción principal queda apagada al terminar.

| Before | After | Why |
| --- | --- | --- |
| «Siguiente paso» deshabilitado al completar en movimiento reducido. | Acción final habilitada, por ejemplo «Volver al inicio», que ejecute `jump(0)` y conserve el modo por pasos sin reproducir automáticamente. | Hace explícita la repetición accesible y resuelve el cierre sin alterar tiempos, geometría o preferencias de movimiento. |

La corrección debe alcanzar la etiqueta/icono y acción de esa rama, el texto de cierre si hace falta, y la captura/evidencia móvil final correspondiente. La verificación adicional necesaria es sólo final → volver al inicio → siguiente paso, conservando movimiento reducido y reloj detenido. Ningún otro cambio material de diseño se requiere con la evidencia disponible.

## keep

Conservar la banda de operación de tinta, cámara agrupada, reloj/tabulares, slider con hitos reales, separación entre tiempo y llenado, banda final positiva, lectura en bandas de código/medidas y respuesta inmediata por teclado. Mantener el alcance en FactoryPlayer; el shell y el lenguaje claro/teal ya hacen coherente la extensión.

No se modificó producto ni se abrió navegador o repitieron detector/suites. Riesgo pendiente: cierre reducido incoherente; fluidez y rendimiento en hardware real siguen sin comprobarse.
