# Voz y fotos al mismo borrador — validación local

31-oct-2026. Implementación e integración de Luis en `codex/meta-luis`, producto general fuera de la entrega Indie. Base sincronizada con `origin/main@df12172`. No hubo despliegue, migración alojada, push ni merge remoto.

## Recorrido disponible

Abrir `http://127.0.0.1:8080/clients/freight-request/new`, continuar con terrestre y pulsar **Añadir fotos o voz**. También está en **Fotos y notas de voz** del Copilot. Se puede adjuntar PNG/JPEG, indicar que es una etiqueta, adjuntar WAV o grabar hasta 60 segundos. La grabación del navegador se convierte a PCM16 mono 16 kHz; no depende de Nova/Bedrock.

**Analizar adjuntos** consume el reconocimiento de Axel y el ASR existente de Luis mediante el cliente Meta compartido. Presenta transcripción, campos con procedencia, advertencias y faltantes. Las aclaraciones escritas más recientes prevalecen. Seleccionar los datos, marcar **Revisé los datos seleccionados** y pulsar **Aplicar al borrador** actualiza el controlador original del formulario. No crea otra solicitud ni confirma un manifiesto o reserva. Las tres medidas seleccionadas calculan volumen con la misma función que utiliza la conversación; los demás grupos permanecen intactos. Las indicaciones de manejo se muestran, sin convertir texto libre en códigos de catálogo inventados.

Una modificación del formulario invalida una propuesta pendiente. Guardar espera a que terminen los adjuntos; el formulario sigue editable durante el análisis. Los comandos nativos conservan ID, control de versión y confirmación. Las referencias se ligan al guardar y vuelven al reabrir. Una clave de borrador en sessionStorage permite recuperar adjuntos provisionales y reintentar su vinculación tras una recarga inmediata. Reiniciar crea un alcance nuevo. Borrador compartido y adjuntos usan un acordeón común para mantener accesible el cuadro de mensaje.

## Seguridad y almacenamiento

Migración nueva `20261031090000_meta_declaration_media.sql`, registrada con su hash e incluida en la validación V2. Tabla con RLS y sin acceso directo de `anon`/`authenticated`; el servicio autentica actor/organización/miembro y verifica solicitud DRAFT/versión antes y después del análisis. Archivos en bucket privado `declaration-media`, subidos mediante URL temporal. Nunca se acepta del navegador una URL de descarga, ruta de Storage u organización. El servidor verifica bytes, tamaño, decodificación real, MIME y SHA-256. El proveedor no escribe datos comerciales.

Límites: cuatro adjuntos, una nota de voz, imágenes de hasta 5 MiB cada una/12 MiB combinados y WAV mono de hasta 30 MB. ASR e interpretación tienen plazos acotados y no se reintentan automáticamente. Quitar un adjunto retira la referencia; el original no se purga y no se ha implementado una política global de retención. Una subida incompleta aparece para poder retirarla y volver a adjuntar.

## Entorno y pruebas realizadas

Supabase Docker independiente `meta-luis-media-local`: API `127.0.0.1:65321`, DB `65322`, Storage activo. Perfil de preparación fuera de Git en `C:/Users/holap/Documents/Codex/meta-luis-media-local`. Cadena actual de migraciones y escenario sintético `supabase/scenarios/v2-road-baseline/seed.sql`. Migración de medios aplicada únicamente ahí. `.env.local` privado contiene las variables Meta/Supabase; no se copiaron credenciales Amazon. `CARGOMESH_LOCAL_PROFILE=meta-media` aísla su cookie de los otros perfiles. Entrada demo nativa con cuenta sintética local.

- `pnpm test:meta-draft-media`: 14 pruebas: 11 del hook real y tres de cookies. Cubre revisión obligatoria, selección, correcciones durante inferencia, reinicio, vinculación, recuperación provisional, bloqueo de guardado durante análisis, micrófono tardío/cierre y PCM WAV, volumen completo frente a ejes parciales.
- `pnpm smoke:meta-draft-media --live`: 15 casos HTTP/Auth/Storage reales. Meta real reconoció etiqueta y respetó corrección escrita; ASR real devolvió transcripción revisable. Se probó guardado/revisión/reapertura nativa, versión vieja rechazada, archivo corrupto/sobredimensionado, acceso directo denegado y aislamiento entre dos organizaciones. Cero ofertas, reservas o escrituras de capacidad.
- Repetición sin proveedor tras alinear el decodificador con la versión Sharp ya usada por Next: 13 casos HTTP aprobados.
- `51_meta_declaration_media.test.sql`: diez comprobaciones pgTAP de RLS, grants y bucket privado/límite. Tres pruebas del aislamiento de cookies locales aprobadas.
- Regresiones: 104 pruebas de `test:v2-chat-workflow`; 57 pruebas combinadas de medios, controlador, reconocimiento y ASR; 29 de medios, extracción y aclaración de medidas, ejecutadas durante la integración. Los grupos se solapan: no se suman como una cifra de cobertura.
- TypeScript, arquitectura e inventario de hashes verificados. Compilación de producción verificada; la app de desarrollo usa salida separada.
- Revisión final: suite de medios/cookies 14/14, HTTP local 13/13, conversación 104/104 y conjunto de medidas/reconocimiento/ASR 47/47. La compilación de producción volvió a pasar con los cambios finales. El workflow `v2-qa-gate.yml` ejecuta la suite de medios sin credenciales ni inferencia real.

## Evidencia de interfaz

Se usaron los archivos sintéticos versionados `shipping-label.png` y `synthetic-note.wav`, con llamadas Meta reales. Desde el selector de archivos se subieron ambos, se analizó la etiqueta junto con voz y la aclaración «son 3 cajas, no 4», se revisó y se aplicó: 3 BOX, 8 kg por unidad, 40 × 30 × 20 cm, 0.024 m³ por unidad; totales 24 kg/0.072 m³.

La interfaz guardó solicitud `687ed1ba-69c7-42c7-8fb8-52da29eabb55` v1. Se corrigió manualmente a cinco cajas y la descripción, se guardó v2 y se recargó. Se recuperaron el mismo ID, 5 BOX, 40 kg/0.12 m³, descripción corregida y dos adjuntos READY (una etiqueta y un WAV). No se confirmó el manifiesto. La evaluación ROAD conserva UNKNOWN cuando faltan datos.

Se comprobaron escritorio (1371 × 900 CSS), móvil (390 × 844 CSS) y chat desacoplado. Documento sin desbordamiento horizontal; cuadro de mensaje dentro de la ventana. Se corrigió durante esta revisión la combinación de dos paneles expandidos que podía ocultarlo. [Captura escritorio](evidence/luis-draft-media/desktop-reopened.jpg), [captura móvil](evidence/luis-draft-media/mobile-reopened.jpg), [resultado verificable](evidence/luis-draft-media/results.json). Las capturas originales del navegador conservan su margen de captura; las mediciones corresponden al viewport CSS.

## Límites de esta aceptación

El WAV es voz sintética producida con Zira en inglés leyendo español. El ASR produjo palabras imprecisas, visibles en la revisión; **no acredita exactitud con voz humana española**. La corrección escrita explícita se conservó. La conversión PCM y la liberación del micrófono se probaron con puertos de navegador controlados; no se grabó voz de una persona. Tampoco se usaron fotos propias de una carga física. Estos son límites de la muestra, no sustituciones por una respuesta fija del modelo.

El botón de grabación está implementado; necesita que el navegador conceda acceso al micrófono. Fallos de permiso/proveedor mantienen disponible el formulario manual. El ejemplo heredado de la interfaz conserva sus fechas del escenario; el smoke HTTP utiliza ventanas futuras explícitas. No se reparó Google Maps ni se inventaron coordenadas. Esta entrega no incluye la sección de explicación/Passport ni el worker de vídeo.
