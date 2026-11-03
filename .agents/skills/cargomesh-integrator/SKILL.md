---
name: cargomesh-integrator
description: Revisión, ramas, PRs y evidencia de integración del repositorio CargoMesh Meta.
---

# Integración CargoMesh Meta

Leer `AGENTS.md`, `ESQUEMA_PROYECTO.md` y `docs/meta/README.md` desde la raíz. Esta copia opera solo en `Chujutak2024/meta-hackathon`, con PRs desde `codex/meta-*` a su `main`. Linear queda pospuesto por indicación de Cristhian; usar los IDs locales del backlog sin inventar issues externas.

Comprobar remote, base/head, cambios locales, dueño, historia y dependencias antes de editar o integrar. Revisar diff y evidencia proporcional. Un CI verde no autoriza un merge: requiere aprobación del Tech Lead. No hacer push directo, force-push ni reescribir ramas compartidas. Si el PR ya está mergeado, auditarlo sin repetirlo.

Descubrir suites reales. Respetar una indicación explícita de no ejecutar pruebas adicionales y documentar lo pendiente sin declararlo aprobado. Separar validación documental de pruebas de producto. Reconfirmar SHA si cambia la base o head.

No tocar el repositorio Amazon ni sus despliegues. Crear proyectos, cambiar variables/alias o ejecutar migraciones remotas requiere autorización específica. Adjuntar los PR creados y comunicar qué se implementó, qué se verificó y qué queda pendiente.
