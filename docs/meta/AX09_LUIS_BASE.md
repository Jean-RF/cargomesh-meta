# Luis — sección 1: base compartida y entorno

27-oct-2026. Repo `Chujutak2024/meta-hackathon`, rama `codex/meta-luis`, PR existente #7. Producto general, fuera de la candidata Indie. Preparación local; sin cuentas, infraestructura remota, deploy, claves reales ni llamadas al modelo.

**Actualización 28-oct:** se incorporó main con autorización, se compuso ASR con el SDK compartido y se añadió `pnpm smoke:meta --live-voice <WAV propio>` con opt-in. La revisión de las tres secciones y su aceptación actual está en [LUIS_AUDIT_2026_10_28.md](LUIS_AUDIT_2026_10_28.md). El resto de este documento conserva el corte histórico de la sección 1, no el estado actual de sus dependencias.

## Revisión de dependencias

Se revisó `origin/codex/meta-axel@74bfe46` sin fusionarlo, copiar su cliente ni modificar esa rama. AX-00/AX-01 tienen contrato, cliente de texto y `scripts/meta-text-smoke.ts`. PR #4 permanece abierto en este corte. En la base de Luis esos archivos todavía no están integrados. `errors.ts` no existe allí: Axel exporta códigos desde `model-proposal.ts`. Su cliente fija `reasoning_effort: low`; audio y explicación necesitan una extensión acordada, no otro cliente.

El usuario confirmó que aún no hay clave Meta ni proyecto Supabase Meta. Eso impide la aceptación real y un despliegue; no impide desarrollar contratos y pruebas locales.

## Qué hay implementado

- [Contratos propuestos](contracts/LUIS_V1.md) de transcripción/proyección para explicación, Zod, shapes convertibles a JSON Schema estricto y fixtures sintéticos de válido/incompleto/rechazado.
- Chequeo de entorno de solo lectura: repo/rama/root correctos, proveedor/modelos, nombres de claves compatibles con Axel, rechazo de secretos públicos, separación del target Supabase y voz Nova heredada desactivada.
- `scripts/meta-smoke.ts`: sin flags o con `--check` no llama a ningún proveedor. `--live-text` exige configuración segura y los módulos de Axel presentes; delega a su smoke, no crea otro cliente. Separa PASS_TEXT_ONLY de la aceptación de voz, imagen o despliegue.
- Los fallos de un proceso/humo no imprimen respuestas crudas, credenciales, transcripts ni excepciones. Después de iniciar el proceso, si falla no se afirma falsamente que Meta no pudo procesarlo/cobrarlo. Coste desconocido sigue null.
- [Preparación de Vercel](../../infra/meta/vercel.md) sin cambiar ningún proyecto ni el repo Amazon.

## Uso local

Desde `cargomesh/`:

```powershell
pnpm test:meta-base
pnpm smoke:meta
```

La segunda orden usa `.env.local` solo si existe. Sin configuración devuelve `NOT_CONFIGURED`, exit 2, y enumera nombres/estados, no valores. Si la configuración es correcta pero falta el incremento aceptado de Axel devuelve `DEPENDENCY_PENDING`. `READY_FOR_LIVE_CHECK` es solo preparación: `providerVerified` y `deploymentVerified` permanecen false.

Solo tras integrar las dependencias y autorizar una llamada real con el texto sintético propio de Axel:

```powershell
pnpm smoke:meta --live-text
```

Ese comando puede consumir crédito. No ejecutarlo como parte automática del build/CI ni como prueba de voz. La imagen requiere AX-02 y el audio requiere AX-10. No se realizan escrituras comerciales ni se ejecuta `vercel`, Supabase o Modal desde el script.

## Aceptación pendiente

1. Revisión/aceptación de los contratos por sus consumidores y posterior sincronización por `main`.
2. Extensión del cliente compartido de Axel para las modalidades que faltan; no hacer merges oportunistas de su rama.
3. Accesos privados y target Supabase Meta aprobado, con autorización específica para provisionar Vercel.
4. Humo real con modelo, identificador y uso/latencia; coste desconocido no se rellena con cero. Imagen/voz se certificarán con sus adaptadores y medios propios.
5. Despliegue identificable y validación de aislamiento/auth/RLS. CI local o un README no sustituyen estas pruebas.

AX-09 no se declara desplegado/cerrado por esta preparación. AX-10 (transcripción efectiva) y AX-03 (generación/exposición de explicaciones) no se implementan todavía.

## Verificación del corte

Las pruebas con transporte inyectado son pruebas locales, no evidencia de inferencia real ni aprobación externa. Los estados `DEPENDENCY_PENDING`, `UNSAFE_CONFIGURATION` e `INVALID_ARGUMENTS` son diagnósticos del CLI, no nuevos errores de las APIs de dominio.

- `pnpm test:meta-base`: 25 pruebas aprobadas, sin llamadas de proveedor.
- `pnpm smoke:meta`: `NOT_CONFIGURED`, exit 2 esperado; repo/rama/root correctos, configuración y dependencia de Axel pendientes, `liveRequestMade: false`.
- Prueba cruzada con el `DeclarationInputSchema` real de `origin/codex/meta-axel@74bfe46`: acepta la evidencia de audio producida por Luis; evaluación en memoria, sin copiar código ni hacer merge. No prueba autorización, STT ni integración desplegada.
- `pnpm typecheck` y `pnpm check:architecture`: aprobados.
- `pnpm test:v2-conversation` y `pnpm test:v2-chat-workflow`: aprobados en la base de Luis; no se atribuyen a este incremento las capacidades previas.
- `pnpm build`: aprobado sin credenciales reales; canario privado ficticio ausente de los 230 archivos generados del navegador. La variable se limitó al proceso de build, no se creó `.env.local`. No certifica un despliegue remoto ni claves reales.

No se hizo commit, push, merge, deploy, prueba de modelo real ni revisión visual. Sin credenciales/proyecto Meta, AX-09 sigue pendiente de aceptación real aunque esta preparación local pase sus pruebas.
