# Cierre documental — dos resultados por camión

**Documentación conforme al alcance; revisión independiente: SHIP.** El [finish review](finish-review.md) contiene `disposition: ship` y sus cinco secciones: persistence, fidelity, ceiling, material_fixes y keep. Este cierre corresponde a la extensión local de fábrica del 2 de noviembre de 2026; no aprueba toda la aplicación ni una operación física.

## Alcance y autoridad

Se aplicó la ruta ordinary extension de Impeccable: comparar con el mundo incumbente y conservar sus normas. Se leyeron [PRODUCT](../../../PRODUCT.md), [DESIGN](../../../../DESIGN.md), el [sidecar](../../../../.impeccable/design.json), el contrato [Dos resultados por vehículo](../../design-factory-loading.md#dos-resultados-por-vehículo--2-noviembre), el README y finish review de este paquete. Se consultaron el [plan y las poses](../../../../cargomesh/src/features/truck-collection/factory-loading.ts), la [retirada y salida de escena](../../../../cargomesh/src/features/truck-collection/factory-scene.ts), el [reproductor](../../../../cargomesh/src/features/truck-collection/factory-player.tsx), sus [estilos](../../../../cargomesh/src/features/truck-collection/factory-player.module.css), la [telemetría del visor](../../../../cargomesh/src/features/truck-collection/viewer.tsx) y las [pruebas de fábrica](../../../../cargomesh/src/features/truck-collection/factory-loading.test.ts).

La elección autorizada es dejar producto pendiente: última unidad discreta en origen o transferencia del 75 % del lote líquido/granel. No se añadió una rotura. Es un refinamiento code-led sin comp aprobado ni gates comp-led. La simulación conserva sus límites de producto: ningún desenlace constituye observación registrada, inventario real, permiso de carga o cambio de sesión.

## Continuidad del sistema incumbente

La comparación de [antes](before.png) con [escritorio](desktop.png), [1106 px](user-1106.png) y [móvil](mobile.png) conserva shell claro, superficies blancas, tinta azul y teal de CargoMesh. El selector usa radios nativos agrupados por leyenda, etiquetas y descripción; selección y advertencia llevan significado textual además del color. El CSS reutiliza los tokens compartidos, numerales tabulares, foco visible y controles de transporte/cámara de al menos 44 px. La banda de transporte mantiene la tinta existente como superficie; el cierre pendiente reutiliza los tokens ámbar. No se promueve una composición o estado de fábrica a norma global.

DESIGN.md, `.impeccable/design.json` y `docs/PRODUCT.md` coinciden con HEAD `3810a589f75e4d4b9c7b7a7f2797cecffc791209` al normalizar CRLF. Sus SHA-256 de archivo son, respectivamente, `a94705e4a228541c5c62aac6a6134245098c1fa279f8e9a6c68e01d022201685`, `2b6d204472a1893920e754dc88c54805f4fbecff9fdd40ab0f71f5697b2649b0` y `a84b00ac487505913926d1a6701d14f392ea73aebd94810393b9ef7021298bf1`. Este documenter sólo escribe este informe. No se regenera DESIGN ni el sidecar; por ello no se activa la elección requerida para sobrescribirlos.

## Cambio concreto y razón

| Antes | Después | Por qué |
| --- | --- | --- |
| Una secuencia de carga completa. | Dos opciones antes del visor: Carga completa y Salida con pendientes. Cambiar reinicia pausado. | Permite comparar los dos desenlaces pedidos con una elección explícita. |
| Todas las unidades llegan a destino. | La última unidad queda fuera; en flujos queda el 25 % pendiente por masa/volumen. Tras el aviso se retira el equipo y sale el camión con lo cargado. | Explica el faltante usando el producto, peso, dimensiones e identidad nativos de cada modelo. |
| El cierre completo confirma toda la carga. | El cierre pendiente mantiene aviso, conteos, kg y código; el avance se rotula «% del tiempo». | Acabar la animación no se presenta como carga completa. |
| Pausa, búsqueda y reinicio de la consola incumbente. | Los dos escenarios mantienen esas acciones y pasos reducidos, sin autoplay. | El movimiento sigue bajo control del usuario y permite inspeccionar o revertir el resultado. |

La [interrupción sanitaria](medical-stop.png), su [salida](medical-departure.png) y su [resultado](medical-result.png) muestran el mismo faltante: 7/8 contenedores, 1 pendiente, 238 kg cargados, 34 kg fuera y código `0002008000`. El [resultado móvil](mobile-result.png) conserva la advertencia y «Volver al inicio» en movimiento reducido. [Grúa](crane-departure.png), [rampas](ramp-departure.png), [líquido](liquid-departure.png) y [granel](bulk-departure.png) documentan los otros métodos: equipo separado y producto cargado acompañando al vehículo. La rampa portátil permanece horizontal en estación; el tramo propio de la cama baja sigue al remolque según el código.

## Evidencia comprobada y cronología

Se abrieron los 12 PNG y se recalcularon sus SHA-256: **12/12 coinciden** con [verification.json](verification.json). Los 12 contienen el chunk PNG `impeccable:prompt`. La procedencia declara render real de la demostración local en Chrome/Playwright y no imagen generada. `before.png` declara copia de [overview.png de la consola anterior](../juan-factory-console-2026-11-02/overview.png); se comprobó que sus chunks de imagen coinciden con ese original. Es referencia incumbente, no comp aprobado. Las capturas son viewport/canvas enfocados; no se presentan como páginas completas.

| Registro leído | Resultado y alcance real |
| --- | --- |
| [checks.json](checks.json) | Cinco vehículos, cuatro métodos y ambos escenarios; reproducción real de salida, pausa, retroceso, reinicio y código. Móvil: pasos reducidos, salida, reinicio pausado y selector por teclado. Cero errores JS; documento 390/390 px y jugador 341/341 px sin overflow registrado. |
| [edge-check.json](edge-check.json) | El paso reducido desde menos de 1 ms antes del fin llega al resultado pendiente 7/8 sin volver al inicio. |
| [logistics.log](logistics.log) | 212/212 después del núcleo y antes del ajuste final de rampa; no se atribuye a todo el código posterior. |
| [operations.log](operations.log), [architecture.log](architecture.log) | 54/54; arquitectura correcta con 852 módulos y 247 entradas cliente. |
| [factory-final.log](factory-final.log) | 10/11. Se conserva el fallo de igualdad estricta entre `-0` y `0` del ángulo horizontal. |
| [factory-recheck.log](factory-recheck.log) | 1/1 del caso de escena nativa para los 60 modelos tras corregir sólo la aserción a tolerancia `1e-8`. Los once casos quedan cubiertos entre ambos registros; no hubo una única ejecución final 11/11. |
| [build-final.log](build-final.log), [typecheck.log](typecheck.log), [verification.json](verification.json) | Build final completo con lint/tipos y páginas generadas; typecheck sin salida y éxito/HTTP 200 consignados por el implementador en el manifiesto. |
| [detector.json](detector.json) | `[]`, una sola ejecución previa a los últimos ajustes de rampa/rango. No se vuelve a ejecutar ni se extiende su alcance temporal. |

Son registros conservados del implementador, contrastados con código y capturas; este documenter no ejecutó esas comprobaciones otra vez. La prueba de planes comprueba ambos resultados para los 60 modelos; la de escena incompleta comprueba su geometría nativa. El navegador cubre cinco representativos, no 120 combinaciones montadas.

## Drift previo y límites preservados

DESIGN y el sidecar siguen describiendo el scan de operaciones; el sidecar está fechado el 30 de octubre. No catalogan cada estado local de fábrica del 2 de noviembre. Esa cobertura y sus tiempos, alturas o umbrales de contenedor permanecen en el contrato y el paquete de la superficie. Se conserva sin reparar la variación de hover primario local que DESIGN ya documenta; tampoco se certifica la entrega de Inter o el fallback efectivamente usado por cada navegador. El presupuesto actual del contrato dice «sin dependencias ni nuevas texturas o geometrías por frame»; no promete ausencia de poses o pequeños cálculos por frame.

El SHIP leído se limita a esta extensión sintética. No hay nuevas verificaciones de GLB, escáner, FPS, móvil físico, otros motores, rodadura o seguridad industrial/conducción. Las capturas prueban estados; la continuidad temporal está documentada por `checks.json`, sin medición de fluidez. No se introducen dependencias ni activos de terceros para esta extensión y no se publicó, hizo commit, push o PR durante este cierre.

Omitido: navegador, suites y detector adicionales, según el encargo. Riesgo restante: la evidencia no certifica fluidez ni comportamiento en hardware real.
