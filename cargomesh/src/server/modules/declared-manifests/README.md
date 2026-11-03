# Manifiesto declarado — Cristhian

CR-00 incorpora `domain/prepare-candidate.ts`: mapeo puro de un request completo a un candidato de declaración 0.1, con vínculos explícitos de grupos. Contrato en `src/shared/schemas/meta/declared-manifest.ts`. Es un primer contrato para revisión de consumidores, sin persistencia, confirmación humana ni endpoint registrado.

CR-01 incorpora servicio, repositorio Supabase, cinco rutas Hono y migración para preparar/confirmar/consultar revisiones. El formulario manual está conectado y comprobado por unidad, SQL y HTTP/navegador en Meta local; la migración se aplicó solo en la base aislada elegida por el usuario. El entorno sin RPC devuelve MANIFESTS_NOT_INSTALLED. Contrato en `docs/meta/contracts/MANIFEST_HTTP_CR01.md` y evidencia/límites en `docs/meta/VALIDACION_CR01_2026-10-28.md`, desde la raíz. No hay despliegue alojado ni conexiones de otros módulos acreditados por esto.

Entradas: actor, request, payload canónico, clave de idempotencia y versión esperada. Salida: manifiesto persistido/versionado o conflicto estable. Peso y dimensiones desconocidos siguen desconocidos. No convertir una cantidad estimada desde una foto en confirmación.

Consumidores: sesión de carga y comparación de Juan; interpretación de Axel. Una sesión conserva la revisión del manifiesto que abrió, aunque el request cambie después. Separar repositorio/persistencia, servicio y esquema; acordar el contrato en `docs/meta/contracts/README.md` antes de crear tablas o exports.
