# Entrega actual: qué abrir, qué probar y qué falta

**Estado vigente 4-nov:** base `main@45fd371`; corrección Muse con proveedor real, protección multigrupo y enlace manifiesto → sesión. Manifiesto/documentos y vídeo sintético de dos grupos verificados por HTTP local; Passport nuevo reabierto. TypeScript, arquitectura y build correctos. [Cierre, evidencia y pasos de usuario](pruebas/CIERRE_TECNICO_2026-11-04.md). Prevalece sobre cortes históricos siguientes: documentos/adjuntos/sesiones sí están implementados. SAM real, revisión visual y configuración/despliegue Meta pendientes. Git no certifica Vercel.

**2-nov, fluidez técnica:** medición HTTP local de19 rutas y cambios sin diseño: Documentos evita autenticación duplicada; Tetris lee sesión/historial/Passport en paralelo. Pruebas de permisos, lecturas concurrentes y tipos correctas. [Informe con mediciones, límites y pendientes](pruebas/FLUIDEZ_TECNICA_2026-11-02.md). Todo sigue local sin publicación; no equivale a benchmark de producción ni cierre SAM/RA-00.

**2-nov, entrega sintética de Ramón:** descargada/verificada y conectada por la web local en una sesión nueva: A8/8 y B4/4 MATCH, Passport guardado/reabierto. El caso anterior3/4 permanece. [Evidencia y enlaces](pruebas/CLIPS_RAMON_DEMO_2026-11-02.md). No son los clips propios pendientes: RA-00 y SAM real siguen sin aceptación. Launcher actualmente usa fixtureB de este paquete.

**2-nov, 08:22 PET:** configurado el launcher local y comprobado desde la web real8080 con ambos grupos del mismo pedido; Passport nuevo reabierto, documentos/carrier conservados y sesiones por cookies correctas. [Resultado e instrucciones](pruebas/WEB_Y_WORKER_LOCAL_2026-11-02.md). El pendiente de configurar8080 de la nota08:04 queda resuelto; RA-00/filmación propia y SAM real siguen pendientes. No hay publicación de nuestros cambios locales ni despliegue.

**2-nov, 08:04 PET:** PR #12 integrado en `main@1f07e8a`; copia local actualizada conservando cambios sin commit. Incluye lanzador local explícito y evaluador corregido. [Revisión e integración](REVISION_PR12_CORRECCION_2026-11-02.md). El launcher está disponible en código; todavía falta configurarlo para el frontend8080 y luego probarlo con los clips propios de Ramón/SAM autorizado. Modal y el entorno de jueces siguen pendientes; un merge no los despliega.

**Actualización vigente 1-nov, 22:00 PET:** local sobre `main@7d185dc`, con PR #6, #9, #10 y #11 integrados. El pedido documental 8+4 BOX ya tiene dos jobs Python, comparación 8/8 y 4/3 y Passport reabierto con dos explicaciones. [Evidencia y límites](pruebas/RECORRIDO_DOCKMIND_CONECTADO_2026-11-01.md). Vídeos sintéticos/FIXTURE y explicación INJECTED; no acredita SAM/Modal ni aceptación visual. Las filas históricas siguientes corresponden al corte anterior; esta actualización prevalece para DockMind/documentos.

28-oct-2026. Índice de la entrega de Cristhian en `codex/meta-cristhian`, PR #3 del repositorio de trabajo Meta. Estado contrastado con el código local; no es una certificación de todos los módulos del equipo ni de producción.

Actualización 30-oct: PR #3, #5, #7 y #8 integrados; copia local actualizada a `main@df12172`. El #6 queda pendiente por dos defectos reproducidos. Véase [revisión de integración](REVISION_INTEGRACION_2026-10-30.md), que distingue módulos reunidos de conexiones aún pendientes.

## Orden de lectura

| Necesidad | Documento | Alcance |
| --- | --- | --- |
| Probar como usuario, sin terminal | [Guía de aceptación](pruebas/GUIA_USUARIO_CR01.md) | Recorrido manual, datos, resultados esperados y registro |
| Ver pruebas técnicas ya ejecutadas | [Evidencia CR-01 del 28-oct](VALIDACION_CR01_2026-10-28.md) | Resultados anteriores del entorno local, no resultados de la nueva ronda del usuario |
| Implementar el siguiente incremento documental | [Aceptación de documentos](contracts/EXPEDIENTE_DOCUMENTAL_MVP.md) | Funciones pendientes, decisiones y criterios verificables |
| Generar los PDF ficticios | [Plantillas](templates/documentos-demo/README.md) | Dos plantillas Markdown y prompt; todavía no son PDF ni documentos cargados |
| Consultar las rutas y reglas de manifiestos | [Contrato HTTP](contracts/MANIFEST_HTTP_CR01.md) | Preparación, confirmación, consulta, permisos y errores |
| Entender el recorrido completo de negocio | [Flujo propuesto](FLUJO_PEDIDO_DOCUMENTOS_Y_CARGA.md) | Propuesta más amplia; no equivale a implementación |
| Entender la planificación CR | [Plan CR](PLAN_CR_DECLARACION_E_INTEGRACION.md) | Historias, límites y dependencias |

## Estado por punto del plan

| Punto | Entrega observable | Estado |
| --- | --- | --- |
| 1. Guardar y sincronizar | Backend `3b7b544`, sincronización `afe0056`; incremento `e0c55f8`, PR #3 integrado en `88f2f63`; copia local al día con main `df12172` | Integrado en el repositorio de trabajo; sin promoción pública/despliegue |
| 2. Validación/migración | Migración instalada en `meta-cr01-validation`; evidencia de servicio, SQL, HTTP y controles | Validado en local; no aplicado a una base alojada |
| 3. Formulario conectado | Guardar request → preparar → revisar → confirmar → recargar/reabrir manifiesto con grupos | Implementado y probado en local; aceptación visual del usuario pendiente |
| 4. Expediente documental | Biblioteca privada, upload validado, revisiones, vínculos request/manifiesto, compartición booking y revisión carrier | Implementado en Meta local; [contrato y límites](contracts/DOCUMENTOS_HTTP_CR_DOC01.md). Sin migración alojada, validación legal o aceptación visual |
| 5. Propuestas IA | Adaptadores de texto/imágenes de Axel y voz/explicación de Luis reunidos por #4/#7 | Captura privada y aplicación de foto/audio al formulario aún pendientes; no inferencia real nueva por este merge |
| 6. Sesión/dashboard/Passport | #8 conecta sesiones persistidas con manifiesto confirmado, revisión de observaciones disponibles, cierre y Passport histórico/exportable; migración instalada solo en Meta local | `/tetris` operativo; escenarios sintéticos en `/tetris/demo`, laboratorio en `/truck-lab`. Worker, captura de vídeo y recorrido completo DockMind pendientes: #6 no integrado |

En `/clients/organization` existen información de empresa y perfiles de carga. **Documents ya conecta la biblioteca privada del entorno local.** En el manifiesto, una referencia documental textual no acredita que un archivo se haya subido, compartido o aceptado.

## Entorno de aceptación

- Frontend: `http://127.0.0.1:8080/clients/freight-request/new`.
- Base/API Meta local: `meta-cr01-validation`, API 64321 y PostgreSQL 64322. El acceso sintético automático debe mostrar la organización local; no se pide introducir credenciales.
- El perfil de pruebas contiene carriers, nombres y fechas sintéticos. UNKNOWN o mapa sin coordenadas no significa rechazo del guardado del manifiesto ni una contratación aprobada.
- Vercel/Amazon y el repositorio público son cortes independientes. Esta guía no garantiza que tengan el mismo SHA o capacidades del local.
- No se han consultado nuevamente CI o el deploy para este índice; su resultado actual no se deduce del estado local.

## Condición de cierre

El recorrido manual local puede aceptarse cuando el usuario completa los casos UAT-01 a UAT-08 de la guía y registra sus resultados. El punto 4 solo puede aceptarse después de implementar y comprobar DOC-01 a DOC-14; generar los PDF no lo cierra. Las revisiones de consumidores y el gate del PR mantienen su propia evidencia.

Esta reorganización compara código y evidencia existente. No ejecutó otra ronda funcional, migraciones, publicación, merge o despliegue.
