# Web8080 y lanzador DockMind8765 conectados

2-nov-2026, 08:22 PET. Base `main@1f07e8a`, rama de trabajo `codex/meta-cristhian` y cambios locales propios pendientes de commit. Solo Meta local. Sin despliegue, cambios de esquema o llamadas pagadas.

## Qué quedó configurado

- Frontend real Next en `http://127.0.0.1:8080`, un único proceso de desarrollo.
- Base/API Meta `meta-cr01-validation` en64321; solo sus cinco contenedores (DB/Auth/REST/Kong/Storage). Docker Desktop estaba apagado; al iniciarlo recuperó esos cinco contenedores. Los perfiles históricos siguen detenidos.
- Launcher real `dockmind serve-local` en `http://127.0.0.1:8765/jobs`, enlazado solo a loopback, proxy auth y callback HMAC. 401 sin credenciales.
- Credenciales aleatorias generadas por `dockmind local-credentials`, fuera de Git, en `%LOCALAPPDATA%/Temp/cargomesh-dockmind-local/dockmind-local.env`. Se conservó respaldo privado de `.env.local` previo. No se imprimieron valores ni se escribieron secretos en documentación.
- `.env.local` ignorado de la app usa `LOCAL_LOOPBACK`. No se alteraron sus credenciales Meta/Supabase existentes ni la política de acceso. El modo local continúa prohibido en producción/Vercel.
- Logs/PIDs de procesos propios en esa carpeta privada; FFmpeg portátil en el directorio de herramientas de integración, agregado al PATH solo de los procesos iniciados. Sin instalación global, GPU, SAM o Modal.

## Recorrido de aceptación

Nuevo arnés opt-in `cargomesh/scripts/meta-web-worker-demo.ts`. A diferencia del arnés conectado anterior, **solo llama por HTTP al frontend real8080**. No instancia routers ni sustituye dispatcher/storage/provider dentro de la app. El launcher carga el FIXTURE explícito que corresponde a cada clip; ambos clips vienen del renderizador sintético y no representan filmación física.

Pedido existente `8b0fed7d-4cc3-4cc3-b819-8f68fdeefebe`, manifiesto `163cd0cc-a0d2-4f8e-bcde-310c689fcafd` rev1. Sesión DEMO nueva `5394399d-e3a3-404c-8181-0b97aad29d49`; el Passport previo del1-nov se conserva.

| Grupo | Declarado | Resultado del contador | Job | Estado |
| --- | ---: | ---: | --- | --- |
| A:879dc96b-3c00-43e1-b772-619996b2b713 | 8 BOX | 8 BOX | 2d5c69e1-8dd4-4b08-a57d-1fe2cfa21700 | SUCCEEDED / DELIVERED / overlay VERIFIED |
| B:d1b2aab3-29d2-4b90-8a70-d369c0dd1f6c | 4 BOX | 3 BOX | 913c49f3-a710-4fd5-af0d-15d7dd9227c0 | SUCCEEDED / DELIVERED / overlay VERIFIED |

Se reinició únicamente nuestro launcher para cambiar de fixtureA a fixtureB antes del segundo job. No se aplicó un fixture de un grupo al clip del otro. El total esperado es aserción posterior al contador, no respuesta inyectada al pipeline.

Se comprobaron subida privada/READY, job e intento, callbackHMAC200, observación única por grupo, procedencia y SHA del clip, reenvío del mismo comando sin segundo job, descarga del overlay y SHA. Exportación adicional con el comando de evidencia de Ramón: ambos overlays coinciden con su SHA guardado y quedan `SYNTHETIC_OR_FIXTURE`, `billable=false`.

Cobertura COMPLETE y cierre fueron comandos QA automatizados sobre el escenario sintético; **no son revisión física por Cristhian**. Nuevo Passport `beb6cc9f-7ad4-4a6d-99a8-9d26f1bd709a`: A MATCH, B DIFFERENCE_PROPOSED/diferencia1BOX; guardado y reabierto vigente. Cero llamadas de explicación; no se generó un texto que parezca salida Meta real.

Se probaron también las sesiones automáticas Cliente/Carrier mediante POST al endpoint de workspace y cookies reales (sin imprimirlas). Ambas HTTP200. Lectura del Passport y sus dos jobs mediante cookie de Cliente, TetrisHTTP200. El Carrier conserva los dos documentos ACCEPTED; booking `654a02b7-c366-4298-8e1a-003481cbfb0a` sigue AUTHORIZED. No se confirmó capacidad, incidente, transporte o entrega.

TypeScript del conjunto y arnés nuevo sin errores. Revisión visual pendiente de Cristhian; no se usó navegador para declararla aprobada.

## Evidencia saneada

- [Resultado](web-worker-2026-11-02/result.json).
- [Lecturas con cookies](web-worker-2026-11-02/cookie-readback.json).
- Paquetes [grupo A](web-worker-2026-11-02/group-a-evidencia.json) y [grupo B](web-worker-2026-11-02/group-b-evidencia.json).
- Estado de reintentos/claves QA en `meta-hackathon-integration/tmp/web-worker-20261102/state.json`, fuera del repo Meta. Nunca contiene access tokens o URLs firmadas.

## Qué abrir y qué no se debe asumir

[Passport para revisión](http://127.0.0.1:8080/tetris?session=5394399d-e3a3-404c-8181-0b97aad29d49&passport=beb6cc9f-7ad4-4a6d-99a8-9d26f1bd709a).

El launcher quedó activo con **FIXTURE del grupo A solamente**. Archivo compatible: `meta-hackathon-integration/tmp/connected-demo-20261101/group-a.mp4`. No analizar otros vídeos con ese fixture: su conteo no describiría esos bytes. Un cambio aB requiere detener nuestro listener8765 y reiniciarlo con `group-b.fixture.txt`; cambiar aSAM requiere clips propios y autorización del gasto. No existe fallback automático de fixture aSAM.

Para repetir desde terminal, cargar `.env.local` y ejecutar el arnés con `META_WEB_WORKER_STATE_DIR` y `META_WEB_WORKER_CLIP_DIR` explícitos. `--group=a` y `--group=b` requieren fixture correspondiente y sesión OPEN; `--finalize` requiere ambos grupos, cierra y guarda Passport. Para otro recorrido usar un directorio de estado nuevo; no editar un resultado anterior ni resetear la base. Un resultado de esta prueba no acredita RA-00/SAM/Modal.

Próximo bloqueo externo: clips propios A/B, referencia y permiso de Ramón. Nuestro entorno ya puede recibirlos; se deberá pasar explícitamente a modo SAM local con cupo autorizado. La publicación de nuestros cambios locales y el entorno de jueces continúan como tareas separadas.
