# Tetris: proyección de lectura propuesta por Juan

29 octubre 2026. Rama `codex/meta-juan`, PR #5. Propuesta ejecutable; **sin acuerdo de consumidores acreditado**.

Tetris en el núcleo es el dashboard operativo. Capacidad por vehículo/grupo (JU-05), acomodo 2D (JU-06), visualización/arrastre3D (JU-08/JU-09) y optimización entre camiones (JU-10) son ampliaciones. El laboratorio de 60 camiones es una entrega visual solicitada por el usuario y no completa esas historias.

## Entrada y salida

`LoadingDashboardSourceSchema` en `cargomesh/src/shared/schemas/meta/loading-dashboard.ts` valida la proyección: sesión/sede/organización, manifiesto/revisión, grupos con unidad/cantidad nullable, plan/asignaciones y una observación seleccionada con cobertura/calidad/referencias. No suma jobs que puedan contar el mismo cruce. Rechaza IDs duplicados, unidades desconocidas, cantidades negativas y asignaciones a recursos inexistentes en la lectura.

No define otro manifiesto canónico. Cada productor conserva su contrato; un adapter explícito debe mapearlo tras acordar versiones, IDs y cobertura. No conectar payloads mediante casts.

`buildLoadingDashboard` devuelve cantidades/comparación por grupo, totales separados PALLET/BOX, procedencia, alcance y contexto. El fixture abierto declara 18 pallets y 40 cajas, planifica18/40 y observa 14 pallets/cajas desconocidas. No devuelve 58 unidades ni un faltante de 4. El cerrado propone diferencia de 1 pallet y requiere revisión humana; no crea incidencia.

## Invariantes

- null significa desconocido; cero solo cuando la fuente lo declara. Sumas con desconocidos u overflow permanecen desconocidas.
- Cada KPI identifica unidad/fuente. Paginación parcial limita el alcance a grupos recibidos. No hay importes/monedas.
- Plan antiguo, unidad incompatible o plan incompleto no acreditan cantidad planificada actual.
- Abierta/sin observación: NOT_READY. Revisión distinta: OUTDATED; unidad/sesión distinta: INCOMPATIBLE_SCOPE; cobertura/calidad/cantidad insuficientes: INSUFFICIENT_EVIDENCE. Solo después se comparan cantidades.
- Diferencia = declarado−observado solo en MATCH/DIFFERENCE_PROPOSED; no es decisión humana ni incidencia confirmada.
- Refresco vacío o antiguo no borra lectura más reciente de la misma sesión.
- Actor/organización provienen de autenticación del servidor. Repositorio filtra organización/sesión; lector verifica vínculos y sede permitida. Sin endpoint público ni bypass privilegiado.

## Estado y conexiones

Implementados: schema, cinco fixtures, cálculo compartido, lector con repositorio inyectado, demo `/tetris`, selección de unidad/grupo y descarga JSON. 21 pruebas propias más navegación. `CarrierKpis` compacto conserva presentación comercial; su modelo de importes no se mezcla con conteos.

Pendiente: acordar mapping con Cristhian/Ramón; adapter autenticado/persistente sobre Supabase Meta; operación real, jobs/polling/comandos de sesión; conciliación persistida, revisión y Passport. Sin nuevas tablas, RLS o migraciones. No se han probado permisos en base real ni aceptación visual de Cristhian.
