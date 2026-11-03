# Acabado de fábrica y robot — 2 noviembre 2026

Petición: mejorar el detalle de la fábrica y del robot, que se veía rígido en un entorno vacío. Se conserva la simulación de Tetris y su escala métrica, sus 60 cargas y cuatro métodos de manipulación.

La nave incorpora ventanas altas, cerchas y luminarias, conductos con soportes, juntas/textura de concreto, banco de embalaje visible, pallets vacíos, señalización, armario de servicios, panel de control sobre el muelle y equipo auxiliar. El muelle trasero añade escalera con pasamanos, defensas, protección de borde y rodillos. Los accesorios no se cuentan como mercancía ni introducen productos nuevos. Se conserva la carrocería/carga de cada vehículo.

El pórtico trasero ahora tiene muñeca articulada de dos eslabones rígidos, servos, tornillería, guías, collarines telescópicos, cámara de herramienta, conducciones y pinzas con almohadillas. El punto final de la muñeca coincide con el agarre; las unidades no se escalan ni se desplazan fuera del plan. La interpolación quintica empieza y termina con aceleración nula; destinos, fases, duración, códigos, pesos y conteos se conservan. No se añade movimiento ambiental automático. Reproducción, pausa, búsqueda, navegación de cámara y avance con movimiento reducido siguen disponibles.

Se reutilizan Three.js y las luces/HDR existentes. Dos atlas originales por escena —concreto y señalización— evitan texturas por accesorio; las piezas se agrupan por material y parte móvil. Sin dependencia nueva ni descarga de un modelo externo. Las referencias constructivas consultadas fueron los [sistemas de energía/cableado de KUKA](https://www.kuka.com/en-us/products/robotics-systems/robot-periphery/energy-supply-systems) y la [manipulación de cajas de Boston Dynamics](https://bostondynamics.com/solutions/warehouse-automation/); la geometría es propia y no representa el CAD, carga nominal o certificación de un robot de esas marcas.

## Evidencia

- [Antes](before.png), [vista general actual](medical-overview.png), [recogida](medical-pickup.png), [entrada al vehículo](medical-place.png) y [detalle de muñeca/pinza](robot-closeup.png). [Escritorio1106×778](desktop.png) y [móvil390×844](mobile.png).
- Otras estaciones: [bobinas/puente grúa](coil-overview.png), [portaautos/rampas](ramp-overview.png) y [cisterna/llenado](tank-overview.png).
- [Navegador](checks.json): cuatro métodos, punto/código de mercancía contrastado con el plan, reproducir/pausar/buscar/reiniciar y completar conteo. Movimiento reducido móvil con avance por pasos. Sin errores JavaScript o desbordamiento exterior en la muestra.
- Pruebas: 210/210 logística y 54/54 operaciones tras implementar mecanismos/movimiento. Después de ajustar ubicación de accesorios y escalera: 9/9 de fábrica sobre el código final, incluyendo las 60 configuraciones, separación de unidades, límites del acceso, agarre rígido, repetición temporal y presupuesto de accesorios en cuatro métodos. Build final con lint/tipos correcto; arquitectura852/247. No se repite la suite ajena a fábrica para esa corrección de accesorios.
- Detector ejecutado una vez sobre los cuatro archivos de producto modificados: `[]`. Diez PNG inspeccionados con procedencia incorporada. Archivos normativos del sistema visual y la navegación se conservan.

Sin medición de FPS en hardware físico, simulación de esfuerzo/colisión de maquinaria industrial ni validación de seguridad. La vista general móvil prioriza mostrar la estación completa; el zoom y la navegación permiten inspeccionar el detalle. Se mantiene la advertencia de simulación del modelo. Sólo local, HEAD3810a58; sin commit, push o PR.

[Revisión independiente](finish-review.md): **ship** para el acabado localizado, sin correcciones materiales obligatorias. Confirma mejora frente a la escena previa y detalle de muñeca visible con acercamiento. Conserva como techo la escala pequeña de la estación en el encuadre móvil; las capturas estáticas no validan por sí solas la suavidad temporal.

[Cierre documental](documentation-review.md): sistema visual conservado, diez capturas con hash/procedencia y enlaces verificados. Se registra la deriva anterior sin alterar DESIGN, sidecar, PRODUCT o estilos globales.
