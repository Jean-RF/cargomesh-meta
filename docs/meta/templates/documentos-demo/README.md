# Plantillas para generar los PDF de la demo

28-oct-2026. Material de demostración propuesto para el punto 4. No implementa todavía el repositorio privado, checklist o revisión documental del carrier.

**Antes de generar:** usa el [caso de prueba del formulario](../../pruebas/GUIA_USUARIO_CR01.md) y copia organización, pedido, grupos y revisión confirmada. El perfil Meta local puede llamarse «V2 ROAD tenant A», mientras estas plantillas usan «Pacific Produce Demo»: sustituye esa empresa por la de tu prueba o conserva los PDF como escenario independiente. La funcionalidad pendiente está en [criterios del punto 4](../../contracts/EXPEDIENTE_DOCUMENTAL_MVP.md).

## Uso rápido en ChatGPT web

1. Adjunta los tres archivos Markdown de esta carpeta: el prompt y las dos plantillas.
2. Pega el texto de [PROMPT_CHATGPT.md](PROMPT_CHATGPT.md).
3. Pide dos PDF separados en inglés, conservando los avisos de demo.
4. Comprueba sus datos antes de subirlos: la empresa y la carga deben coincidir con el caso que elijas en CargoMesh.

| Archivo de entrada | PDF que debe generar | Uso previsto |
| --- | --- | --- |
| [01-ficha-organizacion.md](01-ficha-organizacion.md) | `demo-company-information.pdf` | Organización → Documentos; ficha declarada reutilizable |
| [02-lista-empaque.md](02-lista-empaque.md) | `demo-packing-list.pdf` | Documentación del envío concreto |

Los datos cumplimentados forman **un escenario ficticio propuesto**, no una exportación de la base local ni del pedido PED-9509 de las pruebas. Para usar ese pedido u otro existente hay que sustituir cantidades, empresa, fechas, UUIDs y revisión por sus valores guardados. No cambiar sus IDs o datos solo para hacerlos coincidir con esta plantilla.

El ejemplo declara 12 pallets: grupo A de 8 y grupo B de 4, a 100 kg y 1 m³ por pallet. Totales: 1.200 kg y 12 m³. No contiene el conteo observado de DockMind: ese resultado procede del vídeo y se compara posteriormente, sin editar el documento original.

## Qué representan

- La ficha de organización es información aportada por la empresa; no es una constancia registral, ficha fiscal, autorización, póliza o certificado oficial.
- La lista de empaque describe la carga declarada; no constituye factura, guía fiscal, autorización de transporte o documento emitido por el carrier.
- Un archivo subido comienza por revisar. Su nombre, diseño o hash no acreditan aceptación por el carrier o verificación oficial.
- `DEMO-ORG-001` y `PL-DEMO-001` son referencias visuales de los PDF. No sustituyen UUIDs de la aplicación.
- Conservar revisiones: si la declaración cambia, generar otra revisión de la lista de empaque; no reemplazar silenciosamente el archivo utilizado anteriormente.

## Uso de plantillas externas

Para esta primera demostración usamos formularios propios de datos, sin logos, sellos o firmas de autoridades. Las referencias externas sirven para comprender campos y tipos documentales; no se copian como certificaciones emitidas:

- [Trade.gov: documentos habituales de exportación](https://www.trade.gov/common-export-documents): campos orientativos de packing list, factura y documentos de transporte. No es una lista obligatoria para el ROAD Lima–Arequipa.
- [IRU: modelo CMR 2007](https://www.iru.org/resources/iru-library/iru-cmr-model-2007): referencia para operaciones internacionales por carretera donde corresponda; no se incorpora como documento universal de CargoMesh.
- [SUNAT: tipos de guía de remisión](https://cpe.sunat.gob.pe/node/114): documentos del remitente y transportista. Esta generación de PDF no realiza su emisión oficial.

## Etapa comercial — propuesta pendiente

El usuario propone situar la evaluación documental después de la oferta. Mantener separados los actores: el carrier presenta su oferta; el cliente selecciona/autoriza; el carrier revisa lo compartido y confirma la orden mediante el flujo correspondiente. Puede necesitar consultar determinados documentos antes de cotizar, pero eso no convierte todas las exigencias posteriores en bloqueos del borrador.

Este material solo prepara archivos de ejemplo. No modifica el momento de aceptación de ofertas, los estados de Booking, los permisos de compartir o las guardas de despacho.
