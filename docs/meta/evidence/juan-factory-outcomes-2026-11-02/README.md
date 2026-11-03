# Dos animaciones por camión — 2 noviembre 2026

Extensión local de Tetris para los 60 vehículos del catálogo: Carga completa y Salida con pendientes. Se mantiene la carga nativa, su tamaño/peso/código y el método de cada vehículo. La alternativa autorizada escogida es dejar mercancía pendiente; no se añade una rotura. No modifica sesiones, observaciones, contratos, API o autenticación ni publica cambios.

En unidades discretas, la última nunca se recoge: las anteriores se cargan, el equipo se retira y el camión sale con una unidad menos. Si sólo hay una unidad, queda en fábrica y sale vacío. En líquidos/granel se corta al75% y permanece el25% pendiente por masa/volumen; no se cuentan partículas ni un lote parcial como lote completo. La segunda secuencia tiene1,5s de aviso,6,5s de retirada y8s de salida tras la interrupción. Reproducción/pausa/búsqueda/reinicio conservan el resultado y son reversibles. El cambio de escenario reinicia pausado. Movimiento reducido usa pasos e incluye el instante de salida sin autoplay.

El camión y lo ya cargado se trasladan juntos; el producto omitido conserva su ubicación de fábrica. Las puertas traseras se cierran al terminar de retirar el robot; la manguera gira fuera del vehículo y cesa la transferencia. La rampa portátil baja rígida al suelo y queda en estación, conservando longitud; el tramo entre niveles de la cama baja sigue al remolque. Se amplía el suelo por delante sin reducir el encuadre inicial.

## Evidencia

- [Antes](before.png): consola del trabajo anterior, copiada con su procedencia, como referencia de continuidad.
- [Selector escritorio1280](desktop.png), [1106](user-1106.png), [móvil390](mobile.png) y [resultado móvil](mobile-result.png).
- [Unidad sanitaria pendiente](medical-stop.png), [salida sanitaria](medical-departure.png), [resultado/conteos/código](medical-result.png), [grúa/bobinas](crane-departure.png), [rampas/portaautos](ramp-departure.png), [líquido](liquid-departure.png) y [grava](bulk-departure.png).
- [Verificación de navegador](checks.json): cinco vehículos de los cuatro métodos, ambas variantes, salida reproducida en tiempo real, pausa, búsqueda atrás, reinicio, códigos, pasos reducidos y selección por teclado.0erroresJS. Móvil390/documento390 y844/844; jugador341/341 sin overflow.
- [Manifiesto de capturas](verification.json):12PNG con procedencia incorporada; escaneo0ausentes. [Detector](detector.json):una ejecución TSX/CSS,[]; anterior a los últimos ajustes de geometría/rango, sin repetirlo.
- [Logística](logistics.log): 212/212 tras el núcleo, antes del ajuste final de retirada de rampas. [Operaciones](operations.log): 54/54. [Arquitectura](architecture.log): 852 módulos / 247 entradas cliente. [Build final](build-final.log) correcto con lint y tipos, sobre el código final.
- [Fábrica final](factory-final.log): diez pruebas pasan; la undécima detectó una aserción estricta entre cero y cero negativo del ángulo horizontal, sin diferencia geométrica. Se corrigió sólo la tolerancia de la aserción. Su [reejecución](factory-recheck.log) pasa y recorre las 60 escenas nativas; las once pruebas quedan cubiertas entre las dos ejecuciones. No se oculta el resultado anterior.
- [Guarda del último paso reducido](edge-check.json): avanzar desde menos de 1 ms antes del fin llega al resultado incompleto (7/8) sin reiniciarlo. No se extrapolan pruebas históricas de GLB/escáner a este cambio.

## Límites

La [revisión independiente de acabado](finish-review.md) emite **ship** para esta extensión y sus estados comprobados, sin ajustes materiales pendientes. El [cierre documental](documentation-review.md) confirma las doce capturas, hashes/procedencias, enlaces y normativos conservados; no certifica toda la aplicación ni repite navegador o suites.

Simulación sintética, sin registro operativo o certificación de seguridad industrial/conducción. No hay fractura de productos ni medición física, validación de ruedas en desplazamiento, escáner, FPS/móvil físico u otros motores de navegador. Los60modelos se comprueban en lógica/escena nativa; el navegador cubre cinco representativos, no las120combinaciones montadas. Capturas estáticas documentan estados; `checks.json` comprueba avance de reloj/desplazamiento en reproducción, no una medición de fluidez.

Producto modificado:factory-loading.ts, factory-scene.ts, FactoryPlayerTSX/CSS y telemetría local del viewer; dos pruebas de fábrica añadidas. Sin nuevas dependencias/activos de terceros. HEAD3810a58,ramacodex/meta-juan,sincommit/push/PR.
