# AX-03 — explicación fundamentada, sección 3

**Estado actualizado, 1-nov-2026:** la conexión pendiente descrita en el corte histórico siguiente ya se implementó en `codex/meta-luis`, reutilizando los puertos de Juan integrados en main. Incluye interfaz, autorización, vigencia material, guardado/reapertura, reintentos duraderos y una aceptación de navegador con Meta real sobre datos sintéticos. [Pruebas y límites actuales](LUIS_PASSPORT_ACCEPTANCE_2026_11_01.md). Implementación `bb36cb2`, con publicación autorizada en el mismo PR #10; sin despliegue ni migración alojada. Las referencias anteriores a falta de credenciales/read model reflejan la fecha de aquel corte.

Corte: 28-oct-2026. Luis, implementación asistida por Codex. Producto general, fuera de Indie. Cambios **locales y sin publicar** en `codex/meta-luis`, destinados al PR #7. Con autorización del usuario, se sincronizó main mediante el merge local `c085d07` (incluye `a5c2a4d`). No se integró el PR a main ni se hizo push, despliegue o inferencia real. Se restauraron las tres secciones locales y se verificó que los 19 archivos nuevos conservaban su contenido frente al respaldo de Git; los conflictos de scripts/documentación conservaron ambos avances.

## Entrega local

`cargomesh/src/server/ai/meta/explain-reconciliation.ts` implementa el núcleo de lectura/explicación, con dependencia explícita de autorización de Juan y composición efectiva con el cliente compartido de Axel mediante `metaExplanationProvider()`, predeterminado si no se inyecta otro puerto. No incluye otro SDK, cliente HTTP, lector de secretos ni catálogo de errores. No registra una ruta ni modifica el comparador, el manifiesto, el review o la interfaz del Passport.

La solicitud acepta únicamente `schemaVersion`, `reconciliationId`, `reconciliationVersion` e idioma `es|en`. Las cifras, unidades, cierre, suficiencia, revisiones y eventos se leen por un puerto autorizado del servidor; no se aceptan del navegador. El actor procede del contexto autenticado y su correo no se entrega al proveedor.

El núcleo valida el alcance recibido y su vigencia antes de la llamada y después de la respuesta. La huella incluye toda la proyección, no solo la versión de conciliación: cambios de manifiesto, observación, estado, suficiencia o timecode invalidan el resultado. El puerto de Juan debe comprobar relaciones/permisos actuales y comparar esa huella contra una lectura vigente. Una huella no acredita acceso ni autenticidad física. El consumidor debe volver a cotejar identidad, revisiones y huella al aplicar una respuesta; esta comprobación local no elimina una carrera posterior en el navegador.

## Explicación y límites

Se distinguen dos formatos: `ExplanationPlanShapeSchema` es el **plan estructurado del proveedor**; `ExplanationShapeSchema` es el **resultado que el servidor redacta para el consumidor**. No se debe enviar el segundo al modelo ni aceptar texto libre generado usando solo `validateExplanation()`. El borrador v1 aún sin consumidores conectados añade `reasons` a la salida y a sus fixtures.

Para MATCH o DIFFERENCE_PROPOSED cerrados, suficientes y compatibles, la petición exige JSON Schema estricto y razonamiento **medium**. El modelo selecciona motivos verificables, acciones permitidas y referencias exactas. El servidor redacta el resumen, motivos y límites en español o inglés. No intenta demostrar la verdad de texto arbitrario con expresiones regulares: texto libre, causas, conteos nuevos o comandos no caben en el plan y se rechazan.

Ejemplo sintético: esperado **12 PALLET**, observado **11 PALLET**, diferencia suministrada **1 PALLET**. La salida muestra esos tres valores y «Diferencia pendiente de revisión». No hace la resta, no decide el signo y no certifica pérdida, robo o responsabilidad. Juan conserva la corrección del cálculo y el convenio del signo; los números se copian incluso si el productor suministrara una diferencia errónea. Esta frontera no es otro comparador.

Los motivos disponibles describen sesión cerrada, suficiencia declarada por el comparador, misma unidad y pertenencia de referencias a eventos recibidos. No atribuyen una causa a un evento. Las referencias conservan exactamente `eventId`, `evidenceId` y `timecodeMs`; no generan enlaces privados. Juan/Cristhian deben resolver el acceso temporal al medio y la transformación temporal real del vídeo antes de navegar al frame.

NOT_READY, INSUFFICIENT_EVIDENCE, INCOMPATIBLE_SCOPE y OUTDATED devuelven una guía `source: DOMAIN_STATUS`, con `explanation: null` y cero llamadas a Meta, incluso sin clave. Una sesión abierta muestra progreso sin declarar faltante. PALLET/BOX no se convierten ni suman; desconocido sigue siendo null. La calidad consumida es la suficiencia declarada por Juan, no una confianza visual inventada.

Las acciones son propuestas: CHECK_MANIFEST, REQUEST_HUMAN_REVIEW y REVIEW_EVIDENCE con referencia validada para estados comparables; las guías inciertas pueden sugerir más evidencia o esperar al cierre. No existe un puerto de escritura, confirmación, incidencia o booking. La persona revisa antes de cualquier comando implementado por su dueño.

## Fallos y cancelación

Sin configuración válida se devuelve NOT_CONFIGURED. Fallos del proveedor, 401/429/500 o timeout producen PROVIDER_UNAVAILABLE sin mensajes privados ni reintentos automáticos. JSON, modelo, plan o referencias inválidos producen MODEL_OUTPUT_INVALID. Una revisión/permisos cambiados descartan toda la explicación. La cancelación del solicitante lanza AbortError genérico y una respuesta tardía no se aplica. El presupuesto total es de hasta 45 s, incluyendo lectura, autorización y proveedor, acotado también por el timeout configurado.

La explicación es opcional: el consumidor conserva la comparación numérica que ya obtuvo de Juan cuando esta función falla. No se sustituye por ceros, coincidencia, un fixture ni una explicación simulada. Este comportamiento del núcleo está probado; el comportamiento visual del Passport aún no está conectado ni acreditado.

Los metadatos distinguen INJECTED de META_MODEL_API e incluyen modelo, razonamiento solicitado, intento, latencia y uso si existe. `estimatedCostUsd: null` significa coste desconocido; un timeout puede haber procesado/cobrado. No se registran prompts, respuestas brutas, URLs privadas o secretos. Ninguno de estos tests acredita facturación, razonamiento efectivo o calidad de una llamada real.

## Composición realizada, pendientes y evidencia revisada

- PR #5 de Juan, `codex/meta-juan@cc45634`, seguía abierto al revisar. Su carpeta de reconciliación y matriz de contratos son documentación; no se encontró un comparador, fixture de productor ni Passport ejecutables. `ExplanationInput` sigue siendo una proyección **propuesta**, no el contrato aceptado de Juan.
- Tras la sincronización autorizada, se reutilizan `readMetaProposalConfig()` y `requestMetaJson()` de Axel. El único cambio al cliente compartido añade `reasoningEffort?: low|medium` con valor predeterminado `low`. La interpretación conserva su comportamiento y la explicación solicita `medium`. La clave/modelo/budgets proceden de la configuración existente; no se devuelven secretos. Los tipos de error reutilizan `ProposalErrorCode`. Esta extensión local debe revisarse con Axel, sin presumir una aceptación del equipo.
- El consumidor real debe proporcionar `ReconciliationAccess`: autorización por actor/relaciones, proyección de revisiones/unidad/calidad/alcance y comprobación de vigencia completa. Los puertos inyectados de tests no certifican RLS ni persistencia.
- Faltan la composición del read model de Juan, ruta autenticada y presentación/estado de error en el Passport con sus dueños, además de las credenciales y una llamada real autorizada. El usuario confirmó que aún no tiene clave Meta ni proyecto Supabase Meta separado. No se crearon servicios remotos ni se usó el entorno Amazon. La auditoría posterior sí compuso ASR en la sección 2 y corrigió el plazo durante la comprobación final de permisos y una carrera de cancelación; ver [auditoría completa](LUIS_AUDIT_2026_10_28.md).

Fuentes oficiales revisadas: [salida estructurada](https://dev.meta.ai/docs/structured-output) y [razonamiento](https://dev.meta.ai/docs/reasoning). JSON Schema no demuestra la verdad semántica; por eso se usa un plan acotado y redacción del servidor. La documentación indica que los tokens de razonamiento cuentan dentro del presupuesto de salida, no son texto que se deba exponer.

## Verificación ejecutada

| Comando | Resultado local |
| --- | --- |
| `pnpm test:meta-explanation` | 29/29, incluido SDK compartido con HTTP inyectado, plazo posterior al proveedor y carrera de cancelación; sin inferencia real |
| `pnpm test:meta-ai` | 37/37 de Axel; interpretación conserva razonamiento low y guardas |
| `pnpm test:meta-base` | 32/32; contratos, entorno y humos seguros |
| `pnpm test:meta-voice` | 30/30; incluye ASR del SDK compartido |
| `pnpm test:v2-conversation` | PASS, 106 + 32 pruebas |
| `pnpm test:v2-chat-workflow` | PASS, 104 pruebas |
| `pnpm typecheck` | PASS; corregida durante la verificación una propiedad opcional en el test de JSON Schema |
| `pnpm check:architecture` | PASS, 790 módulos y 236 entradas de cliente |
| `pnpm smoke:meta` | NOT_CONFIGURED, salida 2 esperada sin credenciales; dependencias de Axel presentes y cero llamadas |
| `pnpm build` | PASS, compilación, validación de tipos y generación de páginas |
| `git diff --check` | PASS |

Casos: 12/11 cerrado, coincidencia y cero conocido, BOX, diferencia firmada, sesión abierta, insuficiencia, unidades incompatibles, antigüedad, identidad/tenant/actor, revisión y permisos cambiados, referencias/timecodes falsos, motivos/comandos/prosa no permitidos, JSON/uso/modelo inválidos, ausencia de configuración, fallos, cancelación y dependencias que no respetan la señal.

Las pruebas de SDK ejercitan la configuración, URL, autorización, JSON Schema, razonamiento medium, ausencia de tools/store, uso, límites, rechazos y ausencia de reintentos del cliente real, con HTTP inyectado. No son llamadas a Meta. No se ejecutó una prueba visual/de punta a punta: el núcleo aún no está conectado al Passport y su read model.
