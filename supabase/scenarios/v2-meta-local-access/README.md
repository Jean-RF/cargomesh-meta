# Acceso demo Carrier — Meta local

Complemento del escenario ROAD QA para `meta-cr01-validation` (API 64321, DB 64322).
No es una migración ni un aprovisionamiento de cuentas reales. No aplicar en proyectos alojados.

`seed.sql` requiere el usuario `qa-v2-a@cargomesh.test`, su operador activo y el Carrier QA ROAD exactos.
Concede únicamente `CARRIER_EDITOR` para ese Carrier, durante 14 días, si no existe ese grant.
Un operador por sí solo no permite entrar al portal: `read_v2_carrier_portal_access` también verifica el grant.

La cuenta ya existente se configura privadamente en `cargomesh/.env.local` mediante
`CARGOMESH_DEMO_CARRIER_EMAIL` y `CARGOMESH_DEMO_CARRIER_PASSWORD`; no copiar contraseñas al escenario.
La sesión y las comprobaciones de pertenencia permanecen activas.

Aplicado el 31-oct-2026 únicamente al contenedor etiquetado `meta-cr01-validation`.
Verificación HTTP: `POST /api/auth/workspace-session` con `workspace=carrier` → 200;
`GET /carriers` con esa cookie → 200 sin el componente de entrada de sesión.

Para retirar este acceso de demo, revocar el grant exacto de ese usuario/Carrier/permiso;
no borrar operadores, cuentas ni volúmenes. La expiración tampoco debe renovarse silenciosamente con cada arranque.
