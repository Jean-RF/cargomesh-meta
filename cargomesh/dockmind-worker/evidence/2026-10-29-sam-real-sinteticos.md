# Primera corrida real de SAM 3.1 (29 de octubre de 2026)

**Qué prueba:** que la cuenta del equipo llega a la Meta Model API, que el cliente del worker (Files con vencimiento y Responses en streaming) funciona con el servicio real, y que el parser y el contador leen la respuesta real de `sam-3.1`.

**Qué no prueba:** la precisión con video de una carga real. Los clips son `SYNTHETIC_RENDER` generados con `dockmind synthetic`; la validación con clips propios (RA-00 y RA-01) sigue pendiente.

## Entorno

- Modelo: `sam-3.1` en `https://api.meta.ai/v1`. La clave autentica y lista 9 modelos, incluido `sam-3.1`.
- Worker `dockmind-0.1.0`, Python 3.12, Windows. Clip normalizado a 1280×720 y 10 fps.
- Concepto `cardboard box`, unidad `BOX`, línea vertical en el centro y adentro a la derecha.

## Resultados

| Clip | Request | Cuadros | Cajas de SAM | Esperado | Observado | Estado | Segundos SAM | Costo estimado USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `sintetico_todas.mp4` | `resp_6ae2d7690ce69b9a6dd34154` | 110 | 249 | 6 | 6 | OK | 10,2 | 0,022 |
| `sintetico_falta_una.mp4` | `resp_6ae2d7824b68b4476fcb41c8` | 125 | 253 | 5 | 5 | OK | 9,58 | 0,025 |
| `sintetico_reingreso.mp4` | `resp_6ae2d791f1931f9fedd041db` | 135 | 200 | 4 (5 entran, 1 sale) | 4 (5 entran, 1 sale) | OK | 9,16 | 0,027 |
| `sintetico_oclusion.mp4` | `resp_6ae2d7a2e0ca0cb6092a40aa` | 110 | 173 | 4 | 3 | REQUIRES_REVIEW | 8,88 | 0,022 |

Total: unos USD 0,10 y menos de 40 s de SAM para 480 cuadros.

## Lectura

- Tres clips dan el conteo exacto sin marcas.
- En la oclusión, SAM sigue el borde visible del bulto mientras la franja lo tapa y después le asigna otro ID. DockMind no cuenta ese cruce: marca `ID_SWITCH_SUSPECTED` a los 6,0 s ("El ID 2 desaparece junto a la línea y aparece el ID 4") y deja el resultado en revisión humana. Es el comportamiento esperado.
- Los resultados valen solo para estos cuatro clips sintéticos. No se generaliza a cámaras reales.

## Cómo repetirlo

```bash
dockmind synthetic
dockmind analyze clips/sinteticos/sintetico_todas.mp4 --line 0.5,0,0.5,1 --inside 0.8,0.5 --concept "cardboard box" --unit BOX --source SYNTHETIC_RENDER
dockmind evaluate --reference clips/sinteticos/referencia_sintetica.csv --observations out
```

Requiere `META_MODEL_API_KEY` en `.env`, que nunca se commitea.
