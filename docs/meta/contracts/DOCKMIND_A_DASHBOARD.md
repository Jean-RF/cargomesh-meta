# DockMind → dashboard de carga: propuesta de mapeo

30 de octubre de 2026. Propuso Ramón/Jean (PR #6) para el dashboard de Juan (PR #5).

> **Reemplazada el 31 de octubre.** El adaptador `dashboard-observation.ts` se retiró: la observación de cada job llega a la sesión de Juan con su `recordLoadingObservation` y el dashboard la lee desde ahí. Se conservan la regla de un job por grupo, la cobertura declarada y la separación entre DEMO y VERIFICATION; el flujo vigente está en `cargomesh/src/server/modules/analysis-jobs/README.md`.

El dashboard compara por grupo del manifiesto. DockMind cuenta los cruces de un clip en una sola unidad. Para unirlos, cada job queda asociado a un grupo y un adaptador explícito, sin casts, arma la `observation` de `LoadingDashboardSourceSchema`.

## 1. Cada job cuenta un grupo

La petición `POST /meta/dockmind/jobs` lleva dos campos nuevos:

| Campo | Regla |
| --- | --- |
| `groupId` (opcional) | Grupo del manifiesto en la revisión vigente. Si se omite y hay un solo grupo de la unidad del job, se elige solo. Si hay varios: `MANIFEST_GROUP_REQUIRED`. Si no existe: `MANIFEST_GROUP_NOT_FOUND`. Si es de otra unidad: `INCOMPATIBLE_UNIT`. |
| `coverage` (`PARTIAL` por defecto) | Lo declara el operador: `COMPLETE` solo si el clip muestra toda la carga de ese grupo. DockMind no puede saberlo por sí mismo. |

El mismo clip para otro grupo es otro job, porque el grupo forma parte de la clave de deduplicación. El worker y su contrato `dockmind.job.v1` no cambian.

El lector de sesión (`SessionReader`, que implementa Juan) devuelve los grupos de la revisión vigente con `groupId`, `label` y `unit` en lugar de una sola unidad por sesión.

## 2. Observación para el dashboard

`toDashboardObservation` (`cargomesh/src/server/modules/analysis-jobs/dashboard-observation.ts`):

| Campo del dashboard | Valor |
| --- | --- |
| `observation.id` | `dockmind-` + hash de los jobs e intentos usados: es estable y cambia cuando cambia un conteo |
| `sessionId`, `manifestRevision` | Los de la sesión. Solo entran jobs de esa sesión y esa revisión |
| `complete` | `true` solo si todos los grupos del manifiesto tienen conteo y todos tienen cobertura `COMPLETE` |
| `groups[].id`, `label`, `unit` | Los del grupo del manifiesto. El job tiene que ser de esa unidad |
| `groups[].count` | El neto (entradas − salidas). `null` si DockMind da `INSUFFICIENT_EVIDENCE` o si el neto es negativo |
| `groups[].coverage` | La que declaró el operador al pedir el análisis |
| `groups[].quality` | `SUFFICIENT` solo si DockMind da `OK`. `REQUIRES_REVIEW` da `UNCERTAIN` |
| `groups[].evidence` | El clip (`evidenceId`) con el segundo de cada cruce y de cada marca de revisión. Si no hay ninguno, `timeSeconds: null` |

Reglas:

- Hay como máximo un job por grupo: el más reciente que terminó bien. **Dos jobs del mismo grupo nunca se suman**, porque pueden haber contado los mismos cruces.
- Solo entran inferencias reales de SAM sobre capturas propias. Los fixtures nunca entran.
- **Modo demo:** con `allowSimulatedClips`, también entran clips sintéticos (`SYNTHETIC_RENDER`) que SAM analizó de verdad. Es el video simulado de la sede que el equipo acordó para la demo ([script](../../../cargomesh/scripts/dockmind-depot-clip/README.md)).
- Si ningún grupo tiene conteo, no hay observación (`null`) y el dashboard queda en `NOT_READY`.

El adaptador devuelve `{observation, simulated}`. `observation` cumple el esquema estricto y no lleva campos extra. `simulated` es `true` si algún conteo sale de un clip simulado. **El dashboard tiene que mostrar "Video simulado"** cuando `simulated` es `true`, para que la demo nunca lo presente como cámara real.

## 3. Por qué REQUIRES_REVIEW no llega como suficiente

Con video real, SAM puede no detectar un bulto que no corresponde al concepto. Esa falta no deja marca ([evidencia](../../../cargomesh/dockmind-worker/evidence/2026-10-29-sam-real-cinta-pexels.md)). Un conteo con marcas tiene segundos que una persona tiene que mirar. Con calidad `UNCERTAIN`, el dashboard lo deja en `INSUFFICIENT_EVIDENCE` en vez de proponer una diferencia. Cuando la revisión humana resuelve las marcas, el conteo revisado puede pasar a `SUFFICIENT`; ese paso le corresponde a la revisión y al Passport, no a este adaptador.

## Verificación

- 7 pruebas propias en `dashboard-observation.test.ts`, más la elección del grupo en `service.test.ts` (`pnpm run test:meta-dockmind`).
- Con video simulado de la sede y SAM real, DockMind contó 3 de 3 pallets y 2 de 2 cuando faltaba uno, sin marcas ([evidencia](../../../cargomesh/dockmind-worker/evidence/2026-10-30-sam-sede-simulada.md)).
- La salida del adaptador se validó, sin commitear nada, con `LoadingDashboardSourceSchema` y `buildLoadingDashboard` de la rama de Juan (`f13d18f`), sobre su fixture `review`:
  - **3 grupos con conteo:** 11 pallets contra 12 declarados da `DIFFERENCE_PROPOSED`; 6 contra 6 da `MATCH`; las cajas con marcas dan `INSUFFICIENT_EVIDENCE`.
  - **Un solo grupo con conteo:** ese grupo da `INSUFFICIENT_EVIDENCE` (la observación está incompleta) y los otros dos `NOT_READY`.
  - **Fixture `open`:** los 3 grupos dan `NOT_READY`.

Al integrar ambos PR, el adaptador valida su salida con `LoadingDashboardSourceSchema` y estos tipos locales se reemplazan por los de Juan.
