# Revisión de documentación: catálogo Tetris y detalle 3D

Fecha: 2026-10-31. Alcance: extensión local del sistema CargoMesh existente, después del dictamen `ship` de `.impeccable/review/tetris-vehicles/finish-review.md`.

## Resultado

El resultado terminado conserva el sistema visual incumbente. No requiere cambios en `DESIGN.md` ni en `.impeccable/design.json`: se preservaron ambos archivos y `cargomesh/src/app/globals.css`. Esta revisión registra la comparación; no crea una identidad, una escala de tokens ni reglas globales nuevas.

El catálogo previo de 60 camiones, conductor y precio PEN por viaje y el detalle de carga pertenecen al alcance de Juan junto con sesiones, comparación y Passport. La ausencia de `PRODUCT.md` en la raíz sigue siendo una brecha documental anterior; `docs/PRODUCT.md` es contexto histórico y no reasigna responsabilidades. No se editó ni se reinterpretó ese documento.

## Comparación con el sistema existente

| Aspecto | Resultado observado |
| --- | --- |
| Paleta | El catálogo, controles, ficha y tabla usan los tokens CargoMesh de lienzo claro, superficie blanca, tinta azul, texto secundario, líneas y teal. Las capturas confirman la misma relación entre fondo, registros y acción. Se conserva la regla Shared Palette. |
| Tipografía | Se hereda la pila Inter/sans de la página existente y los números tabulares. El título local usa 30 px; se reduce a 27/26 px en los umbrales de esta superficie. Los controles y textos de apoyo usan 12–14 px. La documentación conserva su cautela sobre la fuente efectivamente entregada al navegador. |
| Densidad y forma | Se mantienen el ancho máximo de 1488 px, controles de al menos 44 px, esquinas locales de 6 px y contenedores de 10 px. Filas compactas y líneas finas organizan la comparación, sin convertir cada registro en una tarjeta decorativa. |
| Profundidad | Las superficies de operación permanecen planas. Se reutiliza `CarrierKpis` con `variant="compact"`: cuatro lecturas sin arte, sombra, radio ni elevación al pasar el puntero; dos por fila en la captura móvil. |
| Visor | `CollectionViewer` se reutiliza con carga diferida. El escenario neutro, las anotaciones proyectadas y la selección ámbar pertenecen al visor y a este contrato de superficie. Sus colores literales no se incorporan a la paleta global. |
| Adaptación | El catálogo pasa a registros de dos columnas y el detalle apila visor/ficha a 850 px; las etiquetas no seleccionadas del modelo se ocultan bajo 600 px. Estos umbrales locales conviven con los de la operación anterior. La tabla de 740 px conserva un contenedor con desplazamiento interno, foco y pista visible en móvil: cumple Internal Scroll. |
| Navegación y estados | Cabecera y pie conservan CargoMesh/Tetris y acceso a sesiones/Passport. El aviso general Demostración se ve en escritorio y móvil. Controles nativos tienen etiquetas, foco visible y estado pulsado; el código contiene resultados vacíos, vehículo desconocido y estados de carga/error del visor. |
| Veracidad de las lecturas | Los precios son fixtures sintéticos autorizados; no se añaden etiquetas repetidas por fila. La masa se compara con carga útil, las cantidades se nombran como plan y la nota enlaza a conteos observados/comparación/Passport. El código de esta vista no crea contratos, ofertas ni reservas. |

## Evidencia comprobada

Se leyeron `DESIGN.md`, `.impeccable/design.json`, `docs/meta/design-tetris-vehicles.md`, los tokens de `globals.css`, el shell Tetris y la variante compacta de `carrier-kpis.module.css`. Se revisaron `vehicle-workspace.tsx`, `vehicle-workspace.module.css`, `vehicle-dashboard-model.ts`, `load-annotations.tsx`, `load-annotations.module.css`, la integración/anotaciones/carga/error de `viewer.tsx` y la selección de rutas en `app/tetris/page.tsx`.

Se abrieron las seis capturas finales: `desktop.png`, `directory-viewport.png`, `detail-desktop.png`, `detail-viewport.png`, `mobile.png` y `detail-mobile.png`. Muestran respectivamente catálogo completo/primer viewport y detalle completo/primer viewport, más catálogo filtrado y detalle a 390 px. No presentan estados vacíos accidentales ni capturas con nombre equivocado. La lectura detallada se apoyó en las capturas de viewport y de detalle; la miniatura del catálogo largo sólo confirma su cobertura completa. Los metadatos de procedencia incrustados fueron aportados por el flujo de captura y no se reescribieron en esta revisión.

Como evidencia registrada, `README.md`, `validation.json` y `browser-check.json` informan build/TypeScript y arquitectura correctos, pruebas 41/41 + 54/54 + 188/188 y recorrido de navegador sin errores ni solicitudes fallidas. El dictamen de cierre es `ship`; `design-detector.json` contiene `[]`. Estos checks no se ejecutaron de nuevo en el pase documental.

## Observaciones conservadas, sin reparación

El sistema registrado ya señala la variación local de hover primario y limita su afirmación a la pila tipográfica declarada. El sidecar describe componentes y umbrales de la operación anterior; no es un inventario exhaustivo de cada nueva superficie. Ninguno de estos hechos autoriza regenerarlo o promover ajustes locales a reglas globales. No se canonizó ningún defecto ni se añadió prohibición visual nueva.

No se repitieron pruebas de ejecución, detector, contraste medido o interacción en móvil físico. El alcance comercial permanece de demostración y las capturas no acreditan contratos ni conteos observados reales.
