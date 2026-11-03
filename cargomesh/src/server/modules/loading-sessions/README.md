# Sesiones de carga — Juan

`dashboard-reader.ts` implementa el lector: recibe actor de autenticación del servidor y repositorio inyectado que consulta por organización/sesión. Valida payload, organización/sesión y sede concedida; rechaza fixtures en la vía conectada. Sin adapter Supabase o endpoint. Los comandos persistentes de abrir/cerrar siguen pendientes.

Estados y transiciones se acuerdan antes del código: sesión abierta, análisis en proceso, lista para revisión y cierre humano. Estados de job son independientes del cierre. Un clip parcial no cierra automáticamente una operación ni confirma una entrega.

Produce contexto para el dashboard y jobs; consume manifiesto y evidencias. Preservar versión esperada e idempotencia. Un callback repetido u obsoleto no debe sobrescribir resultados nuevos. Las rutas Hono solo delegan en el servicio tras autenticar actor y alcance.
