# Un producto, cinco módulos y conexiones tempranas

Corrección acordada por Cristhian el 27 de octubre de 2026. Este documento corrige la ampliación accidental del paquete de Cristhian con las tareas de Luis. No hay intercambio de roles ni dos implementaciones del mismo módulo.

## Resultado común

Declaración del envío -> propuesta revisada -> manifiesto confirmado -> sesión/dashboard Tetris -> observación del vídeo -> comparación -> explicación y Reality Passport -> revisión humana.

Ese es el recorrido de evidencia, no una sustitución del workflow comercial. La [propuesta de flujo de pedido, documentos y carga](FLUJO_PEDIDO_DOCUMENTOS_Y_CARGA.md) conecta perfil documental → solicitud → requisitos del servicio → oferta/selección → orden autorizada/confirmación → operación/sesión. Los documentos reutilizables se proponen desde Organización; los específicos se vinculan al envío y los del carrier los aporta su responsable. Confirmar el manifiesto no contrata transporte. La propuesta sigue pendiente de revisión, catálogo operativo y ejecución; no incorpora nuevos requisitos universales al runtime.

| Dueño | Implementación única | Entrega a otros |
| --- | --- | --- |
| Cristhian | CR: formulario, adjuntos privados, revisión, manifiesto/versiones e integración | Evidencia y audio autorizado a Axel/Luis; manifiesto a Juan |
| Axel | AX-00/01/02/04: cliente de proveedor, errores e interpretación | Propuestas validadas a Cristhian; cliente compartido a Luis |
| Luis | AX-09/10/03: entorno, transcripción y explicación | Texto revisable a Cristhian/Axel; explicación fundamentada a Juan |
| Juan | JU: sesiones, Tetris como dashboard, comparación y Passport | Contexto de job a Ramón; hechos determinísticos a Luis |
| Ramón/Jean | RA: vídeo propio, SAM, tracks, contador y worker | Observaciones con evidencias, unidad y timecodes a Juan |

Tetris núcleo es el dashboard operativo; el acomodo físico 2D/3D avanzado conserva la prioridad de ampliación del backlog. El contador pertenece a Ramón; el cálculo de diferencias a Juan; la explicación a Luis. Ningún frontend implementa una segunda copia de esos cálculos.

## Contratos que acordamos antes de conectar

Cada productor entrega schema/versionado, un ejemplo válido, uno incompleto y uno rechazado; el consumidor confirma su interpretación. Incluir organización autorizada, IDs, revisión, unidad, evidencia, estado técnico, error y política de reintento según corresponda. Las interfaces se implementan en los schemas compartidos, no en cinco JSON incompatibles.

1. Cristhian y Axel: propuesta asociada a la revisión del borrador; el usuario confirma y una edición posterior prevalece.
2. Cristhian y Luis: audio/evidencia autorizado y transcripción no confirmada; el proveedor caído no bloquea el formulario manual.
3. Cristhian y Juan: manifiesto confirmado y revisión inmutable para la sesión; correcciones posteriores no reescriben lo observado.
4. Juan y Ramón: sesión/job, clip, dirección y alcance; resultado con unidad, cruces, timecodes, cobertura e incertidumbre.
5. Juan y Luis: hechos de comparación ya calculados; explicación con referencias válidas y sin inventar faltantes o decisiones.

## Iteración e integración

Primero se conectan fixtures explícitos y se verifica el contrato. Después se sustituye cada fixture por el productor real conforme esté disponible, sin esperar a que los cinco terminen todos sus detalles. El fixture se rotula y no se presenta como inferencia real.

Cada responsable comprueba su módulo y corrige sus defectos. Los ensayos de integración usan revisiones identificadas y conservan la evidencia de los resultados; no se hacen merges oportunistas entre ramas para suplir dependencias. Los cambios aceptados se sincronizan desde main. Cada frente conserva el PR abierto ya asignado, sin crear otro por archivo o historia.

Orden de conexión: request manual/manifiesto -> interpretación y transcripción -> sesión/dashboard -> worker/observación -> comparación/explicación/Passport. En cada paso se comprueba también error, datos pendientes, reintento y referencias obsoletas antes de pulir el siguiente.

El cierre conjunto apunta a pruebas de punta a punta, permisos, recuperación, rendimiento y mejoras de frontend: estados, textos, accesibilidad y transiciones. Es un objetivo, no una garantía de que solo queden defectos visuales: un fallo de contrato, datos o proveedor vuelve al dueño correspondiente.

Este cambio es de planificación. No ejecuta pruebas de producto, no configura recursos remotos y no acredita integraciones funcionales por existir el documento.

## Producto completo y entrega del evento

Los cinco módulos pertenecen al producto general y conservan su autoría real. El candidato Indie sigue limitado por el [acuerdo de entrega](ENTREGA_Y_REINTEGRACION.md); no se publica automáticamente todo el producto ni se atribuye a cuatro el trabajo de cinco. Si una parte no es elegible, se ajusta el alcance de la candidata, no se duplica por defecto el trabajo ni se cambian autores.

Tras terminar el evento y su evaluación es obligatorio completar la reintegración pendiente y publicar el proyecto completo con crédito para los cinco, incluido Luis. Las conexiones técnicas se trabajan desde ahora; esa publicación posterior no exige aplazar su comprobación.
