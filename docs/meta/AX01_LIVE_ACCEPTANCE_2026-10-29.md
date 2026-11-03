# AX-01 — aceptación real de texto, 29 de octubre de 2026

Responsable: Axel, asistido por Codex. Repo Meta; rama `codex/meta-axel`, código `74bfe467758000de30bc80a70c956d91c02c07c9`. Resultado local, sin despliegue ni merge.

## Ejecución y resultado

Comando desde `cargomesh/`: `pnpm smoke:meta-text --live`.

Entrada sintética propia: `12 pallets of machine parts, 100 kg per pallet.`

| Dato | Resultado real |
| --- | --- |
| Aceptación | PASS; exit 0 |
| Modo / transporte | META / META_MODEL_API |
| Modelo devuelto | muse-spark-1.3 |
| Request ID | 59e7d00e-622e-4d19-a982-94d4b52e43cd |
| Latencia de esta llamada | 5.677 ms |
| Intentos | 1 |
| Tokens de entrada / salida | 2.297 / 1.113 |
| Costo | Desconocido; estimatedCostUsd=null |
| Propuesta | 12 PALLET, 100 kg por unidad; dimensiones pendientes |
| Escrituras comerciales | 0 |

La prueba valida el contrato de respuesta, las cantidades/unidad y los faltantes. No guarda solicitudes ni usa datos de una organización. Esta muestra individual no es un benchmark ni acredita el flujo autenticado del navegador.

El primer intento dentro del entorno de ejecución restringido devolvió PROVIDER_UNAVAILABLE en 52 ms, sin request ID ni uso informado. La repetición con acceso de red permitido pasó. Ese fallo no demuestra una clave inválida ni un cobro nulo.

## Secretos y límites

La clave se cargó desde `.env.local`, ignorado por Git y no rastreado. No se imprimieron ni guardaron claves, cookies o respuestas crudas del proveedor. No se publicaron archivos de entorno ni se cambiaron AWS, Vercel, Supabase o Modal.

La aceptación real de texto de AX-01 queda comprobada. Revisión humana y prueba autenticada/visual siguen pendientes. No acredita fotos, etiquetas, transcripción, SAM, conteo o Passport.

## Siguiente incremento del plan

AX-02: interpretar foto, etiqueta y transcripción autorizadas, manteniendo evidencia, revisión de entrada y confirmación humana. El adaptador debe dejar peso/medidas pendientes si una foto no los acredita y descartar resultados de revisiones antiguas. La integración de medios de Cristhian y la transcripción de Luis son dependencias separadas; el procesamiento de video corresponde al worker de Ramón/Jean.
