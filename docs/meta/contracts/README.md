# Contratos entre frentes

CR-01 conecta la [base Hono de manifiestos](MANIFEST_HTTP_CR01.md) con el formulario existente: cinco endpoints, servicio, repositorio y migración aplicada exclusivamente en Meta local. [Pruebas SQL, servicio y recorrido HTTP/navegador](../VALIDACION_CR01_2026-10-28.md) ejecutados; no hay despliegue alojado ni aceptación de consumidores acreditados. Las entregas de Axel y Juan mantienen sus límites.

La [propuesta de flujo, expediente documental y carga](../FLUJO_PEDIDO_DOCUMENTOS_Y_CARGA.md) detalla estados, pantallas, revisión humana, responsables y contratos lógicos pendientes. Distingue documentos reutilizables de Organización, documentos del envío y documentos del carrier. No equivale a un repositorio de archivos implementado ni a una política documental aceptada; su capa nueva requiere revisión antes de ampliar schemas estrictos o guardas comerciales.

La matriz siguiente describe el intercambio requerido. CR-00 ya incorpora un [schema candidato y mapeo de declaración](DECLARED_MANIFEST_CR00.md), pendientes de revisión de consumidores y validación ejecutable. El contrato ModelProposal de Axel está integrado desde main mediante PR #4, con esquema ejecutable y fixtures; no equivale a persistencia ni aceptación real del proveedor. El resto de nombres no acredita tablas o endpoints disponibles. Los schemas compartidos viven en `cargomesh/src/shared/schemas/meta/`, y las mutaciones en los servicios autorizados de cada dueño.

| Contrato | Productor | Campos/relaciones mínimos | Consumidores |
| --- | --- | --- | --- |
| DeclaredManifest | Cristhian | requestId, revisión, grupos/unidad, autor de aprobación | Juan, explicación |
| MediaEvidence | Cristhian / Ramón | id, objeto privado, actor, fuente, hash, vínculo y estado | IA, sesión, worker, Passport |
| OrganizationDocument / revisión (propuesto) | Cristhian | propietario/sujeto, tipo, objeto privado, fechas, revisión y acceso; no aceptación por mera subida | Expediente del envío autorizado |
| DocumentRequirement / versión (propuesto) | Cristhian coordina; operador publica su política autorizada | servicio/corredor, fuente, etapa, responsable, criterios de validez/aplicabilidad | Cliente y Carrier; sin lista universal inventada |
| ShipmentDocumentLink / evaluación (propuesto) | Cristhian | pedido/orden, requisito/versión, documento/revisión, sharing grant y resultado por etapa | Revisión autorizada, orden y Passport restringido |
| ModelProposal | Axel | inputRevision, campos/faltantes, evidenceRefs, modelo | Cristhian |
| Transcription | Luis | evidenceId, revisión, texto no confirmado | Axel, Cristhian |
| LoadingSession | Juan | sede, manifiesto/revisión, operación autorizada opcional, versión, alcance | Ramón |
| AnalysisJob | Ramón | evidencia/sesión, configuración, intento, estado y lease | Juan |
| LoadingObservation | Ramón | unidad, eventos/timecodes, conteo, calidad y cobertura | Juan |
| Reconciliation | Juan | versiones, comparable/motivos, esperado/observado/diferencia | Luis, Passport |
| HumanReview | Juan | conciliación/revisión, actor, decisión y motivo | Passport; incidencia solo con comando autorizado |

Reglas: la fuente tenant es el actor; revisiones e idempotencia se verifican antes de persistir; propuestas antiguas no sobreescriben cambios recientes. La clave de job incluye evidencia/configuración/revisión; procesamiento concluido no significa observación suficiente. El vídeo normalizado guarda su transformación temporal para que un timecode encuentre el frame correcto.

Antes de conectar dos módulos, el productor define el esquema y un fixture de éxito, desconocido y rechazo. Los fixtures viven junto al contrato que realmente los valide; no inventar un resultado de IA en un endpoint productivo. Si el contrato cambia, avisar a consumidores y revisar el delta.

`AnalysisJob` y `LoadingObservation` tienen esquema ejecutable desde el [PR #6](https://github.com/Chujutak2024/meta-hackathon/pull/6), integrado en `main`: `cargomesh/src/shared/schemas/meta/dockmind.ts` (job `dockmind.job.v2` con URLs https; la variante `DockMindLoopbackJobSchema` solo para el lanzador local en 127.0.0.1; resultado `dockmind.result.v2`), fixtures exportados por el worker y la firma del callback en `cargomesh/src/server/modules/analysis-jobs/`. La observación llega a Juan por su `recordLoadingObservation`; no hay un segundo modelo de dashboard. Detalle en `cargomesh/src/server/modules/analysis-jobs/README.md`.

Las APIs Meta viven en [routes/meta](../../../cargomesh/src/server/hono/routes/meta/README.md). CR-01 registra las rutas de manifiestos y acredita su recorrido manual local; las demás entregas no se consideran disponibles por esta estructura.

ModelProposal v1.0 ya tiene implementación, JSON Schema y fixtures integrados desde main: [contrato ejecutable y límites](MODEL_PROPOSAL.md). La conexión con nuestros endpoints y su aceptación real están pendientes; los demás contratos mantienen su estado y dueños.

Preparación de Luis: [voz y explicación v1](LUIS_V1.md), schemas y fixtures propuestos para acuerdo con consumidores. La [auditoría](../LUIS_AUDIT_2026_10_28.md) identifica las conexiones pendientes con medios y Passport; no acredita su persistencia ni autorización de punta a punta.
