# Documentos, creación asistida y calendario — 4 de noviembre de 2026

Responsable: Cristhian, corrección autorizada del flujo y referencia visual de calendario. Checkout activo `salida/jean-meta-copilot/repo`, rama `codex/meta-copilot-overlay-ui`, repositorio Meta `Jean-RF/cargomesh-meta`. El PR #4 de Front fue integrado por el equipo durante este trabajo; estas correcciones posteriores aún no están publicadas. Se preservaron sus cambios, sin tocar Amazon, infraestructura ni base alojada.

## Comportamiento implementado

- La biblioteca privada se consulta por actor/organización mediante `GET /api/v2/meta/documents/readiness`. Se revisan todas las páginas hasta un límite acotado; errores, datos ajenos o paginación circular producen UNKNOWN, nunca «falta». Una versión nueva incompleta/vencida no se sustituye silenciosamente por la vieja. AVAILABLE sólo significa archivo guardado y con fechas utilizables.
- Copilot muestra un recordatorio del perfil empresarial ausente, incompleto o vencido, con enlace a Organización → Documentos. Es descartable por organización/estado durante la sesión del navegador. Reconsulta al volver a la pantalla, al recuperar foco y al terminar una carga; no agrega una pregunta por cada mensaje o pedido. El enlace abre directamente la pestaña documental y el borrador compartido se conserva durante navegación cliente.
- La conversación recibe un resumen documental desde el servidor: reemplaza los datos no confiables del navegador. No vuelve a pedir un perfil disponible y distingue UNKNOWN de MISSING. Un perfil no verificado normativamente no se anuncia como inválido ni como certificado.
- El formulario y el menú «+» permiten importar un packing list PDF. `POST /api/v2/meta/documents/packing-list/prepare` exige sesión/origen, máximo 4 MiB, PDF simple admitido por la política vigente, hasta 12 páginas y 12.000 caracteres. Extrae texto con `unpdf@1.4.0` en servidor, con lectura secuencial y presupuesto acotado; no navega URLs del documento. Al pulsar Analizar, el texto se envía a Meta con salida estructurada.
- La propuesta conserva cada grupo separado, revisión local y huella SHA-256; los campos exigen citas presentes en el texto y unidades explícitas. El usuario revisa los grupos y elige grupos nuevos o destinos existentes distintos. Se rechazan propuestas obsoletas, destinos duplicados y reimportación que duplicaría grupos. Se conservan IDs, índices y datos existentes no propuestos. Datos faltantes permanecen pendientes, sin inventar peso o medidas. Aplicar no crea ni confirma pedidos; la creación sigue usando el flujo nativo, revisión e idempotencia.
- El PDF utilizado para extracción no se carga automáticamente a la biblioteca ni se comparte con un carrier. La interfaz lo explica. El expediente persistente y su vínculo con el manifiesto siguen siendo acciones explícitas del flujo documental existente.
- Recojo y entrega usan calendarios de rango con horas, controles de fecha accesibles y zona horaria visible; también los rangos alternativos. Cancelar conserva el borrador; aplicar actualiza sus campos existentes. La conversión a UTC usa la zona IANA mostrada; fechas imposibles y horas ambiguas/inexistentes por DST se rechazan. Los ejemplos usan mañana y tres días después, en lugar del fixture de octubre vencido.
- La prioridad/tamaño ya no permite saltar la comprobación cronológica. Ventanas solapadas pueden ser disponibilidad válida si existe una entrega posterior a un recojo. El backend de preferencias rechaza conjuntos sin tal combinación. El formulario impide una revisión operativa cuando todos los rangos de un lado vencieron; la lectura de históricos permanece disponible. La viabilidad por tiempo real de ruta continúa siendo responsabilidad del planificador.
- Respuestas explícitas de contactos se capturan mediante el intérprete nativo y no se envían al modelo que excluye datos de contacto. Se conserva la validación E.164/correo existente.

## Evidencia ejecutada

| Comprobación | Resultado |
| --- | --- |
| `node --run test:meta-intake-documents` | 24/24: extracción PDF real, grupos/identidad, rechazo de citas falsas, versiones, permisos/CSRF, paginación, fechas, DST y zona Lima |
| `node --run test:v2-intake` | 91/91: formulario, controlador, revisión, recuperación, grupos, mismos IDs y rechazo de rangos vencidos |
| `node --run test:meta-ai` | 64/64: contrato Meta y captura nativa de contactos sin inferencia |
| `node --run test:v2-chat-workflow` | 119/119 |
| `node --run test:v2-conversation` | 107/107 + 32/32; incluye ciclo de voz simulado, no voz real grabada |
| Draft service + dispatch planner + quote automation | 21/21 |
| `tsc --noEmit` y arquitectura | Correctos; 926 módulos / 267 entradas cliente en la última comprobación |
| HTTP autenticado Next | Formulario y Organización → Documentos: 200, sin error de compilación observable por HTTP |
| Meta real, texto | Extracción de 12 pallets/100 kg, recuerdo, perfil disponible pese a hint MISSING falsificado, guía de perfil faltante y explicación de ventanas solapadas. Una llamada adicional corrige el matiz «no evaluado» frente a «inválido». 1 intento por llamada textual; latencias registradas aprox. 1,8–5,7 s de proveedor, no benchmark p50/p95 |
| Meta real, PDF sintético | Grupos A=8 BOX, B=4 BOX y medidas por unidad conservados, ninguna certificación normativa. Propuesta usada para guardar, repetir la misma clave y reabrir un único DRAFT `5d10eb5a-599d-45d4-b376-5d24a434c0d0`, mismo ID y dos grupos. 0 ofertas/reservas creadas |
| Sesión ausente | readiness devuelve 401 |

Las suites suman 458 ejecuciones de casos con solapamientos; no se presentan como 458 casos únicos. El arnés reproducible `cargomesh/scripts/meta-document-flow-smoke.ts --paid-local` se limita expresamente a la base Meta aislada 64321, usa datos propios sintéticos, realiza llamadas con costo y crea un DRAFT. No ejecutarlo contra producción ni interpretarlo como aceptación integral de UX. Evidencia en [documentos-calendario-2026-11-04](documentos-calendario-2026-11-04/).

## Límites y pendientes precisos

1. **No hay certificación normativa automática.** `PACKING_LIST_COMPLETENESS_V1` sólo comprueba estructura/completitud de captura. La salida permanece `regulatoryReview=NOT_ASSESSED`. Una revisión por jurisdicción/carga/carrier necesita requisitos y fuentes normativas versionadas; no se inventaron reglas legales. Aceptar documentos tampoco confirma capacidad o transporte.
2. PDF escaneado sin texto necesita una imagen legible o captura manual; este incremento no incorpora OCR de PDF escaneado. Los PDF cifrados, con scripts, adjuntos u objetos comprimidos no admitidos por la política técnica se rechazan.
3. El `demo-packing-list-formal.pdf` original compartido se rechaza por la política técnica existente (`UNSUPPORTED_DOCUMENT`). La versión simple `output/pdf/meta-document-demo/demo-packing-list-formal-plain.pdf` de la copia anterior se extrajo correctamente: una página / 1.853 caracteres. No se envió ese archivo del usuario al proveedor en estas pruebas; la llamada real usó exclusivamente el PDF sintético del arnés.
4. Revisión visual/teclado en navegador, responsive y aceptación de toda la interacción del calendario quedan a cargo de Cristhian. HTTP 200 y pruebas unitarias no sustituyen esa revisión.
5. La build de producción aislada no pudo ejecutarse: el sandbox denegó crear el enlace a las dependencias. No se afirma build aprobada para este incremento. La copia aislada se preparó sin `.env`; la aplicación local no fue reemplazada.
6. La consulta `git fetch origin` posterior a comprobar el PR #4 mergeado no se ejecutó: la revisión automática de permisos falló por límite de uso. Publicación/commit/PR de este incremento pendientes. No se eludió la revisión ni se tocó Vercel.
