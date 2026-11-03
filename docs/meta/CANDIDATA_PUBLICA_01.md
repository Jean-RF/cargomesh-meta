# Candidata pública 01 — preparación, no entrega final

27-oct-2026, America/Lima. Preparada por Cristhian con Codex a petición del usuario. Se conserva la autoría real del código importado.

| Dato | Valor verificado |
| --- | --- |
| Repositorio de trabajo | Chujutak2024/meta-hackathon, privado |
| Corte de origen integrado | a5c2a4d8c0f4197641d9024f5f22908dd326e9d6, merge del PR #4 de Axel |
| Base pública preexistente | Chujutak2024/cargomesh @ 4482d3a9a51bcc8c7c151996862ac5d43c96db8f |
| Repositorio de destino | [Chujutak2024/cargomesh-dockmind](https://github.com/Chujutak2024/cargomesh-dockmind), público |
| Rama | codex/release-candidate-01 |
| PR de publicación | [#1](https://github.com/Chujutak2024/cargomesh-dockmind/pull/1), borrador, sin merge |
| Head preparado | 1b07981b9a955bfa1653e205fd066c71bd312ffa |
| Base main pública al abrir | c367499928482232befcc713aeb9945206c009e0, README inicial |
| Checkout independiente | C:/Users/HP/Documents/cargomesh/salida/cargomesh-dockmind-release |

## Contenido y procedencia

Se seleccionaron 1.929 archivos versionados del SHA de origen: aplicación, scripts de soporte, cadenas SQL diferenciadas, fixtures/regresión, documentación técnica de base, contratos/evidencia AX-00/01, licencia/notices y CI heredado. 1.881 coinciden con la base pública antigua: no se presentan como código nuevo del evento. Los archivos nuevos/modificados de origen incluyen AX-00/01 y preparación de directorios/documentación, no funcionalidades DockMind terminadas.

La candidata añade documentación de publicación y adapta seis archivos importados de configuración documental/plantillas/entrada. 1.923 blobs importados se verificaron idénticos al origen, incluida la licencia MIT. El total del PR es 1.936 archivos principalmente por importar la base; no mide trabajo nuevo. El inventario [RELEASE_MANIFEST.json](https://github.com/Chujutak2024/cargomesh-dockmind/blob/1b07981b9a955bfa1653e205fd066c71bd312ffa/RELEASE_MANIFEST.json) conserva blobs, hashes de bytes de origen/publicados y overlays explícitos.

La [procedencia pública](https://github.com/Chujutak2024/cargomesh-dockmind/blob/1b07981b9a955bfa1653e205fd066c71bd312ffa/PROVENANCE.md) acredita AX-00/01 a Axel/Codex y conserva la atribución de la base, incluido Luis y el equipo general. No se replicó toda la historia privada ni se cambiaron autores para simular elegibilidad. El importador no se declara autor del código importado.

## Exclusiones

- PRs de origen #3, #5, #6 y #7 no integrados.
- Backend Hono CR-01 y migración local sin commit/push de nuestro checkout de desarrollo.
- Prompts/backlog/referencias privadas de coordinación y materiales pegados.
- Configuración local real, secretos, node_modules y salida de compilación.
- Inferencia SAM, worker/contador de Ramón, sesiones/Tetris/Passport de Juan, nuevo manifiesto persistido y expediente documental: no se anuncian como implementados en esta candidata.

## Comprobaciones realizadas y límites

- Selección de archivos desde un commit identificado, sin copiar el árbol de trabajo con cambios locales.
- Inventario/hashes y comparación de blobs Git; licencia/notices conservados.
- Escaneo estático acotado de archivos de entorno prohibidos, patrones de claves privadas/credenciales y JWT literales: sin coincidencias. No equivale a una auditoría de seguridad completa.
- Enlaces de documentación de publicación y formato del diff de sus overlays.
- La exportación inicial de Windows convirtió finales de línea; el segundo commit restaura bytes exactos desde blobs y corrige los hashes, sin reescribir historia. No hubo cambio de comportamiento del producto por esa corrección.
- **No se ejecutaron pruebas locales de producto, typecheck, build, SQL, llamadas reales al modelo o revisión visual.** La evidencia CI del origen no se presenta como una aceptación nueva de esta exportación. CI público automático se consulta aparte; no se activa manualmente en esta entrega.

El checkout de desarrollo quedó con sus cambios pendientes conservados; no se hizo pull sobre ellos. Amazon, Supabase alojado, Vercel, permisos de colaboradores y dominios de jueces no se modificaron. No se mergeó el PR público ni se envió el proyecto al evento.

## Qué sigue

Revisar esta candidata, integrar los módulos funcionales que faltan en su repositorio de trabajo, promover solo incrementos identificados y revisar dependencia/autoría/alcance antes de aceptar el corte. La verificación permitida de la candidata, aceptación del proveedor real, derechos sobre material del demo y evaluación de requisitos del evento siguen pendientes. Publicar una rama no certifica que el producto esté completo o que la composición del equipo sea elegible.

El PR público no está listo para presentarlo como demo final. El siguiente corte se añade al mismo PR mientras siga abierto, sin sincronización ciega de main privado ni duplicación de las implementaciones.
