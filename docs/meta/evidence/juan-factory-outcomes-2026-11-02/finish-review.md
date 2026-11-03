# Revisión de acabado — dos resultados por camión

disposition: ship

Revisión independiente del refinamiento local, 2 de noviembre de 2026. Alcance: los seis archivos de fábrica/reproductor/visor indicados en el encargo y su evidencia; no aprobación de todo Tetris ni validación de una operación real. Autoridad: `DESIGN.md`, `docs/PRODUCT.md` y «Dos resultados por vehículo» de `docs/meta/design-factory-loading.md`; craft floor de Impeccable y cierre de `new-work.md`, sección 7. Trabajo code-led dentro del mundo existente, sin comp aprobado ni gates comp-led.

## persistence

Las variantes existen en el plan y la escena compartidos, no sólo en las capturas. `incompleteFactoryPlan` reutiliza las unidades, identidad y recorridos del plan completo; limita la transferencia antes de retirar el equipo y desplazar el vehículo. La pose depende del reloj acotado y vuelve al origen al buscar/reiniciar. Lo omitido conserva su posición de fábrica; camión, accesorios propios y mercancía cargada comparten el desplazamiento. El resultado es estado local de simulación: no se presenta como inventario persistido, observación registrada o modificación de sesión.

La selección nativa reinicia pausada. Movimiento reducido ofrece pasos y retorno al inicio, con un paso de salida; la guarda final de `Math.min(plan.duration, …)` evita un destino infinito cerca del final. Ese último ajuste funcional se revisó en código y fue comprobado por el constructor después de las capturas; no cambia los estados fotografiados.

## fidelity

Se abrieron los 12 PNG requeridos y se compararon sus SHA-256 con `verification.json`: 12/12 coinciden. Son capturas de viewport o canvas de los estados declarados, no páginas completas desde el inicio de Tetris. No presentan regiones vacías, carga incompleta de recursos o secciones equivocadas que invaliden este alcance. `before.png` es referencia incumbente con procedencia declarada, no un comp aprobado.

El selector conserva el shell claro, tinta azul, teal, tipografía y visor PBR existentes. En 1280, 1106 y 390 px las opciones se leen, la selección tiene radio y texto además del color, y móvil apila sin desbordamiento visible. La escena sigue siendo protagonista. El resultado sanitario muestra 7/8, una unidad pendiente, 238 kg cargados, 34 kg omitidos y el código 0002008000; «100 % del tiempo» no se confunde con carga completa. Los cuatro métodos y los dos tipos de flujo incluidos muestran equipo separado del vehículo y mercancía pendiente identificable.

| Before | After | Why |
| --- | --- | --- |
| Una secuencia de carga completa. | Carga completa y Salida con pendientes, elegibles antes del visor. | La petición exige dos desenlaces por camión y permite dejar un producto. |
| Todo el recorrido conduce al depósito de todas las unidades. | La última unidad queda en origen; líquido/granel se detiene al 75 %, seguido de retirada y salida. | La animación explica un faltante concreto conservando la carga real del modelo. |
| El cierre completo usa confirmación positiva. | El cierre incompleto mantiene advertencia, cantidades, peso y código pendientes. | Terminar el reloj no concede éxito operativo. |

## ceiling

El acabado alcanza el objetivo de esta extensión: la diferencia se comprende en la elección, en el espacio 3D y en las cantidades finales. No necesita otra identidad visual, una rotura adicional ni efectos decorativos. La retirada seguida de salida es el movimiento focal; pausa, búsqueda, reinicio y reducción de movimiento conservan su utilidad.

Se revisaron código, capturas y registros existentes; no se abrió navegador ni se ejecutaron suites o detector. `checks.json` aporta reproducción real, pausa, rebobinado, reinicio y código en cinco vehículos de los cuatro métodos, teclado y pasos reducidos en móvil, sin errores JS registrados ni overflow en sus medidas. El detector suministrado contiene `[]` y precede al último ajuste de rampa/rango; no se repitió. El build final terminó. La ejecución de fábrica conservada registra 10/11 y un fallo por comparar `-0` con `0`; tras cambiar sólo esa aserción a tolerancia, el caso nativo que recorre 60 escenas terminó 1/1. Los once casos quedan cubiertos entre ambos registros, sin afirmar una ejecución única de 11/11.

La evidencia no mide FPS, hardware físico, otros motores, escáner ni conducción/seguridad industrial; tampoco monta las 120 combinaciones en navegador. Esos límites no contradicen la simulación solicitada.

## material_fixes

Ninguno en el alcance revisado. No se requiere recaptura, reconstrucción ni lote de cambios visuales. `ship` se limita al refinamiento y a la evidencia descritos arriba.

## keep

Conservar las dos opciones nativas con cambio pausado, los caminos y tiempos de carga completa, el faltante real en origen, la rampa rígida estacionaria y la separación del equipo antes de salir. Mantener el cierre ámbar con texto/código, la distinción entre tiempo y carga, las cantidades por masa/volumen en flujos y el avance por pasos sin autoplay. Preservar los normativos, las doce capturas con su procedencia y ambos registros de la prueba corregida.

Omitido: navegador, suites y detector adicionales, según el alcance. Riesgo restante: las capturas estáticas no certifican fluidez ni comportamiento en hardware real.
