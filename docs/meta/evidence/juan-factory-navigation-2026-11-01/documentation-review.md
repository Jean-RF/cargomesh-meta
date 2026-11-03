# Cierre documental · navegación de cámara en fábrica

**Dictamen: ship · 2026-11-01.** La extensión mantiene el sistema existente y el [finish review fresco](finish-review.md) no deja correcciones pendientes. Este cierre contrasta documentación, fuente y evidencia guardada; no repite la sesión de navegador.

## Continuidad del sistema

[DESIGN.md](../../../../DESIGN.md) conserva los tokens normativos y las reglas compartidas; [.impeccable/design.json](../../../../.impeccable/design.json) conserva sus extensiones y componentes. La barra reutiliza superficies claras, tinta operativa, acciones teal, botones nativos etiquetados de al menos 44 px y foco visible. El hover final de la acción primaria usa el token existente `--cm-color-primary-hover`; no constituye una nueva paleta.

El apéndice de [design-factory-loading.md](../../design-factory-loading.md) persiste la decisión específica: escena protagonista, controles y ayuda debajo, sin cubrir el camión. A 390 px los cinco botones conservan sus etiquetas y se distribuyen en varias filas. [PRODUCT.md](../../../PRODUCT.md) aporta contexto histórico y semántica de simulación; no reemplaza el contrato de esta superficie. No hay motivo para regenerar la identidad ni convertir esta interacción local en una regla global.

## Comportamiento documentado

`camera-navigation.ts` y su test, `viewer.tsx`, `factory-player.tsx` y su CSS cubren la extensión. Los cuatro botones trasladan cámara y objetivo juntos 1 m sobre el suelo respecto a la mirada. WASD/flechas mantienen 3 m/s con foco en el canvas; diagonales normalizadas, oposiciones y limpieza de teclas evitan movimiento residual. Restablecer vista recupera el encuadre sin reiniciar carga o reloj. OrbitControls conserva giro/zoom y permite pan con botón derecho o dos dedos en fábrica; el visor ordinario mantiene su comportamiento. No se incorporan dependencias ni escrituras operativas.

## Evidencia y alcance de sus conclusiones

- [Escritorio, 1106×778](desktop.png), y [móvil, 390×844](mobile.png), inspeccionados como archivos existentes, muestran la barra bajo la escena sin recorte lateral. Usan posiciones del scroll interno, no la parte superior del documento. El finish review registra en ambos el campo PNG `impeccable:prompt` con procedencia de captura propia, Chrome/Playwright y ausencia de generación de imagen.
- Los logs acreditan [204/204 pruebas de logística](logistics.log), incluidas tres del helper de cámara, y [54/54 de operaciones](carrier-operations.log). Typecheck, arquitectura de 847 módulos/246 entradas cliente y build final con tipos/lint constan como resultados comunicados en README y finish review; no tienen log propio en esta carpeta.
- [checks.json](checks.json) registra desplazamientos de aproximadamente 1 m, teclado, foco, slider, giro/zoom/pan, reproducción, móvil y movimiento reducido, con `errors: []`. [browser-check.mjs](browser-check.mjs) conserva los asserts de reset, reloj/contador y salida al plan. El JSON es un resumen, no una traza completa de estados.
- [detector.json](detector.json) contiene `[]` de la ejecución anterior al ajuste de hover. No se atribuye al detector una segunda revisión: la confirmación posterior se apoya en los colores guardados y el CSS final.

No se comprobaron móvil físico, otros motores ni rendimiento en hardware limitado. La cámara carece de colisiones físicas y puede atravesar el escenario. Este cierre escribe únicamente este informe; no añade pruebas, capturas, cambios de producto, commit, push ni PR.
