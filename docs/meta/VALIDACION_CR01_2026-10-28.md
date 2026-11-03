# CR-01: validación local y formulario conectado

28-oct-2026, America/Lima. Cristhian con Codex. Rama `codex/meta-cristhian`, PR #3. El usuario autorizó ejecutar las pruebas y eligió expresamente una base local aislada para Meta.

## Entorno y migración aplicada

- Proyecto Supabase local: `meta-cr01-validation`, contenedor `supabase_db_meta-cr01-validation`.
- API/Auth/REST: `http://127.0.0.1:64321`; PostgreSQL: `127.0.0.1:64322`; frontend: `http://127.0.0.1:8080`.
- Perfil local y evidencias de consola fuera del checkout de desarrollo, en la carpeta hermana `salida/meta-cr01-validation/`; no se copiaron credenciales ni datos de Amazon.
- Cadena estructural V2 instalada en esta base nueva, incluida `20261028041227_meta_declared_manifest_commands.sql`. La versión está registrada en `supabase_migrations.schema_migrations`.
- Escenario sintético `supabase/scenarios/v2-road-baseline/seed.sql`, ejecutado con su guarda `local_only=1`. Los datos de prueba no son capacidad o transportes reales.
- Las cuatro tablas privadas nuevas tienen RLS y carecen de permisos directos de cliente. El RPC conserva su guarda de actor/tenant, rol, versión e idempotencia.
- `plpgsql_check_function_tb` del comando privado no produjo hallazgos. Es comprobación local de esa función, no auditoría de toda la base o del producto.
- `.env.local`, ignorado por Git, contiene solo configuración de este entorno. El acceso automático usa una cuenta sintética local mediante el mecanismo nativo existente; no hay pantalla de login ni se saltan las guardas de API.
- No se aplicó ninguna migración alojada, ni se modificó AWS, Vercel o el repositorio/despliegue Amazon.

## Formulario y revisión

La pantalla existente `/clients/freight-request/new` conserva sus cuatro pasos y el guardado/revisión del mismo request. Después de guardar, el paso 4 incorpora `ManifestReview`:

1. Lee el manifiesto actual del pedido autorizado; vacío significa que aún no existe, no un manifiesto fabricado.
2. **Preparar manifiesto para revisar** persiste una preparación y muestra el contenido devuelto por el servidor.
3. Presenta ruta/ventanas, categoría, embalaje, descripción, totales, división de carga, requisitos, temperatura, cada unidad y sus identidades. También muestra preferencias y referencias documentales cuando existen; no las presenta como documentos verificados.
4. Exige marcar la revisión humana antes de habilitar **Confirmar y guardar manifiesto**.
5. Los cambios locales, otra versión o el vencimiento invalidan esa revisión; no se confirma una propuesta vieja.
6. Una corrección de un pedido ya confirmado exige identificar explícitamente cada grupo existente o marcarlo como nuevo. No se deduce identidad de la posición en otra versión.
7. **Reabrir revisión guardada** lee el ID exacto persistido. Recargar la página recupera el request y consulta su manifiesto actual conservando todos los grupos.

El cliente valida envelopes, scope, versiones y recibos. Los reintentos de una misma intención conservan la clave; una confirmación distinta no crea otra revisión para la misma versión. Una lectura fallida se muestra como error, sin sustituirla por datos de ejemplo. La confirmación no envía el request ni reserva transporte.

## Resultados ejecutados

| Comprobación | Resultado observado |
| --- | --- |
| Servicio y cliente/modelo de revisión (`test:meta-manifests`) | 11/11 pasan |
| Intake completo (`test:v2-intake`) | 88/88 pasan |
| Workflow de conversación (`test:v2-chat-workflow`) | 104/104 pasan; no se invocó un modelo real |
| Acceso demo nativo (`test:workspace-demo`) | 46/46 pasan |
| pgTAP de manifiestos (`supabase/tests/49_meta_declared_manifests.test.sql`) | 34/34 pasan; transacción rollback |
| Inventario/hashes de migraciones | pasa; migración nueva registrada en `migration-manifest.json` |
| Función SQL nueva y RLS | lint sin hallazgos; RLS activo en las cuatro tablas |
| TypeScript y arquitectura | pasan; Node local 24.15.0, no se iguala ficticiamente al Node 24.20.0 de CI |
| HTTP real, frontend → Hono → Supabase local | pasa; descripción debajo |
| Navegador, usando los botones del formulario | guardar → preparar → revisar → confirmar → recargar → reabrir, con dos grupos e identidades conservadas |

Las suites comparten algunos casos; no sumar estos conteos como pruebas únicas. Las comprobaciones de navegador son funcionales: el diseño visual/responsive sigue a cargo del usuario. No se ejecutó un build completo de producción en esta validación.

### Aceptación HTTP reproducible

Desde `cargomesh/`, con el entorno local anterior levantado:

```text
node --env-file=.env.local --conditions=react-server --import tsx scripts/meta-manifest-http.ts
```

El script exige la API aislada `127.0.0.1:64321` y la cuenta sintética prevista; no puede apuntarse por variables a Supabase alojado. Usa las opciones reales y los mappers del formulario para crear un pedido etiquetado de prueba. Lo conserva para inspección local; no borra datos ni crea bookings.

Último caso HTTP: request `2cc7c9e1-2e19-43b7-b23c-cc5c3b59e6fe`, versión 2; manifiesto `54715302-900c-40c9-9b7b-1938664727a0`, revisión 2, dos grupos. Comprobaciones:

- Reintentar la creación conserva el requestId.
- Dos confirmaciones concurrentes con la misma clave conservan el manifiesto y devuelven un recibo repetido.
- Dos confirmaciones con claves diferentes producen un éxito y un conflicto 409, con una sola revisión lógica.
- La corrección conserva requestId, aumenta su versión y permite reordenar grupos preservando los UUID elegidos explícitamente.
- Reabrir recupera unidades, medidas, cantidades e identidades exactas. La revisión histórica anterior permanece intacta.
- Otra organización no lee el pedido; sin sesión se obtiene 401; un POST con cookies desde origen ajeno devuelve 403.
- La sesión sintética automática se establece sin pantalla de login y el pedido final continúa en DRAFT.

### Caso desde la interfaz

Se usaron exclusivamente controles visibles de la pantalla y datos sintéticos. Pedido `8fef264d-9465-47a8-a2ed-bf40b621ae00` (`PED-9509`), versión 1; manifiesto `04b68052-0098-4c92-82fd-292ab6698952`, revisión 1.

Los dos grupos se recuperaron después de recargar y abrir la revisión guardada con los UUID `7bc9ba90-40cf-40dd-aed6-7b0ec844d3bc` y `56fe591e-d0e7-426e-abf1-04de581c41d7`, cantidades 8 y 3 y totales de 4.830 kg / 19,575 m³. No hubo segunda creación del pedido al recargar.

El perfil base contiene fechas y carriers sintéticos heredados; su evaluación puede ser UNKNOWN y el mapa carecer de coordenadas. Eso no se transforma en disponibilidad, cotización o booking. No se certificó una contratación real ni una demo comercial vigente con esta aceptación técnica.

## Límites que siguen pendientes

- Aplicación alojada y despliegue Meta, build de producción y gate del PR sobre el nuevo SHA.
- Revisión de consumidores Axel/Juan; no se afirma aceptación por haber conectado nuestro formulario.
- Documentos privados/reutilización organizacional, medios foto/audio, interpretación real, sesiones/dashboard, observaciones y Passport pertenecen a los incrementos siguientes.
- Definición operativa de retención/cleanup y límites de uso antes de exponer ampliamente la API.
- La identidad explícita de grupos entre revisiones sigue siendo una decisión humana; no hay conciliación automática de grupos externos.

Referencias técnicas: [funciones y privilegios](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [pruebas de base de datos](https://supabase.com/docs/guides/local-development/testing/overview).
