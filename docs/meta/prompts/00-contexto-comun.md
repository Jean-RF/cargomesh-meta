# Contexto común activo de CargoMesh Meta

> **Decisión posterior de alcance:** el equipo general mantiene cinco personas; la entrega Indie corresponde a Cristhian, Axel, Juan y Ramón/Jean. El trabajo de Luis se conserva fuera de esa entrega y se reintegra con crédito en la versión completa pública posterior al evento. El producto general es único: Luis conserva voz/explicación/entorno y Cristhian su formulario/manifiesto e integración; no se implementa una segunda versión del frente de Luis. El alcance Indie se selecciona por separado sin reasignar autoría. Leer primero el [acuerdo de entrega y reintegración](../ENTREGA_Y_REINTEGRACION.md), que prevalece sobre el reparto genérico siguiente.

## Producto y base

Repo: `Chujutak2024/meta-hackathon`. Base importada: CargoMesh `4482d3a9`. Aplicación en `cargomesh/`; stack, scripts y contratos existentes se conservan. La estructura activa se describe en [ESQUEMA_PROYECTO.md](../../../ESQUEMA_PROYECTO.md).

Construimos declaración multimodal revisada, manifiesto versionado, sesión en sede, dashboard de carga, análisis de clip, conciliación y Passport. La IA no autoriza bookings ni crea incidencias. Las cantidades y revisiones se validan en servidor.

## Equipo y repositorio

Cinco inscritos: Cristhian, Axel, Luis, Juan y Ramón/Jean. Axel lleva el núcleo IA y Luis el frente de voz/entorno/explicación; Ramón y Jean son la misma persona. El límite del evento debe comprobarse en las reglas oficiales sin omitir participantes.

Base y destino de PR: `main` de **este** repositorio. Ramas `codex/meta-*`, un dueño por historia y una revisión ajena. No push directo, no force-push, no cambios en Amazon por efecto colateral. Linear está fuera por ahora; usar los IDs del [backlog compartido](../backlog/README.md). Solo cambiar la herramienta de seguimiento con acuerdo del equipo.

## Entradas a cada módulo

- Cristhian produce manifiesto confirmado y medios de declaración usando el request actual.
- Axel interpreta texto/foto/etiqueta/transcripción y devuelve propuestas validadas con evidencia y revisión de entrada.
- Luis transcribe audio y explica una conciliación ya calculada; prepara el entorno por separado cuando se autorice.
- Juan produce sesión, read model del dashboard, comparación y revisión. Una sede no demuestra capacidad.
- Ramón/Jean procesa un clip mediante job asíncrono y produce trayectorias/cruces con marcas temporales y suficiencia.

El contrato común vive en [contracts](../contracts/README.md). Cada productor entrega un ejemplo válido y uno inválido; un consumidor puede avanzar con fixtures explícitos sin presentar ese dato como inferencia real.

## Reglas críticas

PALLET y BOX no se suman entre sí. Un clip con comienzo/final desconocidos u oclusión irresuelta no prueba faltante. Mientras la sesión esté abierta solo mostrar progreso. Una revisión nueva del request no reescribe el manifiesto histórico de una sesión.

Los IDs de SAM no son identificadores de pallets. Contar cruces dirigidos con tolerancia y conservar incertidumbre. La referencia manual se usa para evaluar, no se pasa al modelo como resultado esperado. Un render se rotula como simulación.

Jobs deduplicados y reclamados atómicamente; un timeout no acredita que el proveedor no procesó la petición. Un resultado READY del job puede contener evidencia insuficiente. Reintentar solo con estado conocido y política acotada.

Archivos privados, acceso por actor/relación y URLs temporales. La clave secreta de Supabase no sustituye autorización de negocio. No enviar URLs arbitrarias al worker ni publicar claves/logs privados. La IA devuelve propuestas, no mutaciones.

## Proveedor y entorno

El último paquete propone Meta Model API como principal y Baseten como respaldo. Las cuentas, modelos y modalidades se comprueban en el spike. Los modelos y límites de las guías son configuración propuesta; no usar una constante o paquete solo porque aparezca en un ejemplo. No usar un failover silencioso.

El worker CPU llama a SAM alojado; solo un fallback autoalojado ejecuta el modelo en GPU y exige su propio plan. Vercel, Supabase y Modal se preparan mediante [infra/meta](../../../infra/meta/README.md); ninguna carpeta de esta reorganización configura recursos remotos.

## Trabajo y evidencia

Revisar [iteraciones](../iterations/README.md). Una historia queda lista cuando tiene entrada/salida, dueño, dependencias, casos y aceptación. Ejecutar verificaciones pertinentes cuando se implemente; distinguir pass, fail, bloqueado y no ejecutado. La revisión visual corresponde a Cristhian y no se presupone.

La estructura preparada es documentación y carpetas; no una funcionalidad lista. Actualizar [BUILT_DURING_HACKATHON.md](../../../BUILT_DURING_HACKATHON.md) con commits y evidencia reales.
