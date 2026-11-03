# Factory loading — F1/F2 correction verdict

disposition: **ship**

Veredicto limitado a F1 y F2 del `finish-review.md`. Ambos quedan **resolved**. No se abrió una nueva revisión global ni se utilizó navegador; no se modificó producto.

| Before | After | Why |
| --- | --- | --- |
| **F1 · P2:** el stock longitudinal y la cámara oblicua reducían el camión a unos 280 px y los coches cargados a unos 30 px en el stage de 1105 px. | **resolved.** La espera transversal sobre transbordador (`factory-loading.ts:35`, `:45`, `:64–65`; `factory-scene.ts:112–116`) y la cámara lateral de rampas (`viewer.tsx:86`) hacen legibles los dos niveles y cada automóvil. En `cm-auto-doubledeck-stage.png` se distinguen los coches colocados de aproximadamente 85–90 px, la rampa y las dos unidades pendientes, conservando las proporciones del modelo. El viewport desde arriba, controles y crest corroboran el resultado sin ocultar el stock. | La mercancía y su incorporación al portavehículos ya se pueden leer sin acercamiento manual. La longitud física de la rampa sigue explicando parte del encuadre; ya no diluye los coches hasta impedir su lectura. No queda un gap material respecto del objetivo de F1. |
| **F2 · P2:** la interpolación de pitch dejaba el neumático delantero del tractor 0.533 m sobre la plataforma al alcanzar el extremo superior. | **resolved.** `rolling-supports.ts:8–14` comparte apoyos con la geometría nativa y `:21–44` calcula altura/pitch sobre el perfil. `factory-loading.ts:48–51`, `:68` y `:107–108` lo aplica durante el trayecto y espera a que el apoyo trasero despeje el crest. `factory-scene.ts:192–193` muestra las rampas exterior e interior. En `cm-tractor-stepdeck-stage.png`, `-controls.png` y `-crest.png` desaparece la suspensión anterior; en crest el tractor está nivelado y apoyado. Las vistas stage/crest de `cm-flat-recovery` y `cm-excavator-lowbed` sostienen la reutilización para coches y orugas. | La pose responde a la superficie bajo los apoyos, incluyendo los cambios de pendiente; no se nivela por una interpolación temporal ajena al soporte. La transición a cama baja tiene geometría visible. No queda un gap material respecto del objetivo de F2. |

Evidencia comprobada en este pase:

- 12 capturas pertinentes inspeccionadas: auto (viewport, stage, controles, crest), tractor (stage, controles, crest), flat-recovery y excavator-lowbed (stage y crest), y móvil reducido. La captura móvil conserva «Siguiente paso», reinicio, deslizador y 1/8 contenedores colocados.
- Ejecución propia: `node --import tsx --test --test-name-pattern='rolling loads|car carrier staging' src/features/truck-collection/factory-loading.test.ts` — **2/2 pasan**. El ensayo de apoyos recorre las transiciones, muestrea 800 posiciones angulares de cada semicírculo contra el perfil y exige no penetración y hueco de ruedas menor de 2 mm (`factory-loading.test.ts:93–119`). El segundo comprueba espera compacta y sin solapamiento (`:122–127`).
- Lectura de `browser-check-fix.json`: cuatro casos rodados, `errors: []`. Es evidencia suministrada, no interacción ejecutada por este revisor.
- Verificación de chunks PNG: **35 archivos**, todos con `impeccable:prompt`; sin procedencia ausente. No se repitió el detector.
- El constructor comunicó 7/7 pruebas completas y build final exit 0; este pase no los repitió ni los necesita para sustituir la evidencia focalizada anterior.

No quedan arreglos materiales pendientes de F1/F2. Procede continuar con documentación y cierre dentro del alcance original.

No se repitieron la revisión global, build ni suites amplias, ni se comprobó hardware móvil o lector de pantalla.
La simulación sigue siendo sintética y cinemática; este veredicto no certifica física, seguridad de carga ni un vehículo real medido.
