# Evidencia de medios — declaración y expediente documental

El expediente PDF/PNG/JPEG de Cristhian tiene servicio, repositorio, bucket privado, rutas Hono y paneles mínimos conectados. Contrato: `docs/meta/contracts/DOCUMENTOS_HTTP_CR_DOC01.md`. Sus documentos comerciales se mantienen separados de las fotos/audio de declaración de Luis y de los clips/jobs de Ramón.


La integración de declaraciones de Luis está en `declaration-media.ts`. Conecta el formulario y el borrador compartido de Cristhian con el reconocimiento de Axel y el ASR existente de Luis. La infraestructura de clips y los productores de Ramón/Jean siguen siendo un contrato separado; este módulo no sustituye esos jobs.

`POST /api/v2/declaration-media/{initialize,finish,list,remove,bind,analyze}` requiere sesión nativa activa y origen válido para cookies. `initialize` prepara una URL temporal de subida a Storage privado; el archivo no atraviesa Next. `finish` verifica tamaño real, decodificación PNG/JPEG o PCM16 WAV y SHA-256. El ID estable permanece en la tabla privada `meta_declaration_media`, acotado a organización, miembro y borrador/solicitud. No se aceptan URLs externas, organización ni rutas de Storage del navegador. La clave de servicio solo se utiliza tras autenticar y comprobar ese alcance.

La IA solo devuelve una propuesta. La revisión permite seleccionar campos, comprobar transcripción y confirmar la aplicación al mismo borrador mediante el controlador existente. Una corrección manual invalida una propuesta pendiente; guardar usa los comandos nativos con versión/idempotencia. Los adjuntos se ligan a la solicitud guardada y se recuperan al reabrir. Las tres medidas seleccionadas derivan el volumen con el cálculo compartido de la conversación; los otros grupos se conservan. Indicaciones de manejo se muestran para revisión, sin inventar códigos de catálogo.

Límites: 4 adjuntos, una nota de voz; 5 MiB por imagen/12 MiB combinados, 30 MB por WAV; grabación del navegador hasta 60 s. El navegador convierte su grabación a PCM16 mono 16 kHz. ASR e interpretación usan el cliente Meta compartido, sin reintentos automáticos; fallos conservan el formulario manual. `remove` marca la referencia como retirada; no purga el original ni implementa una política global de retención. La migración nueva crea el bucket privado. No se aplicó a infraestructura alojada.

Validación reproducible y límites de evidencia: `docs/meta/LUIS_DRAFT_MEDIA_ACCEPTANCE_2026_10_31.md` en la raíz del repositorio.
