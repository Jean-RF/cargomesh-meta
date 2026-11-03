# Consola de la simulación de carga — 2 noviembre 2026

El usuario pidió mejorar el diseño y las animaciones de la página; su [captura](user-reference.png) muestra los controles anteriores al completar la carga. Se refina la vista de fábrica dentro de Tetris, conservando CargoMesh, su navegación, sus tokens y los datos del vehículo. [Panel anterior completo](before.png).

La escena ocupa un marco más compacto —280 px en móvil— y los controles de cámara se agrupan fuera de la geometría. La reproducción usa una barra con la tinta del sistema, botones de alto contraste y tiempo más legible. El avance separa porcentaje de tiempo, fase actual, conteos y llenado: las marcas de sólidos corresponden a `releaseAt`, y no se dibujan marcas de unidades en líquidos. Los indicadores, el código de la unidad y las medidas se ordenan en bandas de lectura.

Al pausar aparece «Continuar carga». Al finalizar, «Repetir carga» reinicia la simulación y reproduce; el cierre confirma las unidades/peso colocados y permite seguir explorando. En movimiento reducido, «Volver al inicio» restaura el inicio sin reproducción automática y deja disponible «Siguiente paso». No se registra una observación ni una operación real.

Las transiciones reconocen estado y depósito: avance por transformación, cifra colocada y confirmación final. No hay bucles decorativos o entrada que bloquee la página. Movimiento reducido elimina transiciones/animaciones, y la interacción con foco de teclado mantiene respuesta inmediata. CSS reutiliza la pila existente; sin una librería o servicio nuevo.

## Comprobación

- [Vista inicial de la página](overview.png), [escritorio1280](desktop.png), [final1106](user-1106.png), [foco de teclado](keyboard-focus.png), [móvil390](mobile.png), [final móvil](mobile-complete.png) y [vuelta al inicio por pasos](mobile-reset.png).
- [Líquido](flow.png): 50% del tiempo de simulación y 47,5% de llenado son indicadores distintos y se obtienen del plan.
- [Navegador](checks.json): iniciar, pausar, continuar disponible, velocidad2×, ocho marcas, completar, repetir, reiniciar, cámara sin cambiar reloj, teclado inmediato y modo reducido por pasos. Sin errores JavaScript; móvil de390 mantiene documento/viewport de844px y contenido de341px sin overflow. Contrastes medidos: acciones13,09:1, ayuda6,06:1 y cierre6,09:1.
- Typecheck y build final con lint/tipos correctos;43/43 pruebas de dashboard y arquitectura852/247. Se verifican los controles nuevos en navegador; no se vuelve a ejecutar geometría/GLB o física de maquinaria, que no se modifican en esta tarea.
- Detector una vez sobre TSX/CSS del componente, antes de corregir F1: [resultado](detector.json), `[]`; no se repite. Diez PNG con procedencia incorporada. La corrección final de F1 se verifica en navegador y build.

La [revisión inicial](finish-review.md) pidió un único ajuste F1: evitar el botón final desactivado en movimiento reducido. Se corrigió con «Volver al inicio». El reporte de navegador comprueba que se restablecen tiempo/conteo a cero, el estado queda pausado y no se inicia reproducción automática. El manifiesto anterior a ese ajuste se conserva como `verification-before-F1.json`.

El [dictamen de corrección](verdict.md) puntúa **F1 resolved**, disposición **ship** para esta consola y ese ajuste. No equivale a una certificación de toda la aplicación o de fluidez en hardware físico.

[Cierre documental](documentation-review.md): identidad y archivos normativos conservados, diez hashes/procedencias comprobados y revisión inicial preservada como historia. No se modifican las diferencias previas del proyecto.

Sólo cambian `factory-player.tsx` y su CSS de producto, además del contrato/evidencia. Sin cambios en tiempos, destinos, dimensiones, pesos, códigos, modelos, API, autenticación, dependencias o archivos globales del sistema visual. Sólo local, HEAD3810a58, sin commit/push/PR. Sin pruebas en móvil físico, otros motores o medición de FPS; las capturas estáticas no certifican la fluidez temporal.
