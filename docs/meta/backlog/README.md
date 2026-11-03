# Backlog compartido

Este es el backlog del producto general de cinco personas. Para seleccionar lo que se presenta en Indie rige el [acuerdo de entrega y reintegración](../ENTREGA_Y_REINTEGRACION.md). Las tareas de Luis no se convierten en trabajo de Cristhian por quién haga push; conservar dueño y procedencia reales, y registrar por separado las tareas asumidas para la entrega.

| Archivo | Uso |
| --- | --- |
| [BACKLOG_SCRUM.csv](BACKLOG_SCRUM.csv) | 47 historias: objetivo, dueño, lógica, backend, frontend, aceptación y dependencia |
| [backlog-core.json](backlog-core.json) | 27 historias núcleo; 48,5 horas objetivo |
| [backlog-ampliaciones.json](backlog-ampliaciones.json) | 20 ampliaciones; 67 horas objetivo |
| [MATRIZ_PRUEBAS.csv](MATRIZ_PRUEBAS.csv) | 158 casos propuestos, inicialmente No ejecutado |

Un solo backlog del equipo; cada historia tiene un dueño y su revisor. Las vistas por integrante no son listas independientes. Linear se ha dejado fuera por indicación del usuario. No se crearon issues remotas como efecto de esta preparación.

Antes de editar una historia comprobar dueño, contrato, dependencia y rama. Conservar IDs `CR-*`, `AX-*`, `JU-*`, `RA-*` para trazabilidad aunque algunos `AX-*` correspondan a Luis. Usar [la plantilla de tarea](../../../.github/ISSUE_TEMPLATE/tarea.md) y enlazar el PR. Si se adopta un tablero externo, acordar una única fuente de estados y reconciliar exportaciones; no duplicar estados manualmente.

El inventario de funciones de `CR-09` se ha adaptado a este repositorio: la base ya se importó en PR #1 y la rama principal es main de Meta. La estructura preparada no da por cumplida la aceptación funcional de las historias ni sus pruebas.
