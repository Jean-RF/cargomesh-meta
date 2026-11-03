# Contratos compartidos Meta

CR-00 incorpora `declared-manifest.ts`: candidato de declaración 0.1 y vínculos entre unidades del request e identidades de grupo. Está propuesto para revisión de consumidores; no implementa confirmación ni persistencia.

CR-01 añade `manifest-commands.ts`: comandos de preparación/confirmación, snapshot confirmado y paginación. Backend, SQL y formulario manual comprobados en Meta local; migración aplicada únicamente en ese entorno. Evidencia en `docs/meta/VALIDACION_CR01_2026-10-28.md` desde la raíz. `MediaEvidence`, `Transcription`, `LoadingSession`, `Reconciliation` y `HumanReview` conservan su entrega independiente.
ModelProposal v1.0 está integrado desde main mediante PR #4 de Axel: Zod ejecutable en `model-proposal.ts` y JSON Schema/fixtures en `docs/meta/contracts/`. Incluye fuentes, revisión de entrada, faltantes, advertencias, errores y metadatos. Su conexión con el manifiesto y aceptación real del proveedor siguen pendientes.
`dockmind.ts` define `AnalysisJob` y `LoadingObservation` (`dockmind.job.v2` y `dockmind.result.v2`), con fixtures exportados por el worker en `fixtures/`. Viene del PR #6 de Ramón/Jean, abierto y sin merge a `main`.

Las capacidades restantes de MediaEvidence, Transcription, LoadingSession, Reconciliation y HumanReview conservan sus productores y dependencias de `docs/meta/contracts/README.md`; estos contratos no las implementan.

Las propuestas no equivalen a datos confirmados. Actor, autorización, versiones e idempotencia siguen en los servicios de dominio. Todos los fixtures de IA se rotulan sintéticos; una prueba inyectada no es una respuesta real del proveedor.

`loading-dashboard.ts` añade la proyección de lectura v1 de Juan y fixtures sintéticos. La adaptación con el manifiesto y las observaciones requiere acuerdo de consumidores; no implementa sesiones persistidas ni Passport.
Luis añade `transcription.ts`, `reconciliation-explanation.ts` y `explanation-plan.ts`: schemas v1 propuestos para revisión de consumidores. Voz y explicación componen el cliente de Axel; no implementan endpoints, almacenamiento, comparador ni Passport. Véanse `docs/meta/contracts/LUIS_V1.md` y `docs/meta/AX03_EXPLANATION.md`.
