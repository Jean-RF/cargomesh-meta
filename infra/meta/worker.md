# Plan de análisis asíncrono

La web crea un job persistido y retorna su identidad. El worker recibe acceso autorizado a la evidencia, procesa con timeout/cancelación y reporta observaciones; la UI consulta estado sin reabrir jobs ni duplicar resultados.

Verificar primero acceso real a SAM y el contrato de vídeo del proveedor. Hospedado: worker CPU orquesta llamadas. Autohospedado: verificar versión, licencia y GPU antes de seleccionar imagen/dependencias. No se despliega AWS ni se desmonta el gateway Amazon como parte de este plan.

Diseñar estados independientes del dominio, por ejemplo queued/running/succeeded/failed/cancelled, identidad estable, reintentos con límite y callback firmado. Un job finalizado no confirma carga, booking ni entrega. El día 1 debe producirse evidencia de conteo sobre un clip propio y un fallback honesto si el seguimiento resulta insuficiente.

Paquete operativo de DockMind (Ramón/Jean): [OPERACION.md](../../cargomesh/dockmind-worker/OPERACION.md). Incluye el despliegue concreto de Modal, pendiente de autorización, las variables sin valores, el lanzador local para la web local y la evidencia por grupo.
