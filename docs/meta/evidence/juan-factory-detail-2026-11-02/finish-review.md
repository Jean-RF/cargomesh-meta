# Revisión final — fábrica y robot

**Disposición: ship.** El cambio responde de forma visible a la petición de dar detalle a la fábrica y quitar rigidez al robot. Se aprueba el acabado dentro del modo de simulación existente, sin ampliar el alcance al shell ni atribuir realismo físico industrial.

## persistence

Revisión fresca, sin navegador ni cambios de producto. Inspeccionados los diez PNG de este expediente: `before`, `medical-overview`, `medical-pickup`, `medical-place`, `robot-closeup`, `desktop`, `mobile`, `coil-overview`, `ramp-overview` y `tank-overview`. Leídos `README.md`, `checks.json`, `verification.json` y `detector.json`, junto con el contexto de producto, sistema visual, dirección de acabado y craft floor. Se contrastó el resultado con el código de escena, superficies, poses, visor y pruebas de fábrica.

La evidencia conserva procedencia y hashes en `verification.json`. El registro informa 210 pruebas de logística, 54 de operaciones, 9 de fábrica sobre el código final y build con tipos/lint correcto; la corrección final de accesorios sólo repitió las pruebas de fábrica. El detector guardado es `[]`. Estos resultados se revisaron como evidencia aportada; no se volvieron a ejecutar ni se convirtieron en una prueba de calidad visual. No hay commit, push ni PR en este alcance.

## fidelity

Frente a `before.png`, la mejora es sustancial y coherente: ventanas altas, cerchas parciales, luminarias, conductos y juntas hacen que la pared y el suelo pertenezcan a una nave; el banco de embalaje, pallets vacíos, armario, panel, defensas y escalera explican el uso del lugar. La escena sigue abierta y permite leer el camión y la mercancía. Los accesorios acompañan la transferencia sin tapar su centro visual en la muestra médica. Las vistas de bobinas, rampas y cisterna conservan métodos reconocibles, sin convertir toda carga en el mismo gesto de robot.

`robot-closeup.png` permite reconocer los dos eslabones, ejes, tapas de servo, tornillos, conducción y pinza. Las fases de recogida y colocación muestran el alcance variable. El código mantiene longitudes rígidas y cierra la muñeca en el punto de agarre; la prueba específica contrasta ambos extremos y la repetición al buscar en el tiempo. La interpolación quintica reduce los arranques y paradas bruscos sin alterar las fases ni sus destinos. Las imágenes estáticas por sí solas no certifican la sensación temporal del movimiento.

En `desktop.png` la estación ocupa suficiente ancho y los controles de cámara y reproducción se leen con claridad. En `mobile.png` no hay corte lateral de la estación ni desbordamiento de la página; título, método y carácter simulado son legibles. La vista general conserva la estación entera y requiere zoom para inspeccionar la mecánica. El registro móvil acredita avance por pasos con movimiento reducido; la captura móvil no muestra los controles que quedan debajo del visor.

## ceiling

El acabado llega a una maqueta industrial explicativa de buen detalle, con materiales y sombras consistentes con el visor existente. No llega al fotorrealismo: las superficies son limpias, las piezas auxiliares son simplificadas y el detalle pequeño desaparece en las vistas generales. Esto encaja con la dirección actual y no requiere añadir desgaste, modelos externos ni decoración.

El límite más visible es el encuadre móvil: la estación ocupa aproximadamente 300 × 160 px dentro de un visor de 460 px de alto, por lo que queda bastante fondo gris vertical y la reproducción cae bajo el primer viewport. La vista de rampas también necesita alejarse para contener la larga transferencia. Son límites del panorama completo; no bloquean esta mejora localizada, pero impiden afirmar que el detalle mecánico se aprecia inmediatamente en cualquier tamaño. Una futura mejora de composición debería ajustar sólo la altura móvil del visor, conservando toda la estación y el acceso a los controles.

No hay medición de FPS en móvil físico ni validación de colisión, esfuerzo o seguridad de maquinaria. El presupuesto geométrico y las pruebas de agarre no sustituyen esas mediciones.

## material_fixes

Ninguna corrección material obligatoria observada para esta entrega. No se solicita reconstrucción ni nueva captura: la comparación antes/después y las vistas de detalle permiten evaluar el cambio. Se debe conservar explícito el límite móvil y el carácter de simulación al comunicar el resultado.

## keep

- Mantener la carga y el camión como protagonistas, con accesorios fuera de su transferencia y sin sumarlos a mercancía.
- Conservar la muñeca articulada de eslabones rígidos, agarre exacto, búsqueda determinista y ausencia de bucles ambientales.
- Mantener la distinción entre los cuatro métodos y las dimensiones, códigos, pesos y conteos de las 60 configuraciones.
- Conservar controles etiquetados, navegación y zoom, pausa/reinicio y avance con movimiento reducido.
- Mantener los dos atlas compartidos, agrupación por material y uso de la iluminación existente, sin dependencias ni modelos nuevos.

No se reabrió el navegador ni se repitieron suites o detector. Riesgo pendiente: rendimiento en móvil físico y legibilidad del detalle a escala de vista general.
