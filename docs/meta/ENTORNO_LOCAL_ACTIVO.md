# Entorno local activo

**4-nov:** frontend unificado 8080 y cinco contenedores Meta 64321 activos tras la aceptación técnica. Worker detenido; último fixture usado B, pero no hay launcher por defecto. Resultados/vídeos guardados consultables sin worker. Build aislada terminada, sin proceso. No se iniciaron HAC, Amazon ni dealer. [Recorrido y límites actuales](pruebas/CIERRE_TECNICO_2026-11-04.md).

Actualización posterior2-nov: la entrega sintética de Ramón ya pasó por8080/8765; launcher activo con **fixtureB de Ramón**, solo compatible con su MP4B. Reemplaza el fixtureA anterior a efectos de ejecución nueva; los resultados previos siguen guardados. [Recorrido y enlaces](pruebas/CLIPS_RAMON_DEMO_2026-11-02.md).

Actualización 2-nov, 08:22 PET: frontend8080 y los cinco contenedores Meta activos. Se añadió un launcher Python en8765 con `LOCAL_LOOPBACK`, credenciales privadas y FIXTURE explícito del clip sintéticoA. Sin Modal, GPU o SAM pagado. El launcher no sirve para analizar cualquier vídeo con ese fixture. [Recorrido real por la web e instrucciones](pruebas/WEB_Y_WORKER_LOCAL_2026-11-02.md).

Decisión de Cristhian, 30-oct-2026: no mantener encendidos entornos antiguos ni bancos de pruebas por defecto.

- Trabajo diario Meta: frontend unificado 8080 y proyecto Supabase `meta-cr01-validation`, API 64321. Conserva DB, Auth, REST, Kong y Storage necesarios para el expediente privado.
- No encender `cargomesh-v2-local`, `hac45-carrier-local`, `hac29-v1-reference` o `hac29-baseline-reference` para abrir el frontend Meta. No son dependencias de este runtime.
- Si una prueba pertinente necesita otro banco, registrar cuáles estaban encendidos antes. Al terminar, incluso ante fallo, detener únicamente los bancos que la prueba haya encendido. No dejar todos activos ni reiniciar otros proyectos por rutina.
- Detener no significa eliminar: conservar contenedores y volúmenes. No usar borrado de volúmenes, reset o limpieza global para liberar RAM.
- Antes de operar Docker, comprobar nombre y etiqueta de proyecto exactos. No detener Meta ni proyectos ajenos como efecto lateral.
