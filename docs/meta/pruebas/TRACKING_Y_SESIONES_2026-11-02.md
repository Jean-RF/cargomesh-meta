# Cierre local: sesiones y Tracking — 2 noviembre 2026

El usuario autorizó que Cristhian resolviera aquí los dos pendientes técnicos. Continúa sobre `codex/meta-cristhian`, base `1f07e8a`, preservando la implementación original de sesiones/Passport de Juan. Sin rediseño, cambios comerciales, migraciones, inferencia pagada, commit, push o despliegue.

## Cambios

- Sesiones: Hono ya cubre raíz con `/*`. Se elimina la segunda aplicación de los mismos guards; raíz GET/POST/query y detalle autentican una sola vez. Se mantienen origen, límite32KiB, no-store/Vary y dominio/idempotencia/versiones.
- Tracking lista: validación de las25 ejecuciones antes de hidratar, deduplicación de promesas request/booking dentro de esa lectura autorizada y cuatro trabajadores. Un trabajador libre continúa sin esperar al más lento de un lote; el orden de salida se conserva. Máximo16 llamadas simultáneas al adaptador, sin aumentar el límite anterior.
- Tracking detalle: la cadena booking→decision→plan→route comienza sin esperar eventos/incidencias; offer comienza tras el booking autorizado, en paralelo a esa cadena. Una única lectura de booking, validaciones de alcance/selección/equipo preservadas.
- Ninguna caché global, TTL, reutilización entre usuarios, reintento oculto o sustitución de errores por datos vacíos. Lecturas parciales/desconocidas conservan sus avisos.

## Escala comprobada con fixtures

| Ejecuciones | Pedidos/reservas distintos | Adaptador anterior | Nuevo adaptador |
| ---: | ---: | ---: | ---: |
|25|1|100|52|
|25|5|100|60|
|25|25|100|100|

Cada ejecución conserva dos consultas de hijos; la ganancia depende de compartir referencias. No son conteos SQL ni un benchmark de latencia Supabase: un adaptador puede paginar o autenticar internamente. Los fixtures usan el schema real; no se crearon operaciones comerciales para fabricar un benchmark.

## Verificación

- `test:hac54:h4`:53 aprobadas, cero fallos. Incluye orden, límite de concurrencia, ejecución lenta, tenant/carrier ajenos, duplicados, error403 posterior a una lectura válida y evidencia parcial.
- `test:meta-loading`:43 aprobadas, cero fallos. Incluye auth única y rechazo en raíz por origen/body/contrato antes de comandos de servicio.
- TypeScript `--noEmit --incremental false`:exit0. Arquitectura879 módulos/250 entradas cliente.
- HTTP local real: lista/detalle de sesión, Passport y `/clients/tracking`200; anónimo401, origen externo403, cuerpo excesivo413. [Captura saneada](fluidez-2026-11-02/tracking-sessions-http.json). Primera lectura tras recompilar no se compara como mejora de latencia.

No se midió Tracking alojado con25 ejecuciones, ni render/FPS/navegación en navegador. Lista inicial→detalle/abort y lecturas por padre en el recorrido comercial más amplio quedan separadas. La revisión visual sigue a cargo del usuario. Este cierre local no afirma que main o Vercel contengan estos cambios.
