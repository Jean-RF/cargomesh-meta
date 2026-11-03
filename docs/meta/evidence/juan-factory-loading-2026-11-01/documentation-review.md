# Carga en fábrica — revisión documental del sistema visual

Fecha: 2026-11-01. Alcance: modalidad de fábrica del Tetris 3D existente, después de las correcciones F1/F2. Se aplica la referencia `document` de Impeccable para comparar implementación, contrato y evidencia; no se regenera el sistema de diseño.

**Resultado:** la extensión conserva la identidad CargoMesh V2 y los tokens normativos. La estación industrial es contenido del visor PBR existente, sin establecer otro mundo visual. La referencia local de texto detectada durante la comparación ya utiliza el token existente de tinta; no se creó ni aprobó un token nuevo.

## Autoridad y límites de la documentación

- [DESIGN.md](../../../../DESIGN.md) conserva la paleta clara, acciones teal, tinta azul oscura, tipografía sans declarada y superficies operativas con bordes finos. Su frontmatter es la capa normativa; el CSS sigue siendo la fuente de ejecución.
- [.impeccable/design.json](../../../../.impeccable/design.json), `schemaVersion: 2`, mantiene metadatos, ejemplos y narrativa del sistema existente. La modalidad de fábrica no exige agregar sus colores de materiales, medidas de escena o controles temporales al vocabulario global.
- [El contrato de fábrica](../../design-factory-loading.md) gobierna esta superficie: Operate/Experience, producto y método identificados antes del visor, geometría nativa, tiempo determinista, cuatro métodos y salida al plan sin escrituras operativas. Su frase sobre `DESIGN.md` se satisface aquí mediante comparación y conservación del archivo existente; no autoriza reemplazarlo.
- No existe `PRODUCT.md` en la raíz. Se leyó [docs/PRODUCT.md](../../../PRODUCT.md), la referencia histórica enlazada desde `DESIGN.md`, respetando su separación entre escenarios sintéticos y operación real. La ausencia es anterior a esta documentación y no se reparó.

## Comparación con el sistema existente

| Responsabilidad | Comparación comprobada |
| --- | --- |
| Paleta e identidad | Los **18 colores** del frontmatter de `DESIGN.md` coinciden literalmente con sus declaraciones en `cargomesh/src/app/globals.css`. `git diff` está vacío para `DESIGN.md`, `.impeccable/design.json` y ese CSS global. La UI de fábrica reutiliza surface, ink, muted, line, primary y selected; no declara nuevas propiedades globales. |
| Tipografía y cantidades | El workspace hereda `cm-font-sans` y `cm-color-ink` de `dashboard.module.css:1`. Fábrica mantiene texto de apoyo de 12–13 px, título local de 19 px y cifras tabulares. Las medidas conservan m, kg, L o m³ con etiquetas; «Envolvente de unidades» evita presentarlas como volumen neto del producto. No se verificó qué archivo de fuente o fallback selecciona el navegador. |
| Contenedores y controles | La modalidad permanece en el contenedor blanco y borde fino del detalle. Sus botones conservan 44 px mínimos y esquinas locales de 6 px; el foco visible y los controles nativos siguen presentes. Las declaraciones locales de tamaño, foco e interacción de 130 ms no se promueven al sistema global. |
| Visor y materiales | `factory-player.module.css` conserva el fondo de visor `#d7dcde` ya usado por el detalle. `factory-scene.ts` añade geometría Three/PBR y materiales industriales locales. `viewer.tsx` reutiliza iluminación, texturas, controles de cámara y tratamiento de errores. Los grupos identificados de mercancía se extraen del mismo modelo; no se reemplazan por imágenes o cajas genéricas. |
| Integración | `vehicle-workspace.tsx:21,25,43–44` incorpora `factoryMode`, plan derivado y alternancia con el plan 3D. `vehicle-workspace.module.css` limita la composición específica a `factoryDetail` y `factoryToggle`. No aparece una nueva ruta o shell de fábrica. El estado local se restablece al elegir otro camión o navegar atrás. |
| Adaptación y movimiento | El stage local cambia de 600 a 460 px bajo un contenedor de 650 px; las cuatro métricas pasan a dos columnas y las medidas a una. El código pausa al ocultar pestaña o componente, arranca pausado y sustituye reproducción por avance por pasos cuando hay movimiento reducido. La captura móvil confirma esa variante; no demuestra interacción en hardware físico. |
| Semántica operativa | `factory-loading.ts` deriva producto, cantidad, tamaño y masa del catálogo; valida medidas y capacidad antes de ofrecer un plan. Los sólidos cuentan tras `releaseAt`; líquidos/granel muestran transferencia gradual. El componente informa que no registra observaciones ni cambia la sesión. En la integración y archivos revisados no se encontró una llamada de mutación de sesiones, observaciones, comparación, Passport o contratos. |

La separación entre catálogo, controles locales y estado operativo coincide con las reglas del producto. Las rampas, apoyos compartidos y espera transversal extienden la escena dentro de esa identidad; no justifican cambiar la paleta, los tokens ni la documentación normativa.

## Corrección local y contexto conservado

1. **Referencia local corregida:** el constructor reemplazó mecánicamente las cuatro referencias nuevas a `--cm-color-text` por `--cm-color-ink` en `factory-player.module.css:1,3,5,9`. Se releyó el CSS y la búsqueda en `cargomesh/src` ya no encuentra el nombre anterior. [token-check.json](token-check.json) contiene 22 muestras de color computado idénticas antes/después; se verificó la igualdad de los arrays y su cantidad. El constructor informa navegación fresca con `networkidle` y compilación de desarrollo para esa comparación; no se utiliza el muestreo transitorio de HMR como evidencia final. `--cm-color-on-primary` sigue sin definición global y conserva el fallback explícito `#fff`; no se incorpora como token normativo.
2. **Resumen actualizado:** [checks.json](checks.json) registra siete pruebas de fábrica, 846 módulos/246 entradas cliente, 35 PNG y `ship` limitado a F1/F2. Se comprobaron esos valores; este revisor no editó el archivo. El cierre logístico definitivo se comprobó después en [logistics-final.log](logistics-final.log): **201/201 aprobadas, cero fallos**, sin pruebas canceladas, omitidas o pendientes.
3. **Contexto histórico acotado:** el sidecar y `DESIGN.md` describen los componentes de operaciones de la extracción anterior y no catalogan cada patrón de la nueva modalidad. Esto no constituye aprobación para regenerarlos ni ampliar su autoridad al shell completo. Se conservan íntegros.

## Evidencia comprobada en este pase

- Se leyeron los archivos de la modalidad y los puntos de integración `vehicle-workspace.tsx`/CSS, además del sistema visual y el contrato. Se revisó el código actual de las pruebas para entender la cobertura, sin volver a ejecutarlas.
- Se analizaron los chunks de los **35 PNG** de `.impeccable/review/factory`: todos contienen `tEXt` con la clave `impeccable:prompt`. Las 35 copias de esta carpeta de evidencia son idénticas por SHA-256. Las dimensiones observadas son 1440 × 1050, 1105 × 601 y móvil 390 × 844. La procedencia identifica capturas/render sintético; no acredita una carga física real.
- Se abrieron cuatro capturas actuales: `cm-auto-doubledeck.png`, `cm-tractor-stepdeck-crest.png`, `cm-medical-van-controls.png` y `mobile.png`. El portaautos conserva los dos niveles legibles y stock visible; el tractor está nivelado sobre la plataforma en crest. Los controles sanitarios muestran 4/8 unidades y 136 kg con medidas y advertencia; móvil muestra «Siguiente paso», reinicio, deslizador y 1/8 unidades con siete pendientes. Son observaciones de rasters existentes, sin navegador en este pase.
- [browser-check.json](browser-check.json) contiene ocho casos representativos de los cuatro métodos con `errors: []`; [browser-check-fix.json](browser-check-fix.json) contiene cuatro rodados con `errors: []`. Se comprobaron sus contenidos, no se repitieron sus interacciones. `detector.json` contiene `[]`; no se volvió a ejecutar.
- [finish-review.md](finish-review.md) registra el fallo inicial de encuadre F1 y suspensión del tractor F2. El [veredicto focalizado](fix-verdict.md) los puntúa **resolved** y declara `ship` exclusivamente para esos dos arreglos. Esa decisión no equivale a una nueva revisión global ni al resultado de esta comparación documental.

## Verificación comunicada y cierre comprobado

El constructor comunicó build correcto con tipos/lint después de F1/F2, typecheck, arquitectura de 846 módulos/246 entradas cliente, siete pruebas de fábrica y quince de geometrías de mercancía aprobadas. Ese build precede al reemplazo mecánico del nombre de token; no se repitió por ese reemplazo. Para el CSS posterior se comunicaron compilación de desarrollo y la comprobación de colores de `token-check.json`. Este revisor no repitió esas ejecuciones. Se leyeron las últimas 13 líneas de `logistics-final.log`: la ejecución final registra **201 pruebas, 201 aprobadas, cero fallos**, cero canceladas/omitidas/todo y duración de **254797.5034 ms**. El constructor comunica salida 0. Este resultado final sustituye al recuento histórico previo a F1/F2.

No se modificaron producto, archivos normativos, CSS globales, dependencias, configuración de agentes ni otros documentos. No se realizó commit, push o cambio de PR desde este pase.

No se repitieron navegador, pruebas de producto, detector, revisión visual de los 60 vehículos, lector de pantalla ni hardware móvil.
La demostración sigue usando catálogo sintético y movimiento cinemático: no certifica medidas de un vehículo registrado, contactos físicos, estabilidad, aparejos o seguridad de carga.
