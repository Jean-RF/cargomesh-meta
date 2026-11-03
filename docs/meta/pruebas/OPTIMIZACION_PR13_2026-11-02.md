# Optimización técnica tras PR #13 — 2 noviembre 2026

Base integrada: `main@40f8865`, merge autorizado de Juan. Se conserva su geometría, materiales, simulaciones, interfaz y autoría. Cristhian realiza este ajuste técnico por solicitud expresa del usuario. Sin cambios de infraestructura, migraciones o llamadas de pago; aceptación visual pendiente del usuario.

## Cambios y evidencia

1. **Cámara sin reconstruir geometría.** Separa el efecto de encuadre del que carga/crea/libera camión, carga y fábrica. Cambiar ángulo o viewport no llama otra vez al loader ni invalida el exportador. Cambiar camión, corte/comparación o escenario sigue reconstruyendo. La selección/asamblea de una respuesta antigua no encuadra el camión nuevo.
2. **Iluminación y controles estables.** El cambio completo→pendiente en fábrica conserva HDR/OrbitControls porque no cambia el modo de escena. El reloj/seek y el movimiento reducido conservan sus responsables anteriores.
3. **Una pasada de escena.** Se elimina el `gl.render` adicional de inicialización, dejando al compositor existente a cargo del render. Las métricas se capturan tras RenderPass, antes del postprocesado; no confunden el triángulo de salida con la geometría del camión. Dataset solo cambia cuando cambia la cifra.
4. **Lecturas del flujo.** Se incluyen las optimizaciones locales ya probadas: guards una vez en raíz de documentos/sesiones, Passport independiente en paralelo, deduplicación por lectura en Tracking y cuatro trabajadores con salida estable. Sin caché entre usuarios o autorización debilitada. [Detalle Tracking](TRACKING_Y_SESIONES_2026-11-02.md), [mediciones HTTP anteriores](FLUIDEZ_TECNICA_2026-11-02.md).

## Comparación reproducible del visor

Se transpila y ejecuta el componente Scene real con su lista real de dependencias/limpieza; hooks, cabinas y GPU se sustituyen por un arnés determinístico. El mismo test sobre el head de Juan reprodujo el defecto (dos casos fallan); sobre el ajuste pasa. No es React DOM/WebGL real ni mide segundos, memoria GPU o FPS.

| Secuencia: montaje +7 ángulos +3 resize | PR #13 | Ajustado |
| --- | ---: | ---: |
|Construcciones|11|1|
|Invocaciones loader de cabina|11|1|
|Liberaciones antes de desmontar|10|0|
|Render directo adicional|11|0|

Invocación de loader no equivale a11 descargas: el loader de Juan ya cachea bases. La reducción comprobada es reconstrucción/clonado y trabajo del ciclo de vida.

Pruebas adicionales: cambio real de geometría reconstruye una vez; cabina vieja recibida tarde no sustituye la actual; resize conserva tiempo de fábrica; cambio de escenario mantiene HDR/controles; métricas del compositor pertenecen a la pasada de escena.

## Comprobación y publicación

Suites focalizadas: visor4, sesiones48, Tracking53, documentos8;113 casos aprobados. TypeScript local sin errores y arquitectura local correcta. Los logs están [aquí](pr13-performance-2026-11-02/). La candidata exacta supera esas113 pruebas y46 de workspace/demo:159 aprobadas, TypeScript exit0, arquitectura898 módulos/255 entradas cliente y build de producción correcto. Build aislado, limitado a2 CPU y sin entorno privado; fingerprint del árbol de aplicación en resultado.json. La corrida local anterior incluye cambios previos aún sin publicar y no se confunde con esta candidata.

Se sincronizó la rama con main y se recuperaron los94 archivos locales respaldados. En package.json se conserva la unión de pruebas de Juan y nuestra lectura paralela. La publicación de optimización es independiente de los cambios locales previos de conversación/dashboard/escenarios; esos archivos se conservan sin incorporarlos por accidente. No se modifica el repositorio Amazon ni se promueve automáticamente a Indie.

Pendiente fuera del alcance: medición WebGL/FPS en hardware real y comprobación del despliegue alojado; primera construcción de cada camión aún requiere geometría/activos, y las vistas de geometría realmente distintas siguen teniendo ese coste. No se bajó la calidad para ocultarlo. Lista→detalle inicial y abort de lecturas obsoletas en sesiones permanecen como siguiente mejora separada, sin bloquear este ajuste.
