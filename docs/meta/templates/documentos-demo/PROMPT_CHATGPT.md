# Copiar este prompt en ChatGPT web

Tengo adjuntas dos plantillas Markdown de CargoMesh. Genera dos archivos PDF descargables, separados, con el contenido de cada plantilla:

1. `demo-company-information.pdf`, desde `01-ficha-organizacion.md`.
2. `demo-packing-list.pdf`, desde `02-lista-empaque.md`.

Son archivos de demostración para probar un expediente documental de logística. Usa únicamente el contenido de la sección «PDF CONTENT» de cada plantilla como datos del documento. Las secciones «GENERATION NOTES» son instrucciones de composición; no las imprimas como parte del PDF.

Diseño:

- Idioma inglés. A4 vertical, márgenes de 18 mm, tipografía sans serif legible, fondo blanco y acentos petróleo/teal (`#087F8C`) y azul oscuro (`#14374D`).
- Encabezado textual CargoMesh, título del documento, referencia y revisión. No necesitas un logo externo.
- Mantén el contenido en una página por documento si sigue siendo legible. Si usas otra página, repite encabezado, aviso de demo y pie con numeración.
- Tablas con encabezados claros; evita texto recortado, columnas desbordadas o fuentes diminutas. Las referencias UUID largas pueden ir en filas independientes.
- Coloca en el encabezado y pie de cada página: **DEMO — NOT VALID FOR OFFICIAL PROCEDURES**.

Reglas sobre los datos:

- No inventes identificadores tributarios, matrículas, números de registro oficial, firmas, sellos, pólizas, datos personales, enlaces de validación o códigos QR.
- Los códigos `DEMO-ORG-001`, `DOC-DEMO-ORG-001` y `PL-DEMO-001` son referencias internas del ejemplo, no registros legales ni IDs de base de datos.
- Conserva los datos no aportados como «Not provided» y los vínculos pendientes como «Pending linkage». Nunca completes un UUID o una revisión de manifiesto por inferencia.
- Usa formatos inequívocos: fechas `2 November 2026`, horas con zona `PET (UTC−05:00)`, pesos en kg, volumen en m³ y dimensiones en cm.
- Verifica las cuentas del ejemplo: 8 + 4 = 12 pallets; 12 × 100 = 1,200 kg; 12 × 1 = 12 m³; 100 × 100 × 100 cm = 1 m³ por pallet.
- El peso indicado es bruto declarado, incluido el embalaje. El peso neto no está aportado: déjalo así.
- No añadas «verified», «approved», «certified», cobertura de seguro, aceptación del carrier o disponibilidad de transporte.
- No conviertas estos documentos en factura, certificado oficial, CMR, guía de remisión o permiso de transporte. Sus títulos y finalidad son los descritos en las plantillas.
- No añadas conteos observados, resultados de vídeo, alertas de faltantes ni correcciones de DockMind: estos documentos solo expresan lo declarado.

Antes de entregarlos, revisa que las tablas se lean y que ambos documentos compartan exactamente la misma empresa y referencia organizacional. Entrega los dos PDF y una breve lista de los campos que siguen pendientes de enlazar con CargoMesh. No afirmes que se han guardado o validado en la aplicación.
