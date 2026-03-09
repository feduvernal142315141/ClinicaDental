---
description: Extender, corregir o refactorizar el modulo odontograma integrado en front-clinic sin romper la frontera con el host.
argument-hint: "<objetivo o bug> [ruta/submodulo]"
---

Actua como senior frontend engineer trabajando sobre el modulo odontograma interno de `front-clinic`.

Objetivo:
- Resolver cambios dentro del odontograma manteniendo el modulo embebible, tipado y desacoplado del shell host.

Flujo obligatorio:
1. Revisar primero `lib/odontogram/*` y `components/features/odontogram/*`.
2. Identificar si el cambio pertenece a:
- UI especializada del modulo
- store/estado
- adapters/persistencia
- wrapper host de pacientes
3. Mantener la frontera del modulo:
- UI especializada en `components/features/odontogram/*`
- API publica, store y adapters en `lib/odontogram/*`
- integracion host solo en wrappers de pacientes
4. No introducir dependencias del host dentro del modulo:
- no importar `lib/services/*`
- no importar `lib/contexts/*`
- no importar routing/page shell
5. Si hace falta persistencia o sync, resolverlo via adapter.
6. Si hace falta permisos, toasts o contexto de paciente, resolverlo en el wrapper host.

Reglas obligatorias:
- No reintroducir IDs hardcodeados tipo `current-user` o `current-visit`.
- Mantener copy visible al usuario en espanol.
- Usar imports con alias `@/...`.
- No usar `components/legacy/*`.
- No convertir esto en microfrontend ni monorepo salvo instruccion explicita.
- Si cambias contratos del modulo, actualiza `lib/odontogram/index.ts`.

Validacion esperada:
- Confirmar que no queden imports host-only dentro de `lib/odontogram`.
- Confirmar que el wrapper de pacientes siga recibiendo `patientId`, `clinicId`, permisos y adapter.
- Separar claramente errores propios del modulo de errores globales preexistentes del repo.

Salida obligatoria:
- Alcance del cambio.
- Archivos tocados.
- Riesgos o compatibilidades a vigilar.
- Validacion recomendada.
