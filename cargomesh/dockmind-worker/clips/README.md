# Clips de prueba (RA-00)

Los videos no se commitean: pesan y pueden mostrar personas. Esta carpeta guarda solo instrucciones y la plantilla de referencia.

## Cómo grabar

- Celular fijo en trípode, horizontal, 1280×720 a 30 fps, con buena luz y fondo despejado.
- Encuadra de lado la puerta del camión o el borde de la rampa: solo la zona de paso. SAM sigue como máximo 16 objetos por cuadro.
- Para probar en casa usa cajas de cartón y el concepto `cardboard box` con unidad `BOX`. Usa `pallet` y `PALLET` solo en una bodega real.
- Evita caras: graba a la altura de la carga o de espaldas.
- Cada clip pesa menos de 50 MB y dura entre 15 y 60 s.

## Clips por grupo del pedido (RA-00)

El pedido `8b0fed7d-4cc3-4cc3-b819-8f68fdeefebe` tiene el manifiesto `163cd0cc-a0d2-4f8e-bcde-310c689fcafd` en su revisión 1, con dos grupos. Cada grupo lleva su propio clip:

| Archivo | Grupo | Qué se ve |
| --- | --- | --- |
| `grupo_a.mp4` | A `879dc96b-3c00-43e1-b772-619996b2b713` | Solo las 8 cajas de A, cruzando la línea una por una |
| `grupo_b.mp4` | B `d1b2aab3-29d2-4b90-8a70-d369c0dd1f6c` | Solo las 4 cajas de B |

- No grabar las 12 cajas juntas para usarlas en los dos grupos: un total global no prueba ninguno.
- Mismo encuadre y la misma línea en los dos clips, para usar la misma configuración.
- Si una toma sale mal, se graba otra con otro nombre (`grupo_a_2.mp4`); no se edita ni se recorta el original.
- Anotar el SHA-256 de cada archivo (`certutil -hashfile grupo_a.mp4 SHA256` en Windows, `sha256sum` en macOS/Linux), la referencia manual y el [permiso de uso](permiso.example.md).
- El flujo completo, desde la subida hasta la evaluación por grupo, está en [OPERACION.md](../OPERACION.md#clips-propios-por-grupo-ra-00).

## Casos mínimos

1. `todas.mp4`: entran todas las cajas.
2. `falta_una.mp4`: una caja se queda afuera.
3. `oclusion.mp4`: una persona pasa por delante o entran dos cajas juntas.
4. `reingreso.mp4`: una caja sale y vuelve a entrar.

## Clips simulados de la sede

Para la demo, el equipo usa video simulado: la carga del muelle 02 de la escena 3D, grabada con `cargomesh/scripts/dockmind-depot-clip/render.mjs`. Va en `clips/sede/` con `--source SYNTHETIC_RENDER` y nunca se presenta como cámara real. El script también escribe la línea y la referencia. Resultados: `../evidence/2026-10-30-sam-sede-simulada.md`.

## Clips de terceros

Un video de stock (por ejemplo de Pexels) sirve para probar en local, rotulado `--source THIRD_PARTY_STOCK`. Ve en `clips/pexels/` y nunca se commitea, ni se usa en la demo ni en el video del envío. Los jobs del producto rechazan ese origen. Ejemplo: `../evidence/2026-10-29-sam-real-cinta-pexels.md`.

## Referencia manual

Copia `referencia.example.csv` a `referencia.csv` y anota cada cruce mirando el video: el segundo, la dirección (`IN` o `OUT`) y el total neto esperado del clip, repetido en cada fila. La referencia solo la lee `dockmind evaluate`; el análisis nunca la recibe.

Para los clips de un pedido, cada fila lleva también:

- `sha256`: identifica el clip por sus bytes, no por el nombre;
- `grupo`: el ID del grupo del manifiesto;
- `cobertura`: `COMPLETE` o `PARTIAL`.

Una fila con `grupo` sin `sha256` o sin `cobertura` se rechaza, y un mismo clip no puede ser referencia de dos grupos. Las filas sin `grupo` ni `cobertura` son del formato anterior, para análisis locales, y no tienen esas exigencias.

`dockmind evaluate` lee además los `evidencia.json` de `pnpm evidence:meta-dockmind`. Cada clip de la referencia aparece siempre en el informe, con uno de estos resultados:

- `EVALUADO`: hay conteo;
- `FAILED`: el job terminó sin observación; se muestra su código de error;
- `PENDIENTE`: el job sigue en cola o corriendo;
- `SIN_RESULTADO`: no hay archivo para ese clip.

Solo un `EVALUADO` tiene cantidades. El resumen separa esperados, evaluados (y exactos), fallidos, pendientes y sin resultado, en total y por grupo. Un acierto cuenta solo si el resultado viene de un job de ese grupo, con esa cobertura declarada, sobre captura propia y con SAM real.

La cobertura que se muestra es la del job: si el job no la trae, queda `desconocida` y la fila no es exacta (`COBERTURA_DESCONOCIDA`). La referencia nunca la completa. Si un clip tiene más de un resultado, ninguno cuenta como exacto (`VARIOS_RESULTADOS`).
