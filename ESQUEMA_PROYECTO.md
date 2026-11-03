# Estructura de trabajo de CargoMesh Meta

Este documento reemplaza el esquema inicial de preparación. El antecedente se conserva en [reference/ESQUEMA-INICIAL.md](docs/meta/reference/ESQUEMA-INICIAL.md).

## Flujo y módulos

Cliente confirma un manifiesto; Carrier abre una sesión en una sede; el dashboard muestra declarado/planificado/observado; un job analiza el clip; el comparador produce un resultado y Passport conserva la revisión humana. Las acciones comerciales existentes siguen sus servicios y autorizaciones.

| Responsable | Trabajo y directorio preparado | Produce | Consume |
| --- | --- | --- | --- |
| Cristhian | Intake existente + `src/server/modules/declared-manifests/` y `media-evidence/` | manifiesto revisado y medios de declaración | propuestas de Axel y transcripción de Luis |
| Axel | `cargomesh/src/server/ai/meta/` | cliente, errores, esquemas de propuesta e interpretación | evidencia autorizada y texto/transcripción |
| Luis | `src/server/ai/meta/` + `infra/meta/` | transcripción, explicación, preparación de entorno | cliente de Axel y conciliación de Juan |
| Juan | `src/features/meta-loading-dashboard/`, `src/server/modules/loading-sessions/` y `reconciliation/` | sesión, snapshot del dashboard, comparación y Passport | manifiesto y observación |
| Ramón/Jean | `cargomesh/dockmind-worker/` | job, observación, cruces y vídeo anotado | sesión, clip y configuración |

Las rutas `src/` de esta tabla se resuelven dentro de `cargomesh/`. El equipo tiene cinco inscritos; la elegibilidad se coteja con reglas oficiales sin omitir integrantes. Los archivos nombran a Luis directamente: no hay dos responsables llamados Axel.

## Capas y fronteras

- `src/app/` y `src/server/hono/`: entrada HTTP. Las rutas Meta se implementarán en `src/server/hono/routes/meta/`; esta preparación no las registra ni expone.
- `src/features/`: componentes/estado de interfaz, sin SDKs secretos ni cálculos comerciales inventados.
- `src/server/ai/meta/`: adapters de proveedor; devuelven propuestas validadas, no mutaciones de dominio.
- `src/server/modules/`: servicios y repositorios con autorización, idempotencia y versiones. Cada carpeta nueva tiene un README que describe qué falta implementar.
- `src/shared/schemas/meta/`: contratos comunes a acordar antes de conectar módulos. No duplicar el manifiesto en cada pantalla.
- `dockmind-worker/`: procesamiento asíncrono separado de las peticiones de render de Next.js. Tiene espacios para código Python y sus pruebas; todavía no es un worker desplegable.

## Dashboard de carga

El dashboard es una superficie operativa, con referencia de sesión/sede, indicadores declarados/planificados/observados, tabla por recurso y evidencia seleccionada. Tetris representa la planificación visual: el acomodo 2D/3D avanzado sigue como ampliación `JU-05` a `JU-10`. El esqueleto de carpeta no implementa un optimizador ni añade un gráfico ficticio.

## Planificación y prompts

Los prompts activos viven en [docs/meta/prompts](docs/meta/prompts/README.md), las 47 historias en [backlog](docs/meta/backlog/README.md), los contratos en [contracts](docs/meta/contracts/README.md) y las iteraciones en [iterations](docs/meta/iterations/README.md). Los documentos recibidos originales permanecen en `docs/meta/reference/` para contrastar decisiones; no gobiernan rutas o ramas actuales.

## Rutas de la base preservadas

`cargomesh/`, `scripts/`, `supabase-v2/` y `supabase/` conservan su ubicación porque el build, CI y los gates las usan. `docs/v2-amazon/` conserva contratos de dominio reutilizados; los requisitos del evento Amazon son antecedentes, no requisitos de la nueva entrega. Los documentos de la base se navegan desde [docs/base](docs/base/README.md).

La reorganización no mueve migraciones aplicadas, no cambia el directorio raíz de un despliegue ni configura recursos remotos. Preparar esas carpetas no da por concluidas las historias funcionales.
