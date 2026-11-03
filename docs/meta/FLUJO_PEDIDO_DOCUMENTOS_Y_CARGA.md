# Flujo propuesto: pedido, expediente documental y carga observada

27 de octubre de 2026. Responsable de esta propuesta: Cristhian. Frente CR, PR #3.

**Estado:** entrega documental para revisión del equipo. Contrasta el código de nuestra rama con fuentes oficiales; no implementa pantallas, almacenamiento, validación documental, emisión fiscal o nuevos comandos. No acredita aprobación de Axel/Juan/Luis/Ramón ni pruebas del producto. Los nombres de entidades, estados y comandos nuevos de este archivo son propuestas, no APIs disponibles.

## 1. Decisión de producto y vocabulario

El objetivo del cliente es **crear un pedido de transporte y tramitarlo con un carrier**, aprovechando los documentos que su organización ya tiene. No necesita volver a subir el mismo archivo en cada operación, pero cada uso requiere comprobar alcance, vigencia y permiso de acceso.

No se cambia el significado comercial existente:

| Concepto | Qué representa | Qué no acredita |
| --- | --- | --- |
| Solicitud / FreightRequest | Necesidad de transporte, carga, ruta, contactos y ventanas | Contratación, capacidad o salida |
| Manifiesto declarado CargoMesh | Snapshot de los grupos y cantidades que una persona confirmó | Guía fiscal, autorización aduanera o documento oficial de transporte |
| Oferta / CarrierOffer | Propuesta atribuible al carrier, con vigencia y condiciones | Aceptación del cliente o compromiso definitivo de capacidad |
| Orden / Booking autorizado | Compromiso comercial solicitado por el cliente sobre oferta seleccionada | Confirmación del carrier, documentación completa o vehículo reservado por sí solos |
| Operación / Execution | Planificación y hechos de ejecución vinculados a la orden | Salida o entrega hasta sus eventos autorizados |
| Sesión DockMind | Observación de una carga, con revisión y alcance fijados | GPS, aprobación documental o autorización para despachar |
| Reality Passport | Historial de declaraciones, documentos autorizados, observaciones y revisiones | Certificado de cumplimiento o prueba de autenticidad física |

En la interfaz inicial se mantiene «Nueva solicitud» / «New shipment»; el cierre puede explicar «Envía tu solicitud y elige una oferta para generar la orden». No llamar «Orden confirmada» a un DRAFT ni crear un segundo objeto Order paralelo a Booking. Los IDs técnicos y rótulos visibles conservan su distinción.

**Confirmar lo declarado**, **autorizar una orden** y **registrar salida** son decisiones distintas. No fusionarlas en un botón ambiguo ni añadir una confirmación repetida por cada pantalla.

## 2. Qué existe realmente y qué falta

| Evidencia inspeccionada | Capacidad existente | Límite |
| --- | --- | --- |
| `cargomesh/src/shared/schemas/v2/organization.ts` | Nombre comercial/legal, identificador fiscal, país, contacto y versión | El schema no contiene un expediente de archivos ni verificación oficial de identidad |
| `cargomesh/src/server/hono/routes/organizations.ts` | Lectura de organización actual y revisiones autorizadas | No contiene rutas de carga o revisión documental |
| `cargomesh/src/features/shipper-portal/client-organization.tsx` | Superficie de Organización y perfiles | Textos decorativos sobre compliance no prueban validación; evitar sellos de cumplimiento sin datos |
| `cargomesh/src/shared/schemas/v2/freight-request.ts` | `availableDocuments`: código, referencia, emisión y vencimiento | Referencia declarada no demuestra objeto privado, emisor, revisión o aceptación del carrier |
| `supabase-v2/supabase/migrations/20261007170000_hac40_planner_qa_fixes.sql` | Ejemplo de restricciones de corredor/plan cotejadas con códigos y fechas documentales | Es una migración histórica inspeccionada, no inventario de funciones efectivas del entorno alojado ni verificador de documentos |
| [Contratos comerciales reutilizados](../v2-amazon/contracts/DOMAIN_CONTRACTS.md) | Solicitud, ofertas, decisión, bookings y compromisos separados | El nuevo expediente no sustituye sus guardas |
| [Candidato CR-00](contracts/DECLARED_MANIFEST_CR00.md) | Schema y mapper puro desde pedido válido | Sin confirmación, persistencia, endpoints o expediente implementados |

La propuesta añade capacidades alrededor del pedido existente. No transforma la referencia textual actual en «documento aprobado». Antes de integrar se revisará la cadena SQL vigente completa, no solo el fragmento histórico citado.

## 3. Tres familias de documentos y un repositorio reutilizable

El perfil ofrece **Organización → Documentos**. Cada archivo tiene un propietario y revisiones; que se pueda guardar allí no significa que sea reutilizable para cualquier envío.

| Familia | Ejemplos orientativos, sujetos a requisito aplicable | Reutilización |
| --- | --- | --- |
| Organización | Identificación empresarial; representación o autorización; certificados corporativos si se exigen | Reutilizable cuando sujeto, finalidad, alcance y vigencia coincidan |
| Envío / mercancía | Lista de empaque, factura cuando corresponda, ficha de producto, permiso o declaración asociados al envío | Normalmente específico del envío, producto/lote o régimen; nunca copiar silenciosamente la guía o factura de otro viaje |
| Carrier / vehículo / conductor | Habilitaciones, credenciales, cobertura de seguro, documentos de vehículo o transporte según servicio | Los aporta su responsable; el cliente no debe cargar la licencia del conductor del carrier |

La fotografía para la IA es **evidencia de declaración**, no necesariamente un documento formal. Una nota de voz y una observación de vídeo tampoco satisfacen por sí mismas un requisito documental.

No hay una lista universal de documentos para todos los carriers. La lista efectiva depende del servicio y política del carrier, corredor y jurisdicción, tipo de mercancía, fecha y etapa. Las obligaciones de una autoridad y las condiciones comerciales del carrier deben tener fuentes separadas; una configuración del carrier no deroga una obligación aplicable.

### 3.1 Fuentes externas consultadas y alcance

- [SUNAT: Guía de Remisión Electrónica](https://cpe.sunat.gob.pe/landing/guia-de-remision-electronica-gre): distingue GRE Remitente y GRE Transportista. Esto sustenta separar responsabilidades y documentos de un traslado; no se deduce una matriz legal completa para el caso de demo.
- [DHL Global Forwarding: documentos para carga LCL](https://www.dhl.com/ph-en/home/global-forwarding/freight-forwarding-education-center/documents-you-need-to-ship-lcl.html): presenta documentos del envío en contexto marítimo. No se importa esa lista como requisito del ROAD Lima–Arequipa.

Consulta: 27-oct-2026. El catálogo inicial del escenario ROAD debe ser revisado por un responsable operativo con la fuente y versión aplicables. No se afirma que CargoMesh emita, consulte o valide documentos en SUNAT o en otro registro externo. Las referencias externas justifican el diseño; no certifican que el expediente cumpla una regulación.

### 3.2 Cada requisito debe decir quién, por qué y cuándo

Propuesta de `DocumentRequirement`, versionada y publicada por actor autorizado:

- `requirementId`, código/tipo documental, versión y fuente de la regla; jurisdicción y referencia normativa o política comercial cuando proceda.
- Carrier/servicio/corredor y filtros de aplicabilidad: mercancía, modo, fecha, sujeto y alcance.
- Responsable de aportar: organización remitente, destinatario, carrier u operador autorizado; responsable de revisar por separado.
- Etapa límite: solicitud, oferta, autorización de orden, confirmación carrier o antes del despacho. No todo documento puede existir al crear la solicitud.
- Evidencia aceptable, criterios de vigencia, revisión requerida y si admite un documento sin vencimiento.
- Carácter obligatorio/condicional y regla explícita de excepción, cuando exista; una obligación no dispensable no se omite con un checkbox.

Reglas desconocidas se muestran «Requisitos por confirmar». La ausencia de configuración no significa «No necesitas documentos». Un nuevo requisito exige revisión auditada; no altera retrospectivamente qué reglas se usaron en una orden previa, aunque puede exigir revalidación para la siguiente etapa.

## 4. Recorrido por pantallas

| Paso | Pantalla / responsable | Acción y resultado | Pendiente o error |
| --- | --- | --- | --- |
| 0 | `/clients/organization`, CR | Datos del perfil y documentos reutilizables; subir, reemplazar o consultar vigencia | Perfil incompleto no bloquea explorar ni guardar captura local; el trámite exige los datos que correspondan |
| 1 | `/clients/freight-request/new` y asistente, CR + Axel/Luis | Texto/foto/audio alimentan el mismo borrador; usuario corrige; se conservan grupos | Falta peso/medida: pedirlo, nunca inventarlo o poner cero |
| 2 | Pasos actuales 1–3, CR | Sedes, carga, requisitos, ventanas y contactos; documentos preliminares del envío | Antes de elegir carrier solo hay reglas base conocidas; no afirmar expediente final completo |
| 3 | Paso 4 de revisión, CR | Ver «Declarado por ti» y «Documentación»: reutilizado, pendiente, vencido o por revisar; confirmar contenido y guardar pedido/snapshot consistente | Falta un documento: conservar progreso válido y señalar la etapa bloqueada; no prometer persistir un FreightRequest incompleto incompatible con el schema |
| 4 | Detalle actual `/clients/requests/[id]`, CR y servicios comerciales existentes | Consultar alternativas/ofertas y requisitos del carrier concreto; resolver documentos faltantes | Opciones condicionales separadas del ranking elegible; sin oferta no se fabrica una orden |
| 5 | Selección/autorización de Booking existente | Cliente revisa precio, condiciones, destinatario documental y pendientes; autoriza con auditoría | Bloquear lo obligatorio para esta etapa; revalidar oferta, capacidad y permisos independientemente |
| 6 | Carrier: Órdenes y detalle existentes | Revisa solo documentos compartidos para esa relación, acepta o pide corrección, aporta los propios, confirma compromisos por comandos existentes | «Falta documento» no se confunde con «Sin capacidad» ni cambia automáticamente el estado de Booking |
| 7 | Sede/sesión y dashboard Tetris de Juan | Sesión fija manifiesto/revisión, orden/operación cuando existan, grupo y asignación; Ramón produce observaciones | Sesión interna de demo sin orden va rotulada como tal; no aparenta una contratación real |
| 8 | Dashboard y Passport de Juan | Mientras carga: progreso. Al cerrar y evaluar suficiencia: comparación y propuesta de revisión; persona resuelve | Evidencia parcial o unidad/revisión incompatible: «No concluyente», sin faltante confirmado |
| 9 | Operación existente | Despacho/entrega mediante sus eventos autorizados y requisitos efectivos | Cerrar DockMind o aceptar una alerta no registra salida, entrega o liberación aduanera |

Para un archivo faltante: «Usar documento de mi organización» / «Subir documento». Si debe aportarlo el carrier: «Pendiente del transportista», con motivo y responsable; no botón de subida indiscriminado para el cliente. La revisión documental no debe obligar a rehacer la carga o perder el borrador.

## 5. Reutilización y revisión documental

1. Autenticar actor y organización; resolver documentos del perfil del tenant autorizado.
2. Evaluar reglas conocidas para la etapa/contexto. Antes de seleccionar carrier, declarar que el conjunto aún puede ampliarse.
3. Proponer candidatos compatibles: tipo, propietario/sujeto, alcance, fechas y estado; el usuario ve cuál se propone usar.
4. Si falta: subir a almacenamiento privado o pedirlo al responsable. Conservar la captura autorizada antes de que exista requestId; asociarla después sin crear un pedido vacío inválido.
5. Verificar el archivo y metadatos; revisión por el rol designado. «Cargado», «vigente según fechas», «aceptado por carrier» y «validado por autoridad» son hechos distintos.
6. Asociar al envío una **revisión exacta** del documento y registrar el requisito/versionado que satisface. No duplicar bytes por cada pedido ni enlazar un puntero mutable a «última versión».
7. Antes de compartir con carrier, registrar destinatario, finalidad y alcance con autorización explícita y auditada; mostrar al cliente qué se comparte. Discovery no entrega el expediente entero a todos los candidatos.
8. Al pasar cada etapa, revalidar permisos, revocaciones, requisitos y fechas relevantes. Si vence antes del fin del servicio y la regla exige cubrirlo, solicitar renovación.
9. Reemplazar no reescribe pedidos/sesiones históricos. Revocar acceso impide nuevas descargas no autorizadas; registrar la revocación y política de conservación sin prometer retirar copias ya descargadas.

Los documentos sin vencimiento no reciben una fecha ficticia. El guard de fechas de los permisos existentes requiere análisis de compatibilidad: **no** rellenar `validUntil` con una fecha lejana para eludirlo. Resolver por contrato el tipo de requisito y su adaptador antes de integrar el expediente.

## 6. Estados y transiciones, sin mezclar dominios

Nombres propuestos para el dominio nuevo. No añaden estados al Booking ni reemplazan enums existentes.

| Dominio | Estado/transición propuesta | Regla |
| --- | --- | --- |
| Archivo | `PENDING_UPLOAD → READY` o `FAILED` | READY solo tras comprobar objeto, formato/tamaño y controles de acceso; no significa documento aceptado |
| Revisión documental | `PENDING_REVIEW → ACCEPTED / REJECTED` | Actor, motivo, fecha, regla y alcance; reemplazo crea otra revisión y vuelve a revisión cuando corresponda |
| Validez / acceso | Vencido, revocado, sustituido | Hechos separados/derivados de fechas y auditoría; no borrar aceptación histórica |
| Requisito del envío | `MISSING / IN_REVIEW / SATISFIED / INVALID / UNKNOWN / NOT_APPLICABLE` | SATISFIED solo para requisito, revisión y etapa concretos; NOT_APPLICABLE exige regla/motivo |
| Manifiesto | Candidato → snapshot confirmado | Candidato no es persistencia; confirmación auditada y atómica/recuperable con la revisión del pedido |
| Nueva declaración | Snapshot nuevo con revisión nueva | Conservar el anterior; no sobrescribir el consumido por una sesión |
| Sesión | Preparada → abierta → cerrada; cancelada por comando explícito | Versiones y alcance fijos; finalizar carga no equivale a análisis terminado |
| Job | Pendiente → procesando → resultado / fallo | Lease, intentos y deduplicación; timeout no prueba que el proveedor no haya procesado |
| Conciliación | Progreso / comparable / no concluyente | Comparación final requiere sesión cerrada y evidencia suficiente; resultado separado de revisión humana |
| Revisión humana | Pendiente → confirmada / descartada / pide evidencia | Auditar decisión y hechos fuente; no corregir silenciosamente el conteo original |

No usar un porcentaje global de «cumplimiento» que oculte un requisito obligatorio pendiente. El estado resumido del expediente se deriva por **etapa** de sus requisitos; no se guarda como permiso genérico para todo el transporte.

## 7. Contratos mínimos que deben revisar los consumidores

Estos son contratos lógicos propuestos. Faltan schemas ejecutables, persistencia, endpoints y aceptación. UUIDs de organización/carrier recibidos del cliente no conceden autorización.

| Contrato / productor | Entrada o datos mínimos | Salida / consumidor |
| --- | --- | --- |
| Documento de organización / CR | organización autorizada, tipo, sujeto, revisión, emisor declarado, fechas opcionales, referencia privada del objeto, hash, estado/revisión y acceso | Revisión reutilizable; CR y consulta autorizada del carrier |
| Requisito / CR coordina dominio, operador carrier publica su política | servicio/corredor/carga/etapa, fuente/versiones, responsable, validez y criterios | Lista aplicable con motivos y pendientes; formulario/orden |
| Vínculo documental / CR | requestId/draftVersion o bookingId, requisito/versionado, documentId/revisión, actor y sharing grant | Evaluación trazable por etapa; no URL firmada persistida |
| Preparar manifiesto / CR | Pedido válido, actor y versión esperada, mapa estable de grupos | Candidato CR-00 ya preparado, aún sin aprobación |
| Confirmar declaración / CR | requestId, expectedDraftVersion, intención humana, referencias revisadas, idempotencia | manifestId/revisión inmutable, grupos estables, actor/fecha y recibo; no Booking automático |
| Interpretación / Axel; transcripción / Luis | evidencia autorizada, grupo objetivo explícito y inputRevision | Propuesta/transcripción revisable; no autorización documental |
| Abrir sesión / Juan | manifestId/revisión, sede, actor autorizado, grupos/asignaciones, orden/ejecución si existe, unidad y alcance | sessionId/versión y baseline congelado; no suma de grupos ajenos |
| Observación / Ramón | sesión/revisión, clip, configuración, zona y dirección de cruce, cobertura temporal | eventos con unidad, timecodes, incertidumbre y referencias; IDs de tracking no son IDs físicos de pallet |
| Conciliación / Juan | Baseline exacto y observaciones compatibles/suficientes | esperado, observado, diferencia, motivos, versiones y evidencia; Luis explica esos hechos |
| Revisión y Passport / Juan | conciliación/revisión, actor, decisión y motivo | Evento auditado y lectura según permisos; incidencia solo por comando aparte autorizado |

El `DocumentRefV2Schema` actual no tiene todo este contexto. Hace falta un adaptador con referencias resolubles y controladas en servidor; no ampliar silenciosamente el payload estricto ni tratar un string arbitrario como comprobación. Los documentos organizacionales no deben copiarse íntegros al manifiesto de carga: usar referencias necesarias y autorizadas, con separación de acceso.

### 7.1 Revisiones, consistencia y permisos

- `inputRevision`: edición/captura del formulario y turno IA; respuestas tardías no pisan correcciones.
- `requestDraftVersion`: versión persistida del pedido, con su ciclo de vida actual. Revisar DRAFT no habilita editar una orden ya enviada/reservada.
- `manifestRevision`: snapshot declarado inmutable; grupos con UUID estable, no índice de array.
- `documentRevision`, `requirementVersion`, `sessionVersion` y configuración del job identifican qué se utilizó realmente.
- Guardar pedido/manifiesto/vínculos exige transacción local o composición recuperable con recibo e idempotencia; fallo intermedio no se anuncia «confirmado».
- Para mandatos nuevos, clave idempotente + hash canónico y versión esperada; errores propuestos por normalizar: tenant prohibido, revisión obsoleta, requisito pendiente, archivo no utilizable y evidencia incompatible. Mantener códigos existentes cuando ya aplican.
- El shipper gestiona su expediente con roles autorizados; carrier solo lee/revisa los documentos asignados a su relación y función. Membership válida, RLS/servicio y grants se evalúan en servidor; no acceso por conocer UUID.
- URLs firmadas cortas solo al consumir; nada de URLs privadas permanentes, tokens o archivos sensibles en logs, Git o respuestas del modelo.
- IA puede extraer/proponer campos o señalar diferencias, nunca marcar identidad verificada, emitir una guía, aprobar un permiso o compartir el expediente por sí sola.

## 8. DockMind: qué compara y cuándo

La sesión define qué vehículo/tramo/grupos se están cargando. Si el pedido tiene 12 pallets repartidos en dos camiones, observar el primero no autoriza compararlo con el total global. Juan fija la asignación esperada de esa sesión; las sesiones posteriores no cuentan otra vez la misma asignación sin un evento justificado.

Ramón entrega cruces dirigidos y evidencia de continuidad, incluyendo reentradas/descargas y oclusiones. El algoritmo debe acordar cómo evitar doble conteo y distinguir neto cargado de cruces brutos. El manifiesto conoce unidades logísticas; las cajas dentro de un pallet no se suman como pallets.

Antes de producir un hallazgo final se comprueba: sesión cerrada, unidad y alcance comparables, revisión correcta, cobertura temporal suficiente, incertidumbres resueltas y regla de conteo versionada. Si falla una condición, registrar «No concluyente» y pedir evidencia. Un job terminado no elimina estas guardas.

La discrepancia es un hecho calculado propuesto para revisión. Confirmarla registra la decisión; no cambia el manifiesto para hacerlo coincidir con el vídeo. Una carga adicional, descarga o corrección exige su evento/revisión, seguido de una nueva conciliación trazable.

## 9. Casos compartidos para revisar, no ensayos ejecutados

Todos son ejemplos ficticios de diseño; cantidades del guion no se pasan al modelo como respuesta esperada.

| Caso | Recorrido y resultado esperado |
| --- | --- |
| Perfil preparado | Organización dispone de documento corporativo aceptable; el sistema propone su revisión vigente, cliente ve su uso y solo aporta los documentos específicos del envío |
| Perfil sin archivo | Guardar captura/progreso permitido; checklist explica quién debe subirlo y la etapa límite. No declarar expediente listo |
| Documento correcto, sujeto equivocado | No satisface requisito aunque coincidan nombre de archivo y fechas; no reutilizar el de otra organización |
| Documento vence durante el viaje | Evaluar contra las fechas exigidas por la regla; pedir renovación si no cubre el intervalo, conservando historial |
| Falta documento emitido por carrier | Se muestra responsable carrier; no exige al shipper inventarlo ni bloquea un DRAFT por una etapa posterior |
| Carrier aún sin elegir | Solo requisitos base conocidos; «Por confirmar con transportista», nunca lista final vacía equivalente a cumplimiento |
| Documento rechazado o sustituido | Motivo visible; nueva revisión y reevaluación, sin borrar la revisión usada antes |
| Dos carriers con requisitos distintos | Checklist y grants separados por servicio/relación; no compartir todos los archivos ni aceptar globalmente por la revisión de uno |
| Dos camiones | Sesión compara solo su asignación confirmada; no acusa faltante del total que corresponde al segundo |
| Carga abierta 11/12 | Progreso de 11, sin afirmar faltante final |
| Carga cerrada 11/12 con evidencia suficiente | Diferencia de -1 PALLET propuesta; persona revisa evidencia y decide, sin crear incidencia ni salida automáticamente |
| Vídeo parcial 11/12 | No concluyente aunque termine el procesamiento; pedir clip completo o evidencia adicional |
| Corrección a 13 tras sesión rev1=12 | Nuevo manifiesto/revisión; sesión rev1 conserva esperado 12 y muestra revisión posterior disponible |
| Documento aparentemente alterado | Señalar revisión y procedencia, no certificar falsedad por IA ni autenticidad por hash |
| Doble clic / red interrumpida | Mismo mandato recupera el resultado; payload diferente con misma clave produce conflicto; sin órdenes/manifiestos duplicados |
| Revisión antigua o permiso revocado | Rechazar comando/descarga actual y refrescar contexto; conservar la auditoría histórica con acceso restringido |

## 10. Iteraciones y responsabilidades

No se reasigna código de otros frentes ni se declaran horas nuevas aprobadas. La capa documental amplía el alcance inicial; priorizar explícitamente antes de comprometerla entera en el evento.

| Incremento | Responsable | Backend / lógica | Frontend | Entrega y dependencias |
| --- | --- | --- | --- | --- |
| CR-00 cierre | Cristhian; revisión Axel/Juan y responsables operativos | Grupo/revisión, vocabulario, fuentes y catálogo mínimo por etapa | Recorrido y textos acordados | Decisiones registradas; ejemplos revisados, no aceptación supuesta |
| CR-01 manual | Cristhian | Pedido válido → snapshot confirmado/reabierto, consistencia y versiones | Revisión en formulario actual y detalle | Base independiente del modelo; conserva todos los grupos |
| Expediente mínimo, propuesta CR-DOC-01 | Cristhian, revisión Juan; entorno con Luis | Documento privado/revisión, asociación, acceso y rechazo, antes de integrar reglas amplias | Organización Documentos + reutilizar/subir desde envío | Nuevo alcance pendiente de estimar/backlog; no crear otra rama/PR |
| Checklist por etapa, propuesta CR-DOC-02 | Cristhian; política validada por operador carrier | Requisitos versionados, aplicabilidad, vencimiento, guardas compatibles | Pendientes y responsable en Cliente/Carrier | No prometer matriz normativa internacional completa |
| CR-02 propuestas | Cristhian conecta a Axel/Luis | Medios y resultado ligados a evidencia/grupo/revisión | Aceptar/corregir, fallos recuperables | Depende de transporte multimodal y límites reales del proveedor |
| JU + RA | Juan y Ramón | Sesión fijada, job, conteo, alcance y comparación | Tetris/Passport con evidencia | Consumen manifiesto; permisos compartidos no se deducen de una sede |
| Aceptación integrada | Dueño de cada módulo; Cristhian coordina | Concurrencia, roles, recuperación y contratos | Revisión visual de Cristhian | Comprobar casos cuando se autorice; hoy no se ejecutan pruebas |

El MVP documental recomendable es un catálogo pequeño del escenario acordado, archivos privados y checklist por etapa, con revisión humana. La verificación automática en registros oficiales, emisión fiscal, clasificación legal global y lectura automática de cualquier PDF son ampliaciones separadas. No presentar un mockup del checklist como trámite resuelto.

## 11. Criterios de aceptación y pendientes

Para aprobar el **diseño**: consumidores confirman grupo/revisión, alcance por sesión, vocabulario y checklist; un responsable operativo valida requisitos/fuentes; se identifica quién aporta/revisa cada documento y la etapa de bloqueo; se decide el mínimo del evento y se estima el delta de alcance.

Para dar la **funcionalidad** por terminada después: ejecutar los casos pertinentes de unidades y revisiones; aislamiento tenant/carrier y descargas; restricciones/RLS de nuevas tablas; vigencia por etapa; idempotencia/fallo parcial; subida inválida y retirada; tránsito del mismo request a orden/operación sin duplicados; comparación parcial/multivehículo; reapertura con revisiones exactas. Descubrir las suites reales entonces; esta lista no es un reporte de aprobación.

Pendientes específicos antes de implementar:

1. Catálogo documental del servicio ROAD elegido, con fuentes, versiones, condiciones y responsables. No se obtuvo aquí una política real de un carrier integrado.
2. Roles de carga/revisión/publicación de políticas según grants actuales, sin crear privilegios solo por etiquetas de UI.
3. Compatibilidad de requisitos/fechas y `availableDocuments` con el dominio y SQL vigentes; no modificar migraciones aplicadas ni desplegar por documentar.
4. Comando consistente de confirmación y mapa persistente de grupos, con revisión de Axel/Juan.
5. Retención, revocación, permisos para compartir y acceso histórico al Passport/documentos; límites de archivo y verificación antes de consumo.
6. Semántica de cierre y conteo neto, cobertura y asignaciones entre camiones, revisada por Juan/Ramón.
7. Incorporación de CR-DOC-01/02 al backlog con estimación y aprobación de alcance; no se agregaron como compromisos MUST de manera automática.

Esta entrega corrige y detalla el flujo como **propuesta**. No marca CR-00 Done, no altera estados comerciales en runtime, no modifica el formulario y no autoriza publicación, migraciones o despliegue.
