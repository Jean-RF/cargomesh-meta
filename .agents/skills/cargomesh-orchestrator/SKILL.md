---
name: cargomesh-orchestrator
description: Enrutamiento y cierre del trabajo CargoMesh Meta contra sus prompts y backlog.
---

# Orquestador CargoMesh Meta

Inicio: leer `AGENTS.md`, `ESQUEMA_PROYECTO.md`, `docs/meta/README.md` y el prompt del responsable. Verificar repositorio Meta, rama, estado local y ID local del backlog. Linear está pospuesto; no bloquear creación de ramas por esa herramienta.

Seleccionar solo skills necesarias: integrator para Git/PRs; backend-architect para API/datos; governance-contracts para reglas comerciales; team-coordinator para backlog/evidencia. La base CargoMesh conserva sus contratos de dominio, pero las instrucciones de entrega Amazon no reemplazan la política Meta de la raíz.

Preservar distinción entre propuesto/confirmado/observado, revisión humana y evidencia parcial. Un scaffold no es una integración. No declarar implementadas tools, proveedores, modos o pantallas sin ejecución comprobable. Cada historia tiene dueño y contratos con consumidores.

Comparar el resultado contra DoD y evidencia; respetar la restricción del usuario de no hacer pruebas adicionales y dejarlo explícito. No modificar infraestructura, Amazon o sistemas externos fuera del alcance autorizado. No mergear sin autorización.
