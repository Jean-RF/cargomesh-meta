# Memoria de conversación y formulario — 31-oct-2026

## Problema observado

El usuario declaró 1.000 frascos de medicamentos y después respondió de forma ambigua a la alternativa Road. El proveedor recibía únicamente el último mensaje y algunos campos del borrador: la declaración previa todavía no estaba en esos campos y se perdía. La selección de Road desde el dashboard tampoco navegaba al formulario; el selector de transporte solo se activaba dentro de la ruta de formulario.

## Cambio

- `ConversationContextSchema.conversation`: historial opcional, cerrado a roles user/assistant, hasta 16 turnos de 350 caracteres.
- `conversationMemory`: turnos recientes y hasta cuatro declaraciones/correcciones anteriores como anclas; orden cronológico, transcripciones parciales omitidas, emails/teléfonos enmascarados. `start over` corta el historial anterior. El botón de conversación nueva ya reinicia el historial del componente.
- `ConversationChat` envía ese contexto tanto en selección como en ROAD_INTAKE. El historial informa la respuesta, pero no prueba permisos ni completa campos por sí solo.
- El prompt distingue declaraciones previas del usuario de suposiciones del asistente; conserva cantidades/mercancía conversadas, prioriza correcciones recientes y aclara frases contradictorias o mal transcritas. Solo el mensaje actual aporta citas para campos nuevos.
- Se mantiene el requisito de consentimiento explícito para Road. «yeah we're not» y «hello shipment» requieren aclaración. «I would like to go with road shipment», «yeah» ante la elección de Road o el botón correspondiente permiten continuar.
- Sin borrador/selección activos, el selector del asistente también funciona en el dashboard. Confirmar Road navega al formulario existente y selecciona el paso 1. Ese paso no invoca el guardado del request ni una autorización comercial.

No se convierten 1.000 frascos automáticamente en 1.000 cajas o pallets. El embalaje, medidas, peso y condiciones faltantes siguen requiriendo información y revisión.

## Evidencia

- Prueba focalizada de contexto, selector y adaptador: 30/30.
- Suite `test:v2-chat-workflow`: 111/111. Incluye ocho casos del comando focalizado; el total distinto con los 22 del adaptador es 133.
- `tsc --noEmit --incremental false`: exit 0.
- Peticiones autenticadas reales a `/api/v2/conversation/interpret` usando el historial sintético de los frascos:
  - TRANSPORT_SELECTION: pidió aclarar «hello shipment» y ofreció Road; campos vacíos; META; request `16e41443-1b04-4970-951b-eb03c703ae17`, 3.644 ms.
  - ROAD_INTAKE: «You told me you need to ship at least 1,000 bottles of Medicine. Next for this Road intake we need your origin pickup facility…»; campos vacíos; META; request `6ab9a60c-1f92-4f11-860c-090807b2fb63`, 3.807 ms.

Dos muestras funcionales, sin benchmark ni coste inferido. No se crearon pedidos para comprobar memoria.

## Límites y revisión del usuario

Es memoria acotada de la conversación activa, no un historial persistente entre recargas/dispositivos. Los campos del borrador guardado siguen su persistencia existente. El historial es entrada no confiable y no se interpreta como evidencia verificada, acceso autorizado ni consentimiento de booking.

No se realizó inspección visual. Para comprobar la navegación: abrir el asistente del dashboard, declarar la mercancía, elegir explícitamente Road o pulsar «Continue with Road» y comprobar que aparece el formulario; preguntar después qué mercancía se había declarado. El guardado exige completar los datos y confirmar la revisión existente.

Cambios locales en la rama de Cristhian; sin commit, push, merge ni despliegue de este ajuste.
