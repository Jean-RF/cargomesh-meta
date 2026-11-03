---
name: cargomesh-backend-architect
description: API, persistencia, medios y jobs Meta sobre los contratos existentes de CargoMesh.
---

# Backend CargoMesh Meta

Leer `AGENTS.md`, estructura y contratos Meta. Reutilizar Hono, Zod, servicios y persistencia actuales; no meter lógica de dominio en prompts o handlers. Módulos nuevos preparados en `cargomesh/src/server/modules/`, schemas en `src/shared/schemas/meta/` y adaptadores en `src/server/hono/routes/meta/`.

Actor y organización obligatorios, RLS, validación de payload, idempotencia canónica y control de versión. Preservar contratos comerciales de `docs/v2-amazon/contracts/`: una sede no es cobertura y un análisis no crea oferta, booking o incidencia por sí solo. Propuestas de IA requieren revisión humana.

Medios privados, uploads acotados, URLs firmadas, jobs persistidos y callbacks idempotentes/autenticados. Mantener unidad, revisión, procedencia e incertidumbre en observaciones y comparación. Separar job técnico del cierre de sesión/dominio.

Migraciones estructurales aditivas en la cadena V2; datos demo en escenarios. Aplicación remota exige autorización específica. Pruebas proporcionales descubiertas en repo, salvo instrucción explícita del usuario de no ejecutar adicionales: documentar el pendiente sin inventar resultados. No modificar infraestructura o runtime Amazon.
