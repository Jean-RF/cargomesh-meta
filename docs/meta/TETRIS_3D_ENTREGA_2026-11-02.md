# Tetris, flota 3D y animaciones — entrega de Juan

El 2 de noviembre de 2026 el usuario autorizó publicar en un PR todos los cambios locales de Tetris, camiones y animaciones. Esta entrega continúa el PR #9, ya fusionado, en la rama `codex/meta-juan` del repositorio de trabajo `Chujutak2024/meta-hackathon`. No promueve código al repositorio público Indie ni autoriza merge, despliegue o migraciones alojadas.

## Resultado para el carrier

- Tetris en el menú del carrier y en `/carriers/tetris`; catálogo previo de 60 vehículos con miniatura, conductor, experiencia y tarifa por viaje en PEN. Veinte pequeños, veinte medianos y veinte grandes.
- Categorías: frigoríficos, furgones/lonas, plataformas/barandas, volquetes/tolvas, cisternas/silos y especializados. Búsqueda por vehículo, placa y conductor; filtros por carga útil y orden por nombre, capacidad o tarifa.
- Detalle 3D con carga propia del modelo, grupos de carga en una columna lateral y flecha de selección que respeta la visibilidad. Resumen por masa/capacidad, tabla y consulta de códigos. Las tarifas, vehículos y conductores pertenecen a la demostración; no crean contratos, disponibilidad u observaciones reales.
- Cinco bases de cabina licenciadas adaptadas, carrocerías y cargas especializadas, unión y pisos de remolques corregidos, conductores detallados, materiales PBR, HDR, oclusión ambiental y exportación GLB. Las cinco bases se reutilizan en 60 configuraciones; no se presentan como 60 cabinas OEM originales.
- 930 identificadores internos Code 128: 498 unidades y 432 cajas contenidas en pallets. Las etiquetas siguen la mercancía; los líquidos/graneles identifican el lote, no partículas. No son registros GS1.
- Fábrica equipada, robot con muñeca articulada, puente grúa, rampas y llenado según la mercancía. Movimiento y contadores deterministas, tamaños conservados y consulta de medidas del modelo.
- Dos animaciones seleccionables por camión: carga completa o salida con pendientes. La segunda deja la última unidad en fábrica; en flujos interrumpe al 75% del lote. Se retira el equipo antes de salir, lo cargado acompaña al vehículo y lo pendiente conserva su ubicación/código. Sin simulación de fractura.
- Reproducir, pausar, continuar, repetir, reiniciar, velocidad, búsqueda temporal reversible y pasos con movimiento reducido. Cámara con giro, zoom, pan, botones y WASD/flechas cuando el canvas tiene foco.

## Integración conservada

`/tetris?view=sessions` y enlaces con `session` conservan las sesiones autenticadas, comparación y Passport. La sincronización con `main@1f07e8a` preserva los avances de Cristhian, Axel, Luis y Ramón/Jean, incluida la recuperación de Passport, protección frente a lecturas tardías, vídeo/evidencia y explicaciones. El merge conserva la autoría de sus commits; no atribuye esos módulos a Juan.

El acceso frontal sin inicio de sesión requiere opt-in `CARGOMESH_LOCAL_CARRIER_PREVIEW=true`, entorno `development` y host exacto `localhost:3000` o `127.0.0.1:3000`. La variable no se publica configurada. Las APIs conservan autenticación y permisos; no se modifica RLS ni se aplican migraciones remotas.

## Procedencia y evidencia

- [Cabinas, fuentes y CC BY 4.0](../../cargomesh/public/truck-cabs/LICENSE.md): CARLA Simulator y mekanismo; conversión Valdrada / M. K. Turkcan; adaptación CargoMesh/Juan.
- [Materiales, humano CC0 y codificador MIT](../../cargomesh/public/truck-materials/LICENSE.md). Nueva dependencia del incremento: JsBarcode 3.12.3. Los retratos de stock ya existentes conservan sus créditos y no identifican a las personas ficticias.
- [Catálogo y dashboard](evidence/juan-tetris-vehicles-2026-10-31/README.md), [carrier](evidence/juan-tetris-carrier-2026-10-31/README.md), [selección de grupos](evidence/juan-tetris-callouts-2026-10-31/README.md), [remolques](evidence/juan-trailer-fit-2026-10-31/README.md) y [conductores](evidence/juan-driver-design-2026-10-31/README.md).
- [Códigos](evidence/juan-cargo-barcodes-2026-11-01/README.md), [fábrica](evidence/juan-factory-loading-2026-11-01/README.md), [cámara](evidence/juan-factory-navigation-2026-11-01/README.md), [detalle industrial](evidence/juan-factory-detail-2026-11-02/README.md), [consola](evidence/juan-factory-console-2026-11-02/README.md) y [dos resultados](evidence/juan-factory-outcomes-2026-11-02/README.md).

Los informes fechados conservan su contexto y resultados originales, incluidas correcciones y límites. Sus menciones «sin PR/push» describen la situación anterior a esta autorización. Los logs referenciados se incluyen revisados; los enlaces de publicación ya no dependen de `.impeccable` local. Quedan fuera secretos, configuración privada, builds, cachés, planificaciones locales y exportaciones masivas reproducibles.

## Verificación sobre la integración

Verificación nueva sobre el código integrado `b676715`, conservada con sus logs en el [paquete de publicación](evidence/juan-tetris-pr-2026-11-02/verification.json):

| Comprobación | Resultado |
| --- | --- |
| Instalación con lockfile congelado | Correcta |
| Logística, cargas y geometría | 212/212 |
| Dashboard/sesiones | 45/45 |
| Operaciones carrier | 54/54 |
| Autenticación | 14/14 |
| Navegación carrier | 7/7 |
| Carrier closeout y ciclo del mapa | 50/50 + 6/6 |
| Explicaciones/Passport | 48/48 |
| Arquitectura | 897 módulos / 255 entradas cliente |
| Build de producción, lint y tipos | Correctos |

El [recorrido Chrome posterior a la sincronización](evidence/juan-tetris-pr-2026-11-02/browser.json) confirma catálogo de 60 sin descargar GLB al listar, detalle sanitario, carga completa 8/8 y salida con pendiente 7/8, desplazamiento, modo reducido a390px sin overflow y ruta de sesiones con rechazo anónimo controlado. La API de sesiones devuelve401 sin sesión aunque esté habilitada la vista frontal local. No se generaron capturas nuevas ni se sobrescribieron pruebas visuales anteriores.

No se sustituyen por resultados actuales las capturas, decodificaciones y GLB históricos. La CI del PR se informa por su estado real; no se presume aprobada por las pruebas locales.

No se certifican fotorrealismo, mediciones de vehículos registrados, seguridad de estiba, reparto por eje o fluidez en móviles físicos. No se reejecutan inferencia de pago, escenarios alojados ni validación operacional completa con productores reales. La simulación no constituye un optimizador de estiba ni un conteo observado.
