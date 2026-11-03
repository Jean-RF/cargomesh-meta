# Factory loading finish review

disposition: **fix**

Revisión independiente sobre los archivos de fábrica, sus puntos de integración y las 25 capturas finales entregadas. No se utilizó navegador ni se editó el producto. No hay comp externa aprobada: la autoridad visual es el contrato `docs/meta/design-factory-loading.md`, el shell existente, `DESIGN.md` y `.impeccable/design.json`. El repositorio no tiene `PRODUCT.md` en la raíz; se leyó el contexto histórico disponible en `docs/PRODUCT.md`, sin crear ni reparar contexto como efecto secundario.

## persistence

- El contrato conserva la tesis, el modo Operate/Experience, las medidas del modelo, los cuatro métodos, los contadores tras depósito y la salida al plan sin escrituras operativas. La integración se limita al estado local `factoryMode` y al visor; no encontré una mutación de sesiones u observaciones en el código revisado (`vehicle-workspace.tsx:21`, `:43`, `:44`; `factory-player.tsx:48`).
- Los ocho casos contienen viewport desde arriba, stage y controles; existe además el móvil de 390 × 844. Inspeccioné los 25 PNG. Son capturas legibles del producto y sus canvases, sin canvas negro. Verifiqué sus dimensiones y que todos contienen el chunk tEXt `impeccable:prompt`.
- `browser-check.json` registra ocho casos y `errors: []`; esto es evidencia suministrada, no una prueba de interacción ejecutada por este revisor. El detector suministrado es `[]`; no se volvió a ejecutar.
- Ejecuté directamente `node --import tsx --test src/features/truck-collection/factory-loading.test.ts`: 5/5 pasan. Comprueban las 60 configuraciones, datos, conservación de escala rígida, unidades, navegación temporal y litros. El resultado de pruebas no elimina los dos fallos visuales descritos abajo.

## fidelity

| Elemento | Estado | Evidencia y juicio |
| --- | --- | --- |
| TYPE | match | La cabecera, controles y cantidades mantienen la sans y jerarquía del producto. Los numerales y medidas permanecen legibles en los ocho controles. No se introduce una voz tipográfica ajena. |
| MATERIAL | match | Camiones, mercancías y estación son geometría Three/PBR real; no hay imágenes de cajas genéricas sustituyendo los productos. Las capturas distinguen contenedores sanitarios, pallets, bobinas, tractor, agua, grava, flores y automóviles. `factory-scene.ts:25–30` reutiliza los grupos nativos. |
| GROUND | match | El suelo gris del visor y las superficies claras con acciones teal preservan la escena y los tokens del incumbent. No existe otra autoridad de comp para una temperatura diferente. |
| Identidad, cantidad y escala de mercancía | match | Cada plan procede del catálogo (`factory-loading.ts:21`, `:39`, `:86`). La prueba ejecutada compara los 60 productos y los grupos reutilizados; las capturas representativas sostienen visualmente esa diversidad. |
| Planta y métodos | match | Robot trasero, puente grúa, rampas y llenado se identifican por geometría y texto antes del stage. La carrocería en corte permite ver la carga; el llenado de agua y grava es legible. |
| Encuadre de portavehículos | contradicted | En `cm-auto-doubledeck-stage.png` el camión ocupa aproximadamente 280 px dentro de los 1105 px del canvas; los coches colocados rondan 30 px. La fila de espera y la rampa dominan el encuadre, contradiciendo que el camión y su estación sean protagonistas. Véase F1. |
| Geometría rodada del tractor | contradicted | `cm-tractor-stepdeck-stage.png` y `cm-tractor-stepdeck-controls.png` muestran la parte delantera del tractor suspendida sobre la plataforma. La interpolación angular produce un hueco verificable de 0.533 m bajo el neumático delantero al llegar al extremo superior. Véase F2. |
| Cantidades y llenado | match | Las capturas muestran 4/8 contenedores y 136 kg, 4/8 pallets y 1440 kg, 1/3 bobinas y 6750 kg, 2/4 carros y 130 kg, 2/4 coches y 2920 kg. Agua y grava separan porcentaje, peso pendiente y peso colocado. La lógica cuenta tras `releaseAt`; el peso transferido sigue la fracción de llenado (`factory-loading.ts:97–101`). |
| Controles, móvil y movimiento reducido | acceptable adaptation | El móvil sustituye reproducción por «Siguiente paso», conserva reinicio y deslizador, y muestra 1/8 contenedores y 7 pendientes. Esto deriva del requisito de reducción de movimiento. Los controles son nativos, tienen etiquetas y foco; la animación pausa al ocultar la pestaña o salir de vista (`factory-player.tsx:18–23`, `:33–39`). No se certificó interacción por lector de pantalla ni dispositivo físico. |

## ceiling

Esta revisión consume la evidencia final de las dos rondas declaradas, sin abrir una tercera ronda exploratoria. No hace falta recapturar por evidencia inválida ni reemplazar el mundo visual. Aplicar F1 y F2 en un único lote y volver a comprobar únicamente esos resultados, las mismas vistas afectadas y una regresión móvil. El siguiente pase debe puntuar cada arreglo como resolved, partial o unresolved, sin una nueva búsqueda de pulido.

La cinemática determinista y el catálogo sintético son límites aceptados. No se pide un motor físico, rigging homologado ni una medición de vehículos reales. Estos límites no justifican una separación visible de medio metro entre neumático y soporte ni que el producto principal pierda escala visual.

## material_fixes

| Before | After | Why |
| --- | --- | --- |
| **F1 · P2 — Escena de portavehículos demasiado alejada.** `cargomesh/src/features/truck-collection/factory-loading.ts:43` coloca todos los coches pendientes en una única fila longitudinal. Esa extensión alimenta `farX` en `factory-scene.ts:34` y el encuadre completo de `viewer.tsx:70–96`. Evidencia: `cm-auto-doubledeck.png`, `cm-auto-doubledeck-stage.png` y `cm-auto-doubledeck-controls.png`. | Compactar la espera o encuadrar la celda de trabajo para que se lean el camión y los coches colocados desde la vista inicial, manteniendo la escala 1:1 y acceso comprensible al stock. Conservar espacio para el trayecto; no reducir el tamaño real de las unidades. Verificar el mismo caso completo y su stage. | La tarea es observar cómo se incorpora la mercancía propia al vehículo. En el estado actual se distingue la larga pista antes que los dos niveles de carga. Es un fallo del protagonismo exigido por FIRST VIEWPORT. |
| **F2 · P2 — Tractor suspendido al pasar de rampa a plataforma.** `cargomesh/src/features/truck-collection/factory-loading.ts:57–61` aumenta el pitch desde 0 hasta la pendiente durante toda la subida y empieza a nivelarlo después del extremo superior. `factory-scene.ts:181` aplica ese pitch alrededor del centro. Evidencia: las dos capturas del tractor muestran el hueco delantero. Comprobación analítica usando el neumático nativo: a los 10.871498 s, pitch −18.507°, extremo superior Y=1.338947 m y fondo del neumático delantero Y=1.871781 m, hueco=0.532834 m. | Ajustar posición y pitch de la ruta rodada en los encuentros suelo/rampa/plataforma usando los puntos de apoyo y la longitud del vehículo del modelo. La transición debe empezar cuando el primer eje alcanza el cambio de pendiente y terminar al salir el último. Mantener la mercancía rígida y el tiempo determinista. Añadir una comprobación pequeña de la geometría inclinada y verificar la vista del tractor cerca del encuentro, más la regresión del portavehículos. | La orientación debe corresponder a la superficie que soporta el vehículo. Las cinco pruebas actuales ignoran pitch en las colisiones por AABB (`factory-loading.test.ts:35–47`) y excluyen tamaño rotado en mitad de las rampas (`:81–82`); por eso pasan con este defecto. Una ruta geométrica coherente basta, sin simulación física. |

## keep

- Mantener el shell, los tokens, el visor PBR y la salida «Volver al plan 3D»; no se necesita rediseño.
- Mantener la extracción de geometrías nativas y la escala de sólidos, las cuatro estaciones, el estado pausado inicial y los controles de búsqueda temporal.
- Mantener los contadores tras inmovilización, el peso gradual de líquidos/granel y la separación entre demostración y observación operativa.
- Mantener el móvil con avance por pasos, controles de 44 px y el contenido de medidas y procedencia del modelo.

No se repitieron build, suite logística, arquitectura ni pruebas operativas comunicadas por el constructor. No se comprobó contacto físico real, hardware móvil ni lector de pantalla; la simulación sigue siendo sintética y cinemática.
