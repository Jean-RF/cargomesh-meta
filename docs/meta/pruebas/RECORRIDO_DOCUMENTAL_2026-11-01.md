# Recorrido documental ejecutado — Meta local

## Resultado

Los cuatro pasos autorizados están ejecutados localmente: código Luis sincronizado con el expediente, tres migraciones nuevas aplicadas después de respaldo, request con dos grupos y manifiesto confirmado, documentos privados vinculados, booking autorizado y revisión Carrier de ambos documentos ACCEPTED.

- Request: 8b0fed7d-4cc3-4cc3-b819-8f68fdeefebe.
- Manifest: 163cd0cc-a0d2-4f8e-bcde-310c689fcafd, revisión1.
- Grupo A (8 BOX): 879dc96b-3c00-43e1-b772-619996b2b713.
- Grupo B (4 BOX): d1b2aab3-29d2-4b90-8a70-d369c0dd1f6c.
- Booking: 654a02b7-c366-4298-8e1a-003481cbfb0a, AUTHORIZED.
- Perfil de empresa: revisión54928626-1882-481e-b93c-a11abe7898ea.
- Packing list: revisiónac08c938-6e48-4ffe-abb3-b0ccbc07f75c.

## Cómo revisarlo como usuario

1. Abrir http://127.0.0.1:8080/clients/organization, pestaña Documents. La ficha corporativa aparece en la biblioteca privada.
2. Abrir http://127.0.0.1:8080/clients/requests/8b0fed7d-4cc3-4cc3-b819-8f68fdeefebe. Revisar8+4BOX,120kg y0.432m3; en Shipment documents comprobar ambas revisiones, correspondencia con manifiesto y acceso compartido.
3. Abrir http://127.0.0.1:8080/carriers/orders/654a02b7-c366-4298-8e1a-003481cbfb0a, sección Document review. Comprobar los dos ACCEPTED, sus motivos y descargas.
4. Recargar: IDs, cantidades, enlaces, revisiones y decisiones deben conservarse. El estado del booking sigue AUTHORIZED; la aceptación documental no confirma transporte.

Se utiliza la identidad sintética nativa QA A, con rol de organización y operador Carrier ADMIN válidos. Son permisos del escenario local existente; no se añadió un login ni se quitaron comprobaciones. La identidad QA B no pudo descargar el documento Carrier ajeno. La apertura y revisión visual de estas páginas sigue pendiente del usuario: la aceptación ejecutada fue SQL/HTTP real.

## Qué se verificó

Script opt-in cargomesh/scripts/meta-document-demo.ts: 9 familias de comprobaciones, sin dobles de HTTP/Storage ni inferencia. Identidad nativa, request/manifiesto/grupos exactos, biblioteca privada, upload/replay, vínculo material, autorización explícita de booking, alcance Carrier, descarga SHA-256, rechazo público/otro tenant, revisión/replay y recarga sin mutar booking.

Regresiones locales:7 documento/Hono,11 manifiesto y27 medios. Base con rollback:39 documentos,10 medios,12 idempotencia y13 explicación. TypeScript y manifiesto de migraciones pasan. Una prueba documental suponía biblioteca vacía; se corrigió para comprobar la revisión propia sin eliminar documentos anteriores.

## Archivos y límites

Las copias PDF simples en output/pdf/meta-document-demo conservan exactamente el render original y eliminan EmbeddedFile. Los originales de Downloads permanecen intactos. El contenido de los PDF no se envió a la IA ni se interpreta automáticamente. Datos no aportados (p.ej. teléfonos o apilabilidad) son elecciones explícitas del escenario, detalladas en supabase/scenarios/v2-meta-document-demo/README.md.

El perfil y packing list son ficción de demo, no certificados oficiales. Requisitos por confirmar, sin OCR, antivirus, autenticidad legal o validación internacional automática. No hubo pagos, inferencia, despacho, confirmación de booking, migración remota ni cambios en Amazon. El worker de Ramón no se probó en este recorrido.

Respaldo y recibos: salida/meta-hackathon-integration/before-local-flow-20261101-173203. SQL y documentos anteriores conservados. Resultado legible por máquina: documentos-demo-2026-11-01/result.json.

Integración remota del expediente: PR#11 mergeado, commit2071886789d60d7e2aef43bf9a044e796df1e7e8, con los tres gates SUCCESS sobre head38c2ceedec8982160fcf03acf2b4ad07e09e5508 (run41358132010). Rama local adelantada al mismo main sin perder cambios pendientes. Tras resolver el chat también pasó test:v2-chat-workflow111/111 y TypeScript. El código local incluye las correcciones de chat aún pendientes de publicación; no deben confundirse con el alcance ya publicado del PR.
