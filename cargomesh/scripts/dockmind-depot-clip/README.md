# Clips simulados de la sede para DockMind

El equipo acordó usar video simulado para la demo. Este script graba la carga del muelle 02 de la escena 3D de la sede (`src/features/logistics-3d`, la misma de `/depot-preview`) con una cámara fija, como si fuera un celular en trípode. El clip se analiza con SAM real y se rotula siempre `SYNTHETIC_RENDER`: es un render, no una cámara.

| Archivo | Qué hace |
| --- | --- |
| `scene.ts` | Arma la sede, el camión y el montacargas con los modelos existentes, sin cambiarlos, y dibuja cualquier instante del ciclo con un reloj controlado desde fuera |
| `render.mjs` | Abre la escena en Chrome sin ventana, graba 25 s del ciclo (34 → 59 s) a 1280×720 y 30 fps, y escribe el MP4, la línea para DockMind y la referencia |

## Uso

Desde `cargomesh/`, con un Playwright ya instalado (no se agrega como dependencia) y FFmpeg:

```powershell
$env:CARGOMESH_PLAYWRIGHT_MODULE = '<ruta>\node_modules\playwright-core\index.mjs'
$env:CARGOMESH_CHROMIUM_EXECUTABLE = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
node scripts/dockmind-depot-clip/render.mjs --variant complete --out <carpeta fuera del repo>
node scripts/dockmind-depot-clip/render.mjs --variant missing-one --out <carpeta fuera del repo>
node scripts/dockmind-depot-clip/render.mjs --still 38 --out <carpeta>   # un cuadro, para encuadrar
```

Opciones: `--template` (plantilla de la sede, `distribution` por defecto), `--camera '{"position":[x,y,z],"target":[x,y,z],"fov":60}'` y `--fps`.

Variantes:

- `complete` (`muelle02_completa.mp4`): el montacargas carga los 3 pallets.
- `missing-one` (`muelle02_falta_una.mp4`): el tercer viaje va vacío y un pallet se queda en la zona de preparación. El manifiesto declara 3; DockMind debe contar 2.

Cada corrida escribe:

- `<clip>.line.json`: la línea para `dockmind analyze`, que es la vertical del centro de la puerta proyectada en la imagen, con el lado de adentro hacia el remolque.
- `referencia_<clip>.csv`: el segundo exacto en que cada pallet cruza el plano de la puerta, sacado de la propia simulación. Tiene el formato de `dockmind-worker/clips/referencia.example.csv`.

Los videos no se commitean. Para analizarlos, cópialos a `dockmind-worker/clips/sede/`, que está ignorada por Git:

```powershell
dockmind analyze clips/sede/muelle02_completa.mp4 --line <x1,y1,x2,y2> --inside <x,y> --concept pallet --unit PALLET --source SYNTHETIC_RENDER
```

## Diferencias con la escena original

- El pallet entregado no desaparece del montacargas para reaparecer en otro lugar del remolque, como pasa en el ciclo original. Sigue visible y se desliza al fondo hasta quedar tapado por las paredes. Con el salto, SAM perdía el pallet junto a la línea y el conteo quedaba en revisión.
- La línea baja por debajo del piso. Con la cámara en alto, el pallet que se acerca aparece más abajo que el umbral, y DockMind solo le da lado a una caja cuyo centro cae dentro del segmento.

Resultados con SAM real: [evidencia del 30 de octubre](../../dockmind-worker/evidence/2026-10-30-sam-sede-simulada.md).
