# CR-00: contrato candidato y mapa de grupos

27 de octubre de 2026. Dueño: Cristhian. PR #3. **Propuesta para revisión de Axel/Juan**, no contrato acordado por esos responsables. El primer contrato implementado es un candidato de contenido `0.1`; el manifiesto confirmado, sus tablas y comandos pertenecen a CR-01.

## Código entregado

- [Schema compartido](../../../cargomesh/src/shared/schemas/meta/declared-manifest.ts): `DeclaredManifestCandidateSchema`, `ManifestGroupBindingSchema` y tipos.
- [Mapeo de dominio](../../../cargomesh/src/server/modules/declared-manifests/domain/prepare-candidate.ts): `prepareDeclaredManifestCandidate(request, trustedContext)`.
- [Mapa completo del formulario](../PLAN_CR_DECLARACION_E_INTEGRACION.md): campos, unidades, responsabilidades y decisiones pendientes.

El mapper es una función pura sin Supabase, red, endpoint o importación del frontend. La autenticación, la lectura autorizada y la generación/reconciliación persistente de identidades corresponden al futuro servicio. Pasar un organizationId a esta función no autentica a nadie.

## Entrada y salida

La entrada es `FreightRequestV2ResponseSchema.shape.data`: el mismo DTO que devuelve el servicio existente. No acepta un borrador incompleto como si fuera un pedido válido. `trustedContext` procede del futuro servicio e incluye:

| Campo | Significado |
| --- | --- |
| `actorOrganizationId` | Organización del actor autenticado, no una afirmación del modelo/navegador |
| `expectedRequestDraftVersion` | Versión persistida esperada; no `inputRevision` del turno de IA |
| `groupBindings` | Lista completa de UUIDs de grupo y su índice en las unidades del request |

La salida declara `kind: DECLARATION_CANDIDATE`, contiene la referencia al pedido/organización/versión, ruta/ventanas/preferencias y el cargoSpecification validado con los schemas existentes. No contiene confirmación, autor de aprobación, manifestId, revisión de manifiesto, precios, reservas, claves o URLs privadas inventadas. Tampoco copia teléfonos/correos del request a esta lectura de carga.

Las ubicaciones, documentos de carga explícitos, tipos de embalaje, condiciones, temperaturas y grupos existentes se conservan. No se reduce el dominio a PALLET/BOX por el vocabulario más estrecho de la propuesta 1.0 de Axel. Los totales deben cumplir las reglas ya existentes: suma de cantidades por medidas de cada grupo. No se calcula un total de piezas mezclando pallets y cajas.

## Identidad de grupo

`sourceUnitIndex` solo localiza una unidad dentro de este snapshot. **No es una identidad entre revisiones.** `groupId` debe ser un UUID estable asignado/reconciliado por el servicio; no se deriva del índice ni de una etiqueta de pantalla `group-0`.

El schema comprueba que todos los índices estén cubiertos una sola vez, sin identidades repetidas. El mapper no crea UUIDs y no adivina si un grupo reordenado es uno anterior. Ese algoritmo/contrato sigue pendiente con Juan; al reabrir se deben recuperar las identidades desde persistencia, no generarlas otra vez.

La propuesta de Axel mantiene su `inputRevision` y sus ocho campos de carga. La selección de grupo se resuelve en el futuro servicio/aplicación, fuera de su respuesta 1.0; una respuesta ambigua no se aplica silenciosamente al primer grupo. Este código no implementa la aplicación de propuestas.

## Casos de contrato preparados

Los archivos siguientes son ejemplos sintéticos, sin inferencia y sin ejecución del mapper. La propiedad `expected` representa un resultado deseado para futura validación, no una prueba aprobada.

- [Dos grupos válidos](fixtures/cr00/complete.json): 12 pallets a 100 kg y 2 cajas a 5 kg; total 1.210 kg, grupos separados.
- [Medida pendiente](fixtures/cr00/missing-measurement.json): un input local incompleto; no debe enviarse al mapper de request persistido ni rellenarse con cero.
- [Reordenación y corrección](fixtures/cr00/revision.json): la cantidad cambia y los índices se reordenan conservando groupId, mediante un contexto explícito futuro.
- [Rechazos](fixtures/cr00/rejections.json): claves de dominio, revisiones y vínculos incorrectos; no callbacks ejecutados.

`FORBIDDEN_TENANT` y `STALE_DRAFT` son guardas del mapper. Datos inválidos generan ZodError; el futuro adaptador HTTP deberá normalizarlos según el contrato de errores vigente. No se ha registrado una ruta ni cambiado el comportamiento de guardado de la aplicación.

## Qué falta antes de cerrar CR-00

| Pendiente | Revisor/consumidor | Estado |
| --- | --- | --- |
| Aceptar separación inputRevision / requestDraftVersion / revisión de manifiesto | Axel y Juan | Pendiente |
| Acordar grupo objetivo de propuestas, manteniendo schema de Axel | Axel y Cristhian | Pendiente |
| Fijar identidad de grupo persistida entre revisiones | Juan y Cristhian | Pendiente |
| Definir comando de confirmación y snapshot inmutable con referencias a evidencia y aprobación | Juan y Cristhian | Pendiente CR-01 tras acuerdo |
| Audio/evidencia y transcripción | Luis y Cristhian | Pendiente |
| Verificar ejecutablemente schemas, mapeo y ejemplos | Cristhian; consumidores revisan | No ejecutado por instrucción del usuario |

No se ha realizado llamada real de IA, guardado, migración, despliegue, revisión visual o ensayo del formulario por esta entrega. CR-00 no está Done solo por estos archivos. Su aceptación requiere la revisión de consumidores y evidencia pertinente; CR-01 conectará el servicio de confirmación con el flujo manual actual.
