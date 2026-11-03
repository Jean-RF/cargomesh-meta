> Guía activa para juan. Leer primero [contexto común](00-contexto-comun.md), [estructura](../../../ESQUEMA_PROYECTO.md) y [AGENTS](../../../AGENTS.md). Las historias y APIs descritas siguen pendientes salvo evidencia de implementación. Los prompts recibidos se preservan en `docs/meta/reference/prompts-recibidos/`.

# Juan — dueño de operación

## Rama y PR de este frente

- **Responsable:** Juan.
- **Rama fija:** `codex/meta-juan`; base de arranque `origin/main` en `6f70f50`.
- **PR:** borrador a `main` del repositorio de trabajo `Chujutak2024/meta-hackathon`, titulado «Sesiones, dashboard y Reality Passport».
- **Alcance:** JU: núcleo de sesión, dashboard, comparación y revisión.
- **Vínculos:** Consume manifiesto de Cristhian y observaciones de Ramón/Jean; produce contexto de job y hechos determinísticos para explicación.
- Mantener este PR abierto mientras se construye el frente; varios commits y una historia activa a la vez. Un PR mergeado queda cerrado y no integra automáticamente commits posteriores.
- Este commit prepara instrucciones: no implementa funciones ni acredita pruebas, credenciales o despliegues.

Los acuerdos comunes y el manifiesto de ramas se preparan en la rama de Cristhian. Leer [el manifiesto](https://github.com/Chujutak2024/meta-hackathon/blob/codex/meta-cristhian/docs/meta/PR_INTEGRANTES.md) y [el acuerdo de entrega/reintegración](https://github.com/Chujutak2024/meta-hackathon/blob/codex/meta-cristhian/docs/meta/ENTREGA_Y_REINTEGRACION.md). Antes de integrar funcionalidad, sincronizar las decisiones aceptadas desde `main`.

Este frente corresponde a la entrega Indie de Cristhian, Axel, Juan y Ramón/Jean. Mantener separada la aportación de Luis al producto general; conservar procedencia y autoría reales.


Eres dueño de la **operación**: sesión de carga, dashboard, conciliación y Reality Passport. También montas el proyecto Supabase de Meta, con sus migraciones, RLS y el bucket privado. Tus historias empiezan con **JU**.

## Cómo usar este archivo con tu agente

1. Tu agente debe leer `00-contexto-comun.md` y este archivo (ya están en `docs/meta/prompts/`).
2. Usa el prompt de abajo cambiando `<ID>`; conserva la rama fija del frente y añade los commits al mismo PR abierto.
3. Revisa el plan de 5 líneas que te devuelva antes de dejarlo implementar.

## Prompt para tu agente

```text
Eres el agente de código de Juan (dueño de operación: sesión de carga, dashboard, conciliación y Reality Passport) en CargoMesh, para el hackathon de Meta, track Indie. Repo: Chujutak2024/meta-hackathon.

Historia: <ID>. Rama fija: codex/meta-juan, basada en origin/main de meta-hackathon. Usa el mismo PR del frente; no abras otra rama por historia. El PR va a main de meta-hackathon. No hagas push directo a main ni modifiques el repositorio Amazon.

Antes de escribir código:
1. Lee AGENTS.md, docs/meta/prompts/00-contexto-comun.md y docs/meta/prompts/juan.md (sección de la historia <ID>).
2. Resúmeme en 5 líneas qué vas a cambiar, la entrada y la salida con un ejemplo, los casos negativos y los archivos que vas a tocar. Espera mi OK.

Mientras implementas:
- Trabaja solo en <ID>. Si necesitas algo de otra historia, usa el fixture del contrato y avísame.
- Migraciones solo aditivas, en supabase-v2/supabase/migrations/, con el formato de nombre YYYYMMDDHHMMSS_descripcion.sql y registradas como pidan supabase-v2/migration-manifest.json y supabase-v2/gate.py. Toda tabla nueva lleva organization_id, RLS con private.is_organization_member(organization_id) y una prueba pgTAP.
- Nunca ejecutes supabase db push sin --dry-run primero, y confirma que el project ref es el de Meta, nunca el de Amazon.
- La organización sale del usuario autenticado. Toda mutación usa Idempotency-Key y versión esperada; el conflicto es 409.
- La conciliación es una función pura y determinística. El modelo solo explica; nunca calcula la diferencia ni cambia estados.
- Abrir una sesión no crea una ejecución comercial. Una incidencia solo se crea con el comando existente y después de que una persona confirma.
- Nunca pintes un cero desconocido como cero confirmado: lo que no se sabe se muestra como pendiente.

Al terminar:
- Corre las pruebas unitarias de la historia, las pgTAP de tus tablas y test:carrier-operations y test:logistics si tocaste Carrier o 3D; pega el resultado real.
- Entrégame el resumen del diff, los comandos con su resultado, los límites y lo que queda pendiente.
- Propón la línea para BUILT_DURING_HACKATHON.md.
- No hagas push, merge, db push ni deploy sin que te lo pida.
```

## Tu paquete

- **Produces:** `loading_session`, `reconciliation`, `human_review` y la lectura del dashboard.
- **Consumes:** `declared_manifest` de Cristhian, `analysis_job` y `loading_observation` de Ramón/Jean, y la explicación de Luis.
- **Te consumen:** Ramón/Jean (el worker necesita tu sesión) y Luis (explica tus hechos calculados).
- **Revisas a:** Cristhian (el manifiesto sirve para abrir la sesión). **Te revisa:** Ramón/Jean.
- **Riesgo conocido:** tu paquete es el más cargado. Haz primero el dashboard mínimo. Si Cristhian va al día, puede tomar la vista del Passport del lado Cliente.

## Plan día por día

| Día | Qué entregas |
| --- | --- |
| 27 oct (P0) | JU-00: qué muestra el dashboard y contratos de sesión, conciliación y revisión, con fixtures. JU-12: proyecto Supabase, migraciones existentes aplicadas, escenario de demo, tablas nuevas y bucket |
| 28 oct (I1) | JU-01: dashboard con datos reales del manifiesto |
| 29–30 oct (I2) | JU-02: abrir y cerrar sesiones de carga desde la sede |
| 31 oct–1 nov (I3) | JU-03: conciliación y Reality Passport con revisión humana |
| 2–3 nov (I4) | JU-04: permisos, estados y respuesta percibida |

## Notas técnicas

### JU-12: Supabase

1. Confirma que hay cupo (el plan gratis permite 2 proyectos activos por organización) y crea `cargomesh-meta` en la misma región que el original.
2. Desde `supabase-v2/`, ejecuta `supabase link --project-ref <ref>`, después `supabase db push --dry-run` y, si cuadra, `supabase db push`.
3. Carga el escenario sintético de `supabase/scenarios/v2-*` y la organización de demo (ver `docs/DATA.md`).
4. Crea la migración nueva con las tablas de la sección 7 del contexto común. Cada tabla lleva `organization_id`, las políticas con `private.is_organization_member(organization_id)` (o `private.has_organization_role` para acciones de supervisor) y sus índices.
5. Bucket privado en la misma migración:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meta-evidence', 'meta-evidence', false, 52428800,
        array['image/jpeg','image/png','image/webp','audio/wav','video/mp4','video/quicktime']);
```

6. Políticas sobre `storage.objects` como segunda barrera: lectura y escritura solo en la carpeta de la organización del usuario, usando `storage.foldername(name)`. El flujo normal usa URLs firmadas que emite el servidor después de validar al usuario.
7. Usa las claves nuevas: `sb_publishable_…` para el navegador y `sb_secret_…` solo en servidor y worker. Se las pasas a Luis (Vercel) y a Ramón/Jean (Modal) por un canal privado, nunca por el repo.

### Sesión de carga

- Es un módulo nuevo, por ejemplo `src/server/modules/loading-sessions/`, con sus rutas Hono.
- Úsalo junto a `depot-operations` en lugar de modificarlo.
- Una sesión guarda sede, manifiesto con su versión, operación opcional, estado y versión.
- Si no hay operación autorizada, la sesión se rotula como escenario de demo.
- "Cerrar alcance" requiere la versión esperada. Una sesión abierta muestra progreso, nunca faltantes.

### Conciliación (función pura)

| Situación | Resultado |
| --- | --- |
| Sin observación o sesión abierta | NOT_READY (con progreso si hay datos) |
| Unidad del manifiesto distinta de la observada | INCOMPATIBLE_SCOPE |
| Observación con dudas o cobertura incompleta | INSUFFICIENT_EVIDENCE |
| Manifiesto cambió después de la sesión | OUTDATED |
| Esperado igual a observado | MATCH |
| Esperado distinto de observado | DIFFERENCE_PROPOSED, con diferencia = esperado − observado |

Ponla en un archivo compartido sin dependencias del servidor, con pruebas `node:test` para cada fila de la tabla.

### Dashboard

- Cuatro indicadores: declarado, planificado, observado y pendientes de revisión, cada uno con su unidad.
- Un porcentaje solo se muestra cuando el denominador es conocido y mayor que cero.
- Reutiliza `carrier-kpis.tsx` y `dashboard-model.ts`. El 3D solo se carga si alguien abre esa vista.
- El estado del job se consulta cada 3 s hasta que termina. Si sigue en QUEUED después de 2 minutos, aparece el botón "Reintentar".

### Reality Passport

- Línea de tiempo con las fotos y el audio de la declaración, el manifiesto confirmado, el clip, el video anotado de Ramón/Jean, los eventos de cruce con su segundo, la explicación de Luis y la revisión humana.
- Tocar un evento salta al segundo exacto del video anotado.
- Confirmar o descartar pide un motivo, usa versión esperada e Idempotency-Key, y confirmar dos veces no crea dos incidencias.

## Tus historias

Compromiso MUST: 6 historias, 12 horas.

### JU-00 · Definir snapshot del dashboard y vínculos de sesión

Sprint P0 · MUST · 0,5 h · Depende de: nada · La usan: JU-01

- **Objetivo:** Fijar qué decisiones permitirá el dashboard y qué hechos se pueden calcular con datos existentes.
- **Lógica:** Cada KPI declara universo, unidad y procedencia. Sede, capacidad registrada, reserva y carga observada siguen siendo hechos separados.
- **Backend:** Definir sesión/manifiesto/observación/revisión; una dependencia no concede permisos a otro tenant.
- **Frontend:** Esbozar cabecera de sesión, KPIs, comparación y panel de evidencia; evitar un segundo dashboard general.

Pruebas unitarias:

- JU-00-UT-01: Capacidad desconocida -> porcentaje nulo.
- JU-00-UT-02: Cero observaciones -> no equivale a carga cero confirmada.
- JU-00-UT-03: Sede sin operación -> sesión de demo rotulada.

Aceptación:

- Snapshot acordado con Cristhian y Ramón.
- Propiedad de tablas/módulos anotada.

Archivos de partida:

- `cargomesh/src/features/carrier-juan/dashboard-model.ts`
- `cargomesh/src/features/logistics-3d/depot-arrival.tsx`

Evidencia para el PR: Mapa de entidades y boceto anotado, sin afirmar revisión visual del producto.

### JU-12 · Proyecto Supabase de Meta, migraciones y bucket privado

Sprint P0 · MUST · 1,5 h · Depende de: CR-09 · La usan: RA-10

- **Objetivo:** Base de datos y archivos aislados de Amazon para la versión Meta.
- **Lógica:** Proyecto nuevo; migraciones de supabase-v2 aplicadas con dry-run previo; escenario sintético de demo; claves publicable y secreta nuevas.
- **Backend:** Migración aditiva con las tablas nuevas y RLS, bucket privado meta-evidence (imagen, WAV, MP4/MOV, 50 MB) y políticas en storage.objects por carpeta de organización.
- **Frontend:** No aplica.

Pruebas unitarias:

- JU-12-UT-01: Usuario de otra organización -> no lee ni sube en la carpeta ajena.
- JU-12-UT-02: MIME no permitido -> rechazado por el bucket.
- JU-12-UT-03: Migraciones nuevas -> pgTAP de RLS en verde.

Aceptación:

- Migraciones existentes y nuevas aplicadas en el proyecto Meta.
- La base de Amazon no recibe ningún cambio.

Archivos de partida:

- `supabase-v2/supabase/config.toml`
- `docs/DATA.md`

Evidencia para el PR: Salida de db push --dry-run y lista de migraciones aplicadas, sin claves.

### JU-01 · Mostrar dashboard operativo de carga con snapshot real

Sprint I1 · MUST · 2 h · Depende de: JU-00, CR-01 · La usan: JU-02, JU-05

- **Objetivo:** Dar al operador un resumen útil del envío sin depender del motor 3D ni de la inferencia.
- **Lógica:** Mostrar cantidad declarada, planificada y observada con unidades. Capacidad de peso/volumen solo cuando fuente y asignación sean completas.
- **Backend:** Construir read model acotado a la sesión/operación; no leer toda la flota por cada refresco. Conservar campos desconocidos como null.
- **Frontend:** Crear dashboard: cabecera de sesión, 4 KPIs, filas por vehículo/grupo y panel de comparación. Los fixtures de desarrollo se rotulan.

Pruebas unitarias:

- JU-01-UT-01: Denominador nulo o cero -> sin porcentaje.
- JU-01-UT-02: Paginación parcial -> no presentar total global.
- JU-01-UT-03: Diferencia de monedas -> no sumar importes.
- JU-01-UT-04: Actualización sin datos nuevos -> conservar snapshot anterior.

Aceptación:

- El operador identifica qué está declarado y qué falta observar.
- No se presenta el reparto existente como acomodo 3D probado.

Archivos de partida:

- `cargomesh/src/features/carrier-juan/carrier-kpis.tsx`
- `cargomesh/src/features/carrier-juan/dashboard-model.ts`

Evidencia para el PR: Snapshot de lectura con origen de cada KPI y demostración con un input incompleto.

### JU-02 · Abrir sesión de carga desde sede y operación autorizadas

Sprint I2 · MUST · 3 h · Depende de: JU-01, CR-01 · La usan: RA-02, CR-03, JU-03, RA-03

- **Objetivo:** Conectar el dashboard con un contexto operativo persistido.
- **Lógica:** Una sesión referencia sede, manifiesto y revisión; booking/ejecución son opcionales solo para un escenario rotulado, nunca se inventan. Abrir sesión no inicia una ejecución comercial.
- **Backend:** Crear servicio/repositorio de sesión con RLS, validación de relaciones y versión. Acordar estados y comandos open/close con Ramón; migraciones aditivas en entorno Meta autorizado.
- **Frontend:** Entrada desde sede o detalle de orden; mostrar manifiesto congelado, fase y botón de cerrar alcance. Si no hay operación mostrar condición de escenario.

Pruebas unitarias:

- JU-02-UT-01: Sede/operación de tenants distintos -> rechazo.
- JU-02-UT-02: Manifiesto sin confirmar -> no abrir sesión evaluable.
- JU-02-UT-03: Doble apertura idempotente -> una sesión.
- JU-02-UT-04: Cerrar con versión obsoleta -> conflicto.

Aceptación:

- Request, sede y sesión conservan vínculos correctos al reabrir.
- Juan entrega contrato estable que usa el worker.

Archivos de partida:

- `cargomesh/src/server/modules/depot-operations/application/depot-service.ts`
- `cargomesh/src/features/logistics-3d/depot-arrival.tsx`

Evidencia para el PR: Secuencia de apertura/reapertura/cierre y caso de asociación prohibida con IDs redactados.

### JU-03 · Conciliar y mostrar Reality Passport dentro del dashboard

Sprint I3 · MUST · 3 h · Depende de: JU-02, RA-02, CR-03 · La usan: AX-03, JU-04, JU-07

- **Objetivo:** Convertir declaración y observación en una revisión humana trazable.
- **Lógica:** Comparar solo unidades/alcances compatibles. Evaluar faltante al cierre; un clip incompleto produce revisión. Evidencias y decisiones conservan autor y tiempo.
- **Backend:** Comparador puro y servicios de conciliación/revisión; guardar evidencia y observaciones por referencia sin duplicar archivos. Usar comandos de incidencia existentes solo tras confirmación autorizada.
- **Frontend:** Panel declarado/planificado/observado; timeline con timecodes, visor y confirmar/descartar con motivo. Estados vacíos no se pintan como cumplimiento.

Pruebas unitarias:

- JU-03-UT-01: 12 vs 11 con alcance completo -> diferencia 1.
- JU-03-UT-02: 12 vs 11 en sesión abierta -> progreso.
- JU-03-UT-03: Sin observación -> desconocido.
- JU-03-UT-04: Confirmación repetida -> una revisión; doble incidencia evitada.

Aceptación:

- El operador puede inspeccionar evidencia y confirmar/descartar.
- Passport persiste y respeta tenant.

Archivos de partida:

- `cargomesh/src/features/shipper-portal/tracking-data.ts`
- `cargomesh/src/shared/schemas/v2/workflow.ts`

Evidencia para el PR: Ensayo de caso completo/discrepancia/insuficiente y registros con referencias, sin datos personales.

### JU-04 · Cerrar permisos, estados y respuesta percibida del dashboard

Sprint I4 · MUST · 2 h · Depende de: JU-03 · La usan: CR-10, RA-11, JU-11

- **Objetivo:** Conseguir una lectura clara y estable al actualizar o revisar evidencias.
- **Lógica:** Conservar el último snapshot durante refresh, invalidar acciones obsoletas y no cargar vídeo/3D hasta necesitarlo.
- **Backend:** Acotar queries a sesión y lecturas autorizadas; revalidar versión antes de confirmar. Índices/RLS con pruebas proporcionales si hay migraciones.
- **Frontend:** Loading inicial, vacío, actualizado/en curso, parcial y error; controles coherentes y accesibles; panel de evidencia cargado bajo demanda.

Pruebas unitarias:

- JU-04-UT-01: Refresh fallido -> conserva snapshot con aviso.
- JU-04-UT-02: Actor ajeno -> sin datos.
- JU-04-UT-03: Snapshot obsoleto -> acción bloqueada/conflicto.
- JU-04-UT-04: Clip inexistente -> estado honesto sin pantalla rota.

Aceptación:

- Dashboard muestra qué se sabe y qué está pendiente.
- Ensayo del caso final sin mutaciones inesperadas.

Archivos de partida:

- `cargomesh/src/features/carrier-navigation/background-refresh.tsx`
- `cargomesh/src/features/carrier-juan/carrier-kpis.tsx`

Evidencia para el PR: Revisión de lectura, permisos y ruta de entrada/salida con estado conservado.

### Ampliaciones (solo si sobra capacidad)

No se empiezan sin acuerdo en la daily. El detalle está en `docs/meta/backlog/BACKLOG_SCRUM.csv`.

| ID | Prioridad | Horas | Historia |
| --- | --- | --- | --- |
| JU-05 | SHOULD | 3 | Desglosar capacidad por vehículo y grupo |
| JU-06 | SHOULD | 4 | Editar acomodo 2D con validación |
| JU-07 | SHOULD | 2 | Filtrar y navegar sesiones del dashboard |
| JU-08 | COULD | 6 | Visualizar acomodo físico en 3D |
| JU-09 | COULD | 3 | Mover unidades con drag and drop |
| JU-10 | COULD | 6 | Optimizar reparto entre varios equipos |
| JU-11 | COULD | 2 | Exportar un Passport revisado |
