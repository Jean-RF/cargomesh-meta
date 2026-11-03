# Navegación durante la carga en fábrica — 1 noviembre

Dentro de cualquier camión, la modalidad «Animar carga en fábrica» permite mover la cámara delante/detrás/izquierda/derecha con cuatro botones. Cada click traslada 1 m en el plano del suelo según la mirada; cámara y objetivo de OrbitControls se mueven juntos, conservando altura, orientación relativa y distancia de órbita. Restablecer vista recupera el encuadre sin reiniciar la carga.

Con foco en el canvas: WASD o flechas mantienen movimiento de 3 m/s; las diagonales no aceleran y direcciones opuestas se cancelan. Al soltar, perder foco, ocultar pestaña o desmontar se limpian teclas. Formularios y deslizador conservan teclas propias. Giro/zoom existentes y panorámica con botón derecho o dos dedos usan OrbitControls ya instalado. Los controles se sitúan bajo la escena, sin tapar carga.

[Pruebas de navegador](checks.json): Chrome1106x778 y390x844. Cuatro botones conservan contador/reloj y trasladan1m; teclado sostenido, keyup, oposición/reanudación, blur y slider; reset, giro, zoom, arrastre derecho, pan de dos dedos y desplazamiento durante reproducción. Retornar al plan elimina navegación de fábrica del visor ordinario. Sin desbordamiento móvil ni errores JavaScript. Se verifica también movimiento reducido y hover blanco sobre primary-hover en la acción principal.

204/204 de logística final ([log](logistics.log)), incluidas 3 nuevas pruebas de cámara;54/54 de operaciones. Typecheck y arquitectura de 847 módulos y 246 entradas cliente correctos. Build final de confirmación correcto después del ajuste de hover, con tipos y lint. Detector`[]` ejecutado una vez antes de ese ajuste mecánico. Dos capturas con procedencia, scan0missing.

[Escritorio](desktop.png), [móvil](mobile.png). Se conserva sistema visual; dirección de interacción en docs/meta/design-factory-loading.md. El hover usa token primary-hover para impedir que el hover genérico aclare el botón mientras su texto sigue blanco.

No dependencia nueva ni cambio de cargas/datos/observaciones/Passport. No colisiones físicas de la cámara, móvil físico u otros motores comprobados. Sólo local,sincommit/push/PR; HEAD3810a58.

[Guion de la comprobación de navegador](browser-check.mjs): conserva los asserts ejecutados de reset, reloj/contador, movimientos y salida al plan. El JSON resume resultados; no contiene una traza de todos los estados antes/después.

[Revisión independiente](finish-review.md): ship para esta extensión de controles. [Comparación documental](documentation-review.md): identidad y archivos normativos conservados. No hubo correcciones de producto posteriores a las capturas finales.
