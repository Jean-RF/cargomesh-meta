# Organización: lectura de moneda y acceso documental

Corrección solicitada por Cristhian a partir del error real `value.defaultCurrency: Invalid literal value, expected USD` al abrir Organización en local.

## Causa y cambio

La organización Meta local tiene `PEN` almacenado. El mapeo del repositorio y la respuesta del servicio usaban el mismo esquema USD de los comandos de revisión; por eso GET `/api/v2/organizations/current` respondía 400. La pantalla además condicionaba todas las pestañas al éxito de esa lectura y mostraba datos ficticios de Pacific Produce al fallar.

- Se separa el esquema de **lectura del perfil**, que conserva códigos de moneda almacenados de tres letras, del esquema de **mutación**, que mantiene el contrato USD vigente. No se modifica la base ni se convierte PEN a USD.
- El editor muestra la moneda real; una organización con moneda fuera del contrato de mutación no puede guardarse como USD silenciosamente. Las reglas de ofertas, precios y reservas no cambian. Ampliar las mutaciones de perfil a otras monedas requeriría actualizar su contrato y función SQL como trabajo separado.
- La pestaña Documentos se monta independientemente de la lectura del perfil y sigue exigiendo su propio endpoint autorizado. `?tab=documents` funciona tanto al entrar como al cambiar la URL sin remontar el componente.
- Se eliminan los datos de contacto/nombre de empresa de respaldo inventados. La cabecera presenta sólo datos recibidos. La actividad usa creación y última actualización persistidas; no presenta fechas relativas ficticias ni verificación fiscal/compliance inventada.

## Comprobaciones realizadas

18 pruebas del agregado de organización, contexto, cliente de ajustes, acceso documental y componente real con un arnés de React en memoria. Cubren lectura PEN sin escrituras, rechazo de mutaciones incompatibles, aislamiento de organización, Documentos con perfil pendiente/fallido y navegación al tab después de un error. `tsc --noEmit`, arquitectura (926 módulos / 267 entradas cliente) y whitespace correctos. La revisión visual sigue pendiente de Cristhian.

HTTP real sobre la sesión local y la base Meta aislada:

| Comprobación | Resultado |
| --- | --- |
| GET Organización | 200, `defaultCurrency=PEN` conservado |
| GET biblioteca documental | 200, cinco revisiones recibidas |
| GET disponibilidad documental | 200, perfil AVAILABLE |
| Descarga privada de una revisión READY | 200, 610 bytes; SHA-256 coincide con el registrado |
| Página `/clients/organization?tab=documents` | 200 |
| GET Organización sin sesión | 401 |

Evidencia: [organizacion-documentos-2026-11-04](organizacion-documentos-2026-11-04/). No hubo escrituras de documentos o de perfil, migraciones, inferencias, cambios alojados ni despliegues. El archivo descargado no se copió a Git y no se registraron credenciales ni URL firmada.
