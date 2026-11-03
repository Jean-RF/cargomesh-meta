# Interfaz DockMind — Ramón/Jean

Panel de evidencia de video para el slot `evidenceContent` del dashboard de Juan (`/tetris`). Está en el PR #6 (abierto, sin merge a `main`). No recalcula el conteo ni tiene otro modelo de dashboard: el resultado llega a las observaciones de la sesión de Juan.

| Archivo | Qué hace |
| --- | --- |
| `evidence-panel.tsx` | Subir un clip (SHA-256 en el navegador y subida directa al bucket privado), marcar la línea, elegir grupo y cobertura, iniciar el análisis y listar los análisis de la sesión. Al registrarse una observación pide a Juan que recargue la sesión |
| `line-picker.tsx` | El operador marca sobre el primer cuadro del clip los extremos de la línea de cruce y el lado de adentro |
| `job-status.tsx` | Estado del job cada 3 s mientras está en cola o en curso; entradas, salidas y neto; marcas de revisión con su segundo; avisos de render o fixture; reintento por intento; entrega a la sesión y botón para recuperarla; video anotado con una URL corta |
| `dockmind-api.ts` | Cliente de `/api/v2/meta/dockmind/*` |
| `line-model.ts`, `job-status-model.ts` | Lógica pura, con pruebas en `models.test.ts` |

En una sesión DEMO se puede subir un render sintético; en VERIFICATION, solo captura propia. Un lector (`REQUESTER`) ve el estado pero no opera.

Pendiente: revisión visual (corresponde a Cristhian).
