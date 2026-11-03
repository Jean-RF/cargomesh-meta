# Cierre documental — contención del workspace carrier

disposition: ship

La reparación es una extensión localizada del comportamiento existente. El diff de producto añade únicamente `position:relative` al frame que ya fija `100dvh` y `overflow:hidden`, en `cargomesh/src/features/carrier-navigation/carrier-navigation.module.css`. No introduce una identidad visual ni un patrón nuevo.

## Comparación con el sistema existente

`DESIGN.md` conserva sus tokens normativos y la regla de desplazamiento interno; `.impeccable/design.json` sigue siendo su extensión, sin duplicar ni redefinir primitivas. El CSS permanece como autoridad de ejecución. `docs/PRODUCT.md` aporta contexto histórico y semántica de producto, sin cambiar responsabilidades. Este cierre es evidencia de la reparación, no una norma global.

Según el [diagnóstico y las evidencias](README.md), el caption absoluto de la tabla tomaba `body` como referencia y ampliaba el documento a 2153px frente a un viewport de 778px. Al desplazar la página se exponía el fondo oscuro global. El frame relativo contiene esos descendientes dentro del recorte existente: los [siete casos registrados](checks.json) mantienen documento y viewport iguales (778px en escritorio, 844px en móvil) y `windowY:0`, con controles, tabla, lista y menú accesibles mediante su scroll interno.

Se conservan paleta, tipografía, superficies, estados, controles, textos accesibles y escena 3D. La [revisión fresca](finish-review.md) compara el antes con escritorio, tabla y móvil, valida la procedencia de los cuatro PNG y concluye `ship` para este alcance. No hay motivo para regenerar `DESIGN.md` o el sidecar por una declaración de posición.

## Evidencia y límites

`checks.json` registra cero errores; README y revisión consignan navegación 7/7, detector `[]` y scroll normal de `/truck-lab`. Son resultados suministrados, sin repetición en este cierre.

Sólo se escribe este informe. No se abrieron navegadores ni se ejecutaron auditorías, suites o build de producción; quedan sin comprobar móvil real, hardware y otros motores. El veredicto cubre la contención y el fondo negro, sin ampliar la aprobación de los modelos 3D. Sin commit, push ni PR.
