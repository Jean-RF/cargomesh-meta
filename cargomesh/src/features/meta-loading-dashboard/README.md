# Tetris: sesiones, dashboard, comparación y Passport

Parte de Juan según el reparto corregido del equipo; cambios en la rama codex/meta-juan y PR #8 como continuación del PR #5 ya fusionado. No se usa el documento de historias anterior como asignación.

`/tetris` es operativo y autenticado: lista/abre/relee sesiones, conserva el manifiesto confirmado y la unidad explícita por grupo, recibe observaciones mediante un puerto servidor, permite revisar cobertura/cerrar alcance y generar/reabrir/exportar Passport. `/tetris/demo` conserva los escenarios sintéticos del dashboard.

La comparación reutiliza `shared/meta/loading-dashboard.ts`: desconocido no es cero, PALLET/BOX separados, sin diferencia concluyente con alcance abierto, evidencia parcial/incierta, fuente incompatible o manifiesto desactualizado. Planificado queda pendiente mientras no exista un plan autoritativo.

La API Hono usa el actor nativo y la migración `20261030060000_meta_loading_sessions.sql`; no hay almacenamiento local del navegador como base de sesiones ni fallback a fixtures. Instalarla sólo en el entorno autorizado; no instala CR-01 ni el worker de otros responsables.

Contrato y ejemplos: [JUAN_OPERATION_V1](../../../../docs/meta/contracts/JUAN_OPERATION_V1.md). Puertos en `server/modules/loading-sessions/producer-ports.ts`: SessionReader de Ramón, recepción de su job guardado, ReconciliationAccess de Luis y almacenamiento de su explicación validada. No se duplican el manifiesto, los adjuntos, el jobservice, el contador ni el SDK.

Pruebas: `pnpm test:meta-loading`, pgTAP `supabase/tests/50_meta_loading_sessions.test.sql` y `scripts/meta-loading-local-integration.ts` (requiere ensamble local con los productores, Auth/DB aislados en 64351, secretos locales fuera de Git y resultados fuera del repo). El script no usa inferencia ni servicios de pago. La prueba positiva de conteo es un fixture explícito; no certifica carga física.

El Passport conserva fuentes/versiones y evidencia temporal, no confirma entrega ni ejecuta reservas o incidencias. Su explicación puede estar pendiente sin impedir revisar los hechos. La reproducción de vídeo necesita el acceso autorizado del dueño de medios; no se inventan URLs. La aceptación humana de contratos y la integración desplegada del equipo siguen separadas de las pruebas locales.
