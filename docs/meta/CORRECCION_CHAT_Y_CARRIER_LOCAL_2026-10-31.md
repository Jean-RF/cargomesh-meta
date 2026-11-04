# Corrección de conversación y Carrier local — 31-oct-2026

## Qué fallaba

1. Carrier: `POST /api/auth/workspace-session` devolvía 503 `DEMO_ACCOUNT_UNAVAILABLE`. El entorno no tenía cuenta Carrier y la función `read_v2_carrier_portal_access` devolvía `[]`: había operadores sintéticos activos pero ningún grant en `private.v2_catalog_grants`.
2. IA: el backend real ya respondía en modo META, pero `ConversationChat` interceptaba todos los mensajes mientras no se eligiera transporte. «hola» y «cuanto es 1 +2» nunca llegaban al endpoint desde esa pantalla.

## Corrección local

- Se configuró la cuenta sintética QA existente como Carrier en `.env.local`, privado e ignorado; no se cambió su contraseña ni se crearon cuentas.
- `supabase/scenarios/v2-meta-local-access/seed.sql` verifica usuario/operador/Carrier exactos y agrega el grant `CARRIER_EDITOR` para un solo Carrier, con expiración. Aplicado solo al contenedor cuyo proyecto es `meta-cr01-validation`, sin migración remota ni cambios en políticas de autenticación.
- Se reinició únicamente el frontend Meta para leer el entorno.
- `transport-chat.ts` distingue selección explícita ROAD, modo no disponible y conversación. Saludos/preguntas pasan al proveedor.
- El contexto de interpretación admite el campo opcional `screen`. En `TRANSPORT_SELECTION`, Meta debe producir HELP sin campos ni declaración; una respuesta que intenta proponer datos se rechaza. El cliente tampoco aplica campos en esa pantalla.
- El estado de elección del transporte forma parte del alcance de la petición, para descartar respuestas tardías después de elegir Road.
- Las rutas, revisiones, confirmaciones y validaciones del formulario ROAD existente se conservan. No se agregaron nuevas conexiones de foto/audio ni se habilitó Baseten.

## Verificación

| Comprobación | Resultado |
| --- | --- |
| Sesión Carrier por HTTP | 200, `ok=true`, destino `/carriers` |
| `/carriers` con la cookie devuelta | 200, sin `data-workspace-entry=carrier` ni bloqueo de acceso |
| Adaptador Meta y selector: Node/tsx | 22/22 |
| `npm run test:v2-chat-workflow` | 106/106 |
| `tsc --noEmit --incremental false` | exit 0 |

Inferencia real por `/api/v2/conversation/interpret`, con sesión sintética de Cliente y contexto `TRANSPORT_SELECTION`:

- «cuanto es 1 +2»: META, «Es 3…», campos vacíos, 2.617 ms; request ID `00d9fc0a-4dfe-4abd-81ed-05e9124ec326`.
- «hola»: META, saludo natural y siguiente selección explícita de Road, campos vacíos, 3.995 ms; request ID `2a4c8c84-8994-437a-bab5-298c8a3a3b61`.

No se guardaron pedidos ni se ejecutaron acciones comerciales. Dos muestras no son un benchmark. La revisión visual queda con Cristhian; la verificación realizada fue de código, pruebas y HTTP. No hubo commit, push, merge, build de producción o despliegue en esta corrección.

## Para comprobarlo como usuario

1. Recargar `http://127.0.0.1:8080/carriers`; la cuenta demo debe abrir el espacio.
2. Volver a Cliente y abrir un envío nuevo. Antes de elegir Road, preguntar «cuanto es 1 +2» o escribir «hola»: la respuesta debe contestar el mensaje e invitar a seleccionar Road.
3. La pregunta no debe seleccionar un modo, crear un pedido ni rellenar cantidades. Seleccionar Road explícitamente para continuar con el formulario.

Los cambios de identidad entre pestañas siguen sus guardas existentes. No borrar cookies ni desactivar permisos como solución al error de configuración.
