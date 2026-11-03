# Luis: explicación conectada al Passport — 1 noviembre 2026

Sección 1 del cierre solicitado ahora: AX-03, correspondiente al apartado 3 del plan del 31-oct. Implementada en la rama existente `codex/meta-luis`, sobre `97cd3fc3e7479afd2ec3da6247f997d0f2bb7384`. `origin/main` ya era ancestro al comenzar. Implementación registrada en `bb36cb2d2318f6b0e5c17f38d36dd2adbd1c4dda`. El usuario autorizó publicarla en el PR #10 hacia main; no se hace merge, despliegue o migración remota. Los checks del SHA anterior no validan este incremento.

Luis/Codex implementa esta conexión del producto general de cinco personas, fuera de Indie. Se reutilizan el cliente/configuración de Axel, las fuentes y el writer inmutable de Juan y el manifiesto confirmado de Cristhian. No se sustituye el contador de Ramón ni se atribuye a Luis la autoría de esos módulos.

## Comportamiento terminado

En `/tetris`, un Passport vigente ofrece **Generar explicación** por grupo e idioma español/inglés. El servidor lee las cantidades, unidad, calidad, cierre, versión y eventos autorizados del Passport; el navegador no envía cantidades. La IA selecciona un plan acotado de hechos y acciones, validado con el contrato existente. El renderer del servidor conserva los números del comparador, sin recalcular diferencias ni inventar causas.

El resultado muestra hallazgo, motivos, límites y siguientes pasos sugeridos. Los botones de eventos abren el historial y enfocan el evento real conservado en ese Passport, incluso más allá de las primeras 30 marcas. No se fabrica una URL de vídeo ni se afirma reproducción física del clip.

La explicación se guarda con el writer de Juan y reaparece al recargar, elegir el Passport o abrir su enlace directo. La descarga JSON contiene la explicación guardada. El historial conserva `session` y `passport` en la URL; cambiar de versión descarta lecturas antiguas. El Passport histórico queda consultable y no habilita generación nueva.

Si el comparador no permite concluir —alcance abierto/incierto, cobertura insuficiente o unidad incompatible— se muestra orientación de dominio, sin inferencia. Si Meta falla, no está configurado o devuelve referencias/plan inválidos, permanece la comparación numérica y sus fuentes. Ninguna sugerencia confirma entrega, incidencia, booking, manifiesto o modificación de cantidades; la revisión humana sigue siendo necesaria.

## Contrato y seguridad

`GET /api/v2/meta/loading-sessions/:sessionId/passports/:passportId/explanations` consulta intentos; nunca inicia inferencia. `POST` requiere actor autorizado, mismo origen en sesión por cookies y `Idempotency-Key` UUID. Cuerpo estricto:

```json
{
  "groupId": "<UUID del grupo del Passport>",
  "expectedVersion": 7,
  "language": "es",
  "retryOf": null
}
```

Los IDs se resuelven dentro de la organización autenticada. Un propietario/supervisor activo puede generar; un lector autorizado conserva consulta. Las respuestas, incluso fallos de autorización, llevan `private, no-store`. La ruta Next tiene `runtime=nodejs` y `maxDuration=60`; el núcleo recibe 43 segundos y el writer privilegiado limita cada petición a 6 segundos.

Los metadatos permitidos registran proveedor, transporte real/inyectado, modelo, razonamiento solicitado, latencia, uso informado e incertidumbre de procesamiento. No se almacenan claves, prompts, respuestas brutas ni URLs privadas. `estimatedCostUsd: null` significa coste desconocido, nunca coste cero.

## Reintentos y persistencia

1. El hook conserva clave UUID y cuerpo original antes del POST, en memoria y `sessionStorage`; una respuesta perdida o remontaje recupera la misma operación. El idioma no cambia el payload de un reintento ya iniciado.
2. PostgreSQL vincula la clave al actor/organización y a una huella canónica del comando. La fuente inmutable del Passport tiene su propia huella. Una clave con otro payload devuelve conflicto.
3. Bloqueos transaccionales e índice parcial permiten un solo intento activo por organización/Passport/grupo, incluso con claves distintas o solicitudes simultáneas.
4. Estados: `RUNNING → GENERATED → SAVED`, o `FAILED`. El resultado validado queda duradero en `GENERATED` antes del guardado final. Recuperarlo no vuelve a llamar al proveedor.
5. El guardado de Juan y la transición a `SAVED` ocurren en una transacción. Una respuesta perdida después del commit recupera el mismo resultado.
6. Un `RUNNING` de más de 90 segundos se considera interrumpido, con posible consumo previo. Consultar su estado no lo reinicia. Otro intento exige acción explícita y referencia `retryOf`; la UI pide confirmación cuando pudo haber procesamiento. Una respuesta vieja no completa el reemplazo.
7. Una lectura fallida después del guardado se recupera consultando estado: no queda marcada como adoptada hasta releer correctamente el Passport.
8. Se comprueban rol, estado, versión de sesión, manifiesto vigente y contenido material del request. Los bloqueos de filas cierran la carrera entre comprobación y escritura. Una revisión nueva no recibe la explicación antigua.

Transición añadida: `20261101120000_meta_passport_explanation_generation.sql`, registrada con hash y dependencia en el manifiesto. No se editan migraciones aplicadas. El cuerpo del writer original se conserva en `private`; su firma pública sigue disponible con una comprobación adicional de vigencia. El fixture pgTAP de Juan ahora prepara un manifiesto CR real en vez de una referencia inventada; conserva sus 36 aserciones.

La transición y su historial se aplicaron únicamente a `supabase_db_meta-luis-media-local` (API 65321), con respaldo previo privado fuera de Git. No se modificó la base de Amazon ni una base alojada.

## Pruebas con dobles

| Comando desde `cargomesh` | Resultado | Qué acredita |
| --- | --- | --- |
| `pnpm test:meta-explanation` | 48/48 | Núcleo/adapter, servicio, repositorio y hook; referencias, permisos/versiones, respuestas perdidas y concurrencia con puertos controlados |
| `pnpm test:meta-loading` | 40/40 | Sesiones/Passport, rutas autenticadas y contrato HTTP cliente |
| `pnpm test:v2-conversation` | 138/138, en dos procesos 106+32 | Regresión de conversación existente |
| `pnpm test:meta-draft-media` | 27/27 | Regresión de adjuntos/reintentos y perfil local |

El hook real se evalúa con React, storage y API controlados: clave estable, recuperación después de remontar, doble clic, respuesta tardía tras desmontar, consentimiento de reintento, histórico/lector/grupo ajeno, consulta sin inferencia y recuperación de una relectura fallida. Estos dobles no prueban atomicidad ni durabilidad SQL.

## Pruebas con persistencia local real

`pnpm smoke:meta-passport`, sin `--live`, pasó **13 casos** con Auth, Next, PostgREST y PostgreSQL reales y proveedor de explicación inyectado. Incluye seis reclamaciones simultáneas de una clave; claves distintas para un grupo activo; conflicto canónico; guardado y respuesta descartada/replay HTTP; reapertura exacta; anónimo/otra organización; writer inaccesible al navegador; versión histórica; cambio material entre staging y guardado; caducidad y respuesta tardía del intento reemplazado.

La caducidad se prepara con SQL administrativo exclusivamente en el contenedor local permitido, sin endpoint de depuración. Los casos de concurrencia no utilizan Meta ni consumen inferencia pagada. El script crea explícitamente solicitudes/manifiestos/sesiones sintéticas para la prueba; sus comandos de explicación no crean solicitudes, ofertas ni bookings.

pgTAP en esa misma base: `50_meta_loading_sessions.test.sql` **36/36**; `53_meta_passport_explanation.test.sql` **13/13**. Se comprueban RLS/grants, índice activo, writer público compatible, ausencia de bypass al writer privado e inmutabilidad. El perfil de base V2 incluye el nuevo archivo. El gate HTTP ejecutará el humo sin `--live`; CI rechaza ese flag de pago.

Comprobaciones adicionales: TypeScript, arquitectura (847 módulos/246 entradas cliente), inventario/hashes de migraciones, `git diff --check` y build de producción correctos. No se ejecutó el reset completo del gate contra otra base de desarrollo.

## Aceptación desde el navegador con Meta real

Se pulsó **Generar explicación una sola vez** sobre observación de origen `SYNTHETIC_RENDER`, modo `DEMO`: 10 BOX declaradas, 8 observadas y diferencia 2 suministrada por el comparador. No se generó un conteo físico con SAM.

| Dato | Valor registrado |
| --- | --- |
| Passport | `be84309a-15f0-43a5-9c54-4670b08f6d73`, versión 7 |
| Intento | `a313f783-1674-458e-94b3-b10856de2808`, `SAVED` |
| Proveedor/modelo | Meta Model API · `muse-spark-1.3` |
| Razonamiento solicitado | `medium` |
| Latencia del proveedor | 6593 ms |
| Uso informado | 1072 tokens de entrada, 1981 de salida |
| Coste | No informado por el adapter; `null` |
| Request ID | `a54e36dc-f546-4e7c-92de-12429daa87b6` |

Se comprobó recarga conservando la misma explicación, origen **Meta · API real**, foco/navegación al evento de 0:02.00, cambio a Passport v6 histórico con recarga y regreso a v7, y descarga del JSON con la explicación idéntica. Cero errores/avisos de consola. Layout sin desbordamiento de documento en CSS 1365×900 y 390×844; las tablas conservan su desplazamiento interno. Se restableció el viewport temporal.

[Abrir el Passport local ya explicado](http://127.0.0.1:8080/tetris?session=ab9051f1-77f7-4f12-b172-17b9b71d7cd9&passport=be84309a-15f0-43a5-9c54-4670b08f6d73). No requiere volver a pagar una generación para verlo. [Captura y registro verificable](evidence/luis-passport-explanation/README.md).

## Límites de esta aceptación

La conexión de explicación está terminada y comprobada localmente. Las observaciones son sintéticas: no acreditan captura física, reconocimiento del worker de Ramón, reproducción privada de vídeo, exactitud del conteo real o facturación/créditos. Esos ensayos y el hosting pertenecen al cierre integrado correspondiente, no se dan por realizados aquí. La revisión humana del equipo sigue pendiente. La publicación autorizada se prepara en el mismo PR #10. El resultado remoto del nuevo SHA debe consultarse en el PR; las verificaciones descritas aquí son locales.
