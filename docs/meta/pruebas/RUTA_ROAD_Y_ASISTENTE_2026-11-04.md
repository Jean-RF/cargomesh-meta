# Ruta ROAD, formulario y asistente — 4 noviembre 2026

## Problema y resultado

El mapa ya rechazaba Buenos Aires–Sydney como `DISCONNECTED_NETWORKS`, pero la guía seguía preguntando por la carga porque solo comprobaba que hubiera dos IDs. Se conecta esa misma exclusión geográfica al formulario, avance automático, conversación y guardado/reapertura del DRAFT. No se convierte una distancia en línea recta en carretera ni se inventan kilómetros, horas, oferta o cobertura.

- Aviso persistente fuera del mapa, en español/inglés, también en la nube y en el chat al cambiar a un par desconectado.
- El avance automático se pausa. El usuario puede seguir completando manualmente los datos para conservar un borrador pendiente.
- El botón cambia a «Guardar borrador pendiente». Crear/revisar/reabrir el mismo DRAFT no llama a elegibilidad ROAD si las ubicaciones persistidas están desconectadas. No se cambia el enum comercial DRAFT ni se crea un estado de negocio inventado.
- La conversación recibe `roadRouteStatus`. En HTTP autenticado el servidor lo reemplaza con la política calculada desde las sedes actuales de la organización autorizada; no confía en países/coordenadas/estado del navegador.
- Muse recibe instrucciones de explicar primero la incompatibilidad, pedir cambiar una sede y no avanzar a carga/fechas. La respuesta final conserva los campos propuestos y metadatos/errores existentes, pero reemplaza el texto de siguiente paso por el aviso cuando el par autorizado sigue desconectado.
- Si una corrección propone otra sede autorizada, se recalcula el par; el aviso viejo no se mantiene sobre una ruta ya corregida. IDs ausentes/duplicados/ajenos o coordenadas desconocidas no certifican conexión.
- Texto y controles existentes de confirmación se mantienen; elegir Air/Sea no se habilita como efecto de la corrección. Esos modos siguen sin implementación disponible.

## Qué no certifica

`UNVERIFIED` significa que no hay exclusión geográfica conocida, no que exista una carretera transitable o servicio. El proveedor de rutas conserva la responsabilidad de geometría, distancia y duración estimadas; el backend comercial conserva capacidad, equipo, ventanas y cobertura. Este incremento no sustituye el proveedor ni implementa un cálculo de viabilidad de horarios para cualquier ruta terrestre. No cambia APIs de booking, scoring, migraciones ni datos alojados.

## Verificación

Se descubrieron los comandos desde `cargomesh/package.json`. Resultados: Meta AI 63, chat/workflow 118, intake 90, conversación 107+32 y rutas 57, todos aprobados. Son 467 ejecuciones con solapamientos entre comandos, no 467 casos distintos.

Los casos nuevos cubren: estado de ruta enviado al modelo, contexto autorizado que reemplaza un estado falso del navegador, coordenadas faltantes, IDs duplicados, aviso en ambos idiomas conservando hechos, corrección que elimina la exclusión y DRAFT guardado/reabierto con el mismo ID y cero llamadas a serviceability. Pruebas con dobles para la persistencia; HTTP real local para la ruta de conversación y catálogo autorizado. Sin llamadas pagadas ni escrituras comerciales durante la prueba HTTP.

TypeScript y arquitectura correctos en la candidata; TypeScript también correcto con los cambios actuales de Front. La compilación de producción terminó con exit 0 en copia aislada, sin `.env.local` y sin alterar la caché del servidor activo; 1.573 archivos de entrada conservaron su hash durante el build. [Evidencia saneada](ruta-road-2026-11-04/).

### Copia activa y trabajo de Front

Se detectó que el puerto 8080 cambió de proceso/copia durante la tarea. La carpeta activa es `salida/jean-meta-copilot/repo/cargomesh`, rama `codex/meta-copilot-overlay-ui`, remoto `Jean-RF/cargomesh-meta`. La corrección se aplicó allí mediante un parche comprobado, sin conflictos y conservando las modificaciones de Front. Se respaldaron fuera de Git los 32 archivos pendientes que existían; las rutas ajenas al parche conservaron su hash.

La primera comprobación devolvió un 500 transitorio al abrir sesión; luego la API antigua de esa otra copia rechazó el nuevo campo con 400. Tras identificar la copia activa y aplicar el parche, HTTP pasó: Buenos Aires–Sydney y reverso advierten aunque el navegador declare `UNVERIFIED`; Buenos Aires–Córdoba no conserva el aviso; la cantidad explícita sigue propuesta y sin sesión devuelve 401. Cero inferencia y cero escrituras comerciales.

## Revisión manual del usuario

1. Recargar `http://127.0.0.1:8080/clients/freight-request/new` y seleccionar Road.
2. Elegir Buenos Aires y Sydney. Debe aparecer «Sin conexión terrestre» fuera del mapa y la nube debe explicar la restricción, sin saltar sola a la pregunta de carga.
3. Cambiar a Buenos Aires–Córdoba: el aviso de desconexión debe desaparecer. Esto aún no confirma carretera/cobertura.
4. Para conservar el caso desconectado, completar los datos manualmente, revisar y confirmar «Guardar borrador pendiente». Reabrir el mismo pedido: DRAFT conservado, sin resultado ROAD presentado como viable.

La revisión visual, micrófono físico y validación del sitio Vercel siguen a cargo del usuario/administrador. Publicar el código no aplica el catálogo a una base alojada ni acredita el despliegue.
