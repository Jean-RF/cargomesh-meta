# Fluidez técnica e integración local — 2 noviembre 2026

Alcance solicitado: fluidez/rendimiento/conflictos, **sin diseño o aceptación visual**. Checkout `codex/meta-cristhian`, base `main@1f07e8a` más trabajo local pendiente de commit. Next en modo desarrollo8080, API Meta64321 y launcher8765 FIXTURE. No cambió infraestructura, esquema, datos comerciales, proveedores, estilos o textos de producto. No se usó navegador ni se llamó Muse/SAM pagado.

## Qué se midió

Arnés `cargomesh/scripts/meta-flow-performance.mjs`: sesiones reales por cookies de Cliente/Carrier, lecturas HTTP al frontend, primer acceso separado de muestras calientes.90 respuestas en19 rutas iniciales y46 respuestas en8 rutas API después del ajuste, todasHTTP200. Tres muestras calientes por página, cinco por API de Cliente. No es prueba de carga ni benchmark p50/p95 de producción; se muestran medianas/máximos de muestras pequeñas, no SLA.

| Lectura | Primer acceso de esta corrida | Mediana caliente antes | Observación |
| --- | ---: | ---: | --- |
| Dashboard Cliente | 27153ms | 589ms | Compilación de desarrollo en primera visita |
| Lista solicitudes | 4438ms | 447ms | Tres lecturas calientes |
| Detalle de solicitud | 5100ms | 731ms | Incluye lectura comercial y catálogo |
| Formulario nuevo | 3091ms | 306ms | No se ejecutó inferencia |
| Organización | 2061ms | 322ms | Página; biblioteca documental carga por API |
| Tracking lista | 2537ms | 361ms | No acredita rendimiento con25 ejecuciones |
| Carrier entrada | 13317ms | 328ms | Compilación de desarrollo en primera visita |
| Carrier órdenes | 383ms | 312ms | Máximo caliente1621ms, variabilidad local |
| Carrier orden detalle | 305ms | 342ms | HTML; no demuestra ejecución física |
| Carrier flota | 268ms | 304ms | HTML; no mide render/3D en navegador |

Tetris entrega HTML caliente~111ms, pero es un shell cliente: **no equivale al tiempo completo hasta datos listos**. Sus lecturas se analizaron por separado.

Los logs de Next muestran compilaciones de las rutas en la primera visita (por ejemplo detalle2.7s/formulario2.4s); no hay evidencia de que todos esos segundos sean SQL. No se tocaron loaders/animaciones ni se redujeron timeouts para ocultar errores.

## Mejoras aplicadas y comprobadas

### Documentos: una autenticación por petición

El router propio registraba `[base,base+'/*']`. Hono aplica ambos a la raíz; la prueba nueva falló antes con `2 !== 1`. Ahora se registra wildcard una vez. Se mantienen401, origen, no-store/Vary, roles, body limit e invariantes. Regresión raízGET/query/subruta/POST con origen extranjero aprobada; suite completa de documentos8/8.

API `/api/v2/meta/documents`: mediana245.0→136.5ms (cinco lecturas calientes por corrida), máximo264.8→178.3ms. Es una diferencia observada local, no una promesa de mejora global ni causalidad aislada del ruido de desarrollo. Los endpoints de control también variaron.

### Passport: lecturas independientes en paralelo

El controlador leía sesión+historial, esperaba y después consultaba el Passport seleccionado. Helper nuevo `operation-read.ts` inicia las tres lecturas independientes; conserva los lectores autorizados y la selección/versiones exactas. La guarda epoch/mounted del componente permanece intacta; sin caché compartida ni mutaciones nuevas.

Pruebas: las tres lecturas empiezan antes de resolver ninguna; sin selección no se pide Passport; una denegación se propaga; metadatos históricos `isCurrent=false` se conservan. Suite sesiones42/42 con estas dos regresiones.

Replay de la topología HTTP con las mismas URLs/cookie, tres muestras alternadas por estrategia: secuencial565/445/474ms, paralelo295/332/287ms. Mediana474→295ms. **No es una medición de hidratación o interacción del navegador**; aísla la eliminación de una espera de red del controlador.

### Preparación local reproducible

El arnés admite `--warm-only` para hacer una sola lectura por ruta antes de una demo, sin IA, uploads o comandos comerciales; sus POST son únicamente las sesiones automáticas de workspace existentes. `--apis-only` limita la medición a API. Salidas en `META_PERFORMANCE_DIR`, obligatoriamente bajo `meta-hackathon-integration/tmp`. No se ejecuta calentamiento caro automáticamente cada vez que navega el usuario.

La compilación inicial de Next dev sigue existiendo tras reinicios/cambios. No se forzó modo producción porque `LOCAL_LOOPBACK` lo rechaza intencionadamente. El comportamiento del despliegue de jueces requiere su medición propia.

Al terminar se hizo una sola pasada `--warm-only`:19/19 rutasHTTP200. Varias páginas se recompilaron tras los cambios (p. ej. Cliente6.1s y Carrier3.1s); la pasada ya absorbió ese trabajo. En esa captura, el proceso Next dev tenía un working set~3162MiB. No se lo presenta como consumo estable ni fuga demostrada: es una lectura posterior a compilar varias superficies. El precalentamiento cambia espera inicial por trabajo/RAM anticipados. No se impuso cache global, GC forzado o reinicio que borrase ese calentamiento; si la RAM presiona al equipo, conviene calentar solo las tomas seleccionadas y medir el consumo en reposo por separado. Los procesos auxiliares/worker estaban~5–6MiB de working set en esa misma captura.

## Conflictos y aislamiento

- Ocho lecturas simultáneas por HTTP real en548ms: request, manifiesto, sesión, Passport, jobs, expediente de Cliente, expediente Carrier y booking. Todas200; mismo manifiesto y UUID de ambos grupos. JobsSUCCEEDED/DELIVERED, overlaysVERIFIED; documentosACCEPTED y bookingAUTHORIZED. No cambió estado comercial.
- Cuatro intentos desde la organizaciónB contra sesión/Passport/job/expedienteA: todos404. Dos lecturas anónimas (documentos/sesiones):401. No se eliminó autenticación para ganar tiempo.
- No se encontraron marcadores de conflicto Git en src/scripts/docsMeta. Esto no certifica ausencia de cualquier defecto funcional ni sustituye el gate de cada PR.
- TypeScript exit0; arquitectura879 módulos/250 client entries; Documentos8, Sesiones42 y Workspace/demo46 aprobados. No hubo build local nuevo: se evita competir con el dev que usa el usuario. CI anterior de main no acredita estos cambios locales todavía no publicados.
- Siguen activos solo los cinco contenedores Meta y el frontend/launcher propios. El worker no ejecutó un análisis en esta auditoría. La auditoría no autoriza promover aIndie los componentes del producto general.

## Pendientes concretos

1. **Sesiones: duplicación corregida localmente por Cristhian con autorización del usuario.** Una autenticación por petición raíz/subruta, conservando guards. No reenviar a Juan la corrección ya realizada. La dependencia inicial lista→detalle y cancelación de lecturas obsoletas son mejoras separadas todavía pendientes.
2. **Tracking: optimización implementada y probada con25 ejecuciones.** Deduplicación limitada a cada lectura autorizada, cuatro trabajadores y detalle comercial en paralelo. No equivale a optimizar todo `readRequestChildren`, que permanece separado, ni a medir producción. [Resultados y límites](TRACKING_Y_SESIONES_2026-11-02.md).
3. **Launcher FIXTURE único.** Está activo con fixtureB de Ramón. No analiza correctamente vídeos arbitrarios/A sin cambiar de fixture. No es un modelo live. SAM real, audio/imagen/voz y su latencia no se probaron aquí. Captura propia/RA-00, condiciones de fallo real de proveedor y producción siguen pendientes.
4. **Publicación propia.** Cambios funcionales de conversación, dashboard e integración y estas optimizaciones están sin commit. main remoto por sí solo no los incorpora; preparar PR del frente Cristhian antes de atribuirlos al deploy.

Datos: [antes](fluidez-2026-11-02/before.json), [después](fluidez-2026-11-02/after.json), [lecturas concurrentes/denegadas](fluidez-2026-11-02/consistency.json), [topología Passport](fluidez-2026-11-02/passport-topology.json). Sin tokens, cookies o URLs firmadas.

Preparación final: [pasada única de calentamiento](fluidez-2026-11-02/warm-ready.json).
