# SAM 3.1 sobre la carga simulada del muelle 02 (30 de octubre de 2026)

**Qué prueba:** que DockMind cuenta con SAM real los pallets que entran al camión en el video simulado de la sede, el que el equipo acordó usar en la demo, y que detecta un pallet que falta.

**Qué no prueba:** la precisión con cámaras reales. Son **dos clips sintéticos** (`SYNTHETIC_RENDER`) con modelos 3D simples, iluminación limpia y un solo pallet en movimiento a la vez. La prueba con video real sigue siendo la del [29 de octubre](2026-10-29-sam-real-cinta-pexels.md).

## Clips

Los grabó `cargomesh/scripts/dockmind-depot-clip/render.mjs` desde la escena 3D de la sede, con la plantilla `distribution`. Son 25 s del ciclo, de 34 a 59 s, a 1280×720 y 30 fps. La cámara está fija a 3,2 m de altura, a un lado del pasillo del muelle 02. Los videos no se commitean; el script los vuelve a generar.

| Clip | Qué pasa | SHA-256 (inicio) |
| --- | --- | --- |
| `muelle02_completa.mp4` | El montacargas mete 3 pallets al remolque | `ce9fb05f0602` |
| `muelle02_falta_una.mp4` | El tercer viaje va vacío y un pallet se queda afuera | `8eb49d30d3a3` |

- Línea: la vertical del centro de la puerta, `--line 0.5974,0.1341,0.5639,0.7584 --inside 0.6698,0.3175`.
- Concepto `pallet`, unidad `PALLET`.
- Referencia: la saca la simulación, no una persona. Es el segundo en que el pallet llevado cruza el plano de la puerta: 5,03, 12,03 y 19,03 en el completo, y 5,03 y 12,03 en el otro.

## Corridas

| Corrida | Request | Entran | Salen | Neto | Estado | Costo estimado USD |
| --- | --- | --- | --- | --- | --- | --- |
| Primer encuadre: cámara a 2,1 m, plantilla `cross-dock`, línea solo a la altura de la puerta | (no se guardó) | 0 | 0 | 0 | REQUIRES_REVIEW (`TRACK_LOST_NEAR_LINE`) | 0,05 |
| Cámara alta, línea solo a la altura de la puerta | `resp_6ae44f6923f0f353aa7e4365` | 0 | 0 | 0 | REQUIRES_REVIEW (3 × `TRACK_LOST_NEAR_LINE`) | 0,05 |
| Final, completo | `resp_6ae45062232e7c68a1174ce4` | 3 | 0 | 3 | OK | 0,05 |
| Final, falta uno | `resp_6ae45079cd6f8b43d407490a` | 2 | 0 | 2 | OK | 0,05 |

Total: unos USD 0,20. En las dos corridas finales, los cruces llegan a los 4,9, 11,9 y 18,9 s: 0,13 s antes que la referencia, a 10 fps. `dockmind evaluate` da conteo exacto y sin marcas en los dos clips.

## Lectura

1. **SAM marca solo la base de madera.** Con el concepto `pallet`, la caja de SAM cubre la tarima y no las cajas apiladas encima. Alcanza para seguirla.
2. **Con el primer encuadre no había cruce que contar.** La cinta transportadora de la plantilla `cross-dock` tapaba el recorrido, y SAM recién veía el pallet sobre la línea. La cámara alta con la plantilla `distribution` muestra todo el recorrido.
3. **La línea tiene que cubrir el recorrido en la imagen.** DockMind solo le da lado a una caja cuyo centro cae dentro del segmento dibujado. Con la cámara en alto, el pallet que se acerca aparece más abajo que el umbral de la puerta. Con la línea solo a la altura de la puerta, nunca estuvo "afuera". Se prolongó la misma vertical por debajo del piso. Reevaluada sin volver a pagar, la salida de SAM de la segunda corrida ya daba 3 entradas.
4. **El salto de la animación original generaba marcas.** En el ciclo de la sede, el pallet desaparece del montacargas al soltarse y otro aparece después en el remolque. SAM perdía uno junto a la línea y veía aparecer el otro adentro sin cruce: 3 marcas `TRACK_LOST_NEAR_LINE`. En la escena del script, el pallet entregado sigue visible y se desliza al fondo hasta quedar tapado. Así se comportaría un video real, y desaparecieron las marcas.
5. **El clip sintético es más fácil que uno real.** Esta prueba no reemplaza la de video real: en la del 29 de octubre, SAM no detectó una bolsa que no correspondía al concepto. Por eso el dashboard solo acepta estos clips en modo demo y avisa que son simulados.

## Repetir

```powershell
# desde cargomesh/ (ver scripts/dockmind-depot-clip/README.md)
node scripts/dockmind-depot-clip/render.mjs --variant complete --out <carpeta>
node scripts/dockmind-depot-clip/render.mjs --variant missing-one --out <carpeta>
# copiar los MP4 y referencias a dockmind-worker/clips/sede/ y, desde dockmind-worker/:
dockmind analyze clips/sede/muelle02_completa.mp4 --line 0.5974,0.1341,0.5639,0.7584 --inside 0.6698,0.3175 --concept pallet --unit PALLET --source SYNTHETIC_RENDER --out out/sede_completa
dockmind evaluate --reference clips/sede/referencia_muelle02_completa.csv --observations out/sede_completa
```

Cada clip cuesta unos USD 0,05 con la clave del equipo.
