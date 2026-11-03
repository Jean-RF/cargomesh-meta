> Guía activa para Luis. Leer primero [contexto común](00-contexto-comun.md), [estructura](../../../ESQUEMA_PROYECTO.md) y [AGENTS](../../../AGENTS.md). Las historias y APIs descritas siguen pendientes salvo evidencia de implementación. Los prompts recibidos se preservan en `docs/meta/reference/prompts-recibidos/`.

# Luis — infraestructura, voz y explicación

## Rama y PR de este frente

- **Responsable:** Luis.
- **Rama fija:** `codex/meta-luis`; base de arranque `origin/main` en `6f70f50`.
- **PR:** borrador a `main` del repositorio de trabajo `Chujutak2024/meta-hackathon`, titulado «Voz, explicación y entorno del producto general».
- **Alcance:** AX-09, AX-10, AX-03 del producto general, fuera de Indie.
- **Vínculos:** Consume el cliente de Axel y hechos de Juan cuando estén integrados en el producto general. Sus aportes se conservan para reintegración con crédito después del evento; no promoverlos automáticamente a Indie.
- Mantener este PR abierto mientras se construye el frente; varios commits y una historia activa a la vez. Un PR mergeado queda cerrado y no integra automáticamente commits posteriores.
- Este commit prepara instrucciones: no implementa funciones ni acredita pruebas, credenciales o despliegues.

Los acuerdos comunes y el manifiesto de ramas se preparan en la rama de Cristhian. Leer [el manifiesto](https://github.com/Chujutak2024/meta-hackathon/blob/codex/meta-cristhian/docs/meta/PR_INTEGRANTES.md) y [el acuerdo de entrega/reintegración](https://github.com/Chujutak2024/meta-hackathon/blob/codex/meta-cristhian/docs/meta/ENTREGA_Y_REINTEGRACION.md). Antes de integrar funcionalidad, sincronizar las decisiones aceptadas desde `main`.

Este frente pertenece al producto general de cinco personas y queda fuera de la entrega Indie. La integración por Cristhian no reasigna su autoría ni lo hace elegible. Reintegración y publicación completa posteriores conservan el crédito de Luis.


El paquete de IA se divide en dos frentes que trabajan en paralelo. **Luis** es dueño de la **infraestructura y de los extremos del flujo de IA**: el proyecto Vercel `cargomesh-meta` con sus claves y la prueba de humo, la transcripción de notas de voz con Voice Transcribe y la explicación de las diferencias en el Passport. **Axel** se encarga del cliente compartido, la interpretación y los errores (ver `axel.md`).

## Cómo usar este archivo con tu agente

1. Tu agente debe leer `00-contexto-comun.md` y este archivo (ya están en `docs/meta/prompts/`).
2. Usa el prompt de abajo cambiando `<ID>`; conserva la rama fija del frente y añade los commits al mismo PR abierto.
3. Revisa el plan de 5 líneas que te devuelva antes de dejarlo implementar.

## Prompt para tu agente

```text
Eres el agente de código de Luis (infraestructura, voz y explicación) en CargoMesh, para el producto general Meta, fuera de la entrega Indie. Repo: Chujutak2024/meta-hackathon.

Historia: <ID>. Rama fija: codex/meta-luis, basada en origin/main de meta-hackathon. Usa el mismo PR del frente; no abras otra rama por historia. El PR va a main de meta-hackathon. No hagas push directo a main ni modifiques el repositorio Amazon.

Antes de escribir código:
1. Lee AGENTS.md, docs/meta/prompts/00-contexto-comun.md y docs/meta/prompts/luis.md (sección de la historia <ID>).
2. Revisa la documentación que aplique (https://dev.meta.ai/docs/speech-to-text, structured-output, reasoning, y la de Vercel si tocas el despliegue). Si algo del código no coincide con la doc, gana la doc y me avisas.
3. Resúmeme en 5 líneas qué vas a cambiar, la entrada y la salida con un ejemplo, los casos negativos y los archivos que vas a tocar. Espera mi OK.

Mientras implementas:
- Trabaja solo en <ID>. Si necesitas algo de otra historia, usa el fixture del contrato y avísame.
- Eres dueño de src/server/ai/meta/transcribe.ts, explain-reconciliation.ts y scripts/meta-smoke.ts. Usa el cliente (client.ts) y los errores (errors.ts) de Axel; no crees otro cliente ni otros códigos de error.
- El modelo sale de variables de entorno (META_MUSE_MODEL, META_TRANSCRIBE_MODEL).
- La explicación recibe solo hechos ya calculados por Juan y nunca recalcula la diferencia. Si la sesión está abierta o hay incertidumbre, no puede afirmar que falta un bulto.
- Toda salida del modelo pasa por JSON Schema en la llamada y por validación Zod en el servidor. Una referencia a un evento que no está en la entrada se rechaza.
- La transcripción es una entrada que la persona revisa; nunca se guarda como dato confirmado.
- No uses variantes "contributor" ni Muse Image.
- Claves solo en servidor o en las variables de Vercel; nada de NEXT_PUBLIC_ para secretos; nunca claves, audio ni datos personales en logs.
- En Vercel nunca cambies la rama de producción, el directorio raíz ni los alias del proyecto de Amazon.

Al terminar:
- Corre las pruebas unitarias de la historia y test:v2-conversation; pega el resultado real. Las llamadas reales a Meta van aparte y se anotan con modelo, latencia y costo.
- Entrégame el resumen del diff, los comandos con su resultado, los límites y lo que queda pendiente.
- Propón la línea para BUILT_DURING_HACKATHON.md.
- No hagas push, merge ni deploy sin que te lo pida.
```

## Tu frente

- **Produces:** el entorno el dominio Meta autorizado (propuesto: `cargomesh-meta.vercel.app`), la transcripción de notas de voz y la explicación de la conciliación.
- **Consumes:** el cliente y los errores de Axel, los WAV de Cristhian, y los hechos calculados de Juan (esperado, observado, calidad y eventos).
- **Te consumen:** Axel y Cristhian (la transcripción entra a la propuesta) y Juan (muestra tu explicación en el Passport).
- **Revisas a:** Ramón/Jean (llamada a SAM, worker y despliegue en Modal). **Te revisa:** Axel.

## Plan día por día

| Día | Qué entregas |
| --- | --- |
| 27 oct (P0) | AX-09: proyecto Vercel, cuenta de Meta con alerta de gasto, claves y prueba de humo de `muse-spark-1.3` y Voice Transcribe |
| 28 oct (I1) | AX-10: transcripción de notas de voz en español |
| 29–30 oct (I2) | AX-03, primera parte: explicación contra los fixtures del contrato de conciliación de Juan |
| 31 oct–1 nov (I3) | AX-03, segunda parte: explicación con datos reales de Juan y Ramón/Jean, visible en el Passport |
| 2–3 nov (I4) | Pruebas de punta a punta de los flujos de IA en el dominio Meta autorizado (propuesto: `cargomesh-meta.vercel.app`). Si sobra capacidad, AX-05 |

## Notas técnicas

### AX-09: infraestructura

- **Vercel:** proyecto nuevo `cargomesh-meta` en la misma cuenta del de Amazon, con Root Directory `cargomesh`, Node 24 y Production Branch `main` del repositorio Meta.
- **Proyecto Amazon:** conservar su configuración. La preparación de este repositorio no autoriza cambiar sus build steps, variables o alias.
- **Variables:** las del contexto común, en Production y Preview. Las claves de Supabase te las pasa Juan y el token del worker te lo pasa Ramón/Jean, siempre por un canal privado.
- **Meta:** cuenta en dev.meta.ai, medio de pago, alerta de gasto, créditos del hackathon y dos claves (Vercel y Modal; se ven una sola vez). La de Modal se la das a Ramón/Jean.
- **Prueba de humo:** `scripts/meta-smoke.ts`, inspirado en `scripts/certify-bedrock.ts`. Llama a `muse-spark-1.3` con texto, imagen y esquema, y a Voice Transcribe con un WAV. Anota modelo, latencia y costo. Como el cliente de Axel llega en I1, en P0 este script puede usar el SDK `openai` directamente.

### AX-10: transcripción

- `POST /v1/asr/transcribe` en multipart, con una parte `request` (JSON con el modelo y el sesgo de idioma español) y una parte `audio` (WAV). Verifica los nombres de campos en https://dev.meta.ai/docs/speech-to-text.
- Solo WAV mono PCM de 16 bits a 16 o 24 kHz, hasta 32 MB y 10 minutos. El navegador ya convierte (lo hace Cristhian); el servidor valida y rechaza con `MEDIA_INVALID` lo que no cumple.
- Devuelve el texto con su `evidenceId`. Axel lo usa como fuente `audio` de la propuesta.

### AX-03: explicación de la conciliación

- **Entrada:** solo hechos calculados por Juan: esperado, observado, unidad, si la sesión está cerrada, calidad y eventos con segundo.
- **Salida:** resumen, motivos, acciones sugeridas de una lista cerrada y referencias a eventos.
- **Razonamiento:** `medium`.
- Si la Meta API cae, el Passport sigue mostrando la comparación numérica sin explicación.
- Empieza en I2 contra los fixtures del contrato de Juan y conecta los datos reales en I3.

### Respuesta hablada (AX-05, opcional)

Leer en voz alta la propuesta o la explicación es otra capacidad: Voice Transcribe no sintetiza voz. Si se hace, usa la síntesis del navegador rotulada como tal, y la interfaz debe funcionar igual sin audio.

## Tus historias

Compromiso MUST: 3 historias, 5 horas.

### AX-09 · Proyecto Vercel cargomesh-meta y claves de proveedores

Sprint P0 · MUST · 1 h · Depende de: CR-09 · La usan: aceptación final

- **Objetivo:** Tener el entorno web de Meta desplegado sin tocar el proyecto de Amazon.
- **Lógica:** Proyecto nuevo con Root Directory cargomesh, Node 24 y Production Branch main del repositorio Meta; conservar la configuración del proyecto Amazon.
- **Backend:** Variables del Supabase nuevo, Meta API, Modal y demo; ninguna secreta con NEXT_PUBLIC_; maxDuration 60 en las rutas de Muse; cuenta de Meta con alerta de gasto.
- **Frontend:** Acceso de demo para jueces en el dominio Meta autorizado; `cargomesh-meta.vercel.app` es el nombre propuesto.

Pruebas unitarias:

- AX-09-UT-01: La configuración del proyecto Amazon permanece intacta; el proyecto Meta apunta al repositorio Meta.
- AX-09-UT-02: Bundle del navegador sin claves secretas.
- AX-09-UT-03: Variable faltante -> NOT_CONFIGURED visible.

Aceptación:

- El proyecto Amazon conserva su configuración y su despliegue previo.
- El dominio Meta autorizado sirve un SHA identificable de main de meta-hackathon.

Archivos de partida:

- `cargomesh/.env.example`
- `cargomesh/next.config.ts`

Evidencia para el PR: Capturas de configuración sin valores secretos y URL del deploy.

### AX-10 · Transcribir notas de voz con Voice Transcribe

Sprint I1 · MUST · 1 h · Depende de: AX-00 · La usan: CR-02, AX-02

- **Objetivo:** Convertir la nota de voz del embarcador en texto en español para la interpretación.
- **Lógica:** El audio llega como WAV mono de 16 kHz desde el navegador; la transcripción es una entrada más que la persona revisa y nunca se guarda como dato confirmado.
- **Backend:** Función transcribe() con POST /v1/asr/transcribe (multipart: request JSON y audio WAV), modelo muse-voice-transcribe-1.0 por variable y sesgo de idioma español; límites de 32 MB y 10 minutos; errores MEDIA_INVALID, NOT_CONFIGURED y PROVIDER_UNAVAILABLE del módulo de Axel.
- **Frontend:** Devolver a Cristhian el texto transcrito con su evidenceId para mostrarlo junto a la propuesta.

Pruebas unitarias:

- AX-10-UT-01: WAV estéreo o de 44,1 kHz -> MEDIA_INVALID antes de llamar.
- AX-10-UT-02: Audio de más de 10 minutos -> rechazado.
- AX-10-UT-03: Respuesta sin texto -> transcripción vacía marcada, sin inventar.
- AX-10-UT-04: Clave ausente -> NOT_CONFIGURED sin invocar.

Aceptación:

- Una nota de voz propia en español se transcribe con el modelo real.
- La transcripción queda ligada a su evidencia y no se guarda como dato confirmado.

Evidencia para el PR: Transcripción de un audio propio con modelo, duración y costo; sin datos personales.

### AX-03 · Explicar diferencias a partir de hechos calculados

Sprint I3 · MUST · 3 h · Depende de: AX-01, JU-03, RA-02 · La usan: AX-04, AX-05

- **Objetivo:** Generar una explicación operativa y acciones propuestas respaldadas por evidencia.
- **Lógica:** El input ya trae esperado, observado, unidad, calidad y cierre. Muse explica; no recalcula ni cambia el conteo, la reserva o el manifiesto.
- **Backend:** Función de explicación con schema de referencias y acciones permitidas; no ejecutar herramientas comerciales. Bloquear afirmaciones de faltante si el comparador reporta incertidumbre.
- **Frontend:** Texto breve: hallazgo, límite y siguiente acción sugerida; mostrar enlace al timecode/evidencia que la aplicación valide.

Pruebas unitarias:

- AX-03-UT-01: Esperado 12/observado 11 cerrado -> explicación basada en diferencia de uno.
- AX-03-UT-02: Sesión abierta -> progreso sin declarar faltante.
- AX-03-UT-03: Unidad incompatible -> pedir revisión.
- AX-03-UT-04: Referencia inexistente -> rechazar explicación o omitirla con aviso.

Aceptación:

- Toda afirmación visible se relaciona con input verificable.
- La acción sigue siendo una propuesta del operador.

Archivos de partida:

- `cargomesh/src/server/conversation/carrier-briefing.ts`

Evidencia para el PR: Casos de explicación y rechazo; si IA cae, se mantiene la comparación numérica.

### Ampliaciones (solo si sobra capacidad)

No se empiezan sin acuerdo en la daily. El detalle está en `docs/meta/backlog/BACKLOG_SCRUM.csv`.

| ID | Prioridad | Horas | Historia |
| --- | --- | --- | --- |
| AX-05 | SHOULD | 2 | Ofrecer respuesta hablada opcional |
| AX-07 | COULD | 4 | Mantener conversación de voz bidireccional |
