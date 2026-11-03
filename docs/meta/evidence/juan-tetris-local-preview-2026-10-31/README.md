# Carrier local sin formulario de acceso

Petición del usuario: quitar Sign in para trabajar en localhost. Se habilita una vista del frontend en `localhost:3000` y `127.0.0.1:3000`, sólo con `NODE_ENV=development` y `CARGOMESH_LOCAL_CARRIER_PREVIEW=true`. La opción se activó en `.env.local`, ignorado por Git. Sin commit, push o PR; HEAD3810a58.

El layout carrier muestra el coordinador sin crear una identidad o membresía. El acceso `/carriers` y la URL anterior `/login?returnTo=%2Fcarriers` llevan a `/carriers/tetris`. Se omite Sign out al no existir sesión. La prueba de producción/otros hosts/opción desactivada rechaza esta facilidad. El acceso normal continúa cuando la opción no aplica.

Pruebas:14/14auth, incluida la nueva matriz de configuración/host/entorno. Navegador Chrome con contexto anónimo nuevo:60filas, sin formulario de acceso/salida o cookies de autenticación, detalle3D/recarga, enlace raíz y menú móvil correctos;0erroresJS. La API de sesiones operativas devuelve401 a ese mismo contexto. [Informe](browser-check.json), [captura directa con origen incrustado](desktop.png). Arquitectura841/245 correcta.

Esta facilidad es de presentación local. Las APIs, RLS y operaciones sobre datos conservan autenticación y permisos; no se otorga un actor ficticio ni se abre una base alojada. No se probó móvil físico o una cuenta carrier real en esta comprobación.

Build de producción con tipos/lint correcto. El guard exige desarrollo y permanece cerrado en producción aunque la opción esté configurada. `git diff --check` correcto; sin cambios en la configuración alojada.
