# Cinco ramas y cinco PRs de trabajo

Acuerdo de arranque de Cristhian, 27 de octubre de 2026. Este es el manifiesto de ramas de la primera entrega; Linear continúa aplazado. Repositorio de trabajo: `Chujutak2024/meta-hackathon`. Base de arranque: `main` en `6f70f50`.

## Frentes

| Dueño | Rama única | PR y título del frente | Guía | Alcance |
| --- | --- | --- | --- | --- |
| Cristhian | `codex/meta-cristhian` | [#3](https://github.com/Chujutak2024/meta-hackathon/pull/3): Declaración revisada, manifiesto e integración | [Cristhian](prompts/cristhian.md) | CR: formulario, adjuntos, revisión, manifiesto e integración; consume la transcripción de Luis sin reimplementarla |
| Axel | `codex/meta-axel` | [#4](https://github.com/Chujutak2024/meta-hackathon/pull/4): Cliente Meta e interpretación de la declaración | [Axel](prompts/axel.md) | AX-00, AX-01, AX-02, AX-04; ampliaciones solo después del núcleo |
| Juan | `codex/meta-juan` | [#5](https://github.com/Chujutak2024/meta-hackathon/pull/5): Sesiones, Tetris como dashboard y Reality Passport | [Juan](prompts/juan.md) | JU: contrato de sesión, dashboard, comparación y revisión |
| Ramón/Jean | `codex/meta-ramon` | [#6](https://github.com/Chujutak2024/meta-hackathon/pull/6): DockMind, jobs y conteo de carga | [Ramón/Jean](prompts/ramon-jean.md) | RA: clip propio, SAM, contador, worker y evidencia |
| Luis | `codex/meta-luis` | [#7](https://github.com/Chujutak2024/meta-hackathon/pull/7): Voz, explicación y entorno del producto general | [Luis](prompts/luis.md) | AX-09, AX-10, AX-03 del producto general; fuera de la entrega Indie |

Los cinco PR se abrieron como **borradores** el 27 de octubre de 2026. El primer commit prepara las instrucciones del frente; no acredita implementación, pruebas ni acceso a proveedores. Los enlaces y números corresponden a PRs creados, no a reservas de numeración.

## Forma de trabajar

1. Cada persona usa su rama exacta y el mismo PR para los commits de este frente. No crear ramas por historia ni un PR por archivo.
2. Trabajar una historia pequeña a la vez, con sus casos y dependencias; registrar qué está implementado y qué sigue pendiente en el cuerpo del PR.
3. Sincronizar desde `origin/main`, sin force-push ni reescribir trabajo compartido. No traer funcionalidad de otra rama para resolver una dependencia: usar un contrato/fixture explícito o esperar su integración.
4. Solicitar revisión cuando exista un incremento coherente verificable. El dueño corrige los hallazgos; Cristhian autoriza la integración tras el gate pertinente. Los cambios propios de Cristhian los revisa otro integrante habilitado para el alcance Indie.
5. Un merge integra el PR y lo cierra. Los commits que se suban después a esa rama no se integran solos en `main`. Los cinco PR son el acuerdo para estos cinco frentes iniciales, no una promesa de integrar indefinidamente con cinco PR ya cerrados. Si se necesita otro incremento tras un merge, se acuerda antes su vía de integración.

El PR de Cristhian incluye los acuerdos comunes de entrega/reintegración y este manifiesto. Los demás pueden arrancar los contratos, fixtures y módulos de su guía mientras se revisa esa preparación. Antes de integrar funcionalidad, sincronizar las decisiones comunes aceptadas desde `main`.

## Límites entre frentes

| Productor | Consumidor | Qué acordar antes de conectar |
| --- | --- | --- |
| Cristhian | Axel y Juan | Esquema y revisión del manifiesto, campos desconocidos, medios autorizados |
| Axel | Cristhian | Propuesta validada, revisión de entrada, errores y referencias a evidencia |
| Juan | Ramón/Jean | Identidad de sesión/job, unidad, revisión y alcance del vídeo |
| Ramón/Jean | Juan | Observaciones, cruces/timecodes, dirección, incertidumbre e idempotencia |
| Cristhian | Luis | Audio privado autorizado y evidencia/revisión de origen |
| Luis | Cristhian y Axel | Transcripción revisable con evidenceId y errores estables |
| Juan | Luis | Resultado determinístico y evidencia; el modelo no recalcula la diferencia |
| Luis | Juan | Explicación fundamentada y referencias a los eventos recibidos |

Los cinco construyen un único producto general y conectan sus módulos durante el desarrollo. Luis conserva AX-09, AX-10 y AX-03; Cristhian consume sus resultados y no implementa una segunda versión. Ver [objetivo y conexiones](OBJETIVO_Y_CONEXIONES.md). La publicación Indie selecciona un alcance elegible por separado; el trabajo de Luis no se hace elegible por integrarlo desde otra cuenta. La publicación completa posterior conserva el crédito de los cinco según el [acuerdo de reintegración](ENTREGA_Y_REINTEGRACION.md).

No duplicar el cliente IA, los schemas o los cálculos en cada UI. Acordar cambios de contrato con el productor y los consumidores; los directorios preparados no equivalen a APIs disponibles.

## Qué está listo y qué falta

Listo para empezar: base importada, carpetas por módulo, prompts, backlog con IDs, matriz de casos propuestos y reparto de ramas. Las tareas iniciales de viabilidad/contratos P0 sirven precisamente para comprobar los recursos que aún faltan.

Antes de prometer un demo integrado faltan, con su evidencia real:

- Acceso a proveedores/modelos y una llamada válida de cada capacidad usada.
- Contratos ejecutables y fixtures acordados entre productores y consumidores.
- Entorno Meta de datos, hosting y worker autorizado/configurado; repo público y dominio de jueces registrados.
- Implementación de las historias, pruebas pertinentes y evidencia de extremo a extremo.
- Verificación de elegibilidad del código previo en Indie y tratamiento de la inscripción de cuatro integrantes.

Los PR no incorporan credenciales ni crean infraestructura. No se certifica que los cinco tengan sus máquinas, claves o cuentas configuradas solo por abrirlos.

## Despliegue y publicación

`main` integra el producto general. El despliegue continuo del entorno de pruebas se configura y autoriza por separado; abrir estos PR no lo activa por sí solo. Los previews automáticos existentes, si los hay, se identifican por su SHA y no equivalen a producción.

El repositorio público recibe únicamente una candidata revisada conforme al acuerdo de entrega. No hacer un mirror automático del producto de cinco personas hacia Indie. La versión completa de los cinco debe reintegrarse y publicarse al finalizar el evento y su evaluación, conservando créditos y el corte presentado.
