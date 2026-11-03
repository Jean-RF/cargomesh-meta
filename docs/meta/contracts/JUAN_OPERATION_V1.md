# Contrato de consumo: sesiones, Tetris/comparación y Passport

Autoridad de reparto: mensaje corregido del equipo del 30 de octubre. Juan conserva la rama codex/meta-juan; el PR #5 se fusionó durante este trabajo y este incremento se revisa en [PR #8](https://github.com/Chujutak2024/meta-hackathon/pull/8), su continuación. Manifiesto y adjuntos siguen en #3, interpretación en #4, vídeo/conteo en #6 y explicación en #7. Este contrato no reasigna trabajo ni declara un acuerdo humano ya conseguido.

Estado: propuesta implementada del lado de Juan. Compatibilidad se comprueba con las fuentes indicadas; aceptación de los responsables y conexión de sus servicios desplegados pendientes. Un solo producto; Indie no se publica desde este módulo.

## Fuentes comprobadas

| Dueño | Fuente consumida | Revisión examinada |
| --- | --- | --- |
| Cristhian | `meta_declared_manifests_v1`, manifiesto confirmado CR-01 y groupBindings | `e0c55f8fc62df158245630094cd5a01e6a3f08fe` |
| Axel | SDK de Meta ya integrado en main, sin otro cliente en Juan | main `a5c2a4d8c0f4197641d9024f5f22908dd326e9d6` |
| Ramón/Jean | AnalysisJobRecord SUCCEEDED y SessionReader | `bd92f199ca159f0b90e2dab860f24827d1a5dcea` |
| Luis | ReconciliationExplanationInput/Output v1 | `8f7b2ef6b8b41297a849405c014adf14b14f1fd0` |

Las proyecciones Zod de Juan validan los campos que consume, preservando campos adicionales del productor. No sustituyen sus contratos canónicos. El ensamble de ramas para comprobarlos es local, no incorpora la rama de Ramón al incremento de Juan. CR y Luis ya están integrados en main `fff9026`; sus contratos consumidos mantienen el mismo código.

## Sesión y manifiesto

API autenticada `/api/v2/meta/loading-sessions`. Las mutaciones requieren `Idempotency-Key` UUID, membresía activa OWNER/SUPERVISOR y mismo origen para cookies. Lecturas limitadas a la organización; SQL revalida el actor. No hay DML directo sobre las cinco tablas privadas.

Abrir (`POST /`):

```json
{"requestId":"10000000-0000-4000-8000-000000000001","manifestId":"10000000-0000-4000-8000-000000000002","manifestRevision":1,"facilityId":"10000000-0000-4000-8000-000000000003","mode":"VERIFICATION","groups":[{"groupId":"10000000-0000-4000-8000-000000000004","unit":"PALLET"}]}
```

Los IDs son ilustrativos. El servidor lee el manifiesto confirmado del productor, conserva contenido/revisión/hash y comprueba solicitud, organización y contenido material vigente. Aplica el mismo valor por defecto de CR-01 para documentos omitidos (`availableDocuments: []`). Una transición de workflow que sólo incrementa draft_version no invalida carga idéntica. Cada groupBinding recibe explícitamente PALLET o BOX: packageType es texto libre; no se deduce ni convierte. Cantidades/identidades vienen del manifiesto. Planificado permanece desconocido hasta recibir un plan autoritativo, nunca se inventa cero ni asignación.

`GET /`, `GET /:id` devuelven sesiones/lectura y comparación. `POST /:id/observation-selections` requiere expectedVersion, groupId, observationId, coverage PARTIAL/COMPLETE y reason. Una observación se asigna como máximo a un grupo; clips solapados no se suman. `POST /:id/close` requiere expectedVersion. Registrar otra observación o revisar cobertura incrementa versión incluso después del cierre; un Passport anterior permanece histórico.

## Puerto del worker

`createLoadingAnalysisSessionReader(service, member)` se construye por petición autenticada y satisface SessionReader de #6. Devuelve organización, revisión congelada, estado y lista de grupos `{groupId,label,unit}` de la revisión. No crea ni duplica jobs.

Después de verificar HMAC y persistir SUCCEEDED en su repositorio, #6 llama `recordLoadingObservation(writer, savedJob)`. El writer es un cliente servidor con acceso exclusivo a `meta_record_loading_observation_v1` (service_role); no se expone por HTTP del navegador. El puerto valida revisión, ámbito, groupId, unidad, intento, configuración, fuente, conteos y eventos. Conserva reportedCoverage del productor aparte de la cobertura revisada; una observación ligada a un grupo no puede asignarse a otro. Duplicado idéntico conserva IDs; contenido distinto para el mismo intento es conflicto; intento antiguo se reconoce sin reemplazar. VERIFICATION rechaza fixture/inferencia no real; DEMO queda rotulado.

Los IDs job/evidence del productor son strings y se conservan. Juan genera alias UUID inmutables para evidenceRef/eventId porque #7 los exige. Se conserva clipSha256 del resultado; el hash identifica contenido y no acredita autenticidad física. Cada evento conserva objectId, seconds, timecodeMs y timeMapping del productor. No se afirma que el tiempo corresponda al clip original sin esa transformación. Flags, cobertura parcial, neto negativo o intento obsoleto bloquean diferencias concluyentes.

No se añade otro cargador de adjuntos, counter, callback HMAC o cliente SAM. Medios se resuelven mediante el propietario autorizado; los IDs y tiempos pueden consultarse sin fingir un vídeo disponible.

## Passport y explicación

`POST /:id/passports` con expectedVersion sólo permite sesión cerrada. Es inmutable y único por versión; conserva fuente, regla `loading.compare.v1`, autores, tiempos, evidencia y comparación reproducible. `GET /:id/passports` lista revisiones; `GET /:id/passports/:passportId` indica vigencia por sesión y manifiesto. Una diferencia es propuesta de revisión: no reserva, no crea incidencia ni confirma entrega.

`GET /:id/passports/:passportId/explanation-input?groupId=…` proyecta hechos al contrato v1 de #7. No se recalculan cantidades con IA. Rechaza Passport desactualizado y límites incompatibles (>1 millón o >100 eventos), sin truncar hechos. `createLoadingReconciliationAccess` implementa el puerto autorizado de Luis, ligado a actor/Passport/grupo y usando su fingerprint. `recordLoadingExplanation(writer, passport, groupId, result)` consume su salida y valida ámbito/estado/referencias exactas antes de persistirla. No se implementa otra explicación ni se llama automáticamente a un proveedor de pago. La UI distingue explicación recibida de pendiente.

## Ejemplos de estados

| Situación | Lectura |
| --- | --- |
| Sesión abierta, 8 observados de 10 | progreso, delta null |
| Cerrada, cobertura parcial | evidencia insuficiente, delta null |
| Cerrada, completa, 8 de 10 y evidencia válida | DIFFERENCE_PROPOSED, 2 pendientes de revisión |
| PALLET frente a BOX | alcance incompatible; no suma |
| Manifiesto material/revisión cambió | OUTDATED |
| Sin observación o sin plan | desconocido/null |

La instalación de SQL de Juan no instala el manifiesto de #3: ausencia de esa capacidad devuelve 503 MANIFESTS_NOT_INSTALLED. Los endpoints no recurren a fixtures. `/tetris/demo` conserva escenarios sintéticos explícitos para revisión visual.
