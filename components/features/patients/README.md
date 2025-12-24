# Patients (UI módulo)

Estructura orientada al dominio (inspirada en el patrón tipo `deposits/`).

- `PatientsPageContent/`: listado y controles de la página (tabla, búsqueda, acciones).
- `detail/`: vista de detalle y su page-client.
- `form/`: formulario y page-clients de alta/edición.
- `views/`: vistas auxiliares del módulo.

La API pública se expone desde `index.ts` (consumir vía `@/components/patients`).
