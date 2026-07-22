# Centro de dashboards Listaso

Este repositorio publica una portada para los dashboards de PM, Requerimientos, Capacidad y Customer Success.

## Fuentes acordadas

- Requerimientos: una conversación de Gmail cuyo asunto contenga `Requerimiento`, incluyendo respuestas `Re:`.
- Proyectos: Jira `LISPRO`, excluyendo requerimientos; internos por palabra `Interno` o por el catálogo de `config/internal-projects.json`.
- Tickets y SLA: Jira `LISTICKETS`; el SLA oficial es `Time to done` (`customfield_10142`).
- QA: Jira `QALT`.
- Carga laboral y horas: asignaciones, estimaciones y tiempo trabajado en Jira.
- Clasificación de clientes y condiciones de pago: Zoho, con validación de Alejandra cuando falte información.

## Actualización

`.github/workflows/refresh-data.yml` ejecuta `scripts/refresh-data.mjs` cada seis horas y también puede iniciarse manualmente. La página lee `data/live.json` sin guardar credenciales en el navegador.

Secretos requeridos para Jira: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`.

Secretos opcionales para Gmail: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`.

El repositorio es público. Por eso Gmail publica únicamente el conteo de conversaciones; no publica asuntos ni cuerpos. Zoho queda pendiente hasta definir el módulo y los campos exactos.
