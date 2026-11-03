# Fotos sintéticas de Luis

Generadas el 30-oct-2026 con la herramienta integrada `image_gen` y revisadas visualmente. Son datos de demostración, no evidencia de envíos reales. Los prompts completos y el método están en [GENERATION.json](GENERATION.json).

| Archivo | Referencia de evaluación revisada visualmente | Límite |
| --- | --- | --- |
| [cargo-scene.png](cargo-scene.png) | Cuatro cajas cerradas separadas, visibles sobre el suelo | Sin escala: peso y dimensiones pendientes; solo conteo visible |
| [shipping-label.png](shipping-label.png) | Texto impreso: 4 cajas de repuestos; 8 kg y 40 × 30 × 20 cm por caja | Afirmaciones de una etiqueta sintética, no medidas físicas verificadas |
| [damaged-label.png](damaged-label.png) | Etiqueta dañada sin texto recuperable | Cantidad, peso, medidas y contenido pendientes |

El CLI usa nombres neutros al adjuntar los bytes. No envía los prompts de generación ni las expectativas al proveedor. El cuarto caso no es una imagen: una transcripción sintética antigua declara cuatro cajas y el texto nuevo la corrige a tres.

Desde `cargomesh/`, ejecutar `pnpm smoke:meta-media-luis --check` para validar los archivos sin clave ni llamadas a Meta. Con clave y créditos disponibles, `pnpm smoke:meta-media-luis --live` ejecuta reconocimiento real y contrasta las referencias después de recibir la propuesta. `--report` solo junto a `--live` guarda `LIVE_RESULTS.json`; puede reemplazar ese informe de Luis, nunca el de Axel.

No se ejecutó reconocimiento real durante la preparación inicial. En el seguimiento autorizado del 30-oct pasaron los cuatro casos contra Meta: [LIVE_RESULTS.json](LIVE_RESULTS.json). Los resultados esperados no son respuestas garantizadas del modelo. La aplicación sigue requiriendo revisión humana de la propuesta y autorización de medios.

La nota [synthetic-note.wav](synthetic-note.wav) fue sintetizada localmente con Windows System.Speech, Microsoft Zira Desktop (en-US), leyendo «Son cuatro cajas de repuestos. Cada caja pesa ocho kilos.». PCM16 mono a 16 kHz, 5930 ms. No es voz humana ni voz nativa española; solo acredita el transporte ASR y una transcripción no vacía. Procedencia, hash y límites: [resultados de Luis](../../LUIS_LIVE_RESULTS_2026-10-30.json).
