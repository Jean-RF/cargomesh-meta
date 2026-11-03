# Verdict pass — F1

**F1: resolved. Disposition: ship.** El único ajuste material solicitado en la revisión inicial queda resuelto. Este veredicto corresponde a la consola de fábrica y no amplía el alcance al resto de CargoMesh.

| Before | After | Why |
| --- | --- | --- |
| El final con movimiento reducido dejaba «Siguiente paso» deshabilitado. | `mobile-complete.png` muestra «Volver al inicio» habilitado, con icono de reinicio, al 100% y 2:14. | La acción principal ofrece una salida clara al terminar. |
| La invitación a repetir dependía del reinicio secundario. | `mobile-reset.png` muestra 0:00, 0% del tiempo, 0 colocados, 8 pendientes y «Siguiente paso» disponible. | La repetición conserva el avance manual y permite comenzar de nuevo. |

Se comprobó en `factory-player.tsx:49` que la rama reducida deshabilita sólo mientras la escena no está lista y ejecuta `jump(0)` al finalizar. `jump` en la línea 28 fuerza `setPlaying(false)`; la rama reducida no llama a `setPlaying(true)`. La corrección satisface F1 sin activar reproducción automática ni modificar CSS, tiempos o geometría.

Se inspeccionaron las dos capturas finales obligatorias. `checks.json` registra `reducedRestart: true`, `noAutoplayOnRestart: true` y cero errores. `verification.json` registra el build final con lint/tipos después de F1. Se verificó que los diez SHA-256 actuales coinciden y que los diez PNG contienen procedencia; `verification-before-F1.json` y la revisión inicial siguen presentes. La prueba temporal tras 250 ms pertenece a la evidencia del implementador: esta revisión confirma su resultado guardado y la lógica correspondiente, sin volver a ejecutarla.

No quedan ajustes materiales abiertos de esta revisión. Conservar el diseño y evitar una nueva ronda de pulido.

No se abrió navegador ni se repitieron suites o detector; `[]` corresponde a su única ejecución anterior a F1. La fluidez, FPS en móvil físico y otros motores siguen sin comprobarse.
