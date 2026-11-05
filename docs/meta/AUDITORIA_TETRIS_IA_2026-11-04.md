# Tetris e IA: brechas frente al plan y la hackatón

Fecha: 4 de noviembre de 2026. Revisión de solo lectura del sitio publicado y del código/documentación local de Jean-RF/cargomesh-meta. No se ejecutaron jobs, subidas de archivos, cierres, reservas ni nuevas generaciones de Passport durante esta revisión.

## Conclusión

Tetris sí está desplegado y armado visualmente. No falta recrear el catálogo ni la fábrica 3D. Falta acreditar y completar la conexión entre los datos revisados, la planificación persistida, la observación real de vídeo con SAM y su explicación fundamentada. El catálogo visual y una animación no prueban inferencia de IA ni conteo físico.

## Qué observé en producción

En https://cargomesh-meta.vercel.app/carriers/tetris:

- Catálogo de 60 vehículos, filtros, detalles, conductor y carga útil; rotulado Demostración.
- Detalle del furgón de paquetería: 18 unidades, cuatro grupos y 216 kg asignados. Cantidades presentadas como plan, no conteo observado.
- Controles de vista 3D y animación de fábrica; enlaces a sesiones/Passport y al nuevo planificador 2D/3D.
- La inspección del catálogo no ejecutó análisis Meta ni SAM.

Abrí mediante su lista una sesión ya existente y cerrada de la sede sintética Lima. Mostraba:

| Campo | Resultado observado |
|---|---|
| Declarado | 3 pallets, manifiesto r1 |
| Planificado | Sin plan disponible |
| Observado | Sin observación disponible |
| Evidencia | Un clip sintético verificado de 1,5 MB |
| Observaciones | 0 |
| Comparación | Pendiente de observación |
| Passport | Una versión histórica disponible en el selector |

Esto demuestra una brecha en ESA sesión, no que todas las sesiones o el worker estén averiados. Un clip verificado solo acredita su disponibilidad técnica; no que haya sido analizado por SAM. No generé ni modifiqué el Passport.

## Plan inicial frente al estado comprobado

Fuente inicial: OBJETIVO_Y_CONEXIONES.md y prompts de Juan, Axel, Luis y Ramón/Jean. Flujo previsto: declaración → propuesta revisada → manifiesto → sesión → observación → comparación → explicación/Passport → revisión humana.

| Función | Existe | Falta cerrar o acreditar |
|---|---|---|
| Muse interpreta texto, fotos y etiquetas | Adaptadores y revisión de propuestas; pruebas reales locales previas | Recorrido autenticado publicado foto → propuesta → revisión → manifiesto → Tetris con la misma identidad de grupos |
| Voz/transcripción | Adaptador Meta ASR y reproducción del navegador | Aceptación con micrófono real en producción. Meta ASR no genera voz de salida; la síntesis del navegador no acredita un modelo de voz Meta |
| Catálogo, carga y fábrica 3D | Observado publicado | Conectar la selección visual con un pedido/manifiesto operativo; las placas, tarifas y cargas demo no prueban disponibilidad real |
| Acomodo físico | Nueva vista previa determinística enlazada desde el catálogo | Guardado versionado del plan y consumo por la columna Planificado; no presentar el ensayo temporal como plan operacional persistido |
| DockMind/SAM 3.1 | Código de worker, jobs, callbacks y observaciones | Verificar endpoint alojado, autenticación, callback, storage y migraciones; completar un job real desde la web. La sesión inspeccionada no tiene observación |
| Conciliación | Función determinística y UI por grupos | Datos de observación compatibles y cobertura revisada; nunca restar BOX de PALLET ni declarar faltantes con alcance abierto |
| Explicación de IA | Servicio y UI de Passport, con validación | Explicación Meta real del Passport publicado, fundamentada en los hechos y timecodes de esa sesión |
| Reality Passport | Superficie e historial presentes | Prueba de reapertura con fuentes, revisión, observaciones y explicación verificables; historial por sí solo no acredita inferencia |
| Edición multigrupo por IA | Barreras contra aplicar a una fila incorrecta | Propuesta con targetGroupId y revisión de grupo explícita. El cierre técnico documenta que la edición completa multigrupo aún no está implementada |

## Qué debe hacer cada componente

No hace falta añadir varios agentes autónomos solo para poder decir que hay agentes. En este diseño:

1. Muse propone datos de carga a partir de texto/foto/etiqueta; una persona revisa.
2. El planificador calcula geometría y restricciones mediante código. No debe inventar dimensiones desde una foto sin escala.
3. SAM segmenta/sigue objetos en vídeo; el contador determinístico calcula cruces de línea.
4. El comparador calcula diferencias según unidad, grupo, cobertura y revisión.
5. Muse explica los hechos calculados y referencia evidencia. No crea faltantes, incidencias o reservas.

La ampliación futura del acomodo puede incorporar apilamiento, fragilidad, distribución de peso y descarga, con restricciones verificables. No es requisito demostrado de las bases oficiales ni bloquea el núcleo de evidencia de vídeo del plan inicial.

## Prioridades para cerrar la demo

### P0: una ejecución completa demostrable

- Elegir un manifiesto vigente y grupos identificados, BOX o PALLET sin conversiones implícitas.
- Abrir o reutilizar una sesión autorizada y aportar un clip con permiso y referencia humana independiente.
- Ejecutar SAM real mediante el worker alojado y registrar modelo, configuración, revisión, job/intento, hash y origen del clip.
- Recibir el callback autenticado, mostrar observación y vídeo anotado con timecodes.
- Revisar cobertura, cerrar alcance explícitamente y calcular la comparación.
- Generar/reabrir Passport y explicación Meta basada en los hechos. Registrar qué parte fue inferencia real y qué parte fue cálculo o simulación.

Aceptación: un caso coincidente y otro con diferencia o evidencia insuficiente, sin conteos hardcodeados. No se necesita automatizar una incidencia comercial.

### P1: unir planificación y operación

- Contrato de plan persistente vinculado a organización, sesión, manifiesto/revisión, vehículo y grupos.
- Validación servidor, versión esperada, idempotencia y rechazo de planes obsoletos.
- Alimentar Planificado desde ese plan y reutilizar la geometría en el visor del carrier.
- Estado visible al cambiar manifiesto/vehículo; explicación de por qué una unidad no cabe.

### P2: experiencia y extensiones

- Asistente contextual en Tetris para consultar grupos, restricciones y evidencia, con herramientas de lectura autorizadas.
- Edición multigrupo de propuestas con identidad explícita.
- Apilamiento y reparto de peso solo con datos y validaciones suficientes.
- Inglés consistente: la pantalla actual conserva numerosos textos en español aunque la navegación esté en EN.

## Contraste con la información oficial de la hackatón

Página oficial consultada: https://cerebralvalley.ai/e/meta-ai-developer-hackathon

La página presenta modelos Meta y dos tracks. Para Indie destaca creatividad, ambición técnica y funcionamiento; para Startup, ejecución técnica y solidez en producción. Nuestro encaje propuesto es logística y control de un sistema físico, dentro de Build for Your World y potencialmente Push the Frontier. Es una interpretación de encaje, no una aprobación del organizador.

Para fortalecer la entrega: demostrar aportación sustancial de Meta, recorrido que funciona y resultado comprensible. Un visor 3D por sí solo no muestra ese aporte; sí lo hace vídeo → SAM → observación → comparación → explicación verificable.

La página pública revisada no detalla todas las reglas finales de entrega: al pie indica que las Official Rules deben aceptarse por participantes seleccionados. No permite certificar desde aquí elegibilidad del código preexistente, tamaño de equipo, licencias, formulario, duración del vídeo o requisitos completos. Deben cotejarse con las reglas aceptadas y el portal/Discord oficial, además del acuerdo interno ENTREGA_Y_REINTEGRACION.md. No asumir que todas las funciones o todos los modelos listados son obligatorios.

## Límites de esta auditoría

La revisión visual no confirma variables de Vercel, logs de Modal, migraciones alojadas, SHA exacto del artefacto ni consumo real del proveedor. No se volvió a ejecutar SAM ni se cargaron archivos. Las pruebas locales anteriores de adaptadores no sustituyen la aceptación publicada de punta a punta. La siguiente acción de mayor valor es cerrar P0, antes de construir otro visor o un segundo contador.
