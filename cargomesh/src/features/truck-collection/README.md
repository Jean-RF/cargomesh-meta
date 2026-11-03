# Colección de 60 camiones

Petición local de Juan: 20 pequeños, 20 medianos y 20 grandes, sin repetir identificador, tipo, nombre de modelo, pintura o conductor. Implementación independiente de las historias operativas JU; no registra activos ni personas en Supabase.

## Acceso y alcance

`/truck-lab` muestra un único modelo Three.js a la vez. El catálogo anterior `/vehicle-designs` enlaza a esta colección y conserva sus 23 diseños. Filtros por tamaño, búsqueda de modelo/carga/conductor, selector móvil, siete cámaras, giro/zoom, inspección de carga y exportación GLB completa. No usa servicios de IA ni descargas externas durante el render.

`catalog.ts` contiene los 60 fixtures rotulados `SYNTHETIC_DESIGN`. Los nombres, matrículas DEMO, conductores, bases, potencia, dimensiones y límites de carga son datos de muestra. No corresponden a personas o vehículos registrados, ni a réplicas certificadas de marcas. Cabinas y carrocerías son originales; los mapas Poly Haven y la anatomía de Blender Studio tienen procedencia y licencia propias en `public/truck-materials/LICENSE.md`.

`model.ts` construye geometría en metros: chasis, ejes, suspensión, neumáticos con dibujo, llantas y tornillería, cabina hueca con cristales, retrovisores, asientos, volante, conductor y equipo de carrocería. Agrupa superficies por material. La cámara encuadra los ocho extremos del conjunto según la perspectiva; no deforma el camión para encajarlo.

La carga discreta usa una única función de colocación para el render y las pruebas: cantidad, huella, altura y masa por unidad. Se verifican espacio útil, solapamientos y límite de muestra. Las camas bajas reservan el cuello y el grupo de ejes. Los líquidos calculan nivel a partir del volumen en una sección elíptica; la inspección vuelve transparente la cisterna. Sacos, paquetes y pallets son unidades de carga embaladas, no una afirmación de piezas individuales dentro de cada bulto. Los graneles son un volumen de muestra. No se simulan pesaje, centro de gravedad, reparto por eje, estabilidad, deformación de neumático o certificación de estiba.

## Referencias dimensionales

- [EPAL Euro pallet](https://www.epal-pallets.org/eu-en/load-carriers/epal-euro-pallet): 1200 × 800 × 144 mm. Se reutiliza su huella/detalle de construcción; no se dibujan sellos de certificación.
- [SCHÜTZ ECOBULK, artículo 1028812](https://www.schuetz-id.info/en/info-id-spezifikationen/en-a126q0ch?cid=8ky1): 1000 L, 1200 × 1000 × 1160 mm y tara aproximada 52,3 kg. El ejemplo de agua incorpora esa tara a la masa de la unidad.

## Comprobación y archivos

- `node --import tsx --test src/features/truck-collection/catalog.test.ts`: unicidad 20/20/20, colocación, geometría finita/distinta, presupuesto, liberación de recursos e inspección/nivel de líquido. Incluido en `test:logistics`.
- `node --import tsx scripts/export-truck-collection.mjs <directorio>`: exporta los 60 GLB y `catalog.json`; comprueba cada archivo con el inspector GLB existente y genera hashes SHA-256.
- El botón de descarga exporta la carrocería completa aunque la vista esté cortada. Conserva escala métrica y extras sintéticos.

Three.js, React Three Fiber, OrbitControls y GLTFExporter ya estaban instalados. Se añade `@napi-rs/canvas` como dependencia de desarrollo para exportar los mapas de textura desde Node. El navegador conserva las dependencias de render existentes.

## Revisión anterior de realismo — 29 octubre (rechazada por el usuario)

Tras el rechazo visual del usuario, se reconstruyeron las cabinas con superficies curvas, parabrisas continuo, juntas, puertas, pasos de rueda y altura del conductor. Neumáticos torneados, ruedas traseras duales, cristales tintados, pintura con clearcoat y piezas metálicas diferenciadas. Se reconstruyeron las cargas de automóviles, excavadora y tractor con carrocerías perfiladas, orugas continuas, articulaciones hidráulicas y cucharón abierto; los aisladores/radiadores del transformador se contienen en sus dimensiones de referencia.

Los mapas PBR de madera, metal y cuero y el entorno HDR proceden de [Poly Haven, licencia CC0](https://polyhaven.com/license). Se sirven desde `public/truck-materials/`, con procedencia incrustada, licencia y hashes. No hay solicitudes a Poly Haven durante el render. Los GLB incluyen las imágenes que utilizan y abren sin archivos auxiliares. El HDRI ilumina la escena web y no se exporta como parte del vehículo.

Referencias de forma: [FUSO Canter](https://www.fuso-trucks.com/wp-content/uploads/sites/2/2023/02/TD_Canter_2022_EN_220909.pdf) y [Volvo FH Aero](https://www.volvotrucks.co.uk/en-gb/trucks/models/volvo-fh-aero/specifications.html). Inspiración de proporciones, no réplicas OEM. Los diseños siguen siendo modelos procedurales; no se afirma fotorealismo, captura de vehículos reales ni aptitud física de estiba.

Revisión visual del equipo pendiente de Cristhian/usuario; una revisión del agente o pruebas geométricas no sustituyen su aceptación.

La cámara Detalle de carga encuadra las unidades declaradas y abre la carrocería para examinarlas. Tres pruebas adicionales verifican la geometría visible de coches, excavadora y tractor dentro de su envolvente métrica, además de las seis pruebas de catálogo. Ese corte histórico tenía nueve pruebas de colección y 161 casos logísticos.

## Reconstrucción de identidad estructural — 29 octubre (realismo rechazado por el usuario)

El usuario rechazó nuevamente la cabina compartida y los recoloreados. Esta revisión reemplaza ese generador de cabina; no presenta las anteriores capturas ni su dictamen como aceptación del usuario.

`vehicle-designs.ts` define sesenta decisiones explícitas: capó y habitáculo separados, cabinas adelantadas, acceso bajo, doble fila, cabinas de trabajo, capós largos y dormitorios elevados. Incluye dimensiones, inclinación, ancho, parrilla, ópticas, techo y sección de carrocería. `cab-models.ts` construye esas células y superficies: cofre con sección variable, techo abombado, puerta estampada con junta, pilares, huecos de ventana, pasos de rueda con espesor, accesos, espejos anclados, tablero, asientos y persona sentada. Los conductores tienen rasgos, peinados, vello y accesorios geométricos distintos, además de sus fichas y colores.

`coachwork.ts` construye las secciones de caja, volquete curvo o trapezoidal, cisternas y silo de tres conos con salida inferior. Las bancadas y bastidores dejan paso a las descargas. El resto del equipo fijo conserva su función: pórticos, cunas, portatubos, jaulas, compuertas, brazos o rampas. Los graneles de volquetes/tolvas siguen su sección interior; no son bloques rectangulares atravesando la chapa. El nivel de líquido y la envolvente métrica usan las mismas dimensiones de cisterna, sin deducir capacidad homologada.

**Comparar formas** oculta la mercancía y retira la pintura; utiliza cámara y escala comunes por tamaño. Conserva carrocería, chasis, equipo fijo y conductor. La cámara **Detalle de cabina** facilita examinar frente, puerta e interior. Ambos son controles de inspección; la exportación siempre incluye el modelo completo a color.

Las pruebas adicionales aíslan la cabina sin carga ni persona, verifican la visibilidad de los sesenta rostros y la contención del granel. Un hash diferente detecta regresiones, pero la diferencia visible se comprueba con láminas neutrales, vistas laterales y primeros planos. Ver evidencia en `docs/meta/evidence/juan-truck-identity-2026-10-29/`. GLB y paquete completos se generan fuera de Git con el exportador existente, versión de geometría 4; no se agregó otra dependencia.

Referencias de construcción y proporción: [IVECO Daily chasis cabina](https://www.iveco.com/uk/Daily/Daily-Chassis-Cab) y [Scania P](https://www.scania.com/uk/en/home/products/trucks/p-series.html), además de las referencias anteriores. Son diseños originales, no reproducciones OEM. El acabado sigue siendo 3D procedural para web; la aceptación visual del usuario permanece pendiente. No se ha simulado homologación, reparto de ejes, centro de gravedad ni estabilidad de estiba.


Cierre de revisión4: las catorce pruebas de colección/carga forman parte de 166 casos logísticos. La revisión FULL independiente pidió cuatro arreglos mecánicos/estructurales; los veredictos posteriores los resuelven y devuelven `ship` sobre los arreglos puntuados. Evidencia incluye remolques distintos sin mercancía, cuna de bobinas, telescópico, grúa y cierre de capó. Esto sigue sin sustituir aceptación visual humana o validación física de estiba.

## Revisión 5 — referencias reales, anatomía y embalaje

El usuario volvió a rechazar el realismo de la versión 4. Se compararon fotos y fichas oficiales de [IVECO Daily](https://www.iveco.com/uk/Daily/Daily-Chassis-Cab), [Scania P](https://www.scania.com/uk/en/home/products/trucks/p-series.html), [Isuzu N-Series](https://isuzutruck.co.uk/sales/) y [Volvo FH](https://www.volvotrucks.co.uk/en-gb/trucks/models/volvo-fh-aero/specifications.html). Guían proporciones y construcción; no se redistribuyen sus fotografías o logotipos y los modelos siguen siendo interpretaciones originales.

- Cabinas: morro urbano más compacto, posición corregida del eje delantero, esquinas del frontal continuas, chapa curvada con normales transformadas, techo alto continuo y cabinas europeas más cortas. Ópticas con reflectores, lentes y luz de posición; rejilla perforada, panel de servicio, bisagras, marcas de muestra e instrumentación.
- Mecánica: pasos de rueda recortados también en puertas de cabinas con capó, llantas con orificios reales y garganta torneada, depósitos longitudinales con bandas y tapón. Se conserva la diversidad de carrocerías y equipo fijo.
- Persona: malla anatómica CC0 de Blender Studio/Dan Ulrich, en lugar de cabeza/esferas y extremidades cilíndricas. Pose sentada, manos al volante, rasgos variables, cuero cabelludo, cuello de polo, bolsillo, botones, pantalón y tejidos. La identidad y ficha de cada conductor se conservan.
- Carga: un paquete/cajón contado ya no se representa como ocho o doce unidades pequeñas. Los pallets sí conservan bultos interiores. Cajones abiertos con contenido, cinta y etiquetas, film en pallets embalados y tensores de cinchas; el granel tiene una superficie continua irregular en lugar de siete esferas.
- Materiales: microdetalle original de tejido, piel, cartón y pintura, máscaras de rejilla y etiquetas por vehículo. Se mantienen los PBR/HDR de Poly Haven. Los colores de vértice usan bytes normalizados y se omiten cuando no aportan información. Los GLB mantienen los límites del importador compartido: 200.000 triángulos, 16 imágenes y 12MiB; no se relajan sus validaciones.

Blender se usa sólo para extraer la malla fuente CC0. Reproducción: `blender --background --python scripts/prepare-driver-mesh.py -- <human_base_meshes_bundle.blend>`, seguido de `node scripts/prepare-truck-materials.mjs`. No se añadieron dependencias de render ni servicios externos. Las exportaciones incorporan sus texturas; el HDR sigue siendo iluminación del visor.

La evidencia de esta revisión se registra en `docs/meta/evidence/juan-truck-realism-2026-10-30/`. Se distingue comprobación técnica de aceptación visual: son modelos 3D para web, no escaneos, CAD de fabricante ni demostración de estiba segura. La aprobación estética final sigue correspondiendo al usuario y al equipo.
