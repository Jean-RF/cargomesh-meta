# Plan de datos y medios Meta

Elegir una instancia o entorno independiente autorizado antes de aplicar cambios. No reutilizar por defecto credenciales o datos del demo Amazon. Copiar un repositorio no copia la base alojada.

## Entorno local autorizado el 28-oct

Cristhian eligió una base local aislada para validar CR-01 y el formulario. Proyecto `meta-cr01-validation`: API `127.0.0.1:64321`, DB `127.0.0.1:64322`, frontend `127.0.0.1:8080`. El perfil se mantiene fuera del checkout de desarrollo, en una carpeta hermana `salida/meta-cr01-validation/`, con copia de la configuración V2 y puertos/project_id propios. No usa el volumen de `cargomesh-v2-local` ni resetea otras bases.

Se instaló la cadena V2 y el escenario sintético nativo, con `local_only=1`. El registro de migración, RLS, pruebas y los límites se documentan en [validación CR-01](../../docs/meta/VALIDACION_CR01_2026-10-28.md). `.env.local` del frontend guarda las claves locales y la cuenta sintética solo fuera de Git. La sesión automática nativa evita pedir login al usuario, manteniendo autorización real en Hono/SQL.

Con Supabase CLI 2.117.0, para levantar todos los servicios necesarios de un perfil local se utilizó `supabase start --agent no --workdir <perfil-local>` y se excluyeron componentes no utilizados (Storage, Realtime, Studio, worker y analytics). El modo automático de agente puede levantar únicamente PostgreSQL, que no basta para el frontend. Detener/arrancar solo ese proyecto conserva su volumen; no usar `stop --all`, `--no-backup` ni reset sobre otras bases.

Esta autorización no crea un proyecto Supabase alojado ni aplica migraciones allí. La base local tiene datos de prueba, sin envíos, disponibilidad o contrataciones reales.

La cadena estructural existente sigue en `supabase-v2/supabase/migrations/`; escenarios sintéticos separados en `supabase/scenarios/`. Nuevas tablas de manifiestos, evidencias, sesiones, jobs, observaciones y revisión requieren diseño aditivo, RLS por organización, índices, restricciones y pruebas proporcionales. No modificar SQL histórico aplicado ni insertar demos en migraciones de producción.

Medios: bucket privado, límites de upload, hash/metadata y acceso firmado temporal. Worker con privilegios mínimos; callbacks autenticados, auditados y tolerantes a duplicados. Decidir retención y borrado de originales/derivados. Publicar y ejecutar migraciones remotas requiere aprobación específica y respaldo acorde al cambio.
