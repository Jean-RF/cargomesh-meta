# Operación del worker DockMind — Ramón/Jean

Paquete de ejecución y configuración del worker. Estado al 1-nov-2026:

- **Modal no está desplegado.** No hay URL del worker ni proxy token emitidos.
- **No hay un entorno Meta alojado comprobado** (ni Supabase ni app con https). Mientras no lo haya, el flujo alojado no está disponible.
- Lo que sí corre hoy es el **lanzador local** (`dockmind serve-local`), con el mismo contrato, las mismas cabeceras y la misma firma. Se probó por HTTP real contra una Supabase local: [recorrido](../../docs/meta/evidence/dockmind-local-launcher/README.md).

## Qué falta y quién lo da

| Falta | Lo da | Para qué |
| --- | --- | --- |
| Acceso al workspace de Modal del equipo (miembro con permiso de despliegue) | Dueño del workspace, con aprobación del Tech Lead | `modal deploy`, el secret y el proxy token |
| Autorización para desplegar el worker y emitir el proxy token | Tech Lead | Publicar el endpoint `jobs` |
| Entorno Meta alojado: proyecto Supabase con las migraciones en orden (`…_meta_dockmind_jobs` `20261031120000` y `…_attempt_overlays` `20261101180000`) y la app Meta con URL https | Tech Lead; Vercel según [infra/meta](../../infra/meta/vercel.md) | Que Modal pueda descargar el clip, subir el video y llamar al callback |
| Clave de la Meta API y permiso de gasto para SAM real | Responsable de esa cuenta | Inferencia real: USD 0,20 por cada 1 000 cuadros, mínimo 50 (unos USD 0,06 por un clip de 30 s) |
| Clips propios de los grupos A y B, con referencia manual y permiso de uso | Ramón/Jean | RA-00 (ver más abajo) |

Nada de esto se hace desde este repositorio ni sin la autorización de su responsable. Amazon queda fuera de este paquete.

## Modos

| | `MODAL` (por defecto) | `LOCAL_LOOPBACK` |
| --- | --- | --- |
| Worker | Endpoint `jobs` de la app de Modal `cargomesh-dockmind` | `dockmind serve-local` en 127.0.0.1 |
| URLs | Solo https (clip, video anotado y callback) | Solo `http://127.0.0.1:<puerto>`: Supabase local, app local y lanzador |
| Dónde se permite | Cualquier entorno | Solo fuera de producción: la app lo rechaza con `NODE_ENV=production` o en Vercel |
| Cambio de modo | Explícito con `DOCKMIND_WORKER_MODE`; no hay paso automático de uno al otro | |

Con un modo desconocido, una URL que no corresponde al modo o una variable faltante, la API responde `NOT_CONFIGURED` y no crea el job.

## Variables

Nombres y lugar; ningún valor va en chat, PR, commit, capturas ni en este repositorio.

**App web** (servidor; en Vercel, variables del proyecto Meta; en local, `cargomesh/.env.local`):

| Variable | Alojado (`MODAL`) | Local (`LOCAL_LOOPBACK`) |
| --- | --- | --- |
| `DOCKMIND_WORKER_MODE` | `MODAL` o sin definir | `LOCAL_LOOPBACK` |
| `DOCKMIND_WORKER_URL` | La URL que imprime `modal deploy` para la función `jobs`. Formato de Modal: `https://<workspace>[-<sufijo del entorno>]--cargomesh-dockmind-jobs.modal.run` | `http://127.0.0.1:<puerto del lanzador>/jobs` |
| `MODAL_PROXY_TOKEN_ID`, `MODAL_PROXY_TOKEN_SECRET` | Proxy token del workspace (`wk-…` y `ws-…`). Viajan como `Modal-Key` y `Modal-Secret` | Los genera `dockmind local-credentials` (`local-wk-…` y `local-ws-…`); no son tokens de Modal |
| `DOCKMIND_CALLBACK_URL` | `https://<host de la app Meta>/api/v2/meta/dockmind/callback` | `http://127.0.0.1:<puerto de la app>/api/v2/meta/dockmind/callback` |
| `DOCKMIND_CALLBACK_SECRET` | Aleatorio, 32 caracteres o más. El mismo valor que en el secret de Modal | Lo genera `dockmind local-credentials` |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Del proyecto Supabase Meta. La de servicio, nunca con prefijo `NEXT_PUBLIC_` | De la Supabase local (`http://127.0.0.1:<puerto>`) |

**Secret de Modal `cargomesh-meta-worker`** (solo alojado):

| Variable | Valor |
| --- | --- |
| `META_MODEL_API_KEY` | Clave de la Meta API de quien autoriza el gasto |
| `DOCKMIND_CALLBACK_SECRET` | El mismo de la app |
| `DOCKMIND_ALLOWED_HOSTS` | `<ref>.supabase.co,<host de la app Meta>`, separados por coma |

El worker no lleva claves de Supabase: solo usa las URLs firmadas que manda la app.

**Cómo se pasan:** quien despliega genera los valores en su máquina y los guarda en un archivo privado fuera de cualquier repositorio. Al secret de Modal se cargan con `modal secret create cargomesh-meta-worker --from-dotenv <archivo privado>`, para que no queden en el historial del shell. A Vercel los carga quien tiene acceso, desde el panel del proyecto. Si otra persona necesita un valor, se comparte por el gestor de contraseñas o el canal seguro que acuerde el equipo.

## Despliegue en Modal (cuando se autorice)

Requisito previo: el entorno Meta alojado con https. Sin él, Modal no tiene de dónde descargar el clip ni a quién avisar.

1. En `cargomesh/dockmind-worker`, con el venv activo: `pip install -e ".[dev,modal]"` y `pytest`.
2. `modal setup` (o `modal token set`) con la cuenta del workspace del equipo. `modal profile list` debe mostrar ese workspace.
3. Crear el archivo privado con las tres variables del secret y cargarlo: `modal secret create cargomesh-meta-worker --from-dotenv <archivo privado>`.
4. `modal deploy modal_app.py`. Imprime la URL de la función `jobs`, que requiere proxy auth (`requires_proxy_auth=True`).
5. Emitir el proxy token: `modal workspace proxy-tokens create --name cargomesh-dockmind-app` (o en el dashboard, en Settings > Proxy Auth Tokens). El secret se muestra una sola vez. En un workspace con RBAC, el token se habilita para el entorno con `modal workspace proxy-tokens allow`.
6. Cargar en la app las variables de la tabla y volver a desplegarla.
7. Comprobar, en este orden:
   - un POST a la URL sin cabeceras responde 401;
   - un job con un clip propio en una sesión VERIFICATION llega a SUCCEEDED, se entrega a Juan y su video queda VERIFIED;
   - `pnpm evidence:meta-dockmind --out <carpeta> <jobId>` arma el paquete de ese job.

   Hasta entonces, el flujo alojado no está cerrado.

Para retirarlo: `modal app stop cargomesh-dockmind`, `modal workspace proxy-tokens delete` del token y borrar el secret.

## Conectividad

Las llamadas del flujo son estas:

1. La app hace POST a `DOCKMIND_WORKER_URL` con `Modal-Key` y `Modal-Secret`.
2. El worker descarga el clip con una URL firmada de 1 hora.
3. El worker sube el video anotado con una URL firmada de solo creación, de 2 horas.
4. El worker llama al callback de la app, firmado con HMAC.

Un worker en Modal corre en la nube. No alcanza `127.0.0.1:64321` (Supabase local) ni `127.0.0.1:8080` (app local). Por eso hay dos caminos, y ninguno abre túneles ni puertos públicos:

- **Alojado:** una Supabase Meta alojada (`<ref>.supabase.co`) y la app Meta desplegada con https, con sus hosts en `DOCKMIND_ALLOWED_HOSTS`. Está pendiente de la autorización de la tabla de arriba.
- **Local:** el lanzador corre en la misma máquina que la Supabase y la app locales.

## Lanzador local: probar el worker desde la web local

Garantías:

- Escucha solo en 127.0.0.1.
- Responde 401 sin `Modal-Key`/`Modal-Secret` válidos.
- Acepta URLs http solo de los dos orígenes del archivo: la Supabase local y la app local.
- Firma el callback con el mismo HMAC.
- Lanza cada job e intento una sola vez.
- El segmentador se elige al arrancar y no tiene valor por defecto. SAM real lleva un cupo de llamadas pagadas; FIXTURE va rotulado `real_inference: false`.
- Imprime un recibo por job, sin URLs ni secretos, con el consumo del proveedor (`provider`).

Uso, en `cargomesh/dockmind-worker` con el venv activo. La Supabase local tiene que correr con Storage: sin él no hay clips ni videos anotados.

1. Archivo privado, fuera de cualquier repositorio; el comando lo exige:

   ```bash
   python -m dockmind local-credentials --out <carpeta privada>/dockmind-local.env --storage http://127.0.0.1:64321 --app http://127.0.0.1:8080
   ```

   El lanzador usa el puerto 8765 (`--port` lo cambia). El archivo trae las seis variables `DOCKMIND_*` y `MODAL_PROXY_*` de la app y el origen de Storage del lanzador.
2. Copiar esas líneas a `cargomesh/.env.local`, reemplazando las `DOCKMIND_*` y `MODAL_PROXY_*` anteriores, y reiniciar el front de 8080 en modo desarrollo.
3. Arrancar con el segmentador elegido:
   - FIXTURE, sin costo: `python -m dockmind synthetic --out <carpeta> --only todas`, y después `python -m dockmind serve-local --config <archivo> --segmenter fixture --fixture <carpeta>/sintetico_todas.fixture.txt`. En una sesión DEMO se sube `sintetico_todas.mp4` como `SYNTHETIC_RENDER`. El FIXTURE describe ese clip; con otro clip, el conteo no describe lo que se ve.
   - SAM real, pagado: `python -m dockmind serve-local --config <archivo> --segmenter sam --paid-calls <N>`, con `META_MODEL_API_KEY` en `dockmind-worker/.env`. Después de N análisis nuevos, el siguiente falla con `NOT_CONFIGURED`. Un reintento que reusa la observación no gasta cupo.
4. En la web: sesión, evidencia, pedir el análisis y ver el resultado.
5. Al terminar: Ctrl+C, quitar esas líneas de `.env.local` y borrar el archivo privado.

Límites:

- No prueba Modal, la red pública ni una base alojada.
- La reentrega sin SAM vive en la memoria del lanzador: si se reinicia, se pierde esa reentrega, no un resultado.

Prueba automática del mismo camino: `CARGOMESH_LOCAL_SECRETS_PATH=<status json> pnpm e2e:meta-dockmind-launcher`.

## Clips propios por grupo (RA-00)

El pedido es `8b0fed7d-4cc3-4cc3-b819-8f68fdeefebe`, con el manifiesto `163cd0cc-a0d2-4f8e-bcde-310c689fcafd` en su revisión 1. Tiene dos grupos:

| Grupo | ID | Unidades |
| --- | --- | --- |
| A | `879dc96b-3c00-43e1-b772-619996b2b713` | 8 BOX |
| B | `d1b2aab3-29d2-4b90-8a70-d369c0dd1f6c` | 4 BOX |

Reglas:

- **Un clip por grupo.** El clip A muestra solo las 8 cajas de A cruzando la línea, y el clip B solo las 4 de B. No se usa un clip con las 12 cajas para los dos grupos: un total global no prueba ninguno.
- **Un job por clip**, pedido en la sesión VERIFICATION de ese pedido, con el `groupId` de su grupo y fuente `OWN_CAPTURE`. La cobertura es `COMPLETE` si se ve toda la carga del grupo y `PARTIAL` si no. La declara el operador, y la revisión humana la confirma o la corrige en el dashboard de Juan.
- **El conteo sale del pipeline**, con SAM real. La referencia manual va en `clips/referencia.csv` (fuera de Git), con el SHA-256 y el grupo de cada clip. Solo la lee `dockmind evaluate`.
- **Permiso de uso:** se completa una copia privada de [clips/permiso.example.md](clips/permiso.example.md) por sesión de grabación. En la evidencia solo se cita su referencia.
- Si el pipeline marca `REQUIRES_REVIEW` o `INSUFFICIENT_EVIDENCE`, se conserva así. Una revisión humana no convierte un FIXTURE en inferencia real.

Pasos:

1. Ramón/Jean graba los clips A y B según [clips/README.md](clips/README.md) y anota la referencia y el permiso.
2. Los clips llegan a la máquina de la base Meta local por un canal privado. Nunca por el repositorio.
3. Se suben en la sesión VERIFICATION y se pide un job por grupo. El lanzador corre con `--segmenter sam --paid-calls 2`, autorizado por el responsable de la clave.
4. `pnpm evidence:meta-dockmind --out <carpeta> <job A> <job B>` arma un `evidencia.json` por job.
5. `python -m dockmind evaluate --reference clips/referencia.csv --observations <carpeta>` compara grupo por grupo.
   - Cada clip esperado aparece siempre: `EVALUADO`, `FAILED`, `PENDIENTE` o `SIN_RESULTADO`, sin cantidades si no hay conteo.
   - Un job de otro grupo, sin inferencia real, sintético, con otra cobertura o sin cobertura declarada sale marcado y no cuenta como acierto.
   - La aceptación por grupo exige que todos los clips esperados de ese grupo sean exactos.

## Evidencia de un job real

`evidencia.json` (`dockmind.evidence.v1`, de [evidence-pack.ts](../src/server/modules/analysis-jobs/evidence-pack.ts)) trae:

- **Identidad:** job, intento, organización, sesión, evidencia, grupo, revisión del manifiesto y cobertura.
- **Clip:** SHA-256 subido y SHA-256 analizado, que deben ser iguales.
- **Configuración:** la línea, el punto de adentro (IN cruza hacia él), la unidad, el concepto, `margin` y `min_track_frames`.
- **Procedencia:** segmentador, `real_inference`, modelo, `request_id` y versión del análisis.
- **Conteo:** entradas, salidas y neto, con los segundos y cuadros de cada cruce, las marcas de revisión con su segundo y el estado.
- **Consumo del proveedor.**
- **Video anotado del intento:** el SHA-256 guardado y el SHA-256 de una lectura nueva del bucket.
- **Entrega a Juan.**

`label` resume la procedencia. Solo `OWN_CAPTURE_REAL_INFERENCE` sirve como evidencia de conteo real.
