disposition: ship

Revisión fresca del arreglo localizado de scroll, desde archivos y capturas. No se proporcionaron comp aprobado, QUALITY BAR ni contrato de nueva superficie: la dirección vinculante es conservar la interfaz existente y reparar la contención. `docs/PRODUCT.md` aporta contexto histórico; no se exige crear PRODUCT.md raíz para este cambio.

## persistence

Pass. Se leyeron `DESIGN.md`, `.impeccable/design.json`, `docs/PRODUCT.md`, el CSS afectado y la evidencia de esta carpeta. El diff de producto en `carrier-navigation.module.css` contiene exactamente una declaración nueva: `position:relative` en la regla de `.frame` que ya fija `100dvh` y `overflow:hidden`. El wrapper de `carrier-navigation.tsx` aplica esa clase y conserva el contenedor de desplazamiento interno. No cambia contratos, datos, textos, modelos, tokens ni reglas globales.

Capturas abiertas e inspeccionadas: imagen original del usuario y los cuatro PNG requeridos. `before.png`, `desktop.png` y `table.png` miden 1106×778; `mobile.png`, 390×844. Los cuatro llevan metadatos `impeccable:prompt` que identifican captura propia de localhost mediante Chrome/Playwright, fecha y archivo. Son capturas de viewport en posiciones de scroll declaradas, no páginas completas desde arriba. El negro de `before.png` es el defecto reproducido deliberadamente: comienza en y378, como en la imagen del usuario, y no invalida esta evidencia diagnóstica. Ninguna captura posterior presenta ese vacío inferior.

`checks.json` registra siete casos, documento igual a viewport, `windowY:0`, frame de y0 hasta el borde inferior y desplazamiento interno que alcanza controles, tabla y lista. Registra cero errores. `detector.json` es `[]`; no se ejecutó otro detector. La navegación 7/7 y el scroll global conservado en `/truck-lab` son evidencia suministrada por el implementador, no una repetición independiente de esta revisión.

## fidelity

| Elemento | Estado | Before | After | Why |
| --- | --- | --- | --- | --- |
| Contención del workspace | match | El frame se desplaza fuera del viewport y deja una zona negra desde y378. `before.json` registra documento de 2153px frente a 778px de viewport. | Controles y tabla ocupan hasta el borde inferior en escritorio; en móvil continúa el contenido sin el corte negro. Los casos suministrados mantienen documento de 778/844px y `windowY:0`. | Un contexto de posición en el frame contiene los descendientes absolutos dentro del recorte existente; corrige la causa sin pintar el fondo. |
| TYPE | match | Sans compacta, jerarquía operativa y etiquetas del portal existente. | Se conservan tipografía, pesos, controles y numerales; el diff no cambia su estilo. | La reparación de scroll no introduce una voz visual nueva. |
| MATERIAL | match | Escena 3D de camión y fábrica, superficies planas y controles del producto. | Permanecen escena, geometría visible, controles y tabla. | No se sustituyen materiales ni recursos por aproximaciones decorativas. |
| GROUND | match | El desplazamiento exterior expone el fondo oscuro global debajo del shell claro. | Continúan el fondo claro del workspace y las superficies blancas dentro del frame. | No se cambia la paleta ni se oculta el fallo con un color global. |
| Desplazamiento y acceso al contenido | match | El documento exterior puede moverse aunque la interfaz ya tiene scroll propio. | `desktop.png` muestra siguiente paso, reinicio y avance de bandeja; `table.png` muestra G01–G04 y el pie; `mobile.png` muestra controles y lecturas en dos columnas. | La contención conserva el contenido desplazable y su organización en las dos anchuras. |
| Semántica y alcance | match | El caption accesible absoluto toma body como referencia según el diagnóstico suministrado. | El cambio no elimina caption ni etiquetas: modifica únicamente su ancestro de contención. | Se conserva la semántica en lugar de borrar el elemento que revela el fallo. |

## ceiling

Reached para este arreglo de contención. No corresponde añadir ornamentación, movimiento, nuevos fondos ni rehacer el mundo visual. El defecto rechazado por el usuario está visible en el antes y ausente en las tres vistas posteriores; las métricas suministradas explican esa diferencia. Este veredicto cubre el problema de scroll, no una auditoría general del producto.

## material_fixes

Ninguno pendiente en el alcance revisado.

## keep

Conservar el frame relativo, el scroll independiente del contenido y menú, los textos accesibles, la escena y el scroll global de rutas externas al shell. No se repitieron navegador, suites ni build de producción; móvil real, hardware y otros motores quedan sin comprobar, por lo que el veredicto se limita al CSS y a la evidencia Chrome suministrada.
