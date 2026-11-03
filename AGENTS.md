# CargoMesh Meta: instrucciones activas del repositorio

## Alcance y fuente de verdad

Este archivo gobierna `Chujutak2024/meta-hackathon`. La estructura activa empieza en `ESQUEMA_PROYECTO.md` y `docs/meta/README.md`. Las instrucciones heredadas de la copia Amazon se conservan como referencia en `docs/meta/reference/AGENTS-CARGOMESH-BASE.md`; sus hitos, ramas históricas y requisitos específicos del evento no gobiernan esta entrega.

El equipo del producto general es Cristhian, Axel, Luis, Juan y Ramón/Jean. Por decisión expresa del usuario, la entrega Indie se delimita a Cristhian, Axel, Juan y Ramón/Jean; Luis continúa en el proyecto general fuera de esa entrega. Antes de promover cambios al repositorio público, leer `docs/meta/ENTREGA_Y_REINTEGRACION.md`: conservar autoría real, separar aportaciones y registrar procedencia. Que Cristhian integre o suba un cambio no lo convierte en su autor. La reintegración y publicación completa posterior al evento es un compromiso obligatorio pendiente de ejecución; no autoriza publicaciones o cambios de infraestructura inmediatos.

## Git y coordinación

- Base `origin/main` y PR a `main` de **este repositorio Meta**; ramas `codex/meta-*`. No usar `meta-main` ni modificar `Chujutak2024/cargomesh` como efecto lateral.
- El usuario definió cinco ramas/PRs para los cinco frentes iniciales. Nombres exactos, alcance y límites en `docs/meta/PR_INTEGRANTES.md`. Reutilizar el PR abierto del responsable; no abrir una rama/PR por historia o ajuste menor. Un PR mergeado queda cerrado y no integra commits futuros automáticamente.
- Por indicación del usuario, Linear está aplazado. Una historia debe identificarse en el backlog compartido o la tarea acordada, con dueño, revisión y rama, sin exigir una escritura en Linear.
- Un dueño implementa y corrige cada historia; consumidores revisan contratos. Un fallo funcional no se traslada silenciosamente al integrador. El objetivo técnico es un único producto de cinco módulos: Luis conserva AX-09/AX-10/AX-03 y Cristhian conserva CR e integración; no duplicar el frente de Luis. Leer `docs/meta/OBJETIVO_Y_CONEXIONES.md` para contratos, fixtures y conexiones tempranas. El alcance elegible de la entrega Indie se selecciona por separado.
- No push directo, force-push o reescritura de ramas compartidas. Preparar PR revisable, verificaciones pertinentes y límites; el Tech Lead autoriza el merge.
- No cambiar configuración remota, IAM, alias, proyecto Vercel o base alojada sin autorización específica. La reorganización del repo no autoriza el despliegue de servicios ni migraciones.

## Dominio y datos que se conservan

- RLS y autorización por actor/organización/carrier. IDs recibidos del navegador o del modelo no prueban acceso. Una clave privilegiada no sustituye esas comprobaciones.
- Mutaciones reintentables con idempotencia y huella canónica; mutaciones concurrentes con versión esperada. Conservar códigos existentes de conflicto.
- No inventar peso, medidas, cobertura, disponibilidad, ofertas, precios, GPS o estados. Sede no equivale a cobertura; capacidad registrada no equivale a disponible. Mantener 0..N carriers y datos/versiones como fuente de elegibilidad/ranking.
- Separar solicitud, propuesta, oferta atribuible, autorización de booking, compromiso de capacidad, operación y revisión. Confirmar un hallazgo no ejecuta otro comando automáticamente.
- La cadena persistente activa de la base sigue en `supabase-v2/supabase/migrations/`; no alterar migraciones aplicadas. Los escenarios sintéticos van separados en `supabase/scenarios/v2-*/`. Nuevas tablas tenant/carrier requieren restricciones, índices, RLS y pruebas proporcionales.
- Los contratos de dominio reutilizados de `docs/v2-amazon/contracts/` conservan sus invariantes técnicas/comerciales salvo cambio explícitamente revisado. Mencionar un modo o adapter no lo implementa.

## IA, vídeo y evidencia

- La IA devuelve propuestas y explicaciones validadas; la lógica de dominio y los cálculos viven en servicios/funciones compartidos.
- PALLET y BOX no se suman. Comparar solo unidad, revisión y alcance compatibles; una carga abierta muestra progreso. Evidencia insuficiente produce revisión, no coincidencia o faltante inventados.
- No hardcodear el conteo del guion. El ground truth evalúa el resultado y no se utiliza como respuesta del modelo. Distinguir captura propia, render sintético e integración real.
- Archivos privados, IDs estables y URLs temporales. No secretos, `.env.local`, claves de proveedor, grants ni URLs privadas en Git/logs. El hash no prueba autenticidad física.
- Jobs y resultados conservan revisión, configuración y evidencia. Reclamación atómica para evitar procesos duplicados; timeout no demuestra ausencia de procesamiento o cobro.

## Trabajo y verificación

Leer el prompt de la persona en `docs/meta/prompts/`, el contrato y la historia antes de editar. Los nuevos directorios contienen planes de implementación: no anunciar APIs/proveedores como disponibles por existir un README.

Descubrir pruebas desde `cargomesh/package.json`, scripts y CI; elegir las pertinentes al cambio. No usar conteos históricos como criterio. La instrucción expresa del usuario de no ejecutar pruebas adicionales prevalece cuando aplique; reportar lo no ejecutado y separar validación documental de pruebas del producto. La revisión visual corresponde a Cristhian y no se presume.

Registrar commits y evidencia reales en `BUILT_DURING_HACKATHON.md`. Antes de cerrar, comparar resultado con aceptación y mostrar límites. Un directorio preparado no completa la funcionalidad de su historia.
