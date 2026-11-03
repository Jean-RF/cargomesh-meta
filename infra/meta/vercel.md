# Plan Vercel Meta

Proyecto independiente asociado a `Chujutak2024/meta-hackathon`. Root Directory propuesto: `cargomesh`; rama de producción: `main` de este repositorio. No editar el proyecto Amazon, su Ignored Build Step, sus variables o sus alias.

Antes de configurar: confirmar acceso, dependencias reales, comando de instalación/build existente y variables estrictamente necesarias. Las claves de modelos solo viven en servidor. Autorizar explícitamente cualquier creación o ajuste remoto.

Evidencia de cierre: proyecto/dominio, SHA exacto, build, conexión a entorno Meta y prueba funcional autorizada. Una carpeta, PR o CI verde no confirma un despliegue. Confirmar referrers de Maps para el dominio Meta antes de prometer mapas live.

## Preparación AX-09 de Luis — sin aprovisionamiento

Usar [environment.example](environment.example) y el chequeo `pnpm smoke:meta` desde `cargomesh/`. El script informa solo nombres/estados y no llama al proveedor por defecto. Su resultado no certifica la propiedad de una cuenta, acceso a modelos, RLS ni un despliegue. `META_APPROVED_SUPABASE_URL` es el origen Meta aprobado fuera de banda, nunca una URL que el navegador o el modelo puedan elegir.

Configuración a comprobar cuando se autorice el proyecto: repositorio `Chujutak2024/meta-hackathon`, Root Directory `cargomesh`, Node 24, instalación con el lockfile existente y build `pnpm build`, producción desde `main` del repositorio Meta. El trabajo local sigue en `codex/meta-luis`. No ejecutar `vercel link`, `vercel deploy`, cambios de alias ni comandos de Supabase como efecto de este chequeo.

Los secretos de Meta/Supabase son de servidor. El frontend solo puede recibir la URL y la clave publicable/anon de Supabase, nunca el service-role. Desactivar la voz Nova heredada en el entorno Meta; no es un reemplazo silencioso del proveedor. El cliente de Axel del PR #4 ya está integrado desde main. La revisión local detecta también una clave privilegiada disfrazada como anon o copiada bajo otro nombre público; el chequeo de valores no sustituye la revisión de permisos reales.

## Audio y presupuesto de la función

Vercel limita el cuerpo de petición/respuesta de sus funciones a 4,5 MB. La API de voz Meta documenta un máximo de cuerpo multipart de 32 MB y diez minutos. Por tanto, no diseñar un upload de audio de 32 MB a una ruta Next/Hono: Cristhian sube al Storage privado y la ruta recibe un `evidenceId`; el servidor resuelve/autoriza el objeto y valida sus bytes antes de llamar a Meta. AX-10 limita el archivo a 30 000 000 bytes y diez minutos de muestras PCM, dejando margen multipart. La respuesta ASR JSON se lee con techo de 64 KiB y se valida antes de exponerse.

La propuesta de `maxDuration = 60` se aplicará a las rutas concretas cuando existan, con timeout de proveedor menor y cancelación. No se modifica ahora el gateway V2 completo ni se promete que una grabación larga se procese en ese plazo; si el spike exige más, decidir un trabajo asíncrono con los dueños antes de desplegar.

Fuentes revisadas el 27-oct-2026: [límites Vercel](https://vercel.com/docs/functions/limitations), [duración Next/Vercel](https://vercel.com/docs/functions/configuring-functions/duration), [audio Meta](https://dev.meta.ai/docs/speech-to-text), [referencia de transcripción](https://dev.meta.ai/docs/api-reference/voice/transcribe).
