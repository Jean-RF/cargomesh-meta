# Entrega sintética A/B de Ramón integrada al recorrido local

2-nov-2026, America/Lima. Base `main@1f07e8a` y ajustes locales de Cristhian. [Carpeta compartida](https://drive.google.com/drive/folders/1dCVyHHa9xqoF-LwFVBIlfU3L5Q9_Y8z-). Autoría del paquete/generador: Ramón/Jean. Integración HTTP y registro: Cristhian. Sin push, despliegue, migración o inferencia pagada.

## Archivos recibidos

Se descargaron los ocho archivos originales mediante el conector autenticado de Drive a `meta-hackathon-integration/tmp/ramon-sinteticos-ab-20261102`, fuera del repo Meta. El generador se leyó como referencia y **no se ejecutó**; no se regeneraron, recodificaron o sustituyeron los MP4. La referencia es geométrica, no anotación humana de una filmación.

| MP4 | SHA-256 comprobado contra mensaje y entrega.json | Bytes | Formato comprobado |
| --- | --- | ---: | --- |
| grupo_a_sintetico.mp4 | 6bd1ab08da4422fd50eacf7f8f32ed9eb967d3ccabce1ceebd8145208d646fc4 | 30528 | H264,1280×720,10fps,17.2s, sin audio |
| grupo_b_sintetico.mp4 | 780dcbd2c6f2985728ee96998b9dcd6dec019dd1d67274af804ffb2b2747b3dd | 21335 | H264,1280×720,10fps,16.2s, sin audio |

El paquete declara rótulo SYNTHETIC RENDER en cada cuadro. No se realizó aceptación visual del rótulo ni de la interfaz; queda para Cristhian. Los archivos se ingirieron explícitamente como SYNTHETIC_RENDER y los resultados conservan FIXTURE/realInference=false.

## Conexión ejecutada

Se extendió nuestro arnés `cargomesh/scripts/meta-web-worker-demo.ts` con `META_WEB_WORKER_DELIVERY_FILE` opcional: verifica nombres de archivo, bytes, SHA y grupos del paquete. Huella del archivo entrega.json fijada al estado de aceptación. Sus cantidades solo comprueban la salida después de contar; la referencia no se envía al worker ni modifica el comando de análisis. El caso anterior conserva sus valores8/3 por defecto.

Mismo pedido `8b0fed7d-4cc3-4cc3-b819-8f68fdeefebe`, manifiesto `163cd0cc-a0d2-4f8e-bcde-310c689fcafd` rev1. Nueva sesión **DEMO** `36dd509e-6612-4ce2-8663-46531abce043`. Un clip/job por grupo, línea vertical0.5, adentro0.8/0.5, unidadBOX, concept cardboard box, coberturaCOMPLETE declarada para QA sintético.

1. Lanzador con fixtureA original; subida/verificación del MP4A y análisis por Next8080→launcher8765→Storage→callbackHMAC→observación de Juan.
2. Esperar resultado y cerrar únicamente nuestro launcher. Reiniciarlo con fixtureB original, subir/verificar MP4B y ejecutar su job.
3. Repetir cada comando de análisis devuelve el mismo job; una observación por grupo. Ambos overlaysVERIFIED, hashes descargados y exportados coinciden con el servidor.
4. Selección de cobertura y cierre mediante comandos QA automatizados: no revisión física humana. Guardar/reabrir Passport mediante API real. Cero llamadas de explicación.

| Grupo estable | Job | Conteo | Comparación de la sesión |
| --- | --- | ---: | --- |
| A879dc96b-3c00-43e1-b772-619996b2b713 | 9eaf27c1-a5e3-481a-aec0-773c6d83f22e | 8 BOX | 8/8 MATCH |
| B d1b2aab3-29d2-4b90-8a70-d369c0dd1f6c | 64b8e40d-f339-4f2b-acfd-7a504efc7ff4 | 4 BOX | 4/4 MATCH |

Passport `331e9301-b37f-46a3-ad06-2b5eab9ca4d6` guardado y vigente tras reabrir mediante cookie real de Cliente. TypeScript correcto.

## DEMO no equivale a RA-00

El evaluador del PR12, sobre la referencia original de Ramón y los dos paquetes exportados, informa esperados2/evaluados2/exactos0, sin fallidos o pendientes. En ambos grupos conserva **SIN_INFERENCIA_REAL**. Esto es el resultado correcto: coincide el conteo sintético, pero no cumple la aceptación física/SAM por grupo. No se relajó el evaluador para hacerlos pasar.

No acredita captura propia, precisión SAM, conteo en cámara real, permiso sobre filmaciones reales, Modal o producción. RA-00 sigue pendiente. No se confirmó booking/capacidad, incidente o entrega por guardar el Passport.

## Qué revisar

- [Caso recibido de Ramón: ambas cantidades coinciden](http://127.0.0.1:8080/tetris?session=36dd509e-6612-4ce2-8663-46531abce043&passport=331e9301-b37f-46a3-ad06-2b5eab9ca4d6).
- [Caso anterior conservado: discrepancia de una caja](http://127.0.0.1:8080/tetris?session=5394399d-e3a3-404c-8181-0b97aad29d49&passport=beb6cc9f-7ad4-4a6d-99a8-9d26f1bd709a). Se releyó por API y conserva B3/4 DIFFERENCE_PROPOSED; no se sobrescribió.

Launcher activo al terminar: **fixtureB de Ramón**, compatible solo con `grupo_b_sintetico.mp4`. Un nuevo análisisA necesita reiniciarlo con fixtureA; no usar este fixture con otro vídeo ni cambiar automáticamente aSAM. Las credenciales siguen solo en archivos privados ignorados/fuera de Git. Revisar un Passport ya guardado no necesita volver a analizar.

Evidencia: [resultado](ramon-sinteticos-2026-11-02/result.json), [readback](ramon-sinteticos-2026-11-02/readback.json), [paqueteA](ramon-sinteticos-2026-11-02/group-a-evidencia.json), [paqueteB](ramon-sinteticos-2026-11-02/group-b-evidencia.json), [evaluación](ramon-sinteticos-2026-11-02/evaluacion.md) y [archivos/hashes de procedencia](ramon-sinteticos-2026-11-02/source-files.json). No se copian MP4 ni URLs firmadas al repo.
