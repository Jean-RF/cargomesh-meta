# Entrega Indie y reintegración del proyecto completo

Decisión de Cristhian, 27 de octubre de 2026. Este acuerdo organiza dos versiones del producto y conserva la contribución real de las cinco personas. No modifica por sí solo la inscripción, permisos de GitHub, despliegues o visibilidad de repositorios.

## Equipo y alcance de la entrega

El proyecto general pertenece al trabajo del equipo de cinco: **Cristhian, Axel, Luis, Juan y Ramón/Jean**. Para esta entrega se adopta como restricción un máximo de cuatro integrantes en Indie, sin contar con una excepción.

Luis quedó fuera del equipo de esta entrega por sorteo, según la decisión comunicada por Cristhian. Esto no elimina su pertenencia al equipo del producto ni sus derechos de atribución sobre sus aportaciones.

| Persona | Proyecto general | Entrega Indie |
| --- | --- | --- |
| Cristhian | Dirección, request, manifiesto e integración | Integrante; su alcance es CR y la conexión de módulos, sin duplicar voz/explicación/entorno |
| Axel | Cliente IA e interpretación | Integrante |
| Juan | Sedes/sesiones, dashboard, comparación y Passport | Integrante |
| Ramón/Jean | Vídeo, SAM, worker y conteo | Integrante |
| Luis | Voz, explicación y entorno; contribuciones al producto completo | Fuera del equipo y del desarrollo específico que se presenta en esta entrega |

**«Cristhian sube lo de Luis» significa que Cristhian coordina e integra ese frente en el producto general; no significa que código escrito por Luis pase a ser autoría de Cristhian.** El objetivo técnico común es una implementación por módulo, conectada durante el desarrollo. La selección del alcance presentable en Indie es una decisión distinta y debe respetar las contribuciones reales; los aportes de Luis no se hacen elegibles cambiando la cuenta que hace push, copiando archivos o modificando metadatos.

Luis conserva AX-09, AX-10 y AX-03: transcripción, explicación y entorno. Cristhian mantiene CR: formulario, medios de declaración, revisión, manifiesto e integración. No hay intercambio de paquetes ni implementación duplicada por defecto. El candidato Indie puede requerir un alcance menor; esta corrección no reasigna los aportes de Luis a Cristhian.

## Dos repositorios con funciones diferentes

| Repositorio | Función | Integración y publicación |
| --- | --- | --- |
| `Chujutak2024/meta-hackathon`, actualmente de trabajo del equipo | Desarrollo completo de las cinco personas | `main` del producto general; cinco ramas de trabajo |
| [Chujutak2024/cargomesh-dockmind](https://github.com/Chujutak2024/cargomesh-dockmind), público | Código y evidencia elegibles de la entrega Indie | `main` de la entrega; creado con README inicial, candidata pendiente de revisión/publicación |

El usuario eligió `cargomesh-dockmind` y se creó el 27-oct-2026 (America/Lima), con README inicial. GitHub confirmó visibilidad pública, rama predeterminada `main` y administración por Chujutak2024. No se publicaron código del producto, historial privado, datos ni secretos, ni se configuró despliegue, colaboradores o sincronización. El dominio de jueces y el SHA de la candidata siguen pendientes de registrar. La creación del repo no certifica elegibilidad o funcionalidad.

**Actualización posterior:** se preparó la [candidata pública 01](CANDIDATA_PUBLICA_01.md) en [PR #1](https://github.com/Chujutak2024/cargomesh-dockmind/pull/1), rama `codex/release-candidate-01`, head `1b07981b9a955bfa1653e205fd066c71bd312ffa`, desde origen integrado `a5c2a4d`. El código seleccionado ya es público en esa rama; `main` sigue con su README inicial porque el PR no se mergeó. Es preparación con base atribuida y AX-00/01, no la entrega final ni un demo DockMind operativo. No hay deploy ni promoción automática.

El repositorio público no es un espejo automático de todo el repositorio de trabajo. Un merge en el `main` privado puede contener trabajo de Luis; por tanto, no autoriza su promoción automática a la entrega. La selección se comprueba también sobre dependencias, documentación y materiales del demo, no únicamente sobre el autor del último commit.

## Flujo simple de trabajo

Ramas previstas, sin crear otra capa `develop` o una rama permanente adicional de integración:

| Rama | Responsable |
| --- | --- |
| `codex/meta-cristhian` | Cristhian |
| `codex/meta-axel` | Axel |
| `codex/meta-luis` | Luis, producto general fuera de la entrega |
| `codex/meta-juan` | Juan |
| `codex/meta-ramon` | Ramón/Jean |

Cada persona actualiza su rama desde `origin/main`, conserva el historial compartido y agrupa varios commits en un PR por incremento útil. No se abre un PR por cada archivo o corrección menor. Revisión breve, verificaciones pertinentes y autorización de integración; `main` es la base integrada. Las ramas de preparación existentes son antecedentes y no justifican nuevas ramas auxiliares.

El despliegue de pruebas del producto general puede seguir su `main` cuando esté configurado y autorizado. La demo de jueces despliega el `main` del repositorio de entrega después de una promoción aprobada. Un error en la promoción no debe modificar el proyecto Amazon ni su base de datos.

La automatización se configura en una tarea específica. Por ahora este flujo es un acuerdo, no un pipeline implementado.

## Registro previo a cada promoción

Toda candidata se prepara desde el último corte de entrega aprobado y añade únicamente cambios elegibles revisados. No se exporta el árbol completo del producto general sin comprobarlo. Si una dependencia indispensable pertenece al trabajo excluido, la candidata queda pendiente o se reduce su alcance.

Registrar una fila por cambio o componente que se quiera entregar:

| Historia/componente | Autoría real | Commit o PR de origen | Uso: producto general / entrega Indie | Dependencias revisadas | Revisor | Commit público y evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| Por completar antes de publicar | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |

El autor que implementa, la persona que integra y la persona que envía el formulario del evento son roles distintos. Un cherry-pick o un push no cambia la procedencia del trabajo. Si hay contribución conjunta, se registra a quienes realmente participaron.

Antes de promover:

- Identificar las aportaciones efectivamente hechas, aunque procedan de parches, copias de archivos o revisiones sustanciales.
- Confirmar qué reutilización de CargoMesh previo permite Indie. Importar la base o crear un tag no acredita que sea trabajo nuevo ni que sea elegible.
- Excluir del alcance de entrega las aportaciones nuevas de Luis y sus dependencias; no resolver esa exclusión cambiando nombres de autor.
- Conservar en `BUILT_DURING_HACKATHON.md` la diferencia entre base previa, incremento presentado y trabajo general fuera de la entrega.
- Registrar commits de origen y destino, verificaciones reales, limitaciones y SHA desplegado para jueces. No atribuir resultados a pruebas no ejecutadas.
- Revisar que no se publiquen secretos, datos privados ni materiales sin derechos de publicación.

Si ya existe una aportación de Luis dentro de una candidata, se registra y se retira del alcance que se presenta hasta resolver su tratamiento conforme a las reglas. Este documento no concede una excepción ni convierte una inscripción de cinco en una inscripción corregida de cuatro.

## Compromiso obligatorio después del hackathon

Por decisión expresa de Cristhian, **al terminar el evento Meta y su período de evaluación se debe completar la reintegración pendiente de las cinco personas y hacer público el proyecto completo**, reconociendo expresamente la contribución de Luis. Las conexiones técnicas y la integración autorizada del producto general pueden hacerse antes: no se espera al último día para comprobar compatibilidad. Este compromiso posterior protege la publicación completa y el crédito, no retrasa el trabajo conjunto.

«Intercambiar proyectos» se ejecuta como una transferencia documentada de la versión completa a la publicación principal. No obliga a borrar el repositorio entregado, sobrescribir su historia o sustituir su demo durante la evaluación.

| Paso | Responsable | Evidencia de cierre |
| --- | --- | --- |
| Confirmar que finalizó la evaluación y no hay una restricción vigente de cambios | Cristhian | Referencia al cierre aplicable y fecha registrada |
| Conservar el corte presentado | Cristhian | Commit/tag de entrega, URL del repo, dominio y SHA evaluados |
| Integrar el trabajo pendiente de los cinco, incluido Luis | Dueño de cada cambio; Cristhian integra | PRs/commits y verificaciones pertinentes, con autoría real |
| Revisar lo que se hará público | Cristhian y dueños de los componentes | Revisión de secretos, datos, derechos y documentación |
| Publicar el proyecto completo | Cristhian | URL pública, release/commit y registro de procedencia |
| Reconocer las contribuciones y ordenar los repositorios | Cristhian, con revisión del equipo | README/créditos de los cinco y enlaces entre entrega congelada y proyecto completo |

La opción preferida es volver público el repositorio real con su historial y aportaciones, manteniendo el repositorio de entrega como referencia del corte evaluado. Si se cambia el repositorio principal o se integra en otro, se documenta el traslado y se conservan autores, créditos y enlaces de origen.

Las actualizaciones posteriores de la versión pública se identifican como posteriores al hackathon; no se presentan como parte del resultado evaluado. Publicar la versión completa no permite hacer públicos secretos o datos privados.

Este compromiso no se considera cumplido únicamente por mencionar a Luis: requiere integrar sus aportes aceptados y publicar efectivamente el proyecto completo. Tampoco se ejecuta automáticamente por haber terminado el plazo de envío.

## Estado del acuerdo

- Equipo de entrega definido: Cristhian, Axel, Juan y Ramón/Jean.
- Luis continúa en el proyecto general, con crédito sobre sus aportaciones.
- Publicación del repositorio completo tras el evento: compromiso registrado, pendiente de ejecución.
- Repositorio público creado: [cargomesh-dockmind](https://github.com/Chujutak2024/cargomesh-dockmind); main con README inicial y candidata técnica publicada en rama/PR borrador #1.
- Registro de inscripción, promoción de código, colaboradores y despliegue: pendientes; no modificados por la creación del repositorio.
- Pipeline de dos repositorios: propuesto; no configurado por este documento.

Este acuerdo prevalece sobre el reparto genérico anterior cuando se prepara la entrega Indie. El backlog general de cinco personas no es, por sí solo, la lista de cambios que se pueden presentar.
