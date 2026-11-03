# Luis: sincronización y aceptación real de IA

30-oct-2026, America/Bogota. Rama `codex/meta-luis`, producto general fuera de Indie. El usuario autorizó traer la rama de Axel, configurar su clave privada local y realizar las pruebas necesarias. No autoriza desplegar ni cambiar infraestructura alojada.

## Árbol sincronizado

- La copia local estaba en `eabd11c`; se actualizó por fast-forward a su propia rama remota `95046f5`, conservando las integraciones de Cristhian/Juan ya publicadas allí.
- El último commit publicado de `origin/codex/meta-axel` era `f3125cb`, cuyo contenido AX-02 ya se había incorporado. El merge local `15d39c8` incorpora también su historial y conserva las extensiones de Luis. Cuatro conflictos de scripts/documentación se resolvieron preservando el contenido combinado existente; no se eliminó ASR ni el razonamiento medium de explicación.
- `META_MODEL_API_KEY` se guardó únicamente en `cargomesh/.env.local`, ignorado por Git. No se copió a plantillas, informes, código cliente, otras ramas ni configuración alojada. Los valores Supabase de esta copia siguen vacíos.
- Los ajustes del ASR, el humo de explicación y esta evidencia permanecen como cambios locales después del merge; este documento no acredita su push.

## Aceptación contra Meta

Resultados reales en [LUIS_LIVE_RESULTS_2026-10-30.json](LUIS_LIVE_RESULTS_2026-10-30.json) y [casos de medios](demo-assets/luis/LIVE_RESULTS.json). Se enviaron exclusivamente ejemplos sintéticos. No hubo escrituras comerciales ni persistencia de dominio.

| Caso | Resultado observado | Modelo / latencia |
| --- | --- | --- |
| Texto: cantidades y peso explícitos, medidas desconocidas | `PASS_TEXT_ONLY`, propuesta válida | `muse-spark-1.3`, 6743 ms |
| Foto sin escala | Cuatro BOX; peso y medidas pendientes; advertencias de conteo visible/sin escala | `muse-spark-1.3`, 5627 ms |
| Etiqueta legible | Cuatro BOX, 8 kg y 40 × 30 × 20 cm por unidad, como afirmaciones no verificadas de etiqueta | `muse-spark-1.3`, 7529 ms |
| Etiqueta dañada | Sin cantidades ni medidas inventadas | `muse-spark-1.3`, 5102 ms |
| Corrección posterior de transcripción sintética | Tres cajas en vez de cuatro, atribuidas al texto reciente | `muse-spark-1.3`, 5859 ms |
| Explicación de comparación sintética cerrada | `PASS_EXPLANATION_TRANSPORT`, conserva esperado 12/observado 11/diferencia 1 recibidos; medium y revisión humana | `muse-spark-1.3`, 5425 ms |
| WAV sintético | `PASS_VOICE_TRANSPORT`, transcripción no vacía ligada a evidencia/revisión | `muse-voice-transcribe-1.0`, 2326 ms |

Los metadatos registran tokens cuando el proveedor los suministra; el coste monetario queda `null`, no se infiere saldo ni se afirma coste cero. Son muestras de aceptación, no métricas de fiabilidad. Los valores de evaluación no se incorporaron al prompt como respuestas esperadas.

La nota WAV se generó localmente con Windows System.Speech, Microsoft Zira Desktop (voz en-US) leyendo texto español; PCM16 mono, 16 kHz, 5930 ms. Es material sintético, no una grabación de una persona hispanohablante. Se comprobó el transporte y una transcripción no vacía, **no su precisión lingüística**. La aceptación con voz humana española y el circuito de medios autenticados siguen pendientes.

## Fallo encontrado y corregido

El primer humo de voz falló. Un diagnóstico adicional hizo una llamada real con fetch instrumentado (etiquetado `INJECTED`, no usado como aceptación): Meta devolvió HTTP 200 y un `sessionId` opaco con puntuación. Nuestro patrón solo aceptaba letras, números, guion y guion bajo y rechazaba esa respuesta válida.

La [documentación de schemas de voz de Meta](https://dev.meta.ai/docs/api-reference/voice/schemas) define ese identificador como cadena. Se añadió un schema común de cadena imprimible de 1–256 caracteres, sin controles ni saltos de línea, consumido por cliente, servicio ASR y validador del humo. No se utiliza para conceder acceso a evidencia. Se agregaron regresiones para puntuación válida y rechazo de controles/longitud excesiva. Tras el arreglo se ejecutó una nueva llamada sin fetch inyectado y pasó el humo completo de voz.

El primer intento y el diagnóstico también pudieron consumir procesamiento. El informe conserva esa distinción; no se borró el fallo ni se presentó el diagnóstico como aceptación de proveedor.

## Verificación local final

| Verificación | Resultado |
| --- | --- |
| `test:meta-ai` | 49 pass |
| `test:meta-base` | 44 pass, incluido el nuevo humo de explicación |
| `test:meta-voice` | 31 pass |
| `test:meta-explanation` | 29 pass |
| `typecheck` | Pass |
| `test:release` | 574 + 4 pass; nueve recetas LOCAL_ONLY, sin activar datos |
| `test:v2-conversation` | 106 + 32 pass |
| `test:v2-chat-workflow` | 104 pass |
| `test:meta-manifests` / `test:v2-intake` | 11 / 88 pass |
| `test:meta-loading` | 21 pass |
| `check:architecture` | Pass, 819 módulos y 240 entradas cliente |
| `build` | Pass, incluida la validación de tipos del build |
| Búsqueda de la clave en fuentes y `.next/static` | Ninguna coincidencia; `.env.local` no versionado |

Las suites comparten casos: sus conteos no se suman como una cifra única de pruebas de producto. Todas las suites son locales e inyectadas; se distinguen de las llamadas reales de la tabla anterior. No se ejecutaron migraciones, pruebas SQL/HTTP contra una base, visuales de navegador, deploy ni CI remoto.

## Límites vigentes

La configuración de IA está lista y la clave funciona con los dos modelos. La aplicación autenticada completa no queda certificada: falta configurar el Supabase Meta autorizado de esta copia y conectar upload/revisión de medios de Cristhian y hechos/Passport de Juan. Docker no mostraba el proyecto `meta-cr01-validation`; la DB de referencia existente ocupa otro volumen y no se reutilizó ni se modificó. La nota sintetizada no sustituye una prueba de audio humano ni un vídeo físico.

Reproducción desde `cargomesh/`: `pnpm check:meta-ai` no llama al proveedor. `pnpm smoke:meta --live-text`, `pnpm smoke:meta-media-luis --live`, `pnpm smoke:meta --live-voice ../docs/meta/demo-assets/luis/synthetic-note.wav` y `pnpm smoke:meta-explanation --live` sí pueden consumir créditos; no ejecutarlos automáticamente en CI.
