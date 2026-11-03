# Registro de trabajo de Axel

Actualizado el 29 de octubre de 2026 tras la aceptación real de texto.

La autoridad activa es AGENTS.md y docs/meta/prompts/ del repositorio Chujutak2024/meta-hackathon. Rama fija: **codex/meta-axel**. Base compartida y target de PR: **main de este repositorio Meta**, según la organización ya publicada. No usar el main de Amazon ni publicar la antigua meta-main local.

| Historia | Dueño | Rama | Commit del incremento | Estado |
| --- | --- | --- | --- | --- |
| AX-00 | Axel, asistido por Codex | codex/meta-axel | 3d1c8fe | Contrato/fixtures implementados y probados; revisión humana pendiente |
| AX-01 | Axel, asistido por Codex | codex/meta-axel | 93d34c6 | Adaptador/chat implementados; aceptación real de texto PASS el 29 de octubre; revisión humana/UI pendiente |
| AX-02 | Axel, asistido por Codex | codex/meta-axel | Incremento de esta entrega; SHA exacto en el historial Git del archivo | Adaptador de fotos/etiquetas/transcripción y cuatro casos reales Meta PASS sobre inputs sintéticos; conexión CR/UI, ASR real y revisión pendientes |
| Registro de la rama | Axel, asistido por Codex | codex/meta-axel | fe78b15 | Rama solicitada por el usuario; publicación autorizada |

## Sincronización de publicación

La rama remota ya existía en 3e24965, sobre main@6f70f50, con la estructura y los prompts del equipo. Se reaplicaron únicamente los commits de IA aún no publicados sobre esa rama, conservando toda su historia, instrucciones, backlog, SQL y trabajo ajeno. No se hizo force-push ni merge a main.

Las versiones originales locales (94d0f05 y d16b77b) permanecen como antecedentes de las pruebas y en la copia de seguridad local; no son los SHA del incremento remoto. Los SHA de arriba identifican su reaplicación. El código de aplicación de AX-00/01 se comparó contra el original local y no tiene diferencias semánticas.

La llamada real de texto pasó con muse-spark-1.3; véase [evidencia del 29 de octubre](AX01_LIVE_ACCEPTANCE_2026-10-29.md). No se acredita revisión humana, aceptación visual, despliegue ni infraestructura. Voz/explicación/entorno conservan el dueño y alcance de los prompts activos.

El incremento multimodal autorizado tiene [implementación y evidencia AX-02](AX02_MULTIMODAL.md), con imágenes de demo rotuladas y prompts conservados. No convierte los módulos pendientes de upload/manifiesto/video en funcionalidad implementada.

Antes de publicar AX-02 se verificó que PR #4 ya integró el incremento anterior en main (`a5c2a4d`). La rama local se adelantó a ese merge sin diferencias de contenido, sin reescritura y sin repetir el merge remoto. Un nuevo incremento no se considera integrado por el PR anterior. No se publican archivos de entorno privados.
