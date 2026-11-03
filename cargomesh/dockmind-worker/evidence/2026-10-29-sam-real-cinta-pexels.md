# SAM 3.1 sobre un video real de carga (29 de octubre de 2026)

**Qué prueba:** cómo se comporta `sam-3.1` con una escena real de carga (cámara, luz, bolsas y cajas mezcladas, bultos quietos en el fondo) y qué cambios del worker hacen falta.

**Qué no prueba:** la precisión de DockMind en la demo. Es **un solo clip de terceros** (`THIRD_PARTY_STOCK`), no una captura propia. La validación con clips propios (RA-00 y RA-01) sigue pendiente.

## Clip

- [Pexels 4473271](https://www.pexels.com/video/4473271/): una cinta transportadora mete paquetes y bolsas a un camión, de izquierda a derecha. Dura 30,1 s, es 1280×720 y la cámara está casi fija.
- Licencia de Pexels: se puede usar y modificar, pero no redistribuir. Por eso el clip, sus cuadros y los videos anotados **no están en el repositorio** y no se usan en la demo. Para repetir la prueba se descarga del enlace a `clips/pexels/`, que está ignorado.
- Línea: `--line 0.70,0.40,0.70,0.62 --inside 0.85,0.5`, justo antes de la entrada del camión. Concepto `package`, unidad `BOX`.

## Referencia

Hay 11 cruces completos de izquierda a derecha, en los segundos 3,8, 7,3, 11,9, 14,4, 15,6, 17,3, 18,6, 19,8, 22,8, 25,1 y 26,7. Hay además 2 cruces incompletos: uno ya está sobre la línea al empezar el clip y la bolsa roja queda sobre la línea al terminar. Esos dos no se cuentan.

La hizo Claude sin usar SAM: con un *slit-scan* (la columna de píxeles de la línea, cuadro a cuadro, una al lado de otra) y revisando los cuadros de cada cruce. **Falta que la verifique una persona.**

## Corridas

| Corrida | Request | Ventana | Entran | Salen | Neto | Estado | Costo estimado USD |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cuadro completo, `package` | `resp_6ae2da47f7de9ed033aa4db2` | 1280×720 | 8 | 3 | 5 | REQUIRES_REVIEW (`OBJECT_LIMIT_REACHED` a los 6,7 s) | 0,06 |
| Recorte manual, `package` | `resp_6ae2da9791bf6253e1924177` | 512×360 | 10 | 0 | 10 | OK | 0,06 |
| Recorte manual, `bag` | `resp_6ae2dae7c46762c72cc04208` | 512×360 | 5 | 0 | 5 | REQUIRES_REVIEW (`ENDS_ON_LINE`) | 0,06 |
| Recorte automático, `package` (worker final) | `resp_6ae2dbe376fe803370f74907` | 506×348 | 10 | 0 | 10 | REQUIRES_REVIEW (`TRACK_LOST_NEAR_LINE` y `ENDS_ON_LINE` a los 29,9 y 30,0 s) | 0,06 |

Total: unos USD 0,24. La última fila usa la versión final del worker: el recorte automático y la separación de IDs reutilizados de este cambio.

## Lectura

1. **El cuadro completo no sirve en un andén con carga en el fondo.** SAM sigue como máximo 16 objetos y 8 de esos lugares se los quedaron bultos quietos. A partir del segundo 6,7 SAM no creó IDs nuevos: le pasó IDs de bultos que ya estaban dentro del camión a bultos nuevos, y eso dio 3 salidas falsas. La marca `OBJECT_LIMIT_REACHED` evitó que el error pasara como OK.
2. **Recortar a un corredor alrededor de la línea lo resuelve.** Hay como máximo 12 objetos por cuadro y no hay salidas falsas. Los 10 cruces detectados coinciden uno a uno con la referencia, con entre 0,5 y 1,4 s de retraso, porque un cruce se cuenta cuando las 4 esquinas ya pasaron.
3. **SAM también reutiliza un ID cuando un bulto sale del cuadro.** En la corrida con recorte automático, el ID de la bolsa amarilla, que había salido por el borde derecho, reapareció 9 s después en un bulto nuevo que entraba por la izquierda, y eso dio una salida falsa. Ahora el worker separa ese ID en dos tramos.
4. **SAM cuenta lo que nombra el concepto.** Con `package` no vio la bolsa azul de plástico del segundo 7,3; con `bag` sí la vio, pero dejó pasar otras cosas. Esa falta es **silenciosa**: DockMind no puede marcar lo que SAM nunca detectó. Por eso el conteo se concilia con el manifiesto. El concepto tiene que corresponder a la unidad declarada: una sola unidad por sesión, `cardboard box` o `pallet`.
5. **Las dos marcas finales son correctas:** al terminar el clip, la bolsa roja está montada sobre la línea.

## Cambios del worker que salen de esta prueba

- `roi.py`: el video que va a SAM se recorta a un corredor alrededor de la línea dibujada (1,6 largos de línea a cada lado y 0,6 más allá de cada extremo, con un mínimo de 256 px). El margen y la zona cercana conservan su distancia en píxeles del original. La observación guarda la ventana en `clip.roi`. `--no-roi` analiza el cuadro completo. Los valores salen de este solo clip.
- `tracks.py`: un ID se parte en tramos si salta más de 0,3 del cuadro por cuadro, o si salió tocando el borde y vuelve más de 5 cuadros después a más de 0,25 de distancia.
- `ClipSource.THIRD_PARTY_STOCK`: sirve para rotular clips de terceros en la evaluación local. Los jobs del producto lo rechazan.
- Las 4 corridas reales anteriores sobre clips sintéticos se recontaron con la lógica nueva y dan el mismo resultado.

## Cómo repetirlo

```bash
dockmind analyze clips/pexels/pexels_4473271.mp4 --line 0.70,0.40,0.70,0.62 --inside 0.85,0.5 --concept "package" --unit BOX --source THIRD_PARTY_STOCK --out out/pexels_4473271
dockmind evaluate --reference clips/pexels/referencia_pexels.csv --observations out/pexels_4473271
```

La referencia (`clip,segundo,direccion,total_esperado` con los 11 cruces de arriba y total 11) se guarda junto al clip, en la carpeta ignorada.
