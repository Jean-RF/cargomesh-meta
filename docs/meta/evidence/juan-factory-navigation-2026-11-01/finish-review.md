# Finish review · navegación de cámara en fábrica

**disposition: ship** · 2026-11-01 · Revisión fresca de la barra de cámara, su integración y adaptación. Sin ediciones de producto ni nueva ronda de navegador.

## persistence

La dirección vigente está en [design-factory-loading.md](../../design-factory-loading.md), incluido su apéndice de navegación. Se conserva el sistema de `DESIGN.md` y `.impeccable/design.json`: superficies claras, tinta operativa, acciones teal y controles existentes. `docs/PRODUCT.md` aporta contexto histórico; no sustituye el contrato de esta superficie.

Están presentes [README](README.md), [checks.json](checks.json), [detector.json](detector.json), [logistics.log](logistics.log), [carrier-operations.log](carrier-operations.log) y ambos PNG. Se inspeccionaron visualmente [desktop.png](desktop.png), de 1106×778, y [mobile.png](mobile.png), de 390×844. Los dos contienen el campo PNG `impeccable:prompt` que identifica captura propia de localhost, Chrome/Playwright, fecha y ausencia de generación de imagen. Ninguno muestra pantalla negra ni estado de preparación.

Las capturas usan posiciones del **scroll interno del workspace** para situar los controles de cámara en el viewport: escritorio comienza dentro de la escena; móvil muestra el encabezado de fábrica. No representan la parte superior del documento. La comparación con las capturas [incumbentes](../juan-carrier-scroll-2026-11-01/) sirve para ubicación y lenguaje visual; sus instantes y scroll difieren, por lo que no es una comparación de píxeles idénticos.

## fidelity

| Before | After | Why |
|---|---|---|
| El incumbente ofrecía giro/zoom y controles de reproducción, sin barra de traslación. | «Cámara», cuatro direcciones y «Restablecer vista» aparecen bajo la escena. | Hace encontrable la exploración pedida y deja visible el camión. |
| La ayuda sólo describía giro y acercamiento. | La ayuda bajo los botones explica foco en la escena, WASD/flechas, botón derecho y dos dedos. | Expone las alternativas sin añadir una capa sobre la carga. |
| No había navegación de cámara que adaptar a 390 px. | Los cinco botones conservan icono y etiqueta, se distribuyen en varias filas y mantienen 44 px de altura mínima y 9 px de separación. | La función completa sigue disponible al tacto; la captura no presenta recorte lateral. |
| El hover genérico podía aclarar la acción primaria conservando texto blanco, según la primera inspección del ejecutor. | La regla específica usa `--cm-color-primary-hover`; el registro final muestra fondo `rgb(0, 95, 103)` y texto blanco. | Recupera legibilidad con el token ya existente. |

La fuente confirma que cada pulsación traslada cámara y objetivo juntos 1 m en el suelo relativo a la mirada; conserva altura, distancia y orientación de órbita. El teclado comparte el mismo helper, normaliza diagonales y cancela oposiciones. Sus listeners están limitados al canvas de fábrica; keyup, blur, ocultación y cleanup sueltan las teclas. El reset usa el estado guardado de OrbitControls y no modifica el seek ni la reproducción. El visor ordinario mantiene pan deshabilitado y no registra estos listeners.

Los botones nativos tienen nombres accesibles, iconos de Lucide ocultos al lector, deshabilitado mientras prepara y foco visible. El canvas es enfocable y referencia la ayuda. La barra sigue el lenguaje existente; no introduce panel flotante, adorno ni dependencia.

## ceiling

Se respeta el límite de una inspección conjunta y una confirmación ya efectuadas por el ejecutor. Esta revisión inspecciona archivos y los dos pares de capturas existentes; no añade capturas, detector, pruebas ni iteraciones de pulido.

Los logs persistidos acreditan **204/204 pruebas de logística** y **54/54 de operaciones**. Las tres pruebas del helper cubren ejes relativos, conservación de órbita/altura, diagonal, oposición, vista cenital, distancia inválida y mapa de teclas. El ejecutor informa typecheck, arquitectura de 847 módulos/246 clientes y build final con tipos/lint correctos; esos tres resultados no tienen un log propio en esta carpeta.

`checks.json` registra cuatro desplazamientos de aproximadamente 1 m con altura constante, teclado/keyup/oposición/blur/slider, giro, zoom, arrastre derecho, reproducción, botones móviles, pan de dos dedos y movimiento reducido; `errors` está vacío. Reset, conservación de reloj/contador y salida al plan constan en README y en el reporte del ejecutor; el JSON no conserva sus valores antes/después. Es evidencia resumida, no una repetición independiente de esas interacciones.

El detector devolvió `[]` **antes** del ajuste de hover y no se repitió. La confirmación posterior del hover se apoya en los colores registrados y en la regla CSS final; no se atribuye al detector una revisión de ese ajuste.

## material_fixes

El único ajuste material comunicado fue el hover de la acción primaria; está corregido en la fuente y confirmado en el registro de navegador. **No se requiere otro cambio de producto ni recaptura para este alcance.**

La interacción táctil procede de entrada sintetizada en Chrome, no de la captura por sí sola. No se comprobaron móvil físico, Safari/Firefox u otros motores, orientación apaisada ni rendimiento en hardware limitado. La cámara no tiene colisiones físicas: puede atravesar el escenario; no se incorpora ese comportamiento al alcance aprobado.

## keep

Conservar la escena como protagonista, la barra debajo, las etiquetas completas y la misma semántica en ambos tamaños. Mantener el helper compartido, OrbitControls existente, render bajo demanda y separación entre navegación y reloj/carga. No extender esta revisión a geometría, estados operativos, observaciones o Passport.

No se añadieron ejecuciones ni cambios fuera de este informe. El límite pendiente es validación en hardware móvil y otros motores; no hay un defecto observado que impida entregar la navegación local.
