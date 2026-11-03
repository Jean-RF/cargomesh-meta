# DockMind worker — Ramón/Jean

Cuenta los bultos que cruzan una línea en un clip de carga. SAM 3.1 (Meta Model API) sigue los objetos; el conteo es una función pura que cuenta cruces de la línea, no IDs distintos. Lo que no se puede concluir queda en `REQUIRES_REVIEW` con el segundo exacto.

## Estado

| Pieza | Estado |
| --- | --- |
| Parser de la salida de SAM 3.1, trayectorias y conteo de cruces con marcas de revisión | Hecho, con pruebas |
| Normalización con ffmpeg (MP4 H.264, 10 fps, máx. 720p) y video anotado | Hecho, con pruebas |
| Cliente de SAM 3.1 (Files API con vencimiento + Responses en streaming) | Validado con el servicio real: [clips sintéticos](evidence/2026-10-29-sam-real-sinteticos.md) y [un video real de terceros](evidence/2026-10-29-sam-real-cinta-pexels.md) |
| Recorte a un corredor alrededor de la línea y separación de IDs reutilizados por SAM | Hecho, con pruebas; salió del video real (neto 5 → 10 de 11) |
| CLI local: `analyze`, `evaluate`, `synthetic` | Hecho |
| Ejecutor de jobs con callback firmado (contrato `dockmind.job.v2` / `dockmind.result.v2`) | Hecho, con pruebas con HTTP simulado |
| App de Modal (`modal_app.py`) | Escrita; **no desplegada**. Despliegue concreto, variables y accesos faltantes en [OPERACION.md](OPERACION.md) |
| Lanzador local (`dockmind serve-local`): mismo contrato, cabeceras y firma que Modal, solo en 127.0.0.1 | Hecho, con pruebas y un [recorrido por HTTP real](../../docs/meta/evidence/dockmind-local-launcher/README.md) |
| Paquete de evidencia por job y evaluación por grupo | Hecho, con pruebas: `pnpm evidence:meta-dockmind` y `dockmind evaluate` con `sha256` y `grupo` |
| Contrato Zod y verificación de firma en la app (`src/shared/schemas/meta/dockmind.ts`, `src/server/modules/analysis-jobs/`) | Hecho, con pruebas |
| Clips privados, jobs persistentes, entrega de la observación a Juan y rutas Hono montadas (`src/server/modules/analysis-jobs/`, migración `20261031120000_meta_dockmind_jobs.sql`) | Hecho en la rama del PR #6, con pruebas de servicio, Hono y pgTAP locales; **sin migrar la base alojada** |
| Interfaz en el slot `evidenceContent` del dashboard de Juan (`src/features/meta-dockmind/`) | Hecho, con pruebas de la lógica; falta revisión visual |
| Clips propios con referencia manual (RA-00) | Pendiente: hay que grabar un clip por grupo del pedido ([guía](clips/README.md#clips-por-grupo-del-pedido-ra-00)) |

## Instalar

```bash
cd cargomesh/dockmind-worker
python -m venv .venv
.venv\Scripts\activate          # en macOS/Linux: source .venv/bin/activate
pip install -e ".[dev]"
pytest
```

Necesita Python 3.12 y `ffmpeg`/`ffprobe` en el PATH.

## Analizar un clip propio

1. Graba siguiendo `clips/README.md` y anota la referencia manual en `clips/referencia.csv`.
2. Copia `.env.example` a `.env` y pon la clave de la Meta API (nunca se commitea).
3. Saca el primer cuadro con una cuadrícula de décimas para leer las coordenadas: `dockmind frame clips/todas.mp4`.
4. Analiza. La línea (los extremos de la puerta) y el punto de adentro van en fracciones del cuadro (0 a 1):

```bash
dockmind analyze clips/todas.mp4 --line 0.5,0,0.5,1 --inside 0.8,0.5 --concept "cardboard box" --unit BOX
```

Deja en `out/todas/`: `normalized.mp4` (lo que vio SAM), `sam_raw.txt` (respuesta cruda), `observation.json` y `overlay.mp4` (video anotado).

Si la línea es más corta que el cuadro, a SAM solo le llega un corredor alrededor de ella (`clip.roi` en la observación): así los bultos quietos del fondo no ocupan los 16 lugares de SAM. `--no-roi` analiza el cuadro completo.

5. Para ajustar la línea sin volver a pagar SAM, reusa la respuesta guardada:

```bash
dockmind analyze clips/todas.mp4 --line 0.45,0,0.45,1 --inside 0.8,0.5 --concept "cardboard box" --unit BOX --replay out/todas
```

6. Compara con la referencia manual (solo aquí se usa):

```bash
dockmind evaluate --reference clips/referencia.csv --observations out
```

Costo: SAM cobra USD 0,20 por cada 1 000 cuadros (mínimo 50). Un clip de 30 s a 10 fps son 300 cuadros: unos USD 0,06.

## Clips sintéticos

`dockmind synthetic` genera cuatro escenarios rotulados `SYNTHETIC_RENDER` (todas, falta_una, reingreso, oclusion) con su referencia y un fixture en formato SAM rotulado `FIXTURE`. Sirven para probar el parser, el contador y el video anotado sin cámara ni clave. **No son evidencia de que SAM funcione**: eso solo se demuestra con clips propios y la API real.

## Contrato con la app

- **Job (API → worker), `dockmind.job.v2`:** IDs de job, intento, organización, sesión, evidencia, grupo del manifiesto y revisión; URL firmada del clip, URL firmada para subir el video anotado, URL del callback, origen del clip y configuración (línea, unidad, concepto, `margin` y `min_track_frames`; la API los manda siempre explícitos y el worker devuelve los que usó).
- **Resultado (worker → API), `dockmind.result.v2`:** la misma identidad (job, intento, organización, sesión, evidencia, grupo y revisión) y `SUCCEEDED` con la observación completa, o `FAILED` con un código estable (`MEDIA_INVALID`, `NOT_CONFIGURED`, `PROVIDER_UNAVAILABLE`, `MODEL_OUTPUT_INVALID` o `INTERNAL`).
- **Firma:** headers `X-DockMind-Timestamp` y `X-DockMind-Signature: sha256=<HMAC-SHA256 de "<timestamp>.<cuerpo crudo>">`. La API verifica con `verifyDockMindSignature` y rechaza firmas de más de 5 minutos.
- **Entrega:** el worker exige una respuesta 2xx de la API. Sin respuesta, 408, 429 o 5xx, reenvía el mismo cuerpo con firma nueva hasta 3 veces (esperas de 2 y 8 s). Un 4xx no se repite. La API responde 503 si guardó el resultado pero no pudo registrar la observación en la sesión de Juan: el reenvío vuelve a intentar esa entrega, y si se agotan los envíos se recupera desde el dashboard sin volver a analizar. El recibo (`delivered`, `tries`, `http_status`, `problem`) queda en el resultado de la llamada de Modal y en el `modal.Dict` `cargomesh-dockmind-results` como `delivery:<job>:<intento>`.
- **Video anotado por intento:** la API manda una URL de subida de solo creación para la ruta del intento. El worker sube con `x-upsert: false` y declara `evidence.overlay_sha256`. Si el objeto ya existe (respuesta 409, o 400 con `statusCode` "409"), no lo reemplaza: lo informa como subido y la API compara el SHA-256 con el objeto guardado. Reintenta la subida hasta 3 veces solo ante timeout, 408, 429 o 5xx.
- **Reentrega sin volver a pagar SAM:** la observación calculada se guarda en ese `modal.Dict` antes de avisar, con clave por job, evidencia, procedencia y configuración. Si el aviso no llegó, el reintento que pide la API (otro intento del mismo job) la reutiliza si el clip descargado tiene el mismo SHA-256 y la manda con el intento nuevo. Junto a la observación se guarda la salida de SAM comprimida: con ella el worker vuelve a dibujar el video anotado y lo sube a la ruta del intento nuevo, sin llamar a SAM. Si el valor no cabe en el `modal.Dict`, se pierde solo esta reentrega barata. El worker nunca repite la inferencia por su cuenta, y los fallos no se guardan. Modal borra cada entrada tras 7 días sin uso.
- **Seguridad:** el worker solo descarga, sube y avisa a hosts de `DOCKMIND_ALLOWED_HOSTS`, y rechaza clips de más de 50 MB.

Esquema Zod y fixtures: `cargomesh/src/shared/schemas/meta/dockmind.ts` y `fixtures/`. Si el contrato cambia, regenera los fixtures con `python scripts/export_contract_fixtures.py` y corre `test:meta-dockmind`.

## Modal (RA-10)

Solo con autorización del Tech Lead. Paso a paso, variables y retiro en [OPERACION.md](OPERACION.md):

1. `pip install modal` y `modal setup` con la cuenta del equipo.
2. `modal secret create cargomesh-meta-worker --from-dotenv <archivo privado>` con `META_MODEL_API_KEY`, `DOCKMIND_CALLBACK_SECRET` y `DOCKMIND_ALLOWED_HOSTS=<ref>.supabase.co,<host de la app>` (el secret no lleva claves de Supabase)
3. `modal deploy modal_app.py` desde esta carpeta, con el venv activo.
4. Crear un token de proxy (`modal workspace proxy-tokens create`) y pasar a la app la URL de `jobs` y el token (`Modal-Key`/`Modal-Secret`).

Para probar sin Modal desde una web local: `dockmind local-credentials` y `dockmind serve-local` ([lanzador local](OPERACION.md#lanzador-local-probar-el-worker-desde-la-web-local)).

`POST /jobs` valida el contrato, lanza el análisis con `spawn` y responde de inmediato; el mismo job e intento nunca se lanza dos veces. El análisis corre en CPU con timeout de 15 minutos.

## Límites conocidos

- Meta advierte que los IDs de SAM pueden cambiar cuando un objeto entra, sale o queda tapado del todo; esos casos quedan marcados para revisión. Un ID que SAM le pasa a otro bulto después de salir del cuadro o con un salto imposible se separa en tramos.
- SAM sigue como máximo 16 objetos por cuadro: si se llega al límite, el resultado pide revisión.
- SAM cuenta lo que nombra el concepto. Un bulto que SAM nunca detecta no deja marca: esa falta solo aparece al conciliar con el manifiesto. Usa el concepto de la unidad declarada.
- La precisión se reporta solo sobre los clips evaluados; no se generaliza.
- DockMind no identifica bultos específicos ni ve lo que hay dentro de una caja.
