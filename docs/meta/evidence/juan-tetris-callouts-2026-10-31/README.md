# Tetris: cuadros fijos y flecha de selección

31 de octubre de 2026. Working tree local sobre `3810a589f75e4d4b9c7b7a7f2797cecffc791209`, rama `codex/meta-juan`. Sin commit, push o PR.

Los cuatro cuadros de carga quedan en una columna a la izquierda del visor. Al seleccionar uno, se sincroniza la tabla y aparece un único conector hasta el borde del grupo. El recorrido sigue la cámara por los márgenes del modelo; la profundidad oculta tramos detrás de geometría más cercana y se comprueba la visibilidad del cabezal. Si la carrocería tapa la carga, se oculta el conector y se indica cómo recuperarla. Sin selección inicial no se dibuja flecha. Los controles de cámara y los otros consumidores del visor se conservan.

## Evidencia

- [Perspectiva de escritorio](desktop.png), [lateral](side.png) y [superior](top.png): captura del visor de 827 × 491 px dentro de página de 1440 × 1050 px.
- [Móvil](mobile.png): cuatro cuadros visibles, captura del visor de 341 × 391 px dentro de página de 390 × 844 px.
- [Carga oculta](occluded.png): carrocería cerrada, conector oculto y aviso de recuperación.
- [Comprobaciones de navegador](browser-check.json): selección cuadro ↔ tabla, órbita/cámaras, cuatro cuadros fuera del canvas, sin desbordamiento horizontal ni errores JavaScript. La galería compartida conserva el visor sin columna.
- [Detector mecánico](design-detector.json): ejecutado una vez, sin hallazgos. No sustituye la revisión visual.

Las cinco capturas muestran el componente completo y conservan la URL de captura en sus metadatos. Pruebas `test:meta-loading`: 43/43; build de producción con tipos/lint y arquitectura (842 módulos, 245 entradas cliente) correctos. [Contrato de dirección](../../design-tetris-callouts.md).

[Revisión visual independiente](finish-review.md): `ship`, sin hallazgos materiales en las cinco capturas. [Revisión documental](documentation-review.md): comparación del componente con el sistema existente, sin redefinir la identidad global.

Al cerrar la tarea se reinició el servidor local, que estaba detenido. Comprobación nueva tras el reinicio: HTTP 200, modelo listo, cuatro cuadros, selección G02 con flecha visible y cero errores JavaScript. No se sustituyeron las capturas revisadas.

## Límites

El extremo identifica la envolvente de un grupo, que puede reunir varias unidades. No es detección de objetos ni validación física del acomodo. Verificación visual sobre el furgón médico y el visor compartido; no se revisaron visualmente los 60 modelos ni se probó un teléfono físico. La carga oculta o fuera de encuadre requiere girar, acercar o mostrar la carga para recuperar el señalador. No se modificaron geometría, exportación GLB, datos, contratos o autenticación.
