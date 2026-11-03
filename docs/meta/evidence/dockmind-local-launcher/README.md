# DockMind: aceptación por HTTP real con el lanzador local (corrida del 1-nov-2026)

Ramón/Jean. Los datos están en [recorrido-lanzador.json](recorrido-lanzador.json), que genera `cargomesh/scripts/meta-dockmind-launcher-e2e.ts` (`pnpm e2e:meta-dockmind-launcher`).

## Entorno

- **Supabase local** del perfil V2 (`supabase-v2`, CLI 2.117.0, 127.0.0.1:58321), con las dos migraciones DockMind y el seed sintético `v2-road-baseline`. Solo corrían Auth, PostgREST, Storage y Kong; ningún banco histórico.
- **App:** `createHonoApp` en un puerto de 127.0.0.1, servida por HTTP, con `DOCKMIND_WORKER_MODE=LOCAL_LOOPBACK`. No se sustituye nada de la app: rutas, wiring, despachador de Modal, Storage y entrega a Juan son los reales.
- **Worker:** el proceso `python -m dockmind serve-local` con `--segmenter fixture`.
- **Credenciales:** las creó `dockmind local-credentials` en una carpeta temporal fuera del repositorio, que se borra al terminar.

## Qué es real y qué no

| Real | Sustituido y rotulado |
| --- | --- |
| HTTP de punta a punta: Bearer del usuario sintético, despacho con `Modal-Key`/`Modal-Secret`, descarga y subida con URLs firmadas de Storage y callback HMAC | Segmentador: el FIXTURE del clip sintético `sintetico_todas` (`real_inference: false`). No hay llamada a SAM ni costo |
| Persistencia del job, verificación del video anotado y `recordLoadingObservation` de Juan | Modal: lo reemplaza el lanzador local, que corre el mismo `run_job` |
| Lectura del video del intento con la URL que emite la API | La repetición del callback la hace la prueba, con el cuerpo y la firma originales |

## Resultado

| Paso | Resultado |
| --- | --- |
| Sesión y clip | Sesión DEMO de Juan sobre un manifiesto CR-01 confirmado. Clip privado subido con URL firmada y READY |
| Proxy auth | El lanzador responde 401 sin las cabeceras |
| Job | Despacho HTTP al lanzador. El worker descarga, analiza, sube `...-a1-overlay.mp4` y llama al callback. Queda SUCCEEDED, DELIVERED y VERIFIED, con neto 6 BOX y una observación de Juan |
| Video correcto | La URL de reproducción es la del intento 1. Su SHA-256 coincide con el que declaró el worker |
| Sin duplicados | El callback repetido recibe 202 `ALREADY_RECORDED`. La recuperación recibe 409 `DELIVERY_NOT_PENDING`. El despacho repetido al lanzador vuelve con `duplicate: true` y reintentar un SUCCEEDED da `ANALYSIS_NOT_RETRYABLE`. Al final hay una observación, un análisis y un solo callback del worker |
| Evidencia | `buildEvidencePack` sobre el job persistido da el rótulo `SYNTHETIC_OR_FIXTURE`, el video verificado con una lectura nueva del bucket, el mismo SHA-256 de clip subido y analizado y `billable: false` |

## Fuera de esta corrida

- Modal desplegado, SAM real, base alojada y captura propia: no se usaron. El flujo alojado no está cerrado.
- El paso del intento 2 que reusa la observación sin SAM está cubierto en `tests/test_local_server.py` y en el [recorrido anterior](../dockmind-local-e2e/README.md), no en esta corrida.
- La interfaz no se probó en el navegador en esta corrida.
