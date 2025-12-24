# Doctors (UI módulo)

Estructura orientada al dominio.

- `columns/`: columnas/configuración de tabla del listado.
- `DoctorsPageContent/`: contenedor del listado (tabla, acciones, paginación).
- `form/`: formulario de alta/edición (campos + componentes auxiliares).
- `detail/`: vista de detalle y modales relacionados.
- `schedule/`: piezas reutilizables del horario (filas, secciones, horas, breaks).

La API pública del módulo se expone desde `index.ts` (consumir vía `@/components/doctors`).
