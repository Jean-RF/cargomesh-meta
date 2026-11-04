# Escenario documental local — 1 de noviembre de 2026

Solo `meta-cr01-validation`, API64321/DB64322 y frontend8080. No aplicar a una base alojada o al proyecto Amazon. Se hizo respaldo antes de las migraciones de Luis.

`seed.sql` deriva del arnés comercial existente de HAC40 y usa sus comandos nativos bajo el actor sintético autenticado. Crea request, manifiesto confirmado, recursos/calendario y evidencia simulados, ruta/plan elegible, oportunidad, oferta de USD100 y selección. No inserta un booking directamente: la autorización se ejecutó por HTTP en `cargomesh/scripts/meta-document-demo.ts`. El grant temporal de catálogo se retira antes del commit. La segunda ejecución del escenario se rechaza para conservar el caso existente.

Carga: dos grupos BOX de 8 y 4 unidades, 10 kg y 0.036 m3 por caja, 40x30x30 cm. Totales120kg/0.432m3. Recojo17-nov 08:00-18:00 PET y entrega18-nov 08:00-18:00 PET. Estos datos coinciden con la packing list aportada.

Datos adicionales explícitos del escenario (no extraídos de los PDF): no dividir el envío, piezas indivisibles y no apilables, sin requisitos especiales declarados, teléfonos de prueba y presupuesto500USD. No se infiere que la ausencia de información del PDF confirme esos hechos físicamente. Los recursos, cobertura, disponibilidad y oferta del escenario se identifican como SIMULATED.

Los archivos conservan el nombre ficticio Pacific Home Goods Demo; su organización técnica es el tenant QA A autorizado. No constituyen verificación de identidad legal de esa organización. Las referencias reales de request/manifiesto/grupos viven en CargoMesh y en el resultado adjunto. Las leyendas Pending linkage del PDF original no se editaron ni se presentan como enlaces certificados.

PDF originales en Downloads no modificados. Copias simples en output/pdf/meta-document-demo eliminan archivos incrustados y conservan página/aspecto; render píxel a píxel idéntico. Se subieron esas copias privadas y su hash se comprobó durante la descarga Carrier.

Evidencia: docs/meta/pruebas/documentos-demo-2026-11-01/result.json. Incluye request8b0fed7d-4cc3-4cc3-b819-8f68fdeefebe, manifiesto163cd0cc-a0d2-4f8e-bcde-310c689fcafd y booking654a02b7-c366-4298-8e1a-003481cbfb0a. Los dos documentos están ACCEPTED solo como revisión de demo. El booking permanece AUTHORIZED; no hay confirmación de capacidad, despacho ni transporte real.

El script es opt-in y exige META_DOCUMENT_DEMO_STATE_DIR con el archivo commercial-refs.json y sus recibos privados locales de reintento. No registra tokens, claves ni URLs firmadas. No usa IA ni cobra pagos. La revisión visual corresponde a Cristhian.
