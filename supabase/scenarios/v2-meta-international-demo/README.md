# Catálogo internacional — Meta local

Escenario sintético explícito para `meta-cr01-validation` (API 64321 / PostgreSQL 64322), organización `QA-V2-A`. Cristhian autorizó esta adaptación el 4-nov-2026 para recuperar el catálogo en su demo local.

- 32 sedes internacionales del escenario `v2-international-client-demo`, con IDs propios de esta organización Meta.
- Las tres sedes QA existentes conservan ID, nombre, dirección y relaciones. Solo se completan sus coordenadas vacías con centros urbanos aproximados; el trigger existente incrementa su versión. No se modifican pedidos, manifiestos históricos, documentos, bookings ni sesiones.
- Resultado inicial: **35 sedes con coordenadas en 17 países**. Las dos C01 del catálogo anterior no se importan. No se crean usuarios, carriers, capacidad, precios o cobertura.
- Coordenadas aproximadas y direcciones ficticias: no identifican almacenes físicos verificados. La presentación sigue el tratamiento de datos de demo ya existente.

## Aplicación autorizada

1. Comprobar que el contenedor tenga la etiqueta `com.supabase.cli.project=meta-cr01-validation` y guardar un respaldo de `public.facilities` fuera de Git.
2. Ejecutar `seed.sql` completo con `ON_ERROR_STOP=1` en esa base local. Tiene transacción, bloqueo, guardas del tenant/filas esperadas y colisiones. Nunca sobrescribe otro tenant ni coordenadas ya editadas; un replay exacto no actualiza versiones.
3. Ejecutar `verify.sql`. Comprobar también el API autenticado `/api/v2/intake/options`: organización A ve las 35; B sigue viendo solo sus sedes.
4. Recargar el formulario de Cliente. El selector conserva sus filtros y los marcadores se muestran al seleccionar una sede; no se dibujan los 35 puntos indiscriminadamente.

`build.py` reproduce manifest/seed/verify desde el catálogo internacional revisado. No se ejecuta al iniciar la app. Estos archivos no son migraciones de producción. Una base alojada requiere identificar su organización y autorización específica; no copiar la conexión o credenciales locales a Vercel.

## Rutas y límites

Una sede visible no acredita cobertura. Sydney → Buenos Aires y el trayecto inverso siguen bloqueados como ROAD; no se dibuja una carretera a través del océano. Las conexiones terrestres requieren respuesta del proveedor y sus claves/configuración, independientemente de esta carga.

Para revertir, revisar el respaldo y las referencias creadas después de aplicar. No hay limpieza automática ni borrado en cascada de pedidos. La carga preserva sedes ajenas y admite sedes adicionales del usuario sin borrarlas.

## Resultado del 4-nov

Aplicado y repetido en Meta local: 35/35 sedes con coordenadas, 17 países; replay sin actualizar filas/versiones. Pedido/manifiesto/bookings/sesiones y sedes del otro tenant conservaron sus huellas. El API del formulario devuelve las 35 sedes al actor A; B sigue viendo solo su sede. Sydney → Buenos Aires y el trayecto inverso devuelven DISCONNECTED_NETWORKS. Sin inferencia ni llamada de rutas para esos prechecks. Revisión visual a cargo del usuario. Evidencia saneada: validation-local.json; respaldo y arneses fuera de Git en tmp/meta-catalog-20261104.

Recargar el navegador para que el formulario vuelva a consultar las opciones. El catálogo no se aplica a Vercel por hacer push: la base alojada tiene que identificarse y autorizarse por separado.
