# Meta Hackathon — preparación del equipo

Nombre provisional del repositorio: `meta-hackathon`. El producto todavía no tiene nombre definitivo.

## Estado actual

- Equipo: Cristhian, Luis, Juan, Ramón y Axel.
- Idea provisional: un carrier, pendiente de precisar.
- Disponibilidad: en coordinación.
- Roles, alcance y tecnologías: pendientes.
- Reglas oficiales: pendientes de publicación o confirmación.
- Este repositorio contiene preparación y documentación; todavía no incluye una aplicación.

El repositorio se prepara para uso privado del equipo. Los accesos de colaboradores y de evaluación se configurarán según corresponda; conocer el enlace no concede acceso.

## Documento de trabajo

[Esquema del proyecto](ESQUEMA_PROYECTO.md): disponibilidad, preguntas sobre las reglas, ficha de idea y organización propuesta.

La documentación de preparación no confirma que el evento permita código previo ni que el equipo de cinco sea admitido. Cuando se conozcan las reglas, registrar su enlace, los requisitos y qué trabajo anterior se pretende reutilizar.

## Colaboración propuesta

1. Registrar una tarea concreta con responsable, resultado esperado y criterio de aceptación.
2. Crear una rama temporal por tarea: `docs/tema`, `feat/tema` o `fix/tema`.
3. Abrir un PR pequeño e indicar cómo comprobar el cambio.
4. Pedir revisión a otro integrante e integrar cuando esté listo.

Mantener una tarea principal por persona. Si cambia la disponibilidad, acordar la redistribución o el recorte de alcance.

Las revisiones son un acuerdo de trabajo; no se ha configurado protección obligatoria de la rama principal. Los checks automáticos se elegirán cuando exista código y se conozca el stack.

## Entorno y Docker

No hay comandos de instalación o ejecución todavía porque no se ha elegido el stack.

Decisión provisional: evaluar Docker al definir dependencias. Puede ser útil para una API, una base de datos y otros servicios locales que deban arrancar de forma consistente entre equipos. Si basta con una aplicación y servicios remotos, puede ser más sencillo comenzar con el runtime del proyecto y su archivo de dependencias bloqueadas.

Antes de adoptarlo, comprobar que todos puedan ejecutar el entorno en sus equipos. Elegir contenedores para desarrollo y elegir el alojamiento de la demo son decisiones distintas.

## Preparación útil para la hackatón

- Definir un solo recorrido demostrable y priorizarlo sobre funciones secundarias.
- Probar temprano la dependencia más incierta, cuando las reglas permitan desarrollar.
- Tener una versión integrada y accesible desde el inicio del desarrollo.
- Preparar datos sintéticos para repetir la demostración.
- Reservar tiempo para integración, prueba del recorrido y presentación.
- Preparar una grabación de respaldo; distinguir cualquier simulación del funcionamiento real.
- Guardar credenciales fuera del repositorio y documentar únicamente nombres de variables con valores ficticios cuando se conozcan.

El siguiente avance depende de las reglas oficiales y de la disponibilidad que ya se está coordinando.
