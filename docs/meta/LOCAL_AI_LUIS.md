# IA local de Luis — 30 de octubre de 2026

**Actualización posterior:** la clave privada ya fue configurada y pasaron llamadas reales de texto, fotos, voz y explicación. Véanse [aceptación real](LUIS_LIVE_ACCEPTANCE_2026-10-30.md) y [resultados](LUIS_LIVE_RESULTS_2026-10-30.json). Lo siguiente describe la preparación inicial; Supabase/UI/Passport siguen sin acreditarse por estas pruebas.

Repositorio `Chujutak2024/meta-hackathon`, rama `codex/meta-luis`. Se incorporó al árbol local el incremento de Axel `f3125cb` de `origin/codex/meta-axel`, sin crear commit ni hacer push. Se conservaron el ASR de Luis y el razonamiento `medium` de explicación dentro del mismo cliente compartido. El único conflicto fue documental y conserva los estados y autorías de ambos frentes.

## Archivo privado

El archivo local es `cargomesh/.env.local`, junto a `package.json`. Git lo ignora; no se incluye en esta entrega. Se creó únicamente con configuración y casillas vacías, sin inventar ni copiar credenciales del proyecto Amazon.

| Variable | Uso / estado al preparar el archivo |
| --- | --- |
| `CARGOMESH_AI_PROVIDER` | `META`; sin clave falla como `NOT_CONFIGURED` |
| `META_MODEL_API_KEY` | Vacía: Luis debe colocar su clave privada localmente |
| `META_MODEL_BASE_URL` | `https://api.meta.ai/v1` |
| `META_MUSE_MODEL` | `muse-spark-1.3`: texto, fotos, etiquetas y explicación |
| `META_TRANSCRIBE_MODEL` | `muse-voice-transcribe-1.0`: WAV |
| `META_PROPOSAL_TIMEOUT_MS` / `META_PROPOSAL_MAX_OUTPUT_TOKENS` | 45000 / 2048 |
| `META_APPROVED_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | Vacías; deben identificar el mismo proyecto Meta autorizado |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Vacías; solo la primera puede ser pública |

Se desactivó el gateway heredado de Nova y Bedrock para evitar un respaldo implícito. El reconocimiento de fotos no necesita otra clave aparte de Meta. SAM/Modal se configurarán con el contrato aceptado del worker de Ramón/Jean; esta preparación no provisiona infraestructura.

No es necesario Supabase para el chequeo de archivos ni para el humo aislado del proveedor. Sí faltan sus valores para la aplicación autenticada completa. Una clave configurada no acredita saldo, acceso al modelo ni conexión exitosa.

## Imágenes de demo

Se conservaron las [tres imágenes de Axel](demo-assets/ax02/README.md) y se generaron otras [tres de Luis](demo-assets/luis/README.md) con la herramienta integrada `image_gen`. Los prompts completos están en [GENERATION.json](demo-assets/luis/GENERATION.json). Todas son sintéticas: ninguna demuestra un envío, peso medido o conteo de carga real.

Las referencias de evaluación se comprueban después de inferir; no se entregan al modelo como respuesta esperada. El cuarto caso es texto sintético que simula una transcripción antigua más una corrección nueva; no acredita ASR real.

## Comandos desde `cargomesh/`

Sin consumo de Meta:

```cmd
pnpm check:meta-ai
pnpm smoke:meta
pnpm smoke:meta-media --check
pnpm smoke:meta-media-luis --check
```

`check:meta-ai` comprueba únicamente los módulos de IA: después de colocar `META_MODEL_API_KEY` debe quedar `READY_FOR_LIVE_CHECK` sin exigir Supabase y sin consumir créditos. El informe conserva `applicationReady: false` mientras falte la base. `smoke:meta` revisa la aplicación completa y sale con código 2 y `NOT_CONFIGURED` mientras falten valores. Los chequeos de fotos validan contratos, firmas, tamaños y hashes; `PASS_INPUTS_ONLY` no significa reconocimiento exitoso.

Después de colocar la clave y confirmar que la cuenta tiene créditos/condiciones aceptadas, los siguientes comandos sí envían material a Meta y pueden consumir saldo:

```cmd
pnpm smoke:meta --live-text
pnpm smoke:meta-media-luis --live
pnpm smoke:meta --live-voice "C:\ruta\nota-propia.wav"
pnpm smoke:meta-explanation --live
```

El humo de fotos utiliza el adaptador de Axel. No hace falta otro cliente ni otra API. Para guardar el resultado de los casos sintéticos de Luis, añadir `--report`; escribe `docs/meta/demo-assets/luis/LIVE_RESULTS.json` y conserva intacto el informe de Axel. Sin `--live` nunca se llama al proveedor. Los argumentos contradictorios o repetidos se rechazan.

La preparación inicial no ejecutó comandos live ni creó `LIVE_RESULTS.json`. El seguimiento posterior autorizado sí los ejecutó, con evidencia separada enlazada arriba; no cambió cuentas remotas ni añadió un medio de pago.

## Verificación de esta copia

| Comando | Resultado real |
| --- | --- |
| `pnpm test:meta-ai` | 49 pass, incluidos los 12 casos de medios de Axel, HTTP inyectado |
| `pnpm test:meta-base` | 38 pass; incluye CLI segura, suites locales y exclusión de `.env.local` |
| `pnpm test:meta-voice` | 30 pass, HTTP inyectado |
| `pnpm test:meta-explanation` | 29 pass, HTTP inyectado |
| `pnpm typecheck` | Pass |
| `pnpm check:architecture` | Pass: 792 módulos, 236 entradas cliente |
| `pnpm test:v2-conversation` | Pass en sus dos etapas |
| `pnpm test:v2-chat-workflow` | 104 pass |
| Humo de imágenes `--check`, suites Axel y Luis | `PASS_INPUTS_ONLY`, cero llamadas a Meta |
| `pnpm check:meta-ai` | Solo falta `META_MODEL_API_KEY`; configuración con clave ficticia en memoria pasa sin invocar ningún proveedor |
| `pnpm smoke:meta` | `NOT_CONFIGURED`: faltan clave Meta y valores Supabase, sin llamada |

Seguimiento del 30-oct: a petición de Luis se comprobó también el `.env.local` real sustituyendo únicamente la clave por un marcador ficticio **en memoria**. Los parsers de texto y voz quedaron configurados, sin otras variables de IA faltantes y sin llamada al proveedor. El archivo conserva la clave vacía. Se añadió `pnpm check:meta-ai` y pasaron sus 20 pruebas de chequeo, incluidas dos nuevas, más typecheck. La validación de configuración no comprueba la validez de una futura clave, saldo ni disponibilidad de modelos.

La aplicación visual para subir/revisar adjuntos y el servicio real de medios siguen siendo integración del frente de Cristhian. Este cambio no anuncia ese flujo como terminado ni altera su UI o las reglas de confirmación. La aceptación real de Axel permanece atribuida a su rama y sus informes; no se presenta como una prueba repetida por Luis.
