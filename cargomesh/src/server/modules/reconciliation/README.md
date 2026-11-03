# Reconciliación y revisión humana — Juan

La proyección usa `src/shared/meta/loading-dashboard.ts`: NOT_READY, INCOMPATIBLE_SCOPE, INSUFFICIENT_EVIDENCE, OUTDATED, MATCH y DIFFERENCE_PROPOSED por grupo. Solo calcula diferencia con alcance cerrado, revisión/unidad compatibles y evidencia completa/suficiente. No persiste conciliación o revisión humana. Integración con worker, Passport y explicación pendiente.

Solo comparar conteos de la misma unidad y revisión dentro de un alcance compatible. Diferenciar observación parcial, evidencia insuficiente, coincidencia y diferencia revisable. No llamar faltante definitivo al conteo de una sesión abierta, al total de detecciones por frame ni a una caja oculta inferida de una foto.

Persistir vínculos a evidencias y timecodes, regla/versiones utilizadas y decisión humana. El review no crea de forma implícita una incidencia comercial, booking o evento de entrega. Debe existir una acción explícita y autorizada para cada efecto. Consumidores: dashboard/Passport y explicación de Luis.
