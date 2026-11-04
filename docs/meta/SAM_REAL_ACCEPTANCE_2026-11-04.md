# SAM 3.1: aceptación local con inferencia real

4 noviembre 2026. Axel asistido por Codex, `codex/meta-tetris-ai-integration`. El usuario autorizó explícitamente hasta dos llamadas pagadas usando solamente clips sintéticos locales. Se ejecutaron dos análisis; no se autoriza ni inicia un tercero. Esta nota sustituye el pendiente de autorización anterior, conservando su contexto histórico.

## Resultados

1. Análisis directo del clip generado `sintetico_todas.mp4`: Meta SAM 3.1, respuesta `resp_6aebbbe91fff85e6266c48d6`, 110 cuadros normalizados, seis entradas, cero salidas, estado OK y ninguna alerta de seguimiento. Las marcas de entrada fueron 3,1; 4,5; 5,9; 7,3; 8,7 y 10,1 segundos. No se pasó la referencia esperada al modelo.
2. Análisis nuevo mediante job local: manifiesto confirmado → sesión DEMO → Storage privado → Python/SAM real → callback HMAC → observación → revisión de cobertura QA sintética → cierre versionado → comparación → Passport persistido/reabierto. Ocho etapas del runner aprobadas; seis cruces, diferencia cero. Overlay descargado/verificado e identidad de bytes conservada. Repetición de callback y despacho no duplicó la observación ni consumió otro análisis.

Passport del segundo caso: `e536ee67-174a-4ec6-9b54-4a10aeda6e97`, versión de sesión 4. [Recibo completo saneado](evidence/tetris-sam-real-2026-11-04/recorrido-lanzador.json).

## Procedencia y límites

- Segmentador `META_SAM_API`, inferencia real; video `SYNTHETIC_RENDER`, no cámara física. La etiqueta agregada del paquete sigue siendo `SYNTHETIC_OR_FIXTURE` porque la captura es sintética: no es un fallo ni se sustituye por OWN_CAPTURE.
- No se enviaron videos privados ni datos de la base publicada. Meta recibió únicamente el clip sintético normalizado y el concepto de segmentación.
- Los dos análisis fueron autorizados. Se desactivaron reintentos automáticos SDK (`max_retries=0`), evitando multiplicar consumo silenciosamente. El runner de aceptación usa un cupo de un análisis nuevo cuando se habilita expresamente con `--sam --live`; su ejecución por defecto sigue en FIXTURE.
- El runner prueba un puente HTTP Hono local real, no un recorrido automatizado de navegador Next. El frontend 8096 y el launcher persistente 8765 siguen en LOCAL_LOOPBACK/FIXTURE para pruebas sin coste. Ese fixture solo corresponde a su clip sintético; no sirve como detector de otros videos.
- Meta texto/foto/explicación conserva sus adaptadores y configuración previos. Esta ronda no ejecutó explicación generativa pagada del Passport, clips propios, Modal ni despliegue alojado.
- Las referencias, cuotas, hashes e IDs no constituyen certificación física, transporte confirmado o incidencia comercial.

## Verificación técnica

TypeScript aprobado; 55 pruebas DockMind aprobadas. Se añade una prueba de la configuración del cliente para impedir reintentos automáticos de inferencia. El diagnóstico local tiene seis pruebas y mantiene el rechazo de Supabase alojada/producción para LOCAL_LOOPBACK. Ningún archivo `.env` ni credencial se incluye en la evidencia.

Para repetir inferencia real hace falta una nueva autorización de gasto y del material que se enviará. Sin ella, ejecutar solamente el modo FIXTURE. Producción sin worker conserva NOT_CONFIGURED.
