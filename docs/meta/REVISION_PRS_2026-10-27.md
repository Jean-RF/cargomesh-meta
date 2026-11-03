# Revisión de PRs y publicación en dos repositorios

27 de octubre de 2026, America/Lima. Revisión estática y lectura de CI existente por Codex para Cristhian. No se ejecutaron pruebas adicionales, llamadas de IA, cambios de infraestructura o migraciones.

**Actualización del 28-oct:** las tablas siguientes conservan el corte histórico de revisión. CR-01 dejó de estar sin commit: backend `3b7b544`, documentación `351562d` y vista previa local `5b30f8c`. La rama de Cristhian se sincroniza con main `a5c2a4d` para actualizar el mismo PR #3; no hay merge de ese PR a main, migración aplicada, conexión del formulario o nuevas pruebas acreditadas por este avance.

## Resultado

Base inspeccionada: `6f70f50dbaf235ea68a458797af92487c02f2e37` de `Chujutak2024/meta-hackathon` (privado).

| PR | Head revisado | Contenido publicado | Decisión |
| --- | --- | --- | --- |
| [#3 Cristhian](https://github.com/Chujutak2024/meta-hackathon/pull/3) | fadf20f55c0451c6edad7540ff6265c1acbb1ecf | Documentación, schema y mapper CR-00 | Mantener en revisión. El backend CR-01 está local, sin commit/push, y no forma parte del PR remoto. Falta revisión ajena del trabajo propio |
| [#4 Axel](https://github.com/Chujutak2024/meta-hackathon/pull/4) | 74bfe467758000de30bc80a70c956d91c02c07c9 | AX-00/AX-01: contrato y adaptador de texto, opt-in, guardas y pruebas inyectadas | **Integrado**, merge commit a5c2a4d8c0f4197641d9024f5f22908dd326e9d6; no aceptación real del proveedor |
| [#5 Juan](https://github.com/Chujutak2024/meta-hackathon/pull/5) | cc45634163ad14331c342d4a149258dfbefb4937 | Solo guía de trabajo, 1 archivo | Mantener borrador: no hay módulo funcional publicado que integrar; no cerrar el PR inicial por la guía sola |
| [#6 Ramón](https://github.com/Chujutak2024/meta-hackathon/pull/6) | 54184f313afb8ea03cb9f21f6ff1b783497e5cad | Worker, contratos, servicio/routes no montadas, UI y fixtures | **No integrar todavía**: corregir los hallazgos funcionales siguientes en su rama |
| [#7 Luis](https://github.com/Chujutak2024/meta-hackathon/pull/7) | dab30b3ef3eeb5832a9c4596f385588bb4234534 | Solo guía de trabajo, 1 archivo | Mantener borrador: no hay módulo funcional publicado que integrar |

Los cinco estaban abiertos y en borrador al comenzar; eran los cinco frentes iniciales, no PRs nuevos adicionales. Tras integrar #4, su rama no se elimina; un PR mergeado no incorpora commits futuros. Las siguientes entregas de esa misma rama necesitarán un nuevo PR cuando haya incremento listo. Eso no exige ramas nuevas por historia.

El título y descripción de #4 se ajustaron al alcance real AX-00/AX-01 antes del merge. Se reconfirmaron base/head y se usó expected_head_sha. Se conservó el historial mediante merge commit, sin squash/force-push. No se tocó el repositorio Amazon. No se hizo pull sobre el árbol local con cambios de CR-01 pendientes.

## CI consultado, sin reproducirlo localmente

| PR | Run de GitHub Actions | Resultado observado |
| --- | --- | --- |
| #3 | [40577061180](https://github.com/Chujutak2024/meta-hackathon/actions/runs/40577061180) | 3 jobs success |
| #4 | [40481170068](https://github.com/Chujutak2024/meta-hackathon/actions/runs/40481170068) | 3 jobs success, incluye paso de contratos/adaptador Meta con proveedores inyectados |
| #5 | [40476641904](https://github.com/Chujutak2024/meta-hackathon/actions/runs/40476641904) | 3 jobs success |
| #6 | [40628451215](https://github.com/Chujutak2024/meta-hackathon/actions/runs/40628451215) | 3 jobs success del gate heredado; no hay paso de pytest o test:meta-dockmind en esos jobs |
| #7 | [40476652355](https://github.com/Chujutak2024/meta-hackathon/actions/runs/40476652355) | 3 jobs success |

No había revisiones GitHub de otras personas registradas al consultar. Los resultados que Ramón describe de sus pruebas locales son evidencia declarada por su entrega, no ejecuciones reproducidas aquí. El gate no certifica SAM real, Modal, persistencia o contratos entre todos los módulos. La elegibilidad del evento tampoco la certifica CI.

## Hallazgos del #6 para que corrija Ramón

### P1: las transiciones no protegen el estado terminal

[service.ts:69](https://github.com/Chujutak2024/meta-hackathon/blob/54184f313afb8ea03cb9f21f6ff1b783497e5cad/cargomesh/src/server/modules/analysis-jobs/service.ts#L69) marca RUNNING después de esperar dispatch. Si el callback guarda SUCCEEDED antes de que dispatch resuelva, updateIfAttempt sigue aceptando el mismo intento y vuelve a RUNNING. La implementación de memoria comprueba únicamente attempt ([memory-repository.ts:23](https://github.com/Chujutak2024/meta-hackathon/blob/54184f313afb8ea03cb9f21f6ff1b783497e5cad/cargomesh/src/server/modules/analysis-jobs/memory-repository.ts#L23)).

Además, dos callbacks concurrentes pueden leer el mismo estado no terminal y ambos escribir porque el CAS no comprueba estado/versión. La comprobación previa en service no hace atómica la transición. Esto puede sobrescribir un resultado o dejar un job terminado pendiente/reintentable.

Corrección esperada: puerto/repositorio con transición atómica que incluya estados permitidos o versión, terminales inmutables y reclamación de dispatch. Casos de callback antes de resolver dispatch y dos callbacks concurrentes, además del replay secuencial ya cubierto.

### P2: el callback no contrasta la configuración realmente ejecutada

[service.ts:180](https://github.com/Chujutak2024/meta-hackathon/blob/54184f313afb8ea03cb9f21f6ff1b783497e5cad/cargomesh/src/server/modules/analysis-jobs/service.ts#L180) contrasta sesión/evidencia/revisión e intento, pero no observation.config frente a job.config. Un resultado firmado con unidad o línea diferentes puede guardarse como éxito y mostrarse mediante toAnalysisJobView. La firma comprueba origen/integridad del mensaje, no que el worker haya usado la configuración solicitada.

Corrección esperada: normalizar defaults de configuración y validar al menos unidad, línea, concepto y parámetros efectivos, junto con la procedencia esperada. Un callback con IDs correctos y unidad/línea cambiadas debe rechazarse sin sustituir observaciones previas.

### P2: resultado no entregado puede darse por completado en el worker

[jobs.py:210](https://github.com/Chujutak2024/meta-hackathon/blob/54184f313afb8ea03cb9f21f6ff1b783497e5cad/cargomesh/dockmind-worker/src/dockmind/jobs.py#L210) envía el callback sin comprobar su status. Un 401/409/500 devuelve igualmente el resultado local, y no hay en ese camino un recibo/delivery persistido y recuperable. La web puede permanecer RUNNING aunque se haya consumido el análisis; reintentar el job puede volver a procesar el vídeo en lugar de recuperar la entrega.

Corrección esperada: validar ACK, clasificar errores y permitir recuperar/reentregar el resultado ya calculado con política acotada. No repetir inferencia automáticamente ante entrega incierta. Casos de 500, 401 y timeout después de un resultado calculado.

Son hallazgos por lectura de código, no fallos reproducidos mediante ejecución. No se modificó la implementación de Ramón ni se enviaron mensajes al equipo. Su falta de deploy o SAM real es un límite de alcance declarado; los problemas anteriores son defectos independientes de ese límite.

## Cómo publicar el otro repositorio

Rige [Entrega y reintegración](ENTREGA_Y_REINTEGRACION.md). El repositorio de trabajo actual se verificó privado. Entre los repositorios accesibles del usuario no se identificó otro repo Meta público; nombre/URL de entrega siguen pendientes de indicar.

1. Mantener `meta-hackathon` como producto general de las cinco personas; sus ramas entregan a ese main mediante revisión.
2. Registrar URL/nombre del repo público. No cambiar la visibilidad del privado ni reutilizar/modificar Amazon como efecto lateral.
3. Preparar una candidata desde un SHA conocido y un inventario de cambios, autoría real, base preexistente y dependencias. No sincronizar ciegamente todo main.
4. Incluir únicamente alcance admisible verificado y dependencias necesarias. Si usa un módulo excluido, no basta omitir su commit o cambiar quién sube: reducir alcance o resolver la elegibilidad antes de publicar. No alterar autores ni esconder contribuciones.
5. Conservar licencia/atribuciones y documentar el origen de la base. Revisar secretos, datos privados y derechos de clips/documentos. El repositorio público necesita lo necesario para reproducir lo que realmente se presenta, no un frontend que dependa de backend oculto sin explicarlo.
6. Revisar la candidata mediante un PR de publicación en el repo público; registrar SHA de origen/destino y verificaciones. Publicación y despliegue se autorizan sobre esa candidata concreta; no se configuraron aquí.
7. El deploy de jueces corresponde al repo público/corte registrado; configuraciones y datos separados de Amazon. No copiar claves, alias o migraciones a la base antigua.
8. Conservar el corte evaluado. Después del evento y evaluación, completar/publicar el producto real con los cinco y sus créditos, conforme al compromiso existente.

No se creó un segundo repositorio ni un pipeline de promoción durante esta revisión. **Actualización posterior:** Cristhian eligió `cargomesh-dockmind` y se creó [el repo público](https://github.com/Chujutak2024/cargomesh-dockmind) con README inicial, sin promover código. La creación se registra en el acuerdo de entrega; el pipeline y la candidata continúan pendientes. Separar repositorios sirve para ordenar versiones; no convierte por sí mismo un proyecto conjunto de cinco en una entrega elegible de cuatro.
