# Revisión de IA de Axel — 31 de octubre de 2026

## Resultado

El núcleo de texto e interpretación de imágenes/transcripciones está disponible en el árbol de `main`. No hace falta volver a integrar AX-02 para disponer del adaptador. La captura de medios del formulario y la aplicación revisada de propuestas a grupos siguen pendientes; configurar una clave no completa esas conexiones.

## Git y procedencia

- Repositorio: `Chujutak2024/meta-hackathon`; copia de trabajo `codex/meta-cristhian` en `c3e8162`, con cambios locales anteriores conservados.
- `git fetch origin --prune` y `git pull --ff-only origin main`: `Already up to date`; base remota `df12172`.
- Axel tiene `f3125cb` en `origin/codex/meta-axel`, sin PR abierto al consultar GitHub. Los PR abiertos son #6 de Ramón/Jean y #9 de Juan.
- `f3125cb` no es ancestro de main. Su implementación AX-02 fue incorporada con procedencia explícita por `eabd11c` de Luis, integrado mediante PR #7 (`fff9026`).
- Se compararon blobs/diffs de `interpret-media-declaration.ts`, `media-input.ts`, `meta-media.test.ts`, `proposal-boundary.ts` y su prueba: sin diferencias entre main y la rama de Axel.
- El cliente/configuración actuales conservan las ampliaciones de voz y explicación de Luis. No sustituir archivos actuales por los de la rama antigua de Axel: perdería esas ampliaciones. Una futura continuación de Axel debe sincronizar main y revisar su delta.
- No se realizó merge, push, despliegue ni migración en esta revisión. La selección publicable Indie mantiene su revisión de procedencia separada.

## Entorno privado

Existe `cargomesh/.env.local`, ignorado por Git. Se conservaron los valores de la base Meta local y se configuraron:

```dotenv
CARGOMESH_AI_PROVIDER=META
META_MODEL_BASE_URL=https://api.meta.ai/v1
META_MODEL_API_KEY=<clave privada, no incluir en Git>
META_MUSE_MODEL=muse-spark-1.3
META_TRANSCRIBE_MODEL=muse-voice-transcribe-1.0
META_APPROVED_SUPABASE_URL=http://127.0.0.1:64321
```

El comprobador `scripts/meta-smoke.ts --provider-only` terminó en `READY_FOR_LIVE_CHECK`, sin dependencias ausentes. Ese estado comprueba configuración, no inferencia ni despliegue. La transcripción no se probó contra el proveedor.

El adaptador configura y valida exclusivamente `https://api.meta.ai/v1`. Una clave de Baseten no sirve con ese origen; habilitar Baseten exige implementar y verificar su configuración y contrato propios. No se usó ni guardó la credencial de Baseten en esta revisión.

## Verificación ejecutada

Comandos desde `cargomesh/`, sobre la copia actual con los cambios locales existentes:

| Comando | Resultado |
| --- | --- |
| `node --conditions=react-server --import tsx --test src/server/ai/meta/proposal-boundary.test.ts src/server/ai/meta/meta-adapter.test.ts src/server/ai/meta/meta-media.test.ts` | 49/49 |
| `npm run test:v2-conversation` | 106/106 y 32/32 |
| `npm run test:meta-base` | 40/40 |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | exit 0 |
| `node --conditions=react-server --env-file-if-exists=.env.local --import tsx scripts/meta-text-smoke.ts --live` | PASS, inferencia real |

`pnpm` intentó resolver su versión con Corepack y falló por DNS del sandbox antes de ejecutar pruebas. Se utilizaron las dependencias locales con Node/npm; no se instalaron paquetes.

### Inferencia real de texto

- Texto sintético propio: `12 pallets of machine parts, 100 kg per pallet.`
- Modelo/transporte: `muse-spark-1.3` / `META_MODEL_API`.
- Propuesta: 12 PALLET, 100 kg por unidad; largo/ancho/alto pendientes.
- Resultado: PASS; un intento; 6.944 ms; 2.297 tokens de entrada, 1.170 de salida.
- Request ID: `730a4bc3-f1ce-4cee-9d72-1c6be4f614d4`.
- Coste: desconocido. Escrituras comerciales: cero.
- Una muestra no acredita fiabilidad, rendimiento p95 ni flujo autenticado completo.

No se ejecutaron revisiones visuales, nueva inferencia de imagen/audio, build de producción, pruebas de navegador ni servicios de regresión Docker.

## Conexiones que faltan

1. **Texto:** el chat ya llama a `/api/v2/conversation/interpret`, que selecciona META mediante entorno. El formulario conserva la revisión humana y las guardas contra respuestas antiguas. La prueba realizada invoca el servicio, no el navegador autenticado.
2. **Foto/etiqueta:** crear la conexión autenticada desde captura/subida privada hasta bytes autorizados y `interpretMetaMediaDeclaration`. El expediente comercial CR-DOC01 no es esa API de captura IA.
3. **Audio:** conectar captura, evidencia privada, transcripción de Luis y revisión del texto antes de alimentar la propuesta. Tener un adaptador ASR no completa esa ruta.
4. **Grupos:** fijar del lado del servidor el grupo destinatario, request, revisión y alcance autorizado. AX-02 devuelve campos por unidad y revisión, pero su DTO no contiene `groupId`; no aplicar una propuesta indiscriminadamente a todos los grupos.
5. **Confirmación:** presentar diferencias por campo, conservar ediciones recientes y confirmar contra la versión esperada antes de persistir. Reabrir debe conservar grupos y procedencia. La IA no confirma manifiestos ni bookings.

Estas conexiones pertenecen al siguiente incremento de formulario/medios e integración, con consumo del contrato de Axel; no constituyen un defecto demostrado del adaptador aislado.
