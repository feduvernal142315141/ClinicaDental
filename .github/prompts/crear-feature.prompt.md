---
description: Crear una feature completa (page + component + hook + service) alineada a la arquitectura de front-clinic.
argumentHint: "<feature> <ruta-base> [objetivo]"
---

Actua como senior software engineer en este repo.

Objetivo:
- Crear o extender una feature completa respetando arquitectura y convenciones locales.

Flujo obligatorio:
1. Detecta la feature y la ruta objetivo a partir del input.
2. Identifica archivos existentes relacionados antes de proponer cambios.
3. Propone estructura de archivos exacta (page, component, hook, service, entity/barrel si aplica).
4. Implementa con patrones del repo:
- Pages en `app/(authenticated)`.
- UI de dominio en `components/features/<feature>`.
- Hooks en `lib/hooks/<feature>`.
- Servicios en `lib/services/<feature>` usando `serviceGet/servicePost/servicePut/serviceDelete`.
- Tipos en `lib/entity/*`.
5. Reutiliza wrappers existentes (`components/ui/antd`, hooks y utilidades existentes).
6. No usar `components/legacy/*` ni `components/features/auth/**/dist/*`.
7. Entrega checklist de validacion final.

Checklist final requerido:
- Imports con alias `@/...`.
- Sin `any` nuevo evitable.
- Manejo de errores consistente.
- Comandos sugeridos con `npm run ...`.
