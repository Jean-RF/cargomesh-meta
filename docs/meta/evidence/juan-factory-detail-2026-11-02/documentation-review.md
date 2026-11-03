# Cierre documental — detalle de fábrica y robot

**Dictamen documental: ship · 2026-11-02.** La extensión conserva el sistema existente y responde al entorno vacío y la rigidez visual señalados por el usuario. El [finish review fresco](finish-review.md) declara `ship`, con `persistence`, `fidelity`, `ceiling`, `material_fixes` y `keep`; no deja correcciones materiales obligatorias. Este pase contrasta fuentes, documentación y evidencia existente. No abre el navegador ni repite suites o detector.

## Autoridad y continuidad

[DESIGN.md](../../../../DESIGN.md) y su [sidecar](../../../../.impeccable/design.json) siguen definiendo el workspace claro: superficies blancas, tinta azul oscura, acciones teal, tipografía sans y procedencia explícita. Los 18 colores del frontmatter coinciden literalmente con sus declaraciones en [globals.css](../../../../cargomesh/src/app/globals.css). `git diff` está vacío para esos tres archivos y [docs/PRODUCT.md](../../../PRODUCT.md). No se reescriben tokens, narrativa, ejemplos ni identidad.

La última sección de [design-factory-loading.md](../../design-factory-loading.md) persiste las decisiones propias de esta mejora: nave abierta, carga protagonista, accesorios fuera de las transferencias, muñeca de dos eslabones rígidos, agarre exacto y movimiento subordinado al reproductor. Los materiales industriales locales son contenido de la escena; no se promueven a paleta global. La frase `FINISH` del contrato se satisface aquí mediante comparación y conservación del sistema vigente, junto con la revisión final y la procedencia de los raster.

[PRODUCT.md](../../../PRODUCT.md) mantiene la separación entre escenarios sintéticos y operación real. La fábrica sigue siendo una simulación del catálogo; la señalética, el equipo auxiliar y el contador no acreditan actividad industrial, inventario ni observaciones de una sesión real.

## Extensión comprobada

| Parte | Resultado y preservación |
| --- | --- |
| Nave y muelle | Frente a [before.png](before.png), [medical-overview.png](medical-overview.png) añade ventanas altas, cerchas parciales, conductos/soportes, luminarias, juntas de concreto, embalaje, pallets vacíos, armario, panel, defensas y escalera con pasamanos. El corte permanece abierto y se distingue camión, stock y transferencia. No se introduce un techo completo que oculte la carga. |
| Robot | [robot-closeup.png](robot-closeup.png) permite identificar los dos eslabones, servos, ejes, tornillería, conducciones y pinza. [factory-scene.ts](../../../../cargomesh/src/features/truck-collection/factory-scene.ts) conserva longitudes rígidas y calcula ambos eslabones hasta el punto de agarre; los telescopios cambian alcance y los sólidos de mercancía conservan escala. Los accesorios no forman parte de `goods` ni del conteo. |
| Cuatro métodos | [Bobinas](coil-overview.png), [rampas](ramp-overview.png) y [llenado](tank-overview.png) conservan mecanismos diferenciados. La extensión de detalle no sustituye sus movimientos por el gesto del robot trasero. |
| Recursos | [factory-surfaces.ts](../../../../cargomesh/src/features/truck-collection/factory-surfaces.ts) genera dos atlas originales por escena: concreto de 512 × 512 y señalización de 1024 × 512. La escena agrupa geometría por material/parte móvil y [viewer.tsx](../../../../cargomesh/src/features/truck-collection/viewer.tsx) mantiene Three.js, HDR y luces existentes. No aparecen descargas de modelos ni una dependencia nueva en este acabado; el árbol completo ya contenía cambios anteriores de dependencias. |
| Interfaz | [Escritorio](desktop.png) conserva controles etiquetados debajo del visor, superficies claras y acento teal. El código del reproductor mantiene botones de 44 px, foco visible, ayuda, pausa/reinicio, búsqueda y movimiento reducido por pasos. La captura [móvil](mobile.png) muestra título, método y advertencia sin corte lateral; no muestra los controles que quedan debajo del visor. |
| Datos | [factory-loading.ts](../../../../cargomesh/src/features/truck-collection/factory-loading.ts) sigue derivando IDs, códigos, cantidades, medidas, masa y destinos del catálogo. Los sólidos cuentan después de depositar/soltar; el llenado conserva transferencia gradual. Las pruebas existentes contrastan las 60 configuraciones y la reutilización de sus geometrías nativas. |

## Movimiento: antes / después / porqué

| Antes | Después | Porqué y evidencia |
| --- | --- | --- |
| La escena anterior presenta un manipulador con poco detalle; una imagen no permite establecer su curva temporal. | Pórtico telescópico y muñeca de dos eslabones rígidos, con orientación variable y pinza detallada. | Mejora la lectura de cómo alcanza la unidad. Recogida, colocación y detalle están en [medical-pickup.png](medical-pickup.png), [medical-place.png](medical-place.png) y [robot-closeup.png](robot-closeup.png). La prueba cinemática comprueba cierre de codo/punta y escala unitaria, sin sustituirlo por deformación. |
| El usuario percibía rigidez en el movimiento. No se infiere una medición de esa sensación desde `before.png`. | Interpolación quintica `t³(10−15t+6t²)` sobre las fases y sus tiempos/destinos existentes; velocidad y aceleración nulas en sus extremos. | Suaviza arranques y paradas. El código permite comprobar la curva; el registro acredita búsqueda repetible, reinicio y conservación del plan. No hay vídeo o medición temporal que certifique la suavidad percibida. |
| La fábrica ya tenía reproducción, pausa, búsqueda, cámara y alternativa de movimiento reducido. | Se conservan esos controles y el render bajo demanda, sin bucles ambientales nuevos. | El detalle acompaña la operación del usuario. `checks.json` registra cuatro métodos y avance por pasos móvil; el código mantiene el reloj condicionado a reproducción. |

## Evidencia, enlaces y procedencia

Se inspeccionaron los diez PNG enlazados en [README.md](README.md): antes, vista médica general, recogida, colocación, detalle de robot, escritorio, móvil y las otras tres estaciones. Los diez SHA-256 recalculados coinciden con [verification.json](verification.json); no falta ni sobra un PNG respecto a su manifiesto. Escritorio mide 1106 × 778, móvil 390 × 844 y los ocho recortes de escena 789 × 601.

Todos incluyen el campo PNG `impeccable:prompt`: captura local de Chrome en `localhost:3000/carriers/tetris`, fecha 2026-11-02, escena/atlas procedurales propios y activos de vehículo previamente atribuidos. La misma nota compartida aclara que `before.png` representa el estado previo; no debe interpretarse como prueba de que ya contenía el acabado nuevo. La procedencia identifica capturas de la aplicación, no fotografías de fabricantes ni generación de imagen. El hash comprueba identidad con el manifiesto, no certifica por sí solo el instante de captura ni el movimiento.

Los 11 enlaces locales del README, los enlaces locales de DESIGN/PRODUCT y los destinos de este informe resuelven a archivos existentes. Los enlaces externos de KUKA y Boston Dynamics se conservan como referencias constructivas declaradas por el autor; no se revalidó su disponibilidad web en este pase. Ni la documentación ni las capturas atribuyen a estas marcas el CAD, la capacidad nominal o la certificación del robot propio.

Los resultados guardados concuerdan: [210/210 de logística](logistics.log) y [54/54 de operaciones](carrier-operations.log) tras el núcleo; [9/9 de fábrica](factory-final.log) repetidas sobre el código final después del ajuste de accesorios/escalera; [build final](build-final.log) con compilación, lint y tipos; [arquitectura](architecture.log) de 852 módulos/247 entradas cliente. La suite ajena a fábrica no se repitió tras ese ajuste. Se leyó [factory-loading.test.ts](../../../../cargomesh/src/features/truck-collection/factory-loading.test.ts) para comprobar el alcance: datos de las 60 configuraciones, separación/acceso, rigidez, búsqueda/reinicio, rampas y presupuesto de accesorios en cuatro métodos. No son pruebas de seguridad industrial.

[checks.json](checks.json) tiene `errors: []`, cuatro muestras con `rootContained: true` y avance móvil reducido; es un resumen, no una traza completa de reproducción. [detector.json](detector.json) contiene `[]` de la ejecución registrada sobre los cuatro archivos de producto. Ninguno de esos resultados reemplaza la comparación visual ni se presenta como una ejecución nueva de este revisor.

## Deriva previa y techo conservado

Se registra sin corregir la deriva anterior ya descrita en el [cierre inicial de fábrica](../juan-factory-loading-2026-11-01/documentation-review.md): no existe `PRODUCT.md` en raíz y el contexto válido está en `docs/PRODUCT.md`; DESIGN/sidecar son la extracción histórica de operaciones y no un inventario exhaustivo de la fábrica; `--cm-color-on-primary` no tiene declaración global y conserva el fallback local explícito `#fff`. Ninguna de estas observaciones autoriza regenerar el sistema como efecto lateral. El árbol contiene además trabajo previo amplio; este cierre no lo atribuye a la mejora actual ni lo modifica.

El [finish review](finish-review.md) acota el acabado a una maqueta industrial explicativa, con materiales limpios y accesorios simplificados. En móvil la estación completa ocupa aproximadamente 300 × 160 px dentro de un visor de 460 px de alto; queda fondo vertical y se necesita zoom para apreciar la mecánica. La panorámica de rampas también aleja la cámara para contener su recorrido. Ese techo queda documentado; no se afirma detalle inmediatamente legible en todos los tamaños.

Este pase escribe únicamente este informe. No modifica DESIGN, sidecar, PRODUCT, globals, producto, memoria ni otros documentos; no hace commit, push o PR.

No se repitieron navegador, detector o suites, ni se comprobó disponibilidad de las referencias web, lector de pantalla o FPS en móvil físico.
Riesgo pendiente: detalle pequeño en vista general móvil y rendimiento físico sin medir; las capturas estáticas y la cinemática no validan colisión, esfuerzo ni seguridad de maquinaria industrial.
