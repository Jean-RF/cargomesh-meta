# Cierre documental · códigos de mercancía

**Resultado: ship acotado · 2026-11-02.** La extensión de `/carriers/tetris` y FactoryPlayer conserva la identidad CargoMesh existente. El [finish review fresco](finish-review.md) contiene `persistence`, `fidelity`, `ceiling`, `material_fixes` y `keep`, sin correcciones materiales pendientes. Este pase aplica la referencia `document` de Impeccable mediante comparación y conservación del sistema; no regenera su identidad.

## Autoridad y continuidad visual

Se contrastaron [DESIGN.md](../../../../DESIGN.md), [.impeccable/design.json](../../../../.impeccable/design.json), [docs/PRODUCT.md](../../../PRODUCT.md), el [contrato de fábrica y su sección Identificadores](../../design-factory-loading.md), la fuente pertinente y el [README de esta evidencia](README.md). El frontmatter y la narrativa existentes siguen gobernando el sistema. `globals.css` continúa siendo la fuente de ejecución; sus tokens de superficie blanca, tinta azul, líneas finas y acento teal coinciden con la consulta y la franja de código actual.

La lista nativa «Ver códigos» permanece subordinada a los datos del camión; FactoryPlayer muestra el código bajo los controles. Los estilos reutilizan los tokens existentes, el foco visible y controles de 44 px. `BarcodeSymbol` aporta SVG con nombre accesible y dígitos de consulta; el negro sobre blanco y las zonas libres son requisitos de lectura locales, no una paleta nueva. Las etiquetas 3D usan geometría y el atlas de impresión compartido. No aparece una textura por identificador ni un nuevo shell.

Se abrieron los cuatro rasters de contexto: [consulta](desktop-codes.png), [fábrica escritorio](desktop-factory.png), [fábrica móvil](mobile-factory.png) y [detalle 3D](model-detail.png). Los tres primeros muestran la jerarquía anterior y la adaptación de la franja a 390 px sin cubrir controles. Son posiciones del scroll interno, no vistas desde el inicio del documento. El detalle 3D muestra integración discreta sobre la carga; su escala no demuestra lectura de los dígitos. Los nueve PNG del paquete son capturas de evidencia, no assets nuevos del producto.

## Correspondencia con el contrato

`cargo-codes.ts` deriva diez dígitos del diseño, ordinal de unidad y ordinal de caja. `layout.ts`, el plan de fábrica, la consulta y el modelo comparten ese valor; el orden de carga no genera otra identidad. Los grupos sólidos transportan sus etiquetas y metadatos. Líquidos, cisternas y graneles reciben una placa de lote en el vehículo.

La cobertura declarada es precisa: **498 unidades manipuladas + 432 cajas internas = 930 IDs distintos**, sobre 60 diseños. Las ocho cajas por pallet de cartones/fármacos tienen código propio; botellas, frutas, ladrillos y otras piezas contenidas no se identifican individualmente. La tabla operativa conserva cantidades del plan; no suma cajas y pallets como observaciones. La extensión no escribe sesiones, observaciones, inventario ni Passport y no presenta los IDs como registros GS1.

`barcode.ts` usa Code 128 C mediante JsBarcode 3.12.3, con validación de diez dígitos y diez módulos libres por lado. La dependencia y su licencia MIT están declaradas en `package.json`, el README y `public/truck-materials/LICENSE.md`. Se conserva el límite de exportación; el README explica que cartones, fármacos y textiles omiten el bisel de 3 mm para compensar las etiquetas, preservando dimensiones, posiciones, cantidades y pesos del catálogo.

## Evidencia y alcance de las conclusiones

- [geometry-decode.json](geometry-decode.json) contiene 930 registros, 930 valores únicos, 498 unidades, 432 cajas y 60 diseños. Su resultado registra 930/930 patrones emitidos por `addBarcodeLabel`, proyectados a PNG y leídos con zxing-cpp 3.0.0. No equivale a 930 fotografías de etiquetas montadas en los vehículos.
- [ui-decode.json](ui-decode.json) registra cinco símbolos SVG capturados y decodificados como Code128. [browser-checks.json](browser-checks.json) contiene cinco vehículos, coincidencia de códigos impresos/consulta, reinicio y contención del documento, con `errors: []`. El README documenta avance y cámara, Chrome 1106×778 y 390×844, y la sustitución de la captura móvil tomada durante la transición del menú.
- Se verificaron los nueve hashes SHA-256 de [checks.json](checks.json) contra sus archivos y la presencia de `impeccable:prompt` en los nueve PNG. [detector.json](detector.json) contiene `[]`; no se ejecutó de nuevo.
- Los 60 registros de [budgets.json](budgets.json) quedan bajo 200.000 triángulos, máximo 194.468, sin cabina licenciada adicional. [glb-checks.json](glb-checks.json) registra los dos GLB completos comprobados: sanitario con ocho etiquetas y semirremolque seco con 216, geometría/metadatos incorporados, sin referencias externas. No se extrapola a una reexportación de toda la colección.
- [checks.json](checks.json) registra 208/208 pruebas logísticas, 43/43 de dashboard y 54/54 de operaciones, typecheck, build con lint/tipos, arquitectura de 851 módulos/247 entradas cliente y HTTP 200. Son resultados guardados del 2 de noviembre, no ejecuciones de este pase. HEAD coincide con `3810a58`; la publicación registrada es `none`.

## Desfases documentales conservados

El scan global y su sidecar conservan ejemplos de navegación horizontal y comparación/Passport con umbral de 800 px. La integración carrier y el catálogo ya tienen sus variantes de shell y consultas de contenedor; esa diferencia de cobertura precede a los códigos y está registrada en el [cierre del carrier](../juan-tetris-carrier-2026-10-31/documentation-review.md). No justifica uniformar componentes ni promover valores locales a tokens globales. Sigue sin existir `PRODUCT.md` en la raíz; se utiliza el documento histórico enlazado en `docs/PRODUCT.md`.

La salvedad de dependencias quedó aclarada en la sección Identificadores del contrato: JsBarcode 3.12.3 (MIT) pertenece a esta extensión posterior, mientras «sin dependencias nuevas» conserva el alcance inicial de fábrica. El decodificador de verificación permanece fuera de la aplicación. Se leyó esa aclaración y coincide con el README, `package.json` y la licencia. No se observó una contradicción pendiente en esa declaración, la identidad visual ni el comportamiento de los identificadores.

`git diff --quiet` devuelve 0 para `DESIGN.md`, `.impeccable/design.json`, `docs/PRODUCT.md` y `cargomesh/src/app/globals.css`, todos versionados. Este pase crea únicamente este informe; conserva esos archivos, las fuentes y la documentación histórica. La aclaración del apéndice del contrato fue realizada por el constructor durante el cierre, sin cambios de código, CSS o capturas posteriores.

## Constancia de revisión y límites

Según la coordinación de cierre, el primer intento de revisor se interrumpió por límite de uso y no produjo dictamen. El único reintento fresco exitoso generó el finish review citado y su decisión `ship`. La incidencia de disponibilidad no se confunde con un fallo de producto, de las suites ni con el resultado de la revisión completada.

No se repitieron navegador, detector, suites, build ni exportaciones; no se modificó producto ni se realizó commit, push o PR.
Riesgo pendiente: la lectura de etiquetas 3D depende de zoom, perspectiva y resolución; no hay comprobación con cámara o escáner físicos, certificación de impresión ni registro externo.
