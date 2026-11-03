# CargoMesh Meta

Preparación del incremento Meta sobre la base CargoMesh: **declarar -> planificar -> observar la carga -> comparar -> revisar evidencias**.

## Empieza aquí

1. [Estructura del proyecto y propiedad de cada carpeta](ESQUEMA_PROYECTO.md).
2. [Contexto, responsables y flujo de trabajo Meta](docs/meta/README.md).
3. [Tu prompt de trabajo](docs/meta/prompts/README.md) y [backlog compartido](docs/meta/backlog/README.md).
4. [Contratos que conectan los módulos](docs/meta/contracts/README.md) y [plan por iteraciones](docs/meta/iterations/README.md).

```text
meta-hackathon/
├── cargomesh/                    # aplicación Next.js y API Hono existentes
│   ├── src/features/             # interfaz; meta-loading-dashboard preparado
│   ├── src/server/ai/meta/       # integración IA: Axel y Luis
│   ├── src/server/modules/       # servicios: manifiesto, medios, sesión y comparación
│   ├── src/shared/schemas/meta/  # contratos compartidos por implementar
│   └── dockmind-worker/          # procesador de vídeo: Ramón/Jean
├── docs/meta/                    # documentación activa de esta entrega
│   ├── prompts/                 # contexto común y una guía por integrante
│   ├── backlog/                 # historias y matriz de pruebas propuestas
│   ├── contracts/               # fronteras y dependencias
│   ├── iterations/              # objetivos y entregas por sprint
│   └── reference/               # antecedentes; no instrucciones activas
├── infra/meta/                  # planes de Vercel, Supabase y worker
├── supabase-v2/                  # cadena SQL de la base que se reutiliza
├── supabase/                     # escenarios y pruebas de la base
├── scripts/                     # verificaciones y herramientas existentes
└── BUILT_DURING_HACKATHON.md      # base existente e incremento nuevo
```

El producto general reúne a Cristhian, Axel, Luis, Juan y Ramón/Jean. La entrega Indie se delimita a cuatro y el trabajo de Luis se conserva para la reintegración y publicación completa posterior al evento: ver el [acuerdo de entrega y reintegración](docs/meta/ENTREGA_Y_REINTEGRACION.md). El backlog general no equivale al alcance presentado.

## Estado real

El PR #1 incorporó la base CargoMesh `4482d3a9a51bcc8c7c151996862ac5d43c96db8f`. Los directorios nuevos de Meta contienen contratos de trabajo y responsabilidades: sus servicios, endpoints y proveedores todavía requieren implementación y evidencia. No hay un despliegue Meta certificado por esta preparación.

La rama base es `main` **de este repositorio**. Las entregas van mediante PR desde `codex/meta-*`; Linear está fuera del flujo por indicación del usuario. Ver [AGENTS.md](AGENTS.md) y [CONTRIBUTING.md](CONTRIBUTING.md).

## Ejecutar la base

Consultar [setup existente](docs/SETUP.md), [variables y límites](docs/CONFIGURATION.md) y [verificación](docs/TESTING.md). La aplicación sigue en `cargomesh/`, de acuerdo con los prompts y los scripts. No copiar credenciales o datos de Amazon. La configuración de infraestructura Meta se revisa por separado en [infra/meta](infra/meta/README.md).

En codex/meta-axel, AX-00/AX-01 incorporan el contrato y adaptador de texto/chat. Configuración, pruebas y aceptación real pendiente en [AX01_META_TEXT](docs/meta/AX01_META_TEXT.md). No se acredita un despliegue Meta.
