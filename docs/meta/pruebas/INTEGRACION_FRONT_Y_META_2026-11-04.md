# Entrega conjunta de Front y correcciones Meta

Solicitud de Cristhian: guardar lo pendiente, sincronizar y subir, conservando el commit de Front `5144a4d`, y abrir PR para revisión de Ramón/Jean.

## Conjunto preparado

- `5144a4d`: Organización, biblioteca documental y reutilización de perfiles de carga, entregados por Front.
- `d02d888`: consulta documental para Meta, importación revisada de packing list, calendario/horarios, contactos, compatibilidad de lectura de moneda y evidencia.
- `6cfbf46`: sincronización normal de `origin/main@c97c59b`, conservando los PR #5 y #6 de Tetris, voces y mapas. El único conflicto fue el registro documental, resuelto conservando ambas entradas.
- Corrección de compatibilidad detectada en el conjunto: `unitUnitsPerPackage` sigue capturándose/reutilizándose mediante grupos y perfiles; no se añade al contrato de inferencia de conversación. Se excluye de su tipo de campos, resolviendo el error TypeScript sin perder el dato.

## Gate del conjunto

| Comando / comprobación | Resultado |
| --- | --- |
| `node --run test:meta-intake-documents` | 24/24 |
| `node --run test:v2-intake` | 91/91 |
| `node --run test:meta-ai` | 64/64 |
| `node --run test:v2-chat-workflow` | 119/119 |
| `node --run test:v2-conversation` | 109/109 + 32/32 |
| Organización, contexto, ajustes y rutas documentales | 18/18; arnés adaptado a la nueva composición de Front |
| Campos de conversación y conservación de grupos | 13/13 después de la corrección de tipos |
| `tsc --noEmit` | exit 0 |
| Arquitectura | 935 módulos / 273 entradas cliente, exit 0 |
| Build Next de producción | exit 0, compilación + tipos + generación de rutas |
| Comparación de la copia de build | 1.527 archivos de `src` y `public` idénticos a la copia activa |

Son 470 ejecuciones de casos con solapamientos, no 470 casos únicos. La build se ejecutó en una copia aislada sin archivos `.env`, con dependencias locales y dos procesos de build mediante configuración sólo en esa copia. No reemplazó el servidor de desarrollo. El primer intento detectó el nuevo campo de Front sin correspondencia en el tipo conversacional; el segundo, tras corregirlo, terminó con exit 0.

Evidencia: [integracion-front-meta-2026-11-04](integracion-front-meta-2026-11-04/). Este gate actualiza las notas anteriores que dejaban pendiente la build o la publicación por restricciones temporales. No se repitieron llamadas pagadas ni escrituras de datos durante esta sincronización; la evidencia HTTP y Meta real anterior mantiene su alcance original.

## Revisión solicitada

Ramón/Jean revisa el PR sobre `main` de `Jean-RF/cargomesh-meta`. El push es a la rama existente `codex/meta-copilot-overlay-ui`, sin force-push ni merge a main. La revisión visual/funcional del usuario sigue pendiente. El análisis de PDF no certifica normativa ni autenticidad, los escaneos sin texto no tienen OCR en este incremento, y la importación no comparte documentos ni crea bookings automáticamente. No se modifica Amazon, Supabase alojado o Vercel. La compilación local no certifica un despliegue alojado.
