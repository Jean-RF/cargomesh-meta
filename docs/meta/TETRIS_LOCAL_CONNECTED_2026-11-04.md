# Tetris local: conexiones verificadas

4 noviembre 2026. Axel asistido por Codex, rama `codex/meta-tetris-ai-integration` de `Jean-RF/cargomesh-meta`.

## Habilitado

- Frontend de este checkout: `http://127.0.0.1:8096`.
- Supabase local aislada: API 64321, PostgreSQL 64322; 57 migraciones y escenario ROAD sintético verificados.
- Lanzador DockMind: `http://127.0.0.1:8765/jobs`, solo loopback, con credenciales locales y callback al frontend 8096. POST sin credenciales: 401.
- Segmentador activo: FIXTURE del clip `sintetico_todas.mp4`, generado en `../meta-local-clips/`. Solo usar ese clip con este fixture; no analiza correctamente un vídeo arbitrario.
- Meta texto/fotos/explicación configurado con la clave local existente. El estado configurado no sustituye aceptación real de cada capacidad.

Las variables de transporte con nombre MODAL_PROXY son credenciales sintéticas locales, no tokens de Modal. Supabase alojada, Vercel y Amazon no fueron modificados. El `.env.local` se mantiene ignorado.

## Recorrido ejecutado

`pnpm e2e:meta-dockmind-launcher` pasó con Auth, Hono, PostgreSQL, Storage y proceso Python reales locales. Segmentación FIXTURE explícita, sin llamada SAM ni cobro.

Ocho etapas verificadas: manifiesto/sesión; registro/subida privada del clip; análisis/entrega de observación; vídeo anotado; repetición de callback/recuperación/despacho sin duplicados; paquete de evidencia; cobertura QA sintética explícita y cierre versionado; comparación con diferencia cero y Passport persistido/reabierto. La lista exacta está en [el recibo](evidence/tetris-local-2026-11-04/recorrido-lanzador.json).

El runner usa su propio puente Hono/puertos temporales, no automatiza el navegador Next8096. El launcher persistente 8765 se comprobó por HTTP para rechazo sin credenciales; la interacción visual completa con ese proceso permanece pendiente. La revisión de cobertura del runner es automatización QA de datos sintéticos, no revisión humana de carga física.

Pruebas adicionales: 55 casos DockMind y seis casos del diagnóstico aprobados. Herramientas ffmpeg/ffprobe preparadas fuera del repo, sin dependencias nuevas del producto. Se permite `DOCKMIND_PYTHON` para seleccionar el venv externo en el runner y `DOCKMIND_E2E_OUTPUT_DIR` para guardar recibos nuevos sin sobrescribir evidencia histórica.

## SAM real pendiente de autorización

La revisión automática rechazó el arranque de SAM real: enviar clips al proveedor y consumir hasta dos llamadas pagadas requería autorización explícita para este paso. No se ejecutó ese arranque ni se eludió el bloqueo. Se solicitó aprobación para dos llamadas sobre clips sintéticos; hasta recibirla, el launcher permanece en FIXTURE.

SAM real no permite afirmar captura física: usar un vídeo sintético con el modelo real sigue siendo SYNTHETIC_RENDER. La validación de clips propios requiere permiso y referencia humana independiente. Explicaciones pagadas nuevas no se ejecutaron en este recorrido.

## Uso seguro

Para comprobar configuración: `pnpm check:tetris-ai --local`. Para repetir E2E: proporcionar en el entorno del proceso `CARGOMESH_LOCAL_SECRETS_PATH` (status JSON privado de esta base), `DOCKMIND_PYTHON` (venv externo), PATH con ffmpeg/ffprobe y `DOCKMIND_E2E_OUTPUT_DIR` para un recibo nuevo. No imprimir el status JSON ni versionar los archivos privados.

El runner prepara y destruye su propio launcher temporal. El launcher persistente 8765 se detiene con Ctrl+C cuando se termine de probar. No activar este modo en Vercel. Para producción sin worker, conservar variables worker vacías y NOT_CONFIGURED.
