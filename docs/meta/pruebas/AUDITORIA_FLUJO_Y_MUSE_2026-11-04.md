# Flujo de usuario, datos de muestra y latencia de Muse

**Corte inicial de diagnóstico.** La corrección y pruebas posteriores están en [Cierre técnico del 4-nov](CIERRE_TECNICO_2026-11-04.md). Las menciones a código sin corregir, pila apagada y falta de build describen el estado previo, no el resultado final.

4 noviembre 2026. Solicitud de Cristhian: pull, identificar datos prefijados, comprobar conexiones y diagnosticar lentitud de Muse. Repositorio de trabajo Meta; no se modifica Amazon ni el repositorio público Indie.

## Resultado y alcance

- Pull fast-forward de `codex/meta-cristhian` a `origin/main@45fd371041feae6351048489fa4a7e77a860c208`. Incluye PR #16 de Juan (garajes, carga, conductores y materiales); PR #15 ya estaba integrado. No había PR abiertos al consultar.
- La aplicación sí tiene APIs y persistencia para solicitud, manifiesto, documentos, sesiones, observaciones y Passport. No se puede afirmar que todo el producto está conectado ni que está listo para cualquier usuario nuevo.
- Los 60 camiones/contratos y su fábrica animada siguen siendo una demostración. No representan la flota, los grupos ni el booking del pedido abierto por el usuario.
- Encontrado fallo real de conversación: un turno que aporta embalaje y pregunta por lo declarado termina en `MODEL_OUTPUT_INVALID`, pese a que Muse recuerda la mercancía. Hay rechazo por salida truncada y por conflicto entre intención local y propuesta del modelo. La demora es medible sin Next.js ni Supabase.
- No se modificó código funcional ni configuración privada. El experimento `minimal` solo alteró el transporte de un arnés; no está aplicado al producto. No se hicieron escrituras comerciales, migraciones, despliegues ni pruebas visuales.

La base, el frontend y el worker locales estaban apagados y Docker no tenía daemon disponible. No se inició esa pila. Esta auditoría combina inspección de conexiones, pruebas automatizadas con dobles y llamadas reales limitadas de texto sintético a Meta. No equivale a repetir hoy el recorrido completo en navegador/base ni certifica Vercel.

## Datos prefijados: cuáles y dónde

| Superficie | Fuente efectiva | Consecuencia para una prueba |
| --- | --- | --- |
| `/tetris`, catálogo 3D | `features/truck-collection/catalog.ts` y `meta-loading-dashboard/vehicle-dashboard-model.ts`: 60 diseños, conductores, placas DEMO, contratos y cargas sintéticos | Sirve para explorar geometría/animación. No para demostrar que se asignó una orden real ni que un precio fue cotizado por un carrier. |
| Fábrica animada | `factory-loading.ts`, `factory-player.tsx`: plan completo e incompleto seleccionables; interrupción programada | No es vídeo analizado ni observación de DockMind. Los códigos/barcodes generados tampoco prueban trazabilidad física. |
| Dashboard de ejemplos | `meta-loading-dashboard/dashboard.tsx` y `/tetris/demo`: `dashboardFixture(scenario)` | Ejemplos explícitos, separados de las sesiones operativas. |
| Mapa Carrier | `carrier-control-tower/control-tower.tsx`, `tower-demo-route.ts`, `tower-simulation.ts` | Simulación activada con ruta fija Lima–Arequipa, reloj ×180 y velocidades/offsets generados. Solo muestra vehículos autorizados disponibles en la lectura y rotula sin GPS. No sirve de tracking real. Posiciones reportadas y rutas de planificación son fuentes diferentes. |
| Formulario normal | `v2-intake-client.ts`: GET `/api/v2/intake/options`; creación/revisión real por API | No sustituye errores de API con un catálogo ficticio. El fixture de desarrollo requiere opt-in y producción lo ignora. Un perfil visual explícito se identifica por cabecera y no ofrece persistencia como si fuera el flujo autorizado. |
| Ejemplo precargado | `prototype-model.ts` / acción de cargar ejemplo | Es opt-in; no debe usarse para afirmar que la IA extrajo esos datos. |
| Documentos | Revisiones privadas, vínculos y compartición por booking persistidos | Los PDF de prueba son ficticios. Aceptarlos registra una revisión documental; no certifica autenticidad, cumplimiento internacional ni autoriza salida. |
| Muse | `server/ai/meta/client.ts` y `conversation.ts` | Se llamó realmente a `https://api.meta.ai/v1` con `muse-spark-1.3`. Hay comandos determinísticos deliberados para guardar, corregir y revisar, no una respuesta de modelo prefijada. El fallback por fallo del proveedor sí puede dar una frase genérica. |
| DockMind | Worker y segmentador seleccionados/configurados | FIXTURE usa resultados sintéticos; SAM real requiere su ejecución verificable. En Vercel no funciona `LOCAL_LOOPBACK`. |
| Scripts/scenarios | IDs de solicitudes y clips conocidos en scripts de aceptación y SQL opt-in | Son fixtures de ensayo, no IDs que la aplicación deba imponer al usuario. No se ejecutaron seeds ni esos comandos comerciales aquí. |

No se encontró en los lectores revisados de solicitud, manifiesto, expediente, ofertas o sesiones un reemplazo automático por la solicitud QA cuando no hay datos. Esto es una revisión de las superficies citadas, no una garantía de ausencia absoluta de constantes en todo el repositorio.

## Qué está relacionado y qué sigue aparte

1. **Solicitud → manifiesto:** el formulario guarda un DRAFT; el panel `ManifestReview` prepara y confirma aparte. Se verifica organización, request, versión y hash; los reintentos conservan clave. Confirmar no crea transporte ni sesión.
2. **Organización → documentos → solicitud:** biblioteca privada, revisión exacta y vínculo al request. La packing list conserva correspondencia con la declaración. Cambiar la carga requiere revisar el vínculo, no heredar una aceptación.
3. **Solicitud → ofertas → booking:** búsqueda, selección y autorización tienen comandos y consentimiento propios. Las tarifas usan políticas persistidas, capacidad y rutas; si faltan datos no hay oferta legítima que mostrar. Registrar una sede no crea cobertura.
4. **Booking → documentos Carrier:** `RequestDossier` enumera relaciones autorizadas; se comparten revisiones concretas. `CarrierDocuments` aparece en el detalle de Orders y limita revisión a rol habilitado. No se comparte toda la biblioteca ni se confirma capacidad por aceptar un PDF.
5. **Manifiesto → sesión:** en `/tetris?view=sessions` se elige request y sede; se lee el manifiesto confirmado y se declara unidad por grupo. La sesión congela su referencia/revisión. La UI consultada opera con el actor de organización; no se ha comprobado hoy acceso Carrier a ese mismo dashboard.
6. **Sesión → DockMind → observación → Passport:** panel de evidencia dentro de la sesión; job, callback, selección de observación/cobertura, cierre de alcance y creación de Passport son pasos explícitos. Hay verificación de IDs/versiones. No se genera el Passport solo por subir un clip.
7. **Catálogo 3D → pedido real:** no existe esa asignación en el workspace visual revisado: importa `tetrisFleet`, no el manifiesto del request. Su enlace a sesiones facilita navegar, no vincula esos 60 camiones con un booking real.

### Límite adicional: varios grupos e IA

La persistencia del formulario conserva grupos múltiples y el manifiesto da IDs estables. El contrato de propuesta IA revisado, en cambio, tiene campos escalares `unitQuantity`, `unitWeightKg`, etc., sin `targetGroupId`. El consumidor de texto/medios aplica esos campos a las propiedades principales del formulario; `additionalUnits` se maneja por separado.

Prueba pura: con A=8 y B=4, «Change the quantity to 6 boxes» cambia A a 6 y conserva B=4. «Change group B quantity to 6 boxes» y «Cambia el grupo B a 6 cajas» no produjeron campos en el parser local. No se hizo una llamada de modelo para demostrar una modificación errónea de B; se registra como limitación/riesgo de alcance, no como corrupción observada. Hasta acordar y probar destino de propuesta, editar B manualmente y no prometer soporte conversacional multigrupo.

## Muse: medición real y reproducción

Arnés ejecuta `interpretConversationTurn` real con su SDK, esquemas, validación y reintento. Un wrapper de `fetch` toma tiempos/contadores y llama al proveedor real; por esa instrumentación el DTO dice `transport=INJECTED`. No es un proveedor simulado: se recibieron HTTP 200, IDs y uso real. Solo texto sintético; no voz, fotos, información privada ni comandos persistentes.

| Caso | Código actual (`low`) | Experimento (`minimal`) | Resultado |
| --- | ---: | ---: | --- |
| Saludo en selección de transporte | 4.232 ms | 2.865 ms | META, 1 intento, sin mutaciones |
| «12 pallets of machine parts, 100 kg per pallet.» | 12.306 ms | 4.762 ms | META, extrae descripción/PALLET/12/100; no inventa medidas |
| Embalaje + referencia al historial | 39.400 ms; repetición diagnóstica 32.338 ms | 13.435 ms | Sigue fallando validación, 2 intentos y fallback |
| Corrección explícita de cantidad | 2 ms | 4 ms | DETERMINISTIC, 0 llamadas al modelo |

Es una muestra diagnóstica pequeña, secuencial y con caché de prompt variable. No son p50/p95, garantía de velocidad en producción ni benchmark de navegador. Los tiempos incluyen red/proveedor; no incluyen autenticación, consultas cloud, compilación Next, carga de recursos ni renderizado del cliente. No se midió CPU/FPS de la PC.

### Fallo reproducible de memoria/validación

Contexto anterior:
- Usuario: `I need to ship 1000 bottles of medicine from Lima to Arequipa.`
- Asistente: `How are the bottles packed for the road shipment?`

Nuevo turno: `They are packed on pallets. Do you remember what I am shipping?`

Resultado observado del producto: `MODEL_OUTPUT_INVALID` y fallback genérico.

Diagnóstico del segundo ensayo:
1. Primer HTTP 200 terminó con `finish_reason=length`. De 2.048 tokens de salida, 1.946 fueron razonamiento; el JSON visible quedó incompleto.
2. Segundo HTTP 200 terminó con `stop` y schema válido. El modelo recordó 1.000 botellas de medicina Lima–Arequipa, propuso PALLET y devolvió `intent=PROVIDE`. El parser local clasifica el texto terminado en pregunta como HELP; `conversation.ts` rechaza `fallback.intent=HELP && turn.intent!=HELP`.
3. En el experimento minimal, un intento devolvió HELP con declaración, también rechazado; el siguiente PROVIDE con declaración volvió a chocar con HELP local.

Por tanto, no es solo «no tiene memoria»: recuerda el contexto, pero hay un desacuerdo entre clasificación/contrato y respuesta válida de contenido. Quitar la validación o permitir que una pregunta rellene campos sería una corrección insegura. La salida debe separar respuesta conversacional y hechos de la última intervención con una decisión de aplicación explícita.

### Coste de trabajo y opciones de optimización

- Incluso el saludo envía un schema de 12.799 caracteres más 3.965 caracteres de instrucciones (2.613 tokens de entrada en la muestra). `declaration=null` no evita el coste de describir toda la declaración al proveedor.
- Se usa respuesta JSON completa, sin streaming, y el cliente espera antes de pintar. No aplicar ni persistir fragmentos de JSON. Streaming de texto/progreso tendría que separarse del resultado estructurado validado.
- Hay hasta dos intentos bajo un plazo total de 45 s; el SDK tiene `maxRetries:0`. Repetir el mismo payload no corrige necesariamente el conflicto HELP/PROVIDE.
- `reasoning_effort` está fijado a low en el transporte y su tipo solo admite low/medium. Meta documenta minimal como soportado; none NO lo está para Spark/Wonder. El experimento minimal mejoró los dos casos correctos, pero no solucionó el caso mixto. No se cambió .env ni el código.
- El cliente descarta respuestas obsoletas por revisión/scope, pero la llamada de texto no lleva AbortSignal del frontend. Abortar al cambiar de pantalla/revisión evitaría esperas/red obsoletas; no garantiza anular un procesamiento o cobro ya iniciado.
- Audio: subida privada → finalización/hash → transcripción → interpretación son pasos distintos. El análisis recorre medios y descarga bytes antes de invocar el modelo; no se midieron aquí sus latencias reales.

Referencia primaria revisada: https://dev.meta.ai/docs/reasoning (razonamiento consume presupuesto de salida; minimal disponible, none rechazado). No copiar razonamiento privado a logs; la evidencia solo guarda contadores y salida visible sintética.

## Recorrido reproducible para un usuario de prueba

Antes: cuenta con membresía activa OWNER/SUPERVISOR, organización Meta, catálogo y al menos dos sedes válidas; cuenta Carrier habilitada y servicio/capacidad/política vigentes si se ensaya la parte comercial. El acceso Explore es un perfil de demostración, no prueba de onboarding de cualquier empresa. Confirmar variables/migraciones/Storage del entorno elegido. No mezclar IDs ni datos local/Vercel.

1. **Organización → Documentos:** subir ficha de empresa ficticia. Recargar; conservar ID/revisión. Debe estar pendiente, no aceptada automáticamente.
2. **New shipment → Road:** escoger dos sedes del catálogo. Probar saludo, luego describir mercancía. No usar Load example para demostrar extracción IA.
3. **Cargo & units:** introducir manualmente dos grupos distinguibles. Comprobar cantidades, peso y volumen por unidad; condiciones y posibilidad de dividir explícitas. No asumir selección de equipo por peso solamente. Para los PDF existentes, usar datos coincidentes o generar packing list correspondiente.
4. **Windows & contacts:** fechas futuras, horas y zona horaria; contactos de prueba. Campos desconocidos deben seguir pendientes; no aceptar 1 kg/1 cm como valores de relleno.
5. **Review → guardar DRAFT:** revisar valores y confirmar. Reabrir desde My shipments: mismo request ID y mismos grupos. Corregir un dato y guardar revisión con el mismo ID; reintento no crea otro pedido.
6. **Manifiesto:** preparar, revisar identidad/grupos y confirmar. Reabrir: misma revisión/IDs. Editar el DRAFT después debe marcar el manifiesto histórico, no reescribirlo.
7. **Documentación del envío:** adjuntar packing list de ese manifiesto y reutilizar ficha empresarial. Recargar y comprobar revisiones exactas. Sin booking aún, documentos privados.
8. **Comercial, si está configurado:** pedir ofertas con consentimiento → Carrier prepara/publica oferta atribuible → Cliente selecciona y autoriza booking → compartir revisiones de documentos con ese carrier/booking → Carrier revisa. Aceptar un documento no confirma booking/capacidad/salida. Sin oferta compatible, el resultado correcto puede ser «sin alternativas», no un precio inventado.
9. **Sesiones y Passport:** ir a `/tetris?view=sessions`, abrir sesión con request/manifiesto/sede y unidad por grupo. Para vídeo sintético elegir DEMO; VERIFICATION exige evidencia compatible.
10. **DockMind:** clip por grupo, configurar línea/dirección/unidad/cobertura, ejecutar el worker real correspondiente o fixture claramente rotulado. Comprobar job, intento, clip, vídeo anotado y observación del mismo grupo. Falta de worker debe dar NOT_CONFIGURED.
11. **Comparación y Passport:** seleccionar observación y cobertura, revisar incertidumbre, cerrar alcance y generar Passport. Reabrirlo; conservar sus fuentes. A 8/8 y B 3/4 con cobertura completa suficiente debe proponer diferencia de B; sin cobertura no declarar automáticamente faltante.
12. **Negativos:** otro tenant no puede leer archivos/request; revisión obsoleta da conflicto; callback repetido no duplica observación; recarga no duplica request/manifiesto/documento. No ejecutar operaciones reales de transporte para probar estos casos.

Los pasos comerciales y los de evidencia son dos cadenas relacionadas por request/manifiesto, no una única automatización que transforme aceptación de IA en transporte confirmado. El dashboard de verificación no es tracking físico, ni el Passport prueba entrega física por sí solo.

## Verificaciones ejecutadas y límites

- Chat111, IA54, manifiesto11, documentos8, medios27, sesiones48, DockMind55, voz31, explicación48, operaciones Cliente81 y comercial Carrier118: **592 pruebas aprobadas**. Son pruebas unitarias/servicio/frontera con dobles; no todas llaman al proveedor o a la base.
- Regresión adicional de Juan: 15 casos de fábrica/lifecycle pasaron. El archivo `catalog.test.ts` fue detenido tras ~292 s por su consumo de CPU al construir/comprobar geometrías. El runner sale 1 por esa interrupción; no se presenta como suite verde ni como defecto funcional probado. No se repitió el catálogo pesado ni un build completo.
- Llamadas reales a Meta: 6 HTTP con código actual (dos intentos en el turno mixto de cada ensayo) y 4 en el experimento minimal: 10 en total, solo textos sintéticos y sin acciones comerciales. Las correcciones explícitas no invocaron al proveedor. No se configuraron tarifas y no se anuncia coste monetario.
- Sin prueba visual, micrófono real, vídeo SAM real, base actual por HTTP/SQL ni despliegue Vercel. Ningún resultado anterior se presenta como una ejecución nueva de esos elementos.
- Harnesses y JSON: `salida/meta-hackathon-integration/tmp/audit-user-flow-20261104`; evidencia saneada adjunta en `auditoria-flujo-muse-2026-11-04/`.

## Correcciones prioritarias y responsables

1. **Axel (productor) + revisión Cristhian (consumidor):** caso mixto HELP/datos y agotamiento de tokens. Regresión sin inventar hechos, sin preguntas rellenadas, sin cambiar guardas de consentimiento. Véase el prompt adjunto.
2. **Axel:** evaluar minimal para conversación simple con pruebas de precisión y memoria; schema pequeño para selección/HELP; política de reintento que no repita sin cambiar nada ante un conflicto conocido. No aplicar minimal globalmente a explicaciones/medios sin revisión.
3. **Cristhian + contrato de Axel:** destino explícito de propuestas en pedidos multigrupo o bloqueo claro hasta seleccionar grupo; conservar revisión e identidad. Mientras tanto, B y siguientes se editan manualmente.
4. **Juan:** decidir si el objetivo es solo catálogo demostrativo o vista del manifiesto y vehículo persistidos. Conectar el segundo requiere adaptador real; no sustituir request/grupos con los del camión DEMO. Mantener la simulación separada de observaciones.
5. **Administrador de Vercel + Ramón:** Maps y datos vigentes; worker alojado si se exige vídeo online. No son errores que se resuelvan con otro pull.

Hasta corregir el turno mixto de Muse y repetir el recorrido en el entorno elegido, no dar ambos flujos por terminados para un usuario sin acompañamiento.
