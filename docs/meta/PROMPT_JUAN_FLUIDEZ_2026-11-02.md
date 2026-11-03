# Juan — fluidez técnica, sin rediseño

> Actualización: Cristhian corrigió localmente la duplicación de guards y optimizó Tracking por petición, a solicitud expresa del usuario. No volver a implementar esos dos cambios. Este prompt conserva el diagnóstico original; solo lista→detalle y abort de lecturas siguen pendientes. [Cierre local](pruebas/TRACKING_Y_SESIONES_2026-11-02.md). Estos cambios aún no están en main ni en el PR de Juan.

En el producto Meta local sobre main1f07e8a se revisaron latencia e integración. No hay rediseño solicitado. Nuestros cambios propios de optimización están todavía locales y no aparecerán al hacer pull: evita sobrescribir `operation.tsx`/`operation-read.ts` hasta coordinar el parche de Cristhian.

## Corrección pequeña verificable: middleware duplicado

`src/server/hono/routes/meta/loading-sessions.ts` registra guards para `[base, base+'/*']`. En esta versión de Hono, `/*` cubre la raíz. Reproducción con `createLoadingSessionsRouter` y authenticate contador: GET `/meta/loading-sessions` ejecuta auth2 veces; GET `/:id` una vez. Las API reales mostraron mediana de lista~277–300ms frente a detalle~160ms; no es un benchmark causal, pero el trabajo duplicado está probado.

Registra una sola cobertura de paths, conservando en raíz/subrutas autenticación, Cache-Control private/no-store, Vary, protección de origen, límite32KiB e idempotencia. Añade regresión de conteo del authenticate para raízGET/POST y subruta, y conserva pruebas401/403/413. No quitar la autenticación ni cachearla entre usuarios. En Documentos Cristhian ya corrigió el mismo patrón en su módulo local; no repitas ese cambio.

## Lectura inicial de Tetris

En `operation.tsx`, el efecto inicial espera `loadingApi.list()` antes de abrir la sesión de la URL. La autorización del detalle ya existe del lado servidor: considera iniciar las lecturas independientes sin esperar la lista, conservando epoch/mounted, metadatos de vigencia, permisos y errores. Abortar lecturas obsoletas al cambiar de sesión/unmount evita trabajo innecesario; no abortar y reintentar mutaciones automáticamente ni llamadas pagadas. Prueba respuesta vieja llegando después de una selección nueva y fallo de permisos.

Cristhian ya preparó localmente un helper para leer sesión+historial+Passport seleccionado en paralelo, sin tocar diseño ni comandos. No vuelvas a serializar el Passport ni descartes la versión histórica seleccionada; espera la integración de ese parche o coordina su incorporación.

## Riesgo de escala heredado, separado del incremento anterior

`server/services/v2-workspace/tracking-server.ts` hidrata cada ejecución con request, booking, eventos e incidencias por lotes de4. `features/shipper-portal/tracking-data.ts` añade cadena decisions→plans→routes y consulta offer después de esa cadena. `readRequestChildren` espera cada padre en serie; el flujo de request espera holds tras executions/incidents aunque son independientes.

No existe aquí una prueba de latencia de Tracking con25 ejecuciones: el entorno actual no tiene una operación de este pedido confirmada para medir esa escala. Primero prepara fixture/banco autorizado y cuenta lecturas; luego propone deduplicación por lectura/actor, fan-out acotado y paralelismo de dependencias reales. No uses cache global de datos tenant, ignores scope ni agregues una RPC/migración remota por este prompt. Separa ese trabajo de la corrección pequeña y entrega evidencia antes/después.

Mantén autoría, unidadBOX/PALLET, IDs/revisión e incertidumbre. Rama de Juan desde main vigente, continuación de su frente y sin force-push/merge/deploy automático. [Informe técnico](pruebas/FLUIDEZ_TECNICA_2026-11-02.md).
