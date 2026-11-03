# CR-01: base backend de declaración manual mediante Hono

27-oct-2026. Cristhian. Rama `codex/meta-cristhian`, PR #3.

**Estado al 28-oct:** backend y formulario conectados en `codex/meta-cristhian`, PR #3. Migración aplicada únicamente en la base local aislada `meta-cr01-validation`; servicio, cliente, SQL y recorrido HTTP/navegador comprobados. Véase [evidencia y límites](../VALIDACION_CR01_2026-10-28.md). No acredita despliegue alojado, contratación real o integración de Axel/Juan; sus entregas y revisiones siguen separadas.

## Alcance

Reutiliza el pedido V2 válido ya guardado. Añade preparación de revisión, confirmación de un snapshot inmutable, historial y lectura. Crear/revisar/enviar el pedido continúa utilizando sus comandos nativos. Esta base no guarda un FreightRequest incompleto ni combina transaccionalmente la creación del pedido y la confirmación del manifiesto.

Guardar un request DRAFT no significa tener un manifiesto confirmado. Si falla esta confirmación, se conserva el requestId y se puede reintentar el mismo mandato. La confirmación no cambia `draftVersion` ni estado del request y no crea ofertas, Booking, reservas, sesión, incidencia o salida. Tampoco aprueba documentos del perfil o del envío.

## Rutas registradas

Prefijo real `/api/v2`. En todos los casos `requestId` es UUID del pedido, no su código visible.

| Método y ruta | Entrada | Salida |
| --- | --- | --- |
| `POST /freight/requests/:requestId/declaration-preparations` | expectedDraftVersion, expectedManifestRevision y grupos cuando corresponda | Preparación persistida, candidato, contentHash, vencimiento y recibo |
| `POST /freight/requests/:requestId/declared-manifests` | preparationId, las dos versiones esperadas, contentHash y confirmed=true | Snapshot confirmado con id/revisión, actor y fecha |
| `GET /freight/requests/:requestId/declared-manifests/current` | Sin body | Último confirmado o null; versión actual del request y matchesCurrentRequest |
| `GET /freight/requests/:requestId/declared-manifests` | limit=1..100, offset=0..1000000; defaults 20/0 | Historial descendente por revisión y nextOffset |
| `GET /freight/requests/:requestId/declared-manifests/:manifestId` | UUID del snapshot | Esa revisión exacta, no sustitución automática por la última |

POST nuevo devuelve 201; replay devuelve 200. GET devuelve 200, incluidos expediente sin confirmaciones e historial vacío. Errores conservan el envelope V2; respuestas exitosas nuevas usan `schemaVersion: 0.1`. Cache-Control privado/no-store. El middleware se limita a estas rutas; no aplica una política global nueva al resto de endpoints.

### Preparar la primera revisión

Ejemplo sintético, **no ejecutado**:

```json
{
  "expectedDraftVersion": 1,
  "expectedManifestRevision": 0
}
```

`Idempotency-Key` es un UUID nuevo. El servidor carga el snapshot persistido y asigna UUIDs a todos los grupos. No acepta organización, cargo, totales, estatus o confirmación suministrados por el modelo/navegador en este body.

La preparación no es aún un manifiesto confirmado. Expira a los 30 minutos. Un replay devuelve exactamente la preparación original, aunque haya vencido; no renueva su ventana. Para revisar contenido otra vez tras cambios o vencimiento se prepara con una clave nueva y datos vigentes.

### Confirmar lo que se revisó

Usar otra clave idempotente para este comando. El paso 4 del formulario muestra el candidato y exige marcar su revisión antes de invocarlo; editar el borrador o vencer la preparación invalida ese consentimiento.

```json
{
  "preparationId": "80000000-0000-4000-8000-000000000001",
  "expectedDraftVersion": 1,
  "expectedManifestRevision": 0,
  "contentHash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "confirmed": true
}
```

IDs y hash son ilustrativos; se usan los devueltos por la preparación real. El backend verifica actor, organización, pedido, versiones, misma persona preparadora, vencimiento y hash revisado. El SHA-256 canónico vincula el contenido; no prueba autenticidad física ni firma legal del usuario.

La autoridad de confirmación reutiliza la guarda de escritura del workflow: OWNER/SUPERVISOR activos. REQUESTER puede leer/preparar, pero no confirmar con esta política inicial. Un supervisor prepara su propia revisión cuando deba confirmar; no suplanta la preparación de otro miembro. Cualquier ampliación de permisos requiere decisión explícita y revisión de su guarda.

### Grupos y correcciones

Desde la segunda revisión se exige un mapa explícito completo:

```json
{
  "expectedDraftVersion": 2,
  "expectedManifestRevision": 1,
  "groups": [
    {"sourceUnitIndex": 0, "groupId": "50000000-0000-4000-8000-000000000002"},
    {"sourceUnitIndex": 1, "groupId": "50000000-0000-4000-8000-000000000001"},
    {"sourceUnitIndex": 2, "groupId": null}
  ]
}
```

Ejemplo de tres grupos en el request actual: dos conservan identidad tras reordenarse; null solicita identidad nueva para el tercero. El servidor no deduce identidad a partir de posición o contenido. Solo acepta UUIDs de la última revisión confirmada del mismo pedido; no importa grupos de otro pedido/tenant ni revive un grupo retirado de forma implícita. Los bindings devueltos se ordenan por índice.

Una confirmación como máximo por requestDraftVersion; otra clave no produce una segunda confirmación del mismo contenido. La corrección comienza con la revisión nativa del request mientras sea DRAFT, seguida de preparación y confirmación nuevas. Un request enviado/reservado no puede editarse mediante este comando DRAFT.

`matchesCurrentRequest=false` indica que la versión del request avanzó; no significa que el manifiesto histórico se haya modificado. La presentación debe distinguir una revisión material de una transición de estado que también incremente draftVersion. La base no compara semánticamente ambos casos ni invalida automáticamente sesiones/órdenes.

## Capas y persistencia

- Schemas: `cargomesh/src/shared/schemas/meta/manifest-commands.ts`; conservan el candidato CR-00.
- Servicio: `cargomesh/src/server/modules/declared-manifests/application/manifest-service.ts`. Valida comandos y resultados/scope; sin efectos comerciales ni llamadas de IA.
- Repositorio Supabase: `.../infrastructure/supabase-manifest-repository.ts`. Cliente existente con identidad del usuario; sin service key ni fallback a memoria. Puente tipado estrecho para RPC nuevo hasta regenerar los tipos.
- Adaptador Hono: `cargomesh/src/server/hono/routes/meta/declared-manifests.ts`, registrado en `app.ts`.
- Migración aplicada **solo en Meta local**: `supabase-v2/supabase/migrations/20261028041227_meta_declared_manifest_commands.sql`. Registrada en su inventario con hash y dependencias; ninguna base alojada fue modificada.

La migración prepara tablas privadas con RLS y sin privilegios directos de cliente para grupos, preparaciones, manifiestos y recibos. El RPC público es SECURITY INVOKER; su implementación privada SECURITY DEFINER necesita acceso transaccional a esas tablas y valida auth.uid/membresía/organización mediante la guarda nativa. No concede permiso a anon o service_role. Confirmación/preparación bloquean el request para serializarse con sus revisiones; ninguna llamada externa ocurre bajo ese lock.

El hash del comando incluye acción, requestId y payload canónico. El recibo se resuelve antes de las comprobaciones de versiones para que un reintento exitoso siga funcionando después de avanzar el request. Una clave con contenido/acción/pedido distintos falla. Snapshot y recibo se escriben en la misma transacción; una preparación conserva su propio recibo y UUIDs. Una preparación abandonada no se convierte en manifiesto ni habilita carga real.

Los índices cubren consultas por organización/pedido y revisiones; restricciones de unicidad evitan dos confirmaciones por versión/revisión y referencia compuesta vincula preparación y manifiesto al mismo tenant/request. Triggers prohíben update/delete de preparaciones y confirmaciones. No se ha añadido cleanup de preparaciones/identidades sin confirmar: falta definir retención/operación de limpieza compatible con recibos y auditoría antes de exposición amplia. No hay un rate limiter nuevo en este incremento; el body está acotado a 32 KiB y la preparación a 100 grupos.

Si el RPC no está instalado, el repositorio devuelve **503 MANIFESTS_NOT_INSTALLED**, sin fingir guardado. Aplicación remota y regeneración completa de tipos se gestionan por separado; esta entrega no conecta ni altera Supabase alojado. El lint local de la función nueva y RLS se verificaron en el entorno aislado.

## Errores principales

| HTTP | Código | Tratamiento |
| --- | --- | --- |
| 400 | VALIDATION_ERROR, INVALID_GROUP_MAPPING, GROUP_MAPPING_REQUIRED, UNKNOWN_MANIFEST_GROUP, MANIFEST_GROUP_LIMIT | Corregir datos/mapa; no fabricar valores |
| 401/403 | UNAUTHORIZED, FORBIDDEN_WORKFLOW o FORBIDDEN_TENANT, FORBIDDEN_ORIGIN | Revisar sesión/rol/origen; conocer un UUID no da acceso |
| 404 | REQUEST_NOT_FOUND, PREPARATION_NOT_FOUND, MANIFEST_NOT_FOUND | Resolver referencia autorizada; no enumerar recursos ajenos |
| 409 | STALE_DRAFT, STALE_MANIFEST, STALE_PREPARATION | Recargar y preparar la revisión vigente |
| 409 | IDEMPOTENCY_CONFLICT | Nueva intención requiere clave nueva; un reintento conserva el payload |
| 409 | PREPARATION_EXPIRED, REVIEW_CONTENT_MISMATCH | Preparar y revisar de nuevo |
| 409 | INVALID_TRANSITION, DECLARATION_ALREADY_CONFIRMED | Respetar ciclo de vida y reutilizar lectura/recibo |
| 413 | PAYLOAD_TOO_LARGE | Este endpoint recibe metadatos de comando, no archivos |
| 503 | MANIFESTS_NOT_INSTALLED | Instalar capacidad tras revisión y autorización; no bucle de reintentos |

## Evidencia y continuidad

La autorización posterior del usuario permite ejecutar las pruebas de este incremento. Pasan 11 pruebas de servicio/cliente, 34 pgTAP, TypeScript/arquitectura y las suites pertinentes de intake/conversación/sesión. También pasaron HTTP real y los botones de guardar/revisar/confirmar/reabrir en navegador, usando exclusivamente Meta local. Los conteos y comandos exactos están en la [evidencia del 28-oct](../VALIDACION_CR01_2026-10-28.md); no se ejecutó build de producción ni se da por aprobado el diseño visual.

Desde `cargomesh/`: `pnpm test:meta-manifests` y, con el stack local autorizado levantado, `pnpm test:meta-manifests:http`. Los casos SQL están en `supabase/tests/49_meta_declared_manifests.test.sql`, registrados en el perfil V2; necesitan la migración y el escenario limpio nativo. Se ejecutaron con rollback en Docker Meta local, sin reset de las bases preexistentes.

Referencias técnicas consultadas: [funciones y privilegios Supabase](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) y [changelog](https://supabase.com/changelog). Se reutiliza el patrón de comandos privados de CargoMesh, no se introduce una elevación genérica desde Hono.

Pendiente: revisión ajena y CI sobre el nuevo SHA, eventual migración/despliegue alojado y preparación operativa para exposición amplia. El perfil documental, sus uploads/requisitos, las propuestas de Axel y sesiones de Juan se conectan en incrementos separados; no son dependencias ficticiamente completadas por cerrar nuestra validación local y el formulario manual.
