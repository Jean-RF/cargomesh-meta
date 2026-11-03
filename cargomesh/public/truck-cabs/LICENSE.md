# Cabinas y ruedas adaptadas para CargoMesh

Estas mallas **no son modelos originales creados por Juan**. CargoMesh/Juan adapta, corta y ensambla las bases siguientes con sus carrocerías, conductores y cargas de muestra. Los derivados de esta carpeta mantienen **CC BY 4.0**: https://creativecommons.org/licenses/by/4.0/ .

| Archivo derivado | Fuente y atribución |
| --- | --- |
| sprinter.glb | CARLA Simulator (carla.org), BP_Sprinter2024; conversión Valdrada / M. K. Turkcan |
| bonnet.glb | CARLA Simulator (carla.org), BP_Ambulance2024; conversión Valdrada / M. K. Turkcan; se reutiliza la cabina con capó |
| euro-high.glb | CARLA Simulator (carla.org), BP_CarlaCola2024; conversión Valdrada / M. K. Turkcan |
| euro-day.glb | CARLA Simulator (carla.org), BP_FireTruck2024; conversión Valdrada / M. K. Turkcan; cabina Actros sin equipo de emergencia |
| isuzu.glb | **Isuzu FFR**, **mekanismo**, CC BY 4.0; conversión/adaptación Valdrada / M. K. Turkcan |

Fuentes primarias y procedencia de la conversión:

- https://github.com/carla-simulator/carla#license
- https://github.com/mkturkcan/valdrada/blob/main/LICENSING.md
- https://github.com/mkturkcan/valdrada/blob/main/ACKNOWLEDGEMENTS.md
- https://github.com/mkturkcan/valdrada/blob/main/client/DATA_SOURCES.md
- Isuzu FFR original: https://sketchfab.com/3d-models/29931659dfe84909a226a625cf5a8f75
- Dataset/revisión de descarga: https://huggingface.co/datasets/mehmetkeremturkcan/valdrada/tree/v0.6.2/Content/models

Cambios de CargoMesh/Juan: descodificación local de Meshopt/KTX2 y atributos cuantizados; selección de LOD0; separación de cabina y ruedas por geometría, sin cambiar el aspecto de carrocería sólo mediante color; retirada de cajas/equipo anterior y cierre de panel trasero donde procede; mapas de color, normales y metal/rugosidad en atlas; LOD independiente para chapa y ruedas, transfiriendo las normales de la malla original; materiales de pintura/cristales adaptados; coordenadas en metros y ensamblaje proporcional con las carrocerías sintéticas. Las variantes de techo alto y bajo comparten arquitectura, y no representan 60 cabinas OEM distintas.

`bases.json` contiene dimensiones de ensamblaje, tamaño y SHA-256 de cada derivado. `sources.json` registra URLs y SHA-256 de las fuentes descargadas. La atribución y la licencia también van en extras del GLB. El script de preparación está en `cargomesh/scripts/prepare-licensed-cabs.py` y recibe archivos intermedios localmente descodificados.

Las otras piezas/cargas del proyecto, el humano CC0 de Dan Ulrich/Blender Studio y los materiales CC0 de Poly Haven conservan su procedencia en `/truck-materials/LICENSE.md`. La iluminación usa el HDR existente de Poly Haven; GTAO y MSAA se ejecutan con Three.js ya instalado. No se incluyen peatones MetaHuman ni datos de ciudad.

Los nombres de marcas describen las fuentes de las mallas; no implican patrocinio. Las configuraciones CM y sus medidas, colores, conductores, potencias y capacidades son datos de muestra; no son réplicas CAD certificadas, una oferta de vehículos ni una homologación de carga.
