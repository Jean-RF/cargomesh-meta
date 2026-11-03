# Acceso a Tetris desde el carrier

31 de octubre de 2026. Extensión local sobre `codex/meta-juan`, HEAD `3810a589f75e4d4b9c7b7a7f2797cecffc791209`, sin commit, push o PR. [Contrato de diseño](../../design-tetris-carrier.md).

Se añade **Tetris** al grupo Operaciones de transporte de la barra lateral carrier, con icono de bloques y estado activo. `/carriers/tetris` reutiliza el catálogo y detalle3D existentes dentro del mismo shell. Se omite la cabecera de marca duplicada y se conserva un único `main`. Las consultas de contenedor adaptan filas, controles y detalle al espacio real junto al menú. El registro de rutas, su traducción a enlaces antiguos y el coordinador reconocen la nueva sección; no se dispara una lectura de solicitudes o borrador al entrar.

`/tetris` continúa disponible. Sesiones, comparación y Passport no cambian. Los vehículos, cargas y tarifas siguen siendo una demostración identificada en pantalla; no se vinculan a operaciones o contratos registrados. No se añaden dependencias ni se modifican permisos, membresías, migraciones o servicios alojados.

Verificado: 7/7 pruebas de navegación carrier y10/10 de rutas/workspace; TypeScript, build de producción y arquitectura840/245 correctos. Chrome: enlace desde el portal, navegación en el mismo documento, fila activa,60vehículos, carga3D diferida, contraer/restaurar menú, recarga de detalle por URL, cámara/grupo, retorno a Flota/atrás, cajón móvil/Escape y desplazamiento horizontal de tabla. Anchuras1440/1024/390 sin desbordamiento; cero erroresJS o solicitudes fallidas. [Recorrido registrado](browser-check.json).

Se usó una identidad QA sintética existente con inicio de sesión nativo. No se provisionó un carrier ni se otorgó acceso: el formulario carrier devolvió403 a esa fixture sin ámbito carrier, después de un503 transitorio inicial; la sesión de miembro autorizada en Tetris permitió comprobar la presentación. Esto no certifica el alta o aprovisionamiento de un carrier real. El acceso normal del layout sigue vigente.

Capturas de viewport, porque el shell desplaza su contenido internamente: [catálogo](desktop.png), [detalle3D](detail-desktop.png), [tabla](detail-table.png), [tablet](tablet.png), [móvil](mobile.png), [menú móvil](mobile-menu.png), [detalle móvil](detail-mobile.png), [tabla móvil](detail-mobile-table.png). Todas abiertas y comprobadas; origen incrustado,8rasters/0sinmetadatos. Las capturas iniciales de documento completo no representaban el scroll interno y se sustituyeron antes de la revisión. Detector ejecutado una vez, `[]`.

No se probó móvil físico, un alta nueva de carrier o una tarifa contractual real. No se reexportaron GLB ni se alteró la geometría, fuera del alcance de esta integración.

Revisión visual independiente, contexto nuevo: **ship** al alcance de esta integración de navegación y shell, sin correcciones materiales. Comprobó las ocho capturas, el contrato y el código relevante; no repitió navegador o pruebas ni certificó acceso/provisión de producción. [Informe](finish-review.md).

[Documentación independiente](documentation-review.md) completada: sistema global conservado,10archivos protegidos sin cambios y12enlaces de evidencia válidos. Los umbrales del contenido se adaptan por contenedor, sin sustituir las reglas del shell.
