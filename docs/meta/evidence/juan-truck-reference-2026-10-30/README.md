# Juan — prototipo de camión con una base diferente

Fecha: 30 octubre 2026, America/Lima. Rama `codex/meta-juan`, continuación en PR #9. El usuario rechazó también la apariencia de v5. Sus comprobaciones técnicas anteriores no acreditan aceptación estética.

Se implementa **un prototipo** en `/truck-lab/reference`, enlazado desde la galería. Usa una malla de vehículo de CARLA, convertida por Valdrada, con superficies, UV, interior y piezas mecánicas previamente trabajadas. No se atribuye esa malla a Juan. La colección anterior conserva sus 60 modelos; este incremento no los sustituye ni añade conductor/carga al prototipo.

## Fuente y transformación

La [licencia y procedencia completas](../../../../cargomesh/public/truck-reference/LICENSE.md) incluyen URLs, autores y hashes. Vehículo de CARLA Simulator, CC BY 4.0; conversión de M. K. Turkcan / Valdrada v0.6.2. No se descargaron peatones MetaHuman ni datos de ciudad. No compras, créditos o dependencias nuevas.

El GLB fuente usa Meshopt, atributos cuantizados y KTX2; no se amplió el importador para aceptarlos. Se descodificó fuera del runtime mediante los loaders/exportador ya instalados de Three.js: sólo LOD0, atributos flotantes, texturas 1024px, normales PNG y otros mapas JPEG. Se probaron el LOD1 de origen (ruedas visiblemente poligonales, descartado) y una reducción en Blender. La elegida conserva LOD0 reducido a 189.987 triángulos, con validación de caras degeneradas y ajustes de barniz y ópticas. Se conserva el tamaño, con rotación hacia -X y apoyo cercano al suelo. La compresión JPEG para las normales también se descartó.

`public/truck-reference/hgv.glb`: 12.052.440 bytes, 10 primitivas, 14 imágenes embebidas. Sin archivos externos, KTX2 o Meshopt en runtime. El inspector compartido mantiene 200k triángulos, 16 imágenes y 12MiB; la carga y la prueba del recurso lo ejecutan sin excepciones específicas para este archivo. Atribución/cambios también en los extras del GLB descargable.

## Comprobaciones de este incremento

- TypeScript correcto y arquitectura: 832 módulos / 242 entradas cliente.
- Build de producción correcto, incluida `/truck-lab/reference`; `pnpm test:logistics` 171/171 y `pnpm test:carrier-operations` 54/54. Incluye una nueva prueba del archivo: límites del inspector compartido, imágenes embebidas, atribución en extras y correspondencia de hash con su licencia. Los avisos heredados de Three CJS/Clock no equivalen a fallos de las pruebas.
- Chrome: navegación desde la colección, cuatro vistas a 1600 y 390px, sin desbordamiento de documento. La descarga coincide byte a byte con el recurso. En el recorrido final: cero errores de página, peticiones fallidas o respuestas HTTP >=400; la prueba negativa 503 y recuperación se ejecuta aparte. El primer intento de automatización encontró una petición fallida antes de que se guardaran sus detalles; se añadió persistencia del diagnóstico y el recorrido completo volvió a pasar.
- Blender 5.2.3: reimportación del GLB final, geometría finita y válida, 14 imágenes empaquetadas de hasta 1024px, cero imágenes externas. Dimensiones incluyendo espejos: 8,0036 × 3,3808 × 4,0552m, sin homologación de esas medidas. Mínimo del conjunto a 9,8mm del suelo.
- `browser.json` y `blender.json` registran resultados del prototipo. Las ocho capturas son renders reales del navegador, sin retoque generativo. No son fotografías del vehículo.

## Aceptación y límites

Se observa una silueta y un trabajo de superficies más cercano a un vehículo reconocible. Sigue siendo un recurso de simulador; no se declara fotorrealismo ni réplica CAD exacta. Pintura, cristales, ópticas y primeros planos aún admiten mejora. La aceptación visual del usuario sigue pendiente.

Para continuar con los 60: fijar una referencia concreta por vehículo, crear/seleccionar mallas con siluetas realmente distintas y licencia redistribuible, trabajar materiales sobre UV, ajustar conductor al interior y modelar embalajes/estiba según cada carga. Comparar primero vistas lateral, frontal y de cabina; replicar la misma cabina con otra pintura no completa el encargo.

No se revalida la operación completa de Tetris/sesiones/Passport en este incremento. No merge a main, despliegue, pagos o migración alojada. Móvil comprobado por viewport de Chrome; GPU, memoria y rendimiento en dispositivos físicos sin medir.
