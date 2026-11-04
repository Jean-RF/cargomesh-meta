# CargoMesh Meta: entrada del equipo

Incremento de Axel del 4-nov en `Jean-RF/cargomesh-meta`: [manifiesto a vista previa Tetris 2D/3D](TETRIS_PLANNING_2026-11-04.md) y [corrección de la selección de voz](VOICE_PLAYBACK_2026-11-04.md). Estos informes distinguen implementación local, integración y aceptación en producción.

Entorno de trabajo: [solo Meta local activo; bancos de pruebas apagados al terminar](ENTORNO_LOCAL_ACTIVO.md).

La documentación activa de Meta está en esta carpeta. El trabajo nuevo se realiza en `Chujutak2024/meta-hackathon`, ramas `codex/meta-*` y PR a `main` del mismo repositorio. Linear está aplazado por indicación expresa del usuario.

**Empieza por [Cierre técnico del 4-nov](pruebas/CIERRE_TECNICO_2026-11-04.md), [Entrega actual](ENTREGA_ACTUAL.md) y la [guía de usuario](pruebas/GUIA_USUARIO_CR01.md).** Formulario/manifiesto, biblioteca documental privada y sesiones/Passport tienen aceptación técnica local. Muse texto tiene corrección y llamadas reales verificadas. El vídeo aceptado es sintético/FIXTURE; SAM real y el despliegue publicado tienen pendientes explícitos. Los cortes históricos no sustituyen este estado.

| Necesidad | Documento |
| --- | --- |
| Repartir el siguiente incremento y revisar avances del equipo | [Mapeado de tareas y próxima revisión](MAPEADO_TAREAS_PROXIMA_REVISION.md) |
| Ver el estado de los seis puntos y qué se puede aceptar | [Entrega actual](ENTREGA_ACTUAL.md) |
| Probar manualmente el formulario, la revisión y la reapertura | [Guía de usuario CR-01](pruebas/GUIA_USUARIO_CR01.md) |
| Definir qué falta para cerrar el punto 4 de documentos | [Criterios de expediente documental](contracts/EXPEDIENTE_DOCUMENTAL_MVP.md) |
| Entender el producto y el mapa del código | [Estructura](../../ESQUEMA_PROYECTO.md) |
| Arrancar una historia con un agente | [Prompts](prompts/README.md) |
| Saber qué rama y PR usa cada integrante | [Cinco frentes de trabajo](PR_INTEGRANTES.md) |
| Conectar los cinco módulos de un único producto | [Objetivo y conexiones](OBJETIVO_Y_CONEXIONES.md) |
| Revisar el recorrido solicitud → orden y los documentos reutilizables | [Flujo de pedido, documentos y carga](FLUJO_PEDIDO_DOCUMENTOS_Y_CARGA.md) |
| Generar archivos PDF de ejemplo para Organización y envío | [Plantillas y prompt para ChatGPT](templates/documentos-demo/README.md) |
| Ejecutar nuestro frente y entender CR-00 campo por campo | [Plan de declaración e integración](PLAN_CR_DECLARACION_E_INTEGRACION.md) |
| Comprobar qué funciona en Meta local y reproducir manifiestos | [Validación CR-01 del 28-oct](VALIDACION_CR01_2026-10-28.md) |
| Consultar tareas, dueño y dependencia | [Backlog](backlog/README.md) |
| Generar, guardar y reabrir la explicación del Passport en Meta local | [Aceptación AX-03 de Luis, 1-nov](LUIS_PASSPORT_ACCEPTANCE_2026_11_01.md) |
| Acordar intercambios entre personas | [Contratos](contracts/README.md) |
| Ver el objetivo y salida de cada sprint | [Iteraciones](iterations/README.md) |
| Preparar hosting y secretos | [Infraestructura Meta](../../infra/meta/README.md) |
| Distinguir base existente y entrega nueva | [Registro del incremento](../../BUILT_DURING_HACKATHON.md) |
| Separar la entrega Indie del trabajo de los cinco y reintegrarlo después | [Acuerdo de entrega y reintegración](ENTREGA_Y_REINTEGRACION.md) |
| Repositorio público de entrega y candidata | [cargomesh-dockmind](https://github.com/Chujutak2024/cargomesh-dockmind); [corte 01 en PR borrador](CANDIDATA_PUBLICA_01.md), sin merge/deploy ni entrega final |
| Consultar decisiones iniciales | [Referencias](reference/README.md) |

Equipo del producto general: Cristhian, Axel, Luis, Juan y Ramón/Jean. Para la entrega Indie se han definido Cristhian, Axel, Juan y Ramón/Jean; Luis mantiene su trabajo fuera de ese alcance. Luis conserva voz, explicación y entorno; Cristhian mantiene formulario/manifiesto e integración, consumiendo esos módulos sin duplicarlos. El producto general se conecta durante el desarrollo y su alcance publicable Indie se decide por separado, conservando la autoría. Rige el [acuerdo de entrega y reintegración](ENTREGA_Y_REINTEGRACION.md). Los códigos `AX-*` se conservan como referencias del backlog y no deben confundirse con el nombre del dueño.

Flujo: declaración revisada -> manifiesto versionado -> sesión de carga -> dashboard/observación -> conciliación -> Passport y revisión. La IA propone y explica; el código valida y calcula; la persona confirma. ROAD es la base operativa reutilizada y no se añaden otros modos por nombrarlos.

Las 27 historias núcleo suman 48,5 h objetivo; las 20 ampliaciones suman 67 h. Las 158 pruebas del catálogo son propuestas, no resultados. Confirmar capacidad real antes de comprometer las ampliaciones. El cierre interno sigue siendo el 3 de noviembre y la fecha oficial indicada es el 4 a las 21:00 ET; revisar reglas y accesos efectivos por separado.

El contrato y adaptador de texto de Axel están integrados por el PR #4 (`a5c2a4d`); su [aceptación real de texto del 29 de octubre](AX01_LIVE_ACCEPTANCE_2026-10-29.md) tiene evidencia independiente. Hono CR-01 y el formulario manual fueron integrados por el PR #3 (`88f2f63`) y comprobados en Meta local; la migración solo está aplicada allí. No se acredita despliegue alojado ni integración de todos los módulos.

## Incremento de IA integrado desde main

AX-00/AX-01 incorporan propuestas validadas y el adaptador SDK de texto/chat, con aceptación real de texto comprobada. Otros módulos/servicios no se declaran implementados por este cambio. Véanse [contrato](contracts/MODEL_PROPOSAL.md), [AX-00](AX00_VALIDATION.md), [AX-01](AX01_META_TEXT.md) y [registro de rama](WORK_REGISTER.md).

[AX-02](AX02_MULTIMODAL.md) añade el adaptador servidor para fotos, etiquetas y transcripciones, probado con inferencia Meta real sobre [material sintético de demo](demo-assets/ax02/README.md). La carga de archivos autorizada, su conexión al formulario, ASR, video/SAM y Passport mantienen su integración y aceptación separadas.
