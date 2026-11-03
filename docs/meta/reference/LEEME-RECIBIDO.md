> **Nota para esta copia:** el equipo inscrito es Cristhian, Axel, Luis, Juan y Ramón/Jean. Axel 1 se interpreta como Axel y Axel 2 como Luis; confirmar esa correspondencia. Las referencias a `meta-main`, al tag y a infraestructura son propuestas que deben cotejarse con [INICIO.md](INICIO.md) y [CONTEXTO_CONSOLIDADO.md](CONTEXTO_CONSOLIDADO.md).

# Guías para los participantes de CargoMesh Meta

Cada integrante trabaja con su agente de IA (Codex o Claude). Estos archivos le dan al agente el contexto y las reglas para que no tenga que adivinar.

| Archivo | Para quién |
| --- | --- |
| `00-contexto-comun.md` | Todos: qué construimos, reglas del hackathon, fechas, Git, arquitectura, contratos, Meta API y lo prohibido |
| `cristhian.md` | Cristhian: Tech Lead y declaración (historias CR) |
| `axel-1.md` | Axel: cliente de la Meta API, interpretación de la declaración y errores (AX-00, AX-01, AX-02, AX-04) |
| `axel-2.md` | Luis: proyecto Vercel, notas de voz y explicación de diferencias (AX-09, AX-10, AX-03) |
| `juan.md` | Juan: sesión, dashboard, conciliación, Passport y Supabase (historias JU) |
| `ramon-jean.md` | Ramón/Jean: DockMind, worker en Modal y video del demo (historias RA) |

## Cómo se usan

1. En P0, Cristhian copia esta carpeta a `docs/meta/` dentro de `meta-main` (historia CR-09), para que todos los agentes la encuentren en el repo.
2. Cada persona abre su archivo y copia el bloque "Prompt para tu agente".
3. Al empezar cada historia: sesión nueva del agente, pegar el prompt y cambiar `<ID>` por la historia (por ejemplo `AX-01`) y `<tema>` por el nombre corto de la rama (por ejemplo `muse-interpretacion`).
4. El agente primero devuelve un plan de 5 líneas. Se revisa y se le da el OK antes de que escriba código.
5. Al terminar, el agente entrega diff, pruebas con su resultado real, límites y la línea para `BUILT_DURING_HACKATHON.md`. El push y el merge los decide la persona, no el agente.

El plan completo está en el doc "Plan CargoMesh Meta". El backlog detallado está en `../BACKLOG_SCRUM.csv` y la matriz de pruebas en `../MATRIZ_PRUEBAS.csv`.
