# CR-DOC-01: expediente privado conectado

Implementado el 30-oct-2026 en el repositorio de trabajo Meta. Aplicado únicamente a `meta-cr01-validation` local; sin migración alojada ni cambios en Amazon.

## Recorrido mínimo

1. `/clients/organization` → **Documents**: Owner/Supervisor sube ficha corporativa u otro documento reutilizable. No hay un nuevo login. REQUESTER no accede a esta biblioteca sensible.
2. Formulario guardado, paso 4, o `/clients/requests/[id]` → **Shipment documents**: elegir **Attach this revision**. La packing list se sube dentro de su solicitud y requiere manifiesto confirmado para vincularla.
3. Después de seleccionar oferta y autorizar booking mediante los comandos existentes, elegir ese booking y **Share this revision**. Solo se comparten los archivos elegidos, no la biblioteca.
4. `/carriers/orders` → detalle → **Document review**: ver archivos compartidos para ese booking. ADMIN/DISPATCHER registra aceptación o corrección con motivo; OPERATOR puede consultar, no revisar.
5. Subir revisión nueva conserva las anteriores y no sustituye automáticamente el archivo del pedido. Vincularla revoca accesos anteriores; compartir otra vez empieza PENDING. La auditoría conserva las decisiones.

Aceptar un documento no confirma booking, capacidad, incidencia o despacho. Sin política documental publicada se muestra **Requirements to confirm**; no se presenta cumplimiento legal automático.

## API Hono

Base de biblioteca: `/api/v2/meta/documents`.

| Método/ruta | Función |
| --- | --- |
| GET `/` | Revisiones de organización; filtros `requestId`, `documentId`, `offset`; páginas de 50 |
| POST `/` | Multipart `file` + JSON `metadata`; reserva correlacionada, subida privada y finalización |
| GET `/requests/:requestId` | Vínculos/versiones, revisión exacta, correspondencia y bookings autorizados |
| POST `/requests/:requestId` | `link`, `unlink`, `share`, `revoke`; clave idempotente y versión esperada |
| GET `/:revisionId/download` | Autoriza nuevamente y emite descarga de 60 segundos |

Carrier: `/api/v2/carriers/:carrierId/documents`.

| Método/ruta | Función |
| --- | --- |
| GET `/bookings/:bookingId` | Solo revisiones compartidas para esa identidad y booking |
| GET `/shares/:shareId/download` | Descargar por vínculo compartido, no UUID de revisión arbitrario |
| POST `/shares/:shareId/reviews` | `expectedVersion`, `decision` ACCEPTED/CORRECTION_REQUESTED y `reason` de 3–1000 caracteres; clave idempotente |

## Datos y límites

- Migración aditiva `20261030181428_meta_document_dossier.sql`: documentos, revisiones, vínculos, accesos compartidos, auditoría y recibos; RLS en seis tablas y sin DML directo de clientes/clave de servicio. RPC valida identidad y ámbito. Bucket privado `meta-documents`; política restrictiva impide saltar el servidor por políticas Storage permisivas heredadas.
- PDF/PNG/JPEG de **4 MiB** máximo; cuota de **100 MiB por organización**, incluyendo reservas incompletas. Sustituye la propuesta inicial de 10 MiB para mantener multipart compatible con el despliegue web actual.
- Validación de extensión, MIME y estructura. PDF simple con índice/catálogo: rechaza cifrado, acciones activas, adjuntos y objetos comprimidos no inspeccionables por este validador. Para exportaciones incompatibles, reimprimir/exportar PDF simple. PNG de 8 bits sin entrelazar con CRC/deflate acotado; JPEG con segmentos/dimensiones acotados. No se ejecuta un decodificador gráfico nativo sobre archivos no confiables en el proceso web.
- Metadata conserva tamaño, tipo detectado, SHA-256, fechas aportadas, autor, organización, ámbito y revisión; URL firmada no es identidad persistente.
- Reintentar upload con la misma intención mantiene revisión/ruta; si el objeto existe se compara hash antes de finalizar. UPLOADING no es listo. Reservas/objetos abandonados quedan privados e incompletos; retención/limpieza para exposición amplia sigue pendiente, sin borrado automático de evidencia.
- Packing list conserva request/manifiesto/revisión. Cambio material invalida correspondencia y exige revisar/vincular explícitamente el archivo adecuado. No se usa solo el número de DRAFT como prueba de cambio material.
- Sin vencimiento aportado se muestra desconocido; vencimiento pasado impide aceptar. Matriz internacional, vigencia durante todo el viaje, antivirus, OCR, firma y autenticidad oficial no están implementados.
- Revocar/sustituir impide nuevas descargas carrier. URLs emitidas pueden durar hasta 60 segundos; archivos ya descargados no se recuperan.
- Storage local habilitado; clave servidor solo en `.env.local` ignorado. No se expone en frontend/Git.

Referencias: [buckets privados](https://supabase.com/docs/guides/storage/buckets/fundamentals), [descarga firmada](https://supabase.com/docs/guides/storage/serving/downloads).

## Verificación

- `pnpm test:meta-documents`: siete pruebas de servicio y frontera Hono: CSRF, versiones, archivo inválido, reintentos y descarga autorizada.
- `supabase/tests/51_meta_documents.test.sql`: 39 controles pgTAP con fixtures y ROLLBACK: permisos, aislamiento, revisión, revocación, versiones y correspondencia.
- `node --env-file=.env.local --conditions=react-server --import tsx scripts/meta-document-http.ts`: opt-in solo 8080/API64321. Crea request/documentos sintéticos etiquetados y manifiesto, nunca booking. Comprueba subida privada real, reintento, vínculos, descarga/hash, rechazo público/otro tenant, historia y revisión nueva. No imprime claves ni URLs firmadas.
- Conjunto documento/manifiesto: 18 pruebas aprobadas (7 nuevas + 11 de regresión). Build de producción aprobado. Seguridad advisors local sin hallazgos. Tipos, arquitectura y manifiesto/hash de migraciones verificados separadamente.
- Aceptación visual/teclado/móvil por Cristhian pendiente. Recorrido comercial completo en navegador con oferta/booking del escenario pendiente: la revisión carrier se verificó en SQL con identidades/grants válidos, no se atribuye a una grabación de usuario.
