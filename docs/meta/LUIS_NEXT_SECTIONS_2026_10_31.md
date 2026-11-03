# Cierre de Luis en cuatro secciones

31-oct-2026, America/Bogota. Plan acordado para trabajar una sección por prompt en `codex/meta-luis`, producto general fuera de Indie. No declara implementación de lo pendiente ni autoriza cambios en infraestructura alojada. Las llamadas aisladas de texto/fotos/ASR/explicación ya están documentadas en [la aceptación real](LUIS_LIVE_ACCEPTANCE_2026-10-30.md).

## 1. Entorno local conectado y base actualizada

Conservar y publicar los arreglos actuales; sincronizar con `main`, que ya contiene las sesiones/Passport de Juan. Preparar o recuperar un Supabase Meta local independiente, con puertos y volumen propios, migraciones pertinentes, datos sintéticos y acceso autenticado. Configurar sus valores privados sin copiar los de Amazon. No reutilizar por comodidad la DB de referencia que ocupa 64322.

Resultado para cerrar: app local conectada a la base Meta, con autenticación y APIs reales verificadas; guardar y reabrir una solicitud/manifiesto. La vista visual sin Supabase sigue siendo una demo y no acredita ese resultado.

## 2. Voz y fotos hacia el mismo borrador

Integración implementada y comprobada localmente el 31-oct: botones, subida privada, ASR/reconocimiento, propuesta revisada, aplicación al formulario, corrección, guardado y reapertura. [Aceptación y límites de la muestra](LUIS_DRAFT_MEDIA_ACCEPTANCE_2026_10_31.md). Voz humana española y fotos de carga física no se sustituyen por los archivos sintéticos utilizados en esta validación.

Consumir el reconocimiento de Axel y el servicio/contrato de adjuntos de Cristhian, sin duplicar esos módulos. Conectar evidencia autorizada y revisión al ASR de Luis y a la propuesta de Axel; acordar con Cristhian los puntos de entrada, revisión/aplicación y errores. Comprobar una grabación humana española, imágenes propias y sintéticas, correcciones posteriores y respuesta antigua descartada.

Resultado para cerrar: desde la interfaz, adjuntar o grabar, analizar, revisar y aplicar al mismo borrador; guardar y reabrir conservando las correcciones y evidencias. No inventar peso/medidas desde una foto sin escala. Las carencias del productor se registran como dependencia y no se suplanta su autoría.

## 3. Explicación conectada al Passport

Conexión implementada y comprobada localmente el 1-nov-2026 en `codex/meta-luis`: interfaz por grupo, Meta compartido, resultado validado y persistido con el writer de Juan, reintentos duraderos, aislamiento, versiones y reapertura/descarga. Una generación desde navegador con Meta real, sobre observación sintética, quedó guardada. [Aceptación, pruebas y límites](LUIS_PASSPORT_ACCEPTANCE_2026_11_01.md). Este es el punto 1 del cierre pendiente solicitado después de completar adjuntos; no se repite el entorno local ya preparado. Implementación `bb36cb2`, publicación autorizada en el mismo PR #10; sin despliegue ni validación física del worker.

Usar el adaptador autorizado de Juan integrado en main. Leer un Passport/grupo vigente, consumir sus cantidades y revisiones, generar con el cliente compartido de Meta y guardar la explicación validada por el writer de Juan. Coordinar observaciones y timecodes de Ramón sin rehacer el contador ni recalcular diferencias en IA.

Resultado para cerrar: explicación visible y persistida al reabrir el Passport; prueba con Meta real sobre datos locales autorizados. Alcance abierto/incierto mantiene guía de revisión; caída del proveedor conserva la comparación; una revisión antigua no se guarda.

## 4. Ensayo completo y entrega

Recorrer declaración, propuesta revisada, manifiesto, sesión/observación, comparación y Passport. Comprobar permisos entre organizaciones, reintentos, versiones, errores, recuperación y revisión humana. Registrar evidencia real y CI del commit publicado. Verificar saldo/vencimiento de créditos por separado: la clave funcional no acredita el grant.

Preparar el entorno Meta alojado y las variables del worker con sus responsables; desplegar únicamente cuando exista autorización concreta. Conservar el proyecto Amazon y separar producto general/candidata Indie. Actualizar el PR de continuación: el #7 ya fue fusionado y no recibe commits nuevos.

Resultado para cerrar: recorrido integrado reproducible, límites explícitos, evidencia y revisión; entorno alojado y demo solo si están autorizados y verificados. Un build local no sustituye aceptación de navegador, RLS o deploy.

## Secuencia

Un prompt por sección, en ese orden. Al cerrar cada una: describir lo implementado, pruebas realmente ejecutadas y dependencias restantes. No pasar a la siguiente por una declaración de intención ni repetir llamadas de pago ya aceptadas sin un motivo nuevo.
