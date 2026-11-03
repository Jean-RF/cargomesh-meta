# Adjuntos: reintentos y cupos atómicos — Luis, PR #10

Producto general de cinco integrantes; fuera de la entrega Indie. Continúa #7 en `codex/meta-luis`; no se creó otra rama ni otro PR.

## Corrección

La reserva anterior comprobaba el cupo y hacía un INSERT en peticiones separadas. Cada llamada generaba un UUID nuevo. Una respuesta perdida dejaba una foto duplicable o el único cupo de voz ocupado.

El navegador calcula SHA-256 de los bytes y registra una clave UUID **antes** de enviar `initialize`. Conserva el payload original y la clave en `sessionStorage`, sin guardar allí el archivo. Una carga fallida conserva el `File` en memoria y ofrece **Reintentar carga**; tras recargar se puede seleccionar el mismo archivo y recuperar la misma operación. Guardar por primera vez no rota una operación pendiente. Quitar explícitamente el adjunto permite comenzar otra operación.

El contrato exige `idempotencyKey` y `contentSha256`, además del alcance y los metadatos existentes. El servidor llama al RPC autenticado `initialize_meta_declaration_media`: comprueba `auth.uid()`, miembro activo, organización activa y rol. La clave tiene índice único por organización/miembro; la huella canónica incluye borrador, solicitud, versión, tipo, MIME, nombre, tamaño y hash de contenido. El hash identifica los bytes declarados; no prueba autenticidad física.

Un bloqueo transaccional por organización/miembro serializa búsqueda de replay, validación de cuota e inserción. Misma clave/payload devuelve el mismo ID; otro payload devuelve HTTP 409 `IDEMPOTENCY_CONFLICT`. Los cupos conservan su alcance por actor y borrador/solicitud: cuatro adjuntos, una voz y 12 MiB de imágenes. `PENDING` y `READY` consumen cupo. `REMOVED` queda excluido del cupo pero conserva el recibo; reintentar su clave devuelve `MEDIA_REMOVED`, sin revivirlo.

`bind_meta_declaration_media` usa el mismo bloqueo y comprueba la cuota combinada al vincular un borrador a una solicitud guardada. No permite transferir una misma serie de adjuntos a otra solicitud. Se mantienen comprobación de revisión/estado de la solicitud, aislamiento, revisión humana y aplicación explícita al mismo formulario. Estos comandos no crean solicitudes ni manifiestos, ofertas o reservas.

Storage queda fuera de la transacción SQL: si falla la firma, la reserva se conserva y se recupera con la misma clave. Los permisos de subida siguen con `upsert:false`; un replay `READY` devuelve `uploadUrl:null`. `finish` comprueba los bytes contra `expected_sha256`, realiza la transición solo desde `PENDING` y no reescribe un `READY`. Un PUT cuya respuesta se perdió puede recuperarse verificando el objeto existente.

## Transición de base

- Nueva: `20261101090000_meta_media_idempotency.sql`, registrada en el manifiesto.
- **No se modificó** `20261031090000_meta_declaration_media.sql` ni otra migración anterior.
- Las columnas nuevas admiten NULL para evidencia anterior; lectura, reproducción y vinculación permanecen compatibles. Las reservas antiguas sin recibo no reciben una clave retroactiva inventada.
- La transición se ejecutó únicamente en el contenedor Docker local `supabase_db_meta-luis-media-local` (API 65321). No hubo migraciones remotas ni despliegues. El integrador deberá aplicar la transición en el entorno autorizado antes de activar este contrato nuevo.

## Comprobado con dobles

`pnpm --dir cargomesh test:meta-draft-media`: **27 pruebas**, sin red ni proveedor.

Se ejecuta el hook real con React/HTTP/micrófono controlados: respuesta perdida en foto y audio, botón de reintento con la misma clave/payload, recuperación de la clave después de remontar, replay READY tras perder la respuesta de `finish`, primer guardado sin rotar la operación, revisión humana, correcciones concurrentes, reset, micrófono y aislamiento de cookies. El servicio real se ejecuta con puertos REST/Storage dobles: reserva conservada tras error de firma, mapeo estable de conflicto y ausencia de nueva firma al estar READY.

Estos dobles **no prueban atomicidad SQL**, durabilidad de PostgreSQL ni el servicio Storage real.

## Comprobado con persistencia real

- `python scripts/test_meta_media_idempotency.py --container supabase_db_meta-luis-media-local`: **19 casos**. Cada participante concurrente usa una conexión/ transacción PostgreSQL independiente. Para foto y audio: commit con primera respuesta descartada, seis inicializaciones simultáneas de una clave con un solo registro, conflicto por metadatos o hash diferentes, canonicalización de orden JSON/nombre, READY conservado, aislamiento organización/miembro/borrador y eliminación sin resurrección. Diez creaciones concurrentes con distintas claves respetan cupo total, único audio y bytes de imágenes. Limpia exclusivamente sus UUID sintéticos. En las pruebas SQL de replay READY se prepara ese estado directamente; no se presenta como una subida real.
- `pnpm --dir cargomesh smoke:meta-draft-media` **sin `--live`**: **22 casos** con Next, Auth, PostgREST y Storage Docker reales. Foto y WAV sintéticos: subida privada, respuesta inicial descartada/replay, READY sin URL de escritura, rechazo de sobrescritura incluso con el token anterior, hash de bytes obligatorio, audio reproducible idéntico, aislamiento, guardar/revisar/reabrir conservando **exactamente los dos IDs**, replay tras vinculación y rechazo de versión antigua antes de cualquier inferencia. Carrera real entre vinculación de dos fotos e inicialización en la solicitud guardada: como máximo cuatro adjuntos, operación perdedora con `MEDIA_LIMIT` y sin vinculación parcial.
- `52_meta_media_idempotency.test.sql`: **12/12 pgTAP**, permisos/RLS/índice y compatibilidad de evidencia READY anterior. Registrado en el perfil V2.
- TypeScript, `test:v2-conversation`, arquitectura (841 módulos/244 entradas cliente) y manifiesto de migraciones: correctos.

No se usó inferencia pagada. No se grabó una voz humana nueva ni se reclamó aceptación visual adicional. Las pruebas SQL locales no sustituyen el gate remoto del SHA del PR.

## Gate y sincronización

`origin/main` se integró mediante merge `44916fb`, conservando los commits y las entradas de autoría de Juan y Luis. Sin force-push. El gate ejecuta las pruebas con dobles, pgTAP, concurrencia SQL con el seed todavía presente y el flujo HTTP sin inferencia. No depende de una API de Meta ni permite `--live` en CI. El PR #10 conserva la continuación de #7 y registra el resultado remoto del SHA publicado.
