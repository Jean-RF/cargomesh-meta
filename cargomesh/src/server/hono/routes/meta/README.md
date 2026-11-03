# Adaptadores HTTP Meta — propietarios de cada módulo

CR-01 incorpora `declared-manifests.ts`, registrado en la composición Hono: preparación, confirmación, vigente, historial y lectura por ID del manifiesto. Conectado al formulario y comprobado en Meta local, con migración aplicada únicamente allí; un entorno sin RPC devuelve MANIFESTS_NOT_INSTALLED. Ver contrato en `docs/meta/contracts/MANIFEST_HTTP_CR01.md` y evidencia en `docs/meta/VALIDACION_CR01_2026-10-28.md` desde la raíz. No hay aplicación alojada o aceptación de otros módulos acreditadas.

DockMind (Ramón/Jean) registra `dockmind.ts` en el PR #6, abierto y sin merge a `main`: clips privados, jobs, reintento, recuperación de la entrega y callback firmado del worker. Probado con Hono y con la Supabase local; sin base alojada ni Modal desplegados. Ver `cargomesh/src/server/modules/analysis-jobs/README.md`.

Rutas futuras separadas: propuestas de declaración/voz, medios autorizados, documentos organizacionales, sesiones, jobs de análisis, reconciliación y revisión humana. Concretar método/path/schema y errores junto con el dueño antes de registrar un handler.

Autenticar actor y organización; validar input, tamaño y permisos; delegar a servicios compartidos; mantener idempotencia y versión esperada. Jobs largos responden con identidad/estado consultable; no bloquear una petición Vercel durante el vídeo completo. Ver `docs/meta/contracts/README.md`.
