# `components/`

Estructura de componentes siguiendo una organización por **propósito** (similar a lo descrito en los informes):

- `components/ui/`: Design system (atómicos, primitives/shadcn, wrappers AntD). Reutilizable y sin lógica de dominio.
- `components/layout/`: Layouts de la app (shell, sidebar, headers).
- `components/app/`: “Single-instance components” / wiring global (providers, interceptores, modales globales).
- `components/features/<feature>/`: UI específica por dominio (appointments, patients, doctors, etc.).
- `components/legacy/`: Código antiguo mantenido solo por compatibilidad (no usar para desarrollo nuevo).

## Convención de imports

- Preferido (nuevo):

  - `@/components/ui/...`
  - `@/components/layout/...`
  - `@/components/app/...`
  - `@/components/features/<feature>/...`

- Compatibilidad: se mantienen alias en `tsconfig.json` para imports antiguos tipo `@/components/<feature>/...`.
