# Prueba como usuario: solicitud y manifiesto

28-oct-2026. Objetivo: comprobar que tu declaración manual se guarda, requiere revisión humana y vuelve a abrirse conservando todos los grupos. El expediente de PDF es el incremento siguiente y todavía no se puede probar dentro de la aplicación.

**Esta es una guía para ejecutar. Sus casillas vacías no son resultados aprobados.** La [evidencia técnica previa](../VALIDACION_CR01_2026-10-28.md) permanece separada de tu aceptación.

## Preparación, 2 minutos

1. Usa [el formulario local](http://127.0.0.1:8080/clients/freight-request/new), en la misma pestaña durante la prueba.
2. Debe abrir sin pedir contraseña y mostrar la cuenta sintética de la organización local. Si aparece login, una página de permisos o un aviso de solo lectura, registra el bloqueo y no introduzcas credenciales de producción.
3. Si recupera un pedido anterior, anota su referencia antes de pulsar **Reset / Reiniciar**. El botón vacía el formulario/selección local; no elimina pedidos guardados de la base. No lo uses si necesitas conservar cambios todavía sin guardar.
4. Selecciona **Road / Terrestre**. Air y Sea continúan no disponibles.
5. Puedes pulsar **Load V2 example / Cargar ejemplo V2** para completar códigos y contactos sintéticos. Luego modifica los datos del caso de abajo: el ejemplo heredado puede traer otra mercancía, requisitos y fechas antiguas.

Solo necesitas datos ficticios. Para esta prueba no hacen falta documentos reales, fotografías personales, pago, oferta ni reserva.

## Caso de prueba de 12 pallets

| Campo | Valor de prueba |
| --- | --- |
| Organización | La que muestra la cuenta local. Anótala exactamente; no cambies de organización para adaptar una plantilla |
| Origen | Sede de Lima disponible en el selector local |
| Destino | Sede de Arequipa disponible en el selector local |
| Categoría | Mercancía general / General |
| Descripción | `UAT CR-01 · packaged household goods · 12 pallets` |
| Embalaje principal | PALLET |
| Grupo 1 | 8 PALLET; 100 kg por unidad; 1 m³ por unidad; 100 × 100 × 100 cm |
| Grupo 2 | 4 PALLET; 100 kg por unidad; 1 m³ por unidad; 100 × 100 × 100 cm |
| Totales esperados | **12 pallets, 1.200 kg y 12 m³** |
| Carga divisible entre vehículos | Sí, para este escenario ficticio; no confirma que exista capacidad |
| Cada pallet indivisible | Sí |
| Apilable | No, para este escenario ficticio |
| Condiciones | Ninguna especial en este caso. Desmarca temperatura/sello que pudiera traer el ejemplo; no conservar requisitos de otro tipo de carga |
| Equipo | Camión furgón / BOX_TRUCK del catálogo; selección declarada, no capacidad confirmada |
| Recojo | 2 noviembre 2026, 08:00–18:00, America/Lima |
| Entrega | 3 noviembre 2026, 08:00–18:00, America/Lima |
| Remitente | Demo sender, teléfono ficticio `+12025550123`, sin correo |
| Destinatario | Demo recipient, teléfono ficticio `+12025550124`, sin correo |

Si pruebas después de esas fechas, elige ventanas futuras y usa las mismas al generar tu packing list. Las medidas son del pallet cargado, no de una caja interior. No mezcles PALLET con BOX para alcanzar 12.

**Comprobación de fechas:** después de editar cada campo, sal con Tab o pulsando otra etiqueta. Verifica la fecha en el resumen del paso 4 antes de guardar. Si sigue mostrando la fecha antigua, detén el guardado y registra el fallo; no des por cambiado el estado solo porque el control se veía rellenado. La ronda anterior acreditó persistencia/reapertura, no todas las variantes de entrada nativa de fecha del navegador.

## Recorrido principal, 10–15 minutos

| ID | Acción como usuario | Resultado para aceptar |
| --- | --- | --- |
| UAT-01 | Completa sedes, carga con **Add group**, ventanas y contactos; avanza al paso 4 | Ves dos grupos distintos, sus cantidades 8/4, medidas y totales 1.200/12; no hay datos vacíos sustituidos por cero |
| UAT-02 | Pulsa **Create DRAFT & evaluate / Crear DRAFT y evaluar** una vez | Aparece una referencia PED y versión guardada; el pedido continúa DRAFT. Anota referencia y requestId del enlace «Continue request» |
| UAT-03 | Busca más abajo **Cargo declaration / Manifiesto de carga** y pulsa **Prepare declaration for review** | Aparece la revisión pendiente con ambos grupos, UUIDs, ruta, ventanas y requisitos. Todavía no dice confirmado |
| UAT-04 | Antes de marcar la revisión, intenta confirmar; luego marca «I have reviewed…» y confirma | Confirmar empieza deshabilitado. Tras marcar y pulsar, aparece «Confirmed declaration», revisión 1 y «Matches the saved draft». No se crea una reserva |
| UAT-05 | Anota ambos UUID de grupo; recarga la página; selecciona Road si vuelve la pantalla de modos; pulsa **Reopen saved revision** | Recupera el mismo PED/requestId, cantidades 8/4, totales y **los mismos UUID**. No vuelve a crear el pedido |
| UAT-06 | Regresa a Cargo & units y cambia grupo 2 de 4 a 5; vuelve al paso 4 | Indica cambios locales. El manifiesto anterior no aparece actualizado como si se hubiera guardado; nuevos totales 1.300 kg y 13 m³ |
| UAT-07 | Pulsa **Save revision & reevaluate**; en el manifiesto relaciona grupo 1 con su grupo anterior y grupo 2 con el suyo; prepara y confirma otra vez | Mantiene requestId, aumenta su versión y manifiesto revisión 2; conserva ambos UUID y cambia solo los datos corregidos. El cuadro obliga a elegir identidades, no las adivina |
| UAT-08 | Recarga y vuelve a reabrir | Recupera revisión 2, cantidades 8/5, 1.300 kg y 13 m³, mismos UUID. El request sigue DRAFT |

El formulario de este corte restaura el request mediante `sessionStorage` de la pestaña. **UAT-05/08 no prueban recuperación en otro dispositivo, navegador o pestaña nueva.** La selección de cualquier pedido desde «My shipments» y retorno explícito al intake para continuar su manifiesto requiere aceptación adicional; no se da por resuelta por el simple refresh.

Para UAT-07, no selecciones «New group» para un grupo que solo cambió de cantidad. Usa «New group» cuando agregaste un grupo nuevo; al eliminar uno, deja de vincularlo, conservando la revisión histórica.

## Casos negativos, después del principal

| ID | Acción | Resultado esperado y límite |
| --- | --- | --- |
| UAT-09 | Deja cantidad en blanco o en 0; intenta avanzar | Marca el campo y no guarda una declaración completa. Devuelve luego el valor correcto |
| UAT-10 | Prepara una revisión y antes de confirmar cambia un dato de la carga | La revisión/consentimiento anteriores no permiten confirmar el dato nuevo; exige guardar y preparar de nuevo |
| UAT-11 | En una corrección intenta asignar el mismo UUID previo a los dos grupos | Rechaza el mapa de identidades; no produce una revisión confirmada |
| UAT-12 | Pulsa confirmar repetidamente durante la espera | Una revisión lógica y un mismo pedido; no duplicados. Existe evidencia técnica previa del reintento concurrente |

Vencimiento de 30 minutos, edición concurrente en otra pestaña, interrupción durante el envío, otra identidad de organización y Requester sin permiso de confirmación son casos técnicos. Ya existe evidencia SQL/HTTP de parte de ellos; no alteres cuentas/roles, reloj o base para reproducirlos manualmente. El consentimiento invalidado tras salir/volver al paso y el reintento después de vencimiento necesitan una ronda específica de interfaz antes de certificar recuperación general.

## Cómo probar los PDF hoy

1. Genera los dos PDF con las [plantillas y prompt](../templates/documentos-demo/README.md).
2. Sustituye **Pacific Produce Demo** por el nombre de la organización local, o conserva esa empresa únicamente como escenario documental independiente. No presentes ambos como si fueran la misma organización.
3. Para la packing list, copia del manifiesto confirmado la referencia del pedido, sus UUID/versiones y los UUID de grupo. No inventes esos datos.
4. Compara el PDF con la revisión guardada: misma empresa, ruta, fechas, cantidades, medidas y unidades.
5. Si usaste la corrección 8+5, genera PDF **revisión 2** con 13 pallets / 1.300 kg / 13 m³. Conserva el PDF revisión 1; no cambies su contenido para ocultar la corrección.
6. Comprueba legibilidad y aviso de demo. «Pending linkage» debe resolverse antes de usarlo como documento vinculado a ese pedido.

**Aquí termina lo comprobable hoy:** no hay botón de subir PDF, biblioteca privada, compartir con carrier ni aceptar/rechazar un documento en esta entrega. No busques una pestaña Documents que todavía no está implementada. Tener los PDF descargados prueba su preparación, no el punto 4 funcional.

## Registro de tu ronda

Copia este bloque y registra resultados reales, sin claves, cookies o datos personales:

```text
Fecha/hora y navegador:
URL y entorno: 127.0.0.1:8080 / Meta local
Organización visible:
Referencia PED / requestId:
Versión del request:
Revisión del manifiesto:
Grupo 1 UUID:
Grupo 2 UUID:
Casos ejecutados y resultado (PASS / FAIL / NO EJECUTADO):
Paso donde falló:
Dato introducido / dato guardado observado:
Mensaje exacto o captura:
¿Se conservó el mismo pedido al recargar?:
Revisión visual (claridad, espera, errores, móvil):
```

Una diferencia de empresa, unidades, fecha, cantidades, ID o revisión bloquea aceptar el caso. Una respuesta UNKNOWN de serviceability o mapa sin clave/coordenadas no debe presentarse como defecto del guardado documental ni como disponibilidad comercial confirmada.
