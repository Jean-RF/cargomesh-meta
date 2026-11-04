# Cierre técnico local — 4 noviembre 2026

Base revisada: `main@45fd371041feae6351048489fa4a7e77a860c208`, incluidos PR #15 y #16. Continuación en `codex/meta-cristhian`, por delegación expresa del usuario. Cristhian corrige también el consumidor/adaptador de Axel, conservando las implementaciones y autorías previas de Axel, Luis, Juan y Ramón. Producto general; no promueve aportaciones al repositorio público Indie ni modifica Amazon.

## Resultado

Se corrigió el fallo reproducido de memoria/intención de Muse, se redujo el trabajo de las preguntas simples, se protegieron los grupos de carga y se conectó el manifiesto con la apertura explícita de una sesión. Se repitieron por HTTP real local la persistencia del manifiesto, el expediente privado y DockMind → observación → Passport. No es una certificación visual, legal, de conteo físico o del entorno publicado.

### Muse y formulario

- Las preguntas se reconocen antes de convertir artículos como «un» en cantidades. «¿Qué es un pallet?» no declara un pallet. Un turno mixto dato + pregunta responde sin aplicar campos; pide una declaración separada para actualizar el formulario.
- HELP y selección de transporte usan un schema estricto pequeño, sin superficie de extracción. Los hechos/correcciones siguen pasando por AX-00, evidencia textual y controles existentes. El modelo no guarda ni contrata.
- Conversación utiliza `META_CONVERSATION_REASONING_EFFORT=minimal` por defecto; admite `low` como ajuste reversible. No modifica razonamiento de fotos, voz o explicaciones. `none` se rechaza antes de llamar al proveedor.
- Se conservan tokens/ID de solicitud observados incluso ante truncamiento. No se registran secretos, razonamiento interno ni coste inventado. Se mantiene timeout total y máximo de dos intentos.
- Cerrar el chat, cambiar de pantalla/borrador o desmontarlo cancela el fetch pendiente. Las comprobaciones de revisión siguen descartando resultados antiguos. Cancelar localmente no demuestra que Meta no procesó/cobró una llamada ya recibida.
- Las propuestas escalares aún no tienen `targetGroupId`. Con varios grupos, chat, controlador y confirmación de foto/audio impiden aplicar cantidad, embalaje o medidas a una fila por posición. El usuario edita el grupo correcto manualmente; un grupo nuevo empieza con cantidad pendiente. No es soporte completo de edición multigrupo por IA.

### Manifiesto → sesión

Un manifiesto confirmado vigente muestra «Continuar a sesión de carga de esta solicitud». `/tetris?view=sessions&requestId=…` selecciona el pedido autorizado, incluso fuera de la primera página. No abre automáticamente una sesión, crea un booking ni sustituye el pedido por un camión del catálogo. El usuario elige sede, modo y unidades y confirma la apertura.

## Pruebas y evidencia

Resultados saneados en [cierre-tecnico-2026-11-04](cierre-tecnico-2026-11-04/). No se copian `.env.local`, cookies, claves, URLs firmadas, PDFs ni clips privados.

### Gate de código

Comandos descubiertos desde `cargomesh/package.json`. Último resultado pertinente por suite:

| Comando | Casos aprobados |
| --- | ---: |
| `test:v2-conversation` | 107 + 32 |
| `test:v2-chat-workflow` | 116 |
| `test:v2-intake` | 89 |
| `test:meta-ai` | 59 |
| `test:meta-base` | 44 |
| `test:meta-manifests` | 11 |
| `test:meta-documents` | 8 |
| `test:meta-draft-media` | 28 |
| `test:meta-loading` | 51 |
| `test:meta-dockmind` | 55 |
| `test:meta-voice` | 31 |
| `test:meta-explanation` | 48 |
| `test:client-operations` | 81 |
| `test:carrier-commercial` | 118 |

878 ejecuciones de casos en 15 etapas, sin fallos. Algunos comandos comparten archivos: no son 878 casos distintos. Las suites afectadas por las últimas correcciones se repitieron y reemplazan sus resultados anteriores. TypeScript sin errores; arquitectura: 902 módulos / 255 entradas cliente. Build exitosa en copia aislada, sin configuración privada, limitada a dos CPU; 1.569 archivos de entrada conservaron su hash durante la compilación. No se alteró la caché de desarrollo para compilar.

El catálogo 3D pesado interrumpido durante la auditoría inicial no se repitió ni se cuenta aprobado. No se afirma que toda la matriz CI remota haya pasado por este gate local. Este incremento no cambia geometría. Inventario UML y DER también pasan sus comprobaciones; no certifican ejecución de migraciones remotas.

### Meta real

Muestra diagnóstica pequeña, no benchmark p50/p95:

| Caso compartido | Antes | Después, intérprete directo |
| --- | --- | --- |
| Saludo en selección | 4,2 s | 2,8 s, una llamada |
| 12 pallets, 100 kg por pallet | 12,3 s | 5,1 s, cuatro campos correctos |
| Recordar 1.000 frascos de medicina + pregunta de embalaje | 32–39 s y dos intentos fallidos | 5,2 s, una llamada; recuerda sin aplicar campos |

Se verificaron después **dos llamadas mediante Next/Auth reales**: memoria 4,6 s de proveedor / 11,1 s HTTP total en primera compilación local; extracción 6,2 s de proveedor / 6,4 s HTTP total. Ambas `META_MODEL_API`, un intento, sin fallback. Recuerda medicina y 1.000 frascos sin convertirlos en 1.000 pallets. La extracción propone PALLET, 12 y 100 kg. Sin sesión: 401; origen externo: 403. Cero escrituras comerciales. Cinco llamadas reales de texto en este incremento, además de diez de la auditoría previa; sin nuevas llamadas de SAM, fotos, voz ni explicación.

### HTTP y base Meta local reales

- Manifiesto: pedido `18bbe016-ab3c-401d-a0a6-5b77a8c28dba`, manifiesto `e6379cfc-6ff3-41f1-8188-2e37e851b256`, revisión 2. Mismo ID tras corrección, grupos estables, reapertura idéntica, replay/concurrencia y aislamiento tenant. Sigue DRAFT.
- Expediente nuevo: pedido `7f32ac4d-5364-4085-b166-732ada5c280b`, manifiesto `fa6e9f30-fa51-42cd-b95d-38d4a9df44ae`. Upload privado, replay, biblioteca/revisiones, vínculos, reemplazo explícito y hashes; acceso público/ajeno y archivo inválido rechazados. Sin booking nuevo.
- Expediente comercial existente: booking `654a02b7-c366-4298-8e1a-003481cbfb0a`. Carrier autorizado reabre dos revisiones ACCEPTED y descarga archivos con hash correcto; otra organización no puede leer/descargar. Lectura, no nueva aceptación, despacho o reserva.
- No se aplicaron migraciones ni cambios de datos alojados.

### DockMind local: recorrido sintético completo

Clips de Ramón con fixtures, SHA y grupos distintos. Next → Storage privado → lanzador Python autenticado → callback HMAC → observación de Juan → revisión de cobertura → cierre → Passport → reapertura.

- Sesión `7285ef67-b35d-4ca2-93ac-3613ce39f7db`; Passport `d22f5102-9fc9-449d-90b9-6fc81ef1e5f5`.
- A: 8 declaradas / 8 observadas BOX, MATCH. B: 4 declaradas / 4 observadas BOX, MATCH.
- Overlays VERIFIED, descargados y hash verificado; una observación por job. Replay no duplica job/observación.
- DEMO, SYNTHETIC_RENDER, FIXTURE, `realInference=false`. No acredita SAM real, RA-00, cámara física ni detección de cualquier vídeo.
- Sin explicación pagada, booking, incidencia o confirmación de entrega.

Dos fallos operativos quedaron en A: despacho antes de readiness del launcher y ausencia de `ffprobe` en PATH. Se esperó respuesta 401 de readiness y se añadió el directorio de herramientas existente al PATH del proceso, sin instalar software ni modificar el worker. Reintento explícito: A completó en intento 3; B en intento 1. El fixture se cambió entre clips; nunca se usó A para B.

## Aceptación manual pendiente

1. Abrir `http://127.0.0.1:8080/clients/freight-request/new`; elegir Road. Es Meta local aislado, API 64321.
2. Chat: «12 pallets of machine parts, 100 kg per pallet.» Revisar campos. Preguntar «What is a pallet?» sin cambiar cantidades. Una pregunta mixta puede pedir una declaración separada: es intencional.
3. Completar ruta, medidas, requisitos, ventanas/contactos del caso. Desconocidos quedan pendientes. Si hay dos grupos, editar cantidades/medidas manualmente en cada uno.
4. Revisar/guardar DRAFT → preparar/revisar/confirmar manifiesto → recargar/reabrir mismo pedido/grupos → nuevo enlace a sesión. Confirmar apertura por separado.
5. Organización → Documents: subir/reutilizar los PDF de demo. Vincular packing list al manifiesto correcto. Compartir versiones explícitas mediante booking autorizado; Carrier revisa. Aceptar documentos no confirma transporte.
6. Resultado de vídeo preparado: `http://127.0.0.1:8080/tetris?session=7285ef67-b35d-4ca2-93ac-3613ce39f7db&passport=d22f5102-9fc9-449d-90b9-6fc81ef1e5f5`. Revisar rotulado sintético, grupos, timecodes y vídeos. Resultados guardados no necesitan worker activo.

Esta guía no afirma que un navegador haya realizado esos pasos hoy.

## Publicación y pendientes externos

- Los resultados son **locales**. Pull/commit/build no certifican el SHA ni las variables de Vercel.
- La sesión CLI disponible solo administra ANJUJE/Amazon, no `cargomesh-meta.vercel.app`. Amazon permanece intacto.
- Paquete privado fuera del repo: `salida/meta-hackathon-integration/private-vercel-20261103/`, con Maps JS, Routes servidor y Meta. Solo el administrador de Vercel Meta debe importarlo en Production y reconstruir el SHA integrado; no enviarlo al grupo. Mantener Supabase Meta HTTPS y credenciales alojadas; no importar las de 64321.
- Maps requiere `NEXT_PUBLIC_GOOGLE_MAPS_JS_API_KEY` **durante build**, APIs habilitadas y referrer Meta autorizado. Cambiar variables sin reconstruir no repara un artefacto viejo. Restricciones de Google Cloud no verificadas aquí.
- Worker alojado: falta endpoint HTTPS y secretos del workspace autorizado, o mantener vídeo local rotulado. 127.0.0.1 no sirve a Vercel; claves Muse no despliegan Modal.
- Captura propia + SAM real/RA-00, micrófono/foto reales, revisión visual y prueba del sitio publicado pendientes. Tetris/fábrica siguen demostrativos, separados de sesiones persistidas.
- Antes de entrega pública, aplicar `ENTREGA_Y_REINTEGRACION.md`; este repo del producto no equivale al paquete Indie.

## Entorno y recursos

Solo cinco contenedores `meta-cr01-validation` y frontend unificado 8080 (8090/3090 redirigen). No se iniciaron HAC, Amazon ni dealer. Worker detenido y build finalizada. Frontend reiniciado para la prueba HTTP y disponible con su base. Ver vídeo guardado no necesita GPU/launcher.

Para reanudar worker: seguir `cargomesh/dockmind-worker/OPERACION.md`, anteponer al PATH el directorio privado con **ffmpeg y ffprobe**, iniciar con fixture del clip correcto y esperar readiness. No mantenerlo encendido por defecto ni publicar credenciales locales.
