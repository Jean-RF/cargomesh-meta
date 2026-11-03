# Prompts por integrante

Las guías describen un único producto general de cinco módulos. Luis conserva voz/explicación/entorno; Cristhian consume esos módulos en su formulario y coordina su integración sin duplicarlos. Rige el [objetivo común y conexiones tempranas](../OBJETIVO_Y_CONEXIONES.md). Antes de usarlas para una entrega Indie, aplicar el [acuerdo de entrega y reintegración](../ENTREGA_Y_REINTEGRACION.md): cuatro integrantes en ese alcance y Luis fuera de la entrega, con reintegración y crédito posteriores obligatorios.

Leer [contexto común](00-contexto-comun.md), [AGENTS](../../../AGENTS.md) y la guía del dueño antes de empezar. Los prompts son instrucciones de trabajo, no evidencia de que las funciones existan.

| Persona | Guía | Historias del frente |
| --- | --- | --- |
| Cristhian | [cristhian.md](cristhian.md) | CR: dirección, request/manifiesto, revisión y entrega |
| Axel | [axel.md](axel.md) | AX-00, AX-01, AX-02, AX-04 y adapters de IA |
| Luis | [luis.md](luis.md) | AX-09, AX-10, AX-03; entorno, voz y explicación |
| Juan | [juan.md](juan.md) | JU: sede/sesión, dashboard, conciliación y Passport |
| Ramón/Jean | [ramon-jean.md](ramon-jean.md) | RA: dataset, worker, SAM, conteo y vídeo |

La corrección de nombres interpreta el antiguo `axel-2.md` como Luis y conserva las historias para no romper dependencias. Si cambia el reparto, actualizar el dueño del backlog y sus consumidores, no duplicar historias.

Usar una historia pequeña y su ID local dentro de la rama y del PR abiertos para cada integrante: ver [manifiesto de cinco frentes](../PR_INTEGRANTES.md). No crear una rama por historia. Base `origin/main` del repositorio Meta y PR al `main` Meta. El nombre `meta-main` de los documentos recibidos correspondía a otro planteamiento y no se usa aquí. No se exige registrar en Linear mientras siga aplazado.

Los archivos técnicos de las guías se implementarán dentro de las carpetas definidas en [la estructura](../../../ESQUEMA_PROYECTO.md). Confirmar la API/modelo con documentación actual antes de codificar. No ejecutar automáticamente migraciones, `modal deploy`, tags o comandos de Vercel presentes como ejemplos.
