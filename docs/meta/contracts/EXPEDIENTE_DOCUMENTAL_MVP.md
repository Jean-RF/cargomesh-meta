# Punto 4: criterios de aceptación del expediente documental mínimo

**Actualización 30-oct:** implementada biblioteca privada, vínculos al request y revisión carrier sobre booking. [Contrato efectivo, límites y verificación](DOCUMENTOS_HTTP_CR_DOC01.md). Revisión después de autorización de booking, sin guarda comercial adicional mientras no haya política publicada. Owner/Supervisor gestiona; ADMIN/DISPATCHER carrier revisa. Límite efectivo: 4 MiB. La matriz siguiente conserva el diseño inicial y no certifica por sí sola todos sus criterios; retención amplia y aceptación visual mantienen pendientes propios.

28-oct-2026. Cristhian implementa CR-DOC-01/02, en su rama y PR existentes. **Estado: especificación para el siguiente incremento; no implementado.** La entrega actual contiene solo el [flujo propuesto](../FLUJO_PEDIDO_DOCUMENTOS_Y_CARGA.md) y [plantillas de demo](../templates/documentos-demo/README.md).

## Corte funcional propuesto

1. **Organización → Documentos:** biblioteca privada de revisiones reutilizables. Subir no significa verificar.
2. **Pedido → Documentación:** vínculo a la revisión exacta de un archivo existente o subida específica del envío. La packing list pertenece a ese pedido/manifiesto; no reutilizarla para otro envío solo porque está en la biblioteca.
3. **Carrier → revisión documental:** consulta limitada a los archivos compartidos para esa relación; pedir corrección o aceptar una revisión dentro de su alcance.

La ficha de empresa ficticia y la packing list sirven como archivos de prueba. El manifiesto de carga sigue siendo una declaración de dominio; adjuntar un PDF no lo modifica ni concede permiso para despachar.

## Momento de revisión comercial: decisión todavía abierta

El usuario solicita que la evaluación documental ocurra después de la oferta. Antes de programar la guarda se debe fijar cuál de estos hitos la exige:

| Decisión | Propuesta de trabajo, aún pendiente de aprobar como regla |
| --- | --- |
| Quién emite y quién acepta la oferta | Carrier presenta; Cliente selecciona/autoriza mediante los comandos existentes |
| Quién revisa los documentos | Actor carrier autorizado para la oferta/booking concreto; asignación de rol por acordar |
| Cuándo se abre la revisión | Tras compartir documentos en la relación comercial elegida; consulta previa a cotizar solo si una regla específica lo requiere |
| Qué bloquea un pendiente | La etapa explícita de una regla versionada. No bloquear guardar DRAFT por un documento de despacho |
| Cómo se confirma la orden | Comando de confirmación carrier independiente de la decisión documental; aprobar un PDF no confirma capacidad |

No está decidido si la revisión documental mínima será previa a presentar la oferta o previa a confirmar el booking tras selección del cliente. La propuesta del usuario orienta al segundo caso; no equivale aún a una guarda implementada. No añadir un estado ambiguo «carrier acepta su propia oferta».

## Criterios obligatorios y pruebas previstas

Todos los criterios siguientes están **pendientes de implementación y ejecución**. No se trasladan los resultados de las pruebas de manifiestos a estos archivos.

| ID | Criterio comprobable | Cómo aceptar |
| --- | --- | --- |
| DOC-01 | Tipos y alcance visibles | Distinguir ficha declarada, packing list, documento oficial aportado y evidencia; mostrar organización/envío/tercero responsable |
| DOC-02 | Subida privada validada | PDF/JPEG/PNG, máximo propuesto 10 MiB por archivo; validar contenido real además de extensión/MIME. Rechazar vacío, ejecutable, SVG/HTML y archivo fuera de límite; no marcarlo usable si falla |
| DOC-03 | Estado de disponibilidad separado de revisión | Subiendo/fallido/listo para revisión, con política de cuarentena/análisis acordada. No afirmar archivo seguro sin capacidad real de inspección |
| DOC-04 | Metadata y objeto correlacionados | Documento/revisión UUID, tamaño, tipo detectado, hash, actor, fechas y fuente; objeto subido sin metadata finalizada no aparece como documento completo |
| DOC-05 | Reintentos recuperables | Doble clic/red interrumpida conserva intención y no duplica revisiones; subida y finalización correlacionadas. Definir compensación/limpieza de objetos huérfanos |
| DOC-06 | Versionado e historial | Reemplazar crea revisión nueva. El pedido conserva la revisión usada; no se sobrescriben documentos revisados anteriormente |
| DOC-07 | Reutilización explícita por pedido | Elegir documento propio desde el envío, mostrar tipo/sujeto/fechas/alcance y registrar vínculo con revisión. Otro tenant o archivo de otro sujeto se rechaza |
| DOC-08 | Coherencia con el manifiesto | Packing list vinculada a request y manifestRevision. Si cambia la declaración, señalar «requiere revisar correspondencia»; no declarar automáticamente falso o actualizado el PDF |
| DOC-09 | Vigencia y ausencia de fecha | Revisar con fecha/intervalo de la regla; «sin fecha aportada» no equivale a vigente o vencido. Un documento sin vencimiento puede ser admisible según su tipo/regla |
| DOC-10 | Compartir con destinatario concreto | Consentimiento/acción auditada para carrier y relación; no publicar toda la biblioteca a candidatos. Revocación impide nuevos accesos; URLs firmadas breves pueden seguir utilizables hasta expirar, límite que debe documentarse |
| DOC-11 | Revisión carrier con alcance y versiones | Pendiente/aceptado/pide corrección/no aplica solo si procede. Actor, motivo, fecha, documentRevision y requirementVersion auditados. Una nueva revisión no hereda la aceptación anterior |
| DOC-12 | Checklist por etapa y fuente | Responsable, motivo, fuente/versiones y fecha límite visibles. Falta de configuración muestra «requisitos por confirmar», nunca «todo completo» |
| DOC-13 | Permisos y separación comercial | Pruebas negativas de rol, tenant, objeto, relación y CSRF; el browser nunca suministra autoridad. Aceptar documento no crea Booking, reserva, incidencia o salida |
| DOC-14 | Límites operativos y UI | Carga/progreso/error/reintento, descarga autorizada, teclado/móvil; política de retención/borrado/tamaño/cuota y comportamiento de auditoría definidos antes de exposición amplia |

El límite de 10 MiB es una propuesta técnica inicial, no configuración existente. Establecerlo en UI, servicio y almacenamiento de forma consistente antes de usarlo como criterio de una prueba.

## Matriz de roles por cerrar

| Acción | Propuesta inicial, pendiente de acordar |
| --- | --- |
| Ver documentos propios de la organización | Miembro activo autorizado según sensibilidad; no acceso universal implícito a cualquier empleado |
| Subir/revisar metadata corporativa | Owner/Supervisor; decidir por separado si Requester aporta documentos solo del envío |
| Compartir documentos con carrier | Actor de la organización con permiso explícito para esa relación |
| Revisar por el carrier | Miembro carrier habilitado sobre esa oferta/booking; no basta conocer el ID del documento |
| Descargar | Revalidar autorización en servidor y emitir acceso temporal; UUID y URL no son autorización permanente |

## Caso de aceptación cuando exista implementación

1. Subir ficha de empresa de demo desde Organización. Recargar: mismo documento/revisión, estado «Por revisar».
2. Abrir el pedido de 12 pallets ya confirmado. Elegir la ficha de la biblioteca y subir su packing list revisión 1.
3. Ver dos vínculos persistentes; ninguno aparece aceptado por defecto. El peso/cantidad del PDF se revisa contra la declaración, no se infiere autenticidad por hash.
4. Seleccionar la relación comercial acordada y compartir solo esos archivos.
5. Entrar como carrier autorizado; ver únicamente lo compartido. Registrar una solicitud de corrección con motivo.
6. Subir packing list revisión 2. Conservar revisión 1 e historial; exigir otra revisión de la nueva.
7. Registrar aceptación documental autorizada; comprobar que Booking/capacidad no cambian como efecto colateral.
8. Intentar acceso desde otro tenant/carrier y después de revocar. Rechazar nuevas lecturas/URLs según la política; documentar el límite de expiración de accesos ya emitidos.

## Qué deja listo el usuario ahora

- Dos PDF legibles, datos de demo y aviso visible, coherentes con la organización y manifiesto elegidos.
- Referencias/UUIDs copiados de la aplicación, sin «Pending linkage» cuando se pretendan vincular realmente.
- Decisión del momento de revisión y responsables.

La implementación se puede construir primero con el escenario propio y una política documental de demo identificada. Una matriz normativa internacional, emisión fiscal, validación externa, firma electrónica y OCR/IA que aprueba cumplimiento no forman parte de este MVP. Las referencias oficiales de las [plantillas](../templates/documentos-demo/README.md) son orientación contextual y no una lista legal universal.
