# Ramón/Jean — corrección acotada del PR #12

Revisamos `1e93ed76e39034afb1c1a4d7a6982cc662741072`. El lanzador y su aceptación HTTP funcionan contra Meta local64321: Auth, Storage, callback HMAC, resultado/observación, overlay y replays. DockMind55 y Juan40 pasan; TypeScript y arquitectura pasan; CI verde. No repitas ese trabajo ni hagas despliegues o SAM pagado. No se mergeó el PR.

Antes de integrar, corrige dos casos de `cargomesh/dockmind-worker/src/dockmind/evaluate.py` en el mismo PR/rama:

1. **Referencia A+B, pero B falla o falta:** `_from_evidence` descarta el FAILED sin observación y `evaluate` recorre solo los resultados presentes. Si A acierta, el informe termina «1 de 1» y ni menciona B, aunque la referencia exige dos clips/grupos. Conserva los clips/grupos esperados y reporta explícitamente FAILED/SIN_RESULTADO/PENDIENTE (elige el contrato documentado) sin inventar cantidades. El resumen debe separar esperados, evaluados y pendientes/fallidos; un grupo esperado ausente no puede desaparecer de la aceptación. Prueba B FAILED y B sin archivo.
2. **Cobertura ausente en un paquete de evidencia:** `_problem` solo compara si ambos valores son truthy y `EvaluationRow` rellena `coverage` con la referencia. Un paquete B `coverage=null`, con conteo4 y referencia COMPLETE, queda `exact=True` y se muestra COMPLETE. Rechaza/marca cobertura desconocida; la referencia no puede convertirse en una declaración del job. Conserva dato desconocido y `exact=False`; prueba null y campo ausente. Mantén compatibilidad legacy explícita para los CSV antiguos sin grupo/cobertura exigidos.

Reproducciones actuales: [revisión](REVISION_PR12_2026-11-01.md) y [script](pruebas/pr12-evaluador/repro.py). Los datos del script son dobles de prueba, no evidencia SAM física.

Añade regresiones, actualiza el resumen/documentación si cambia el contrato y ejecuta las suites pertinentes. Sube la corrección al mismo PR #12 y comparte el nuevo SHA. No cambies migraciones, capas comerciales, acceso local/producción ni otros módulos para este ajuste.

RA-00 continúa aparte: tus clips propios A/B, referencia manual y permiso; SAM real sigue sujeto a autorización del responsable de la clave. Esta corrección no requiere gastar ni grabar antes de entregarla.
