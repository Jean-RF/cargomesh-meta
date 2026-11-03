# Animación de carga en fábrica — 1 noviembre 2026

Disponible dentro del detalle de cada camión en `/carriers/tetris`: **Animar carga en fábrica**.

La modalidad usa los 60 vehículos y su mercancía nativa del catálogo (sin sustituirla por una caja genérica). Aplica robot de entrada trasera, puente grúa, rampas o llenado según el vehículo/producto. Conserva tamaño de sólidos, IDs, cantidades y kg; para cisternas calcula el nivel mediante la sección elíptica y los litros declarados. Tolvas usan crecimiento de la geometría de granel y partículas visuales. La carga sólida suma al quedar depositada; las transferencias suman masa durante el llenado.

Los controles ofrecen inicio/pausa, reinicio, velocidad y búsqueda temporal determinista. Movimiento reducido avanza por pasos. Al ocultar la pestaña o el componente se pausa. El plan operativo sigue separado: no escribe observaciones, sesiones, comparación, Passport ni contratos.

## Evidencia terminada

- Prueba nueva de siete casos: 60 planes, inventario/masa, cuatro métodos, recorrido AABB entre unidades/entrada de furgones, búsqueda y geometría nativa sin escalar sólidos; 7/7 pasan en el estado final, junto con15pruebas de productos detallados.
- `pnpm typecheck`: correcto. `pnpm build`: correcto tras F1/F2, incluye tipos/lint. Después se reemplazó un alias CSS por el token normativo: compilación dev y22colores computados idénticos antes/después; sin otra build de producción para ese alias.
- `pnpm test:carrier-operations`: 54/54. `pnpm check:architecture`: 846 módulos / 246 entradas cliente.
- [Ocho casos en Chrome y móvil390px](browser-check.json): cantidades al inicio/mitad/final, End/Home del deslizador, reproducir/pausar/reiniciar y volver al plan, sin errores JavaScript. `pnpm test:logistics` final: 201/201, incluidas las siete nuevas y las regresiones de geometría/licencias ([log](logistics-final.log)).
- [Detector de los archivos UI modificados](detector.json): `[]`, ejecutado una vez. 35 capturas con origen PNG tEXt, scan0missing.

## Límites

Medidas del modelo sintético, no medidas de una unidad registrada. Rutas cinemáticas: no solver de contactos/estabilidad, capacidad certificada de aparejos o evaluación de seguridad física. La prueba de intersecciones cubre mercancías y apertura rectangular de los furgones y los apoyos rodados; no homologa todos los cuerpos, máquinas y apoyos. El granel es una representación de llenado, sin densidad física calibrada; la envolvente sólida no equivale a volumen neto de producto. Sin móvil físico, render visual individual de los60 o exportación de esta animación a GLB. No dependencias nuevas ni instalación adicional. Trabajo local sobre3810a58, sin commit/push/PR.


## Revisión independiente y correcciones

[Revisión inicial](finish-review.md): F1 pedía mejorar encuadre del portaautos y F2 eliminar rueda delantera del tractor suspendida0,533m. Se compacta el stock en una fila transversal sobre transbordador, se cambia cámara de las rampas y se comparte la geometría de apoyos de neumáticos/orugas con su pose sobre el perfil suelo/rampa/plataforma. Los pasos de la cama baja disponen de rampas interiores. [Veredicto](fix-verdict.md): ship, F1 y F2 resolved; el veredicto puntúa esos dos cambios, no supone una revisión global nueva. Los cuatro rodados se recapturan con un instante tras despejar el eje trasero.

[Prueba de navegador de las correcciones](browser-check-fix.json): cuatro casos, controles/fin/reinicio y móvil, sin errores. La prueba de apoyo muestrea800ángulos por rueda, detecta penetración y exige hueco<2mm sobre el perfil; esta tolerancia no certifica una operación física. Una comprobación inicial con80muestras sobreestimó el hueco de una esquina; se aumenta resolución sin ampliar la tolerancia ni cambiar el solver.


[Comparación documental](documentation-review.md): identidad y18tokens normativos conservados; sin cambios en DESIGN.md, sidecar o globales. [Token CSS](token-check.json):22colores finales iguales tras usar --cm-color-ink en la modalidad.
