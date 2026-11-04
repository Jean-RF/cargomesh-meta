# Plan de ejecución: Tetris e IA

Actualización posterior: [SAM real aceptado en local](SAM_REAL_ACCEPTANCE_2026-11-04.md), tras autorización explícita de dos llamadas sobre clips sintéticos. Ambas ejecutadas; recorrido de job a Passport aprobado. Esto resuelve el bloqueo de autorización previo; producción/Modal y captura física continúan fuera del alcance verificado.

Último avance: [conexiones locales verificadas y launcher habilitado](TETRIS_LOCAL_CONNECTED_2026-11-04.md). Sustituye las notas inferiores de falta de ffmpeg/launcher: ya están disponibles. E2E sintético hasta Passport aprobado; SAM real pendiente de autorización explícita, sin Modal ni cambios alojados.

4 noviembre 2026. Responsable de este incremento: Axel asistido por Codex. Rama independiente expresamente solicitada: `codex/meta-tetris-ai-integration`, base `origin/main@c97c59b` de `Jean-RF/cargomesh-meta`. Target previsto: PR a main, sin publicación, merge ni cambios remotos en este incremento. Se conservan las autorías de los módulos existentes.

## Objetivo y aceptación

### Aclaración de entorno y avance local

El usuario confirma que Supabase Meta alojada existe, pero no hay worker Modal ni créditos/acceso para desplegarlo. En producción, las variables worker/callback/proxy permanecen vacías: `NOT_CONFIGURED` es el estado esperado, no una avería que se deba ocultar. La aceptación técnica se hará con `LOCAL_LOOPBACK` y Supabase local; no se pide ni reutiliza la service-role alojada.

Se autorizó crear un entorno Meta local nuevo porque esta máquina no contenía `meta-cr01-validation`. Se preparó fuera del repositorio en `../meta-local-runtime`, proyecto exacto `meta-cr01-validation`, API `http://127.0.0.1:64321` y PostgreSQL 64322. Las 57 migraciones se contrastaron con sus hashes del manifiesto y se aplicaron. Escenario `v2-road-baseline` y su `verify.sql`: aprobados, con guard `local_only=1`. No se encendieron ni modificaron los contenedores legacy.

Frontend de este checkout en `http://127.0.0.1:8096`: el puerto 8080 estaba ocupado y se conservó intacto. Auth local: 200; lectura HTTP de `/api/v2/intake/options` con sesión bearer local: 200. La suite de manifiestos no se declara aprobada: su etapa de sesión automática exige el origen 8080 y respondió `DEMO_DISABLED` en el frontend alternativo; no se relajó esa política de autenticación para superar la prueba. El entorno admite acceso manual. La CLI descargó imágenes oficiales y creó los servicios nuevos, incluido correo local; no es evidencia de worker o SAM.

Configuración exclusivamente local guardada en `cargomesh/.env.local`, comprobado como ignorado por Git. Worker/callback/proxy siguen vacíos. El diagnóstico acepta `pnpm check:tetris-ai --local` para exigir LOCAL_LOOPBACK y Supabase en 127.0.0.1, rechazando producción/Vercel y cualquier Supabase alojada. Seis pruebas focales aprobadas. El launcher todavía no fue iniciado ni se acredita un job completo o SAM real. Faltan herramientas multimedia ffmpeg/ffprobe en PATH y la elección explícita del segmentador para el siguiente paso.

Cerrar manifiesto confirmado → sesión → vídeo → SAM → observación → comparación → explicación/Passport con referencias a la misma organización, grupo, unidad y revisión. Ver [auditoría de producción](AUDITORIA_TETRIS_IA_2026-11-04.md). No reconstruir catálogo ni fábrica 3D.

## Orden de ejecución

| Etapa | Trabajo | Aceptación | Estado |
|---|---|---|---|
| P0.1 | Diagnóstico seguro de configuración | Distingue Meta, transporte worker, firma callback y configuración servidor Supabase; no imprime valores ni consulta red | Implementado localmente, 4 pruebas aprobadas |
| P0.2 | Preparar entorno autorizado | Worker HTTPS/Modal, callback y Supabase Meta, sin credenciales Amazon | Pendiente de configuración por administrador |
| P0.3 | Recorrido de vídeo real | Job desde sesión autorizada, SAM real, overlay, callback y observación sin duplicados | Pendiente P0.2 y clip autorizado con referencia humana |
| P0.4 | Conciliación y explicación | Cobertura revisada, cierre explícito, comparación, explicación Meta y reapertura Passport | Pendiente observación compatible |
| P1 | Plan operativo persistente | Contrato versionado, permisos, idempotencia y validación servidor; alimentar Planificado | Pendiente diseño/implementación; la vista previa no se presenta como plan guardado |
| P2 | Asistente contextual y multigrupo | Lectura autorizada y propuesta con grupo explícito, sin decisiones comerciales automáticas | Después del recorrido núcleo |

## Primer resultado y reproducción

Desde `cargomesh/`: `pnpm check:tetris-ai`. Salida saneada; código 2 significa configuración incompleta y código 0 solamente listo para probar integración. No certifica acceso al modelo, migraciones, permisos, cuenta, endpoints, SAM ni despliegue. `pnpm test:tetris-ai-readiness` ejecuta las pruebas de esta frontera.

Se ejecutó el diagnóstico usando en memoria el `.env.local` existente del checkout Meta anterior, sin copiarlo ni mostrarlo: Meta configurado; transporte worker, firma de callback y configuración Supabase servidor ausentes. No permite concluir qué variables existen en Vercel. La clave Meta no crea ni despliega un worker.

El administrador debe completar el `.env.local` ignorado de esta carpeta con las variables requeridas por el contrato existente: `DOCKMIND_WORKER_URL`, `DOCKMIND_CALLBACK_URL`, `MODAL_PROXY_TOKEN_ID`, `MODAL_PROXY_TOKEN_SECRET`, `DOCKMIND_CALLBACK_SECRET`, `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, además de Meta. Nunca enviar valores al chat o al repositorio. Para la prueba alojada el callback debe ser accesible al worker; no sustituirlo por localhost. Un diagnóstico local de presencia no prueba aislamiento RLS ni acceso efectivo a Storage.

## Límites y evidencia pendiente

No se ejecutaron jobs, inferencia pagada, subidas, callbacks ni mutaciones comerciales en este incremento. No se instalaron migraciones remotas, crearon cuentas ni cambiaron proyectos Vercel/Modal. Antes de ejecutar P0.3 se requiere vídeo autorizado, referencia independiente y configuración del entorno correcto. Las pruebas con fixtures permanecen rotuladas; la referencia evalúa el conteo, no se manda como respuesta esperada al modelo.
