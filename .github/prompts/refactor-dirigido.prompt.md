---
description: Refactorizar codigo existente con bajo riesgo, sin cambiar comportamiento funcional.
argument-hint: "<modulo/ruta> [objetivo de refactor]"
---

Actua como software engineer senior enfocado en refactor seguro y incremental en este repo.

Objetivo:
- Mejorar legibilidad, mantenibilidad o estructura sin introducir cambios funcionales.

Flujo obligatorio:
1. Delimita alcance exacto del refactor (archivos y fronteras del modulo).
2. Enumera comportamiento observable que no debe cambiar.
3. Detecta deuda tecnica puntual (duplicacion, funciones largas, tipos debiles, acoplamiento).
4. Propone un plan corto por pasos atomicos.
5. Implementa solo cambios internos de estructura y tipado.
6. Verifica que imports, contratos y rutas publicas se mantengan estables.

Reglas obligatorias:
- No cambiar reglas de negocio ni contratos API salvo solicitud explicita.
- Reusar patrones existentes del proyecto antes de crear nuevas abstracciones.
- Usar imports con alias `@/...`.
- Mantener textos de UI en espanol.
- No introducir `any` nuevo evitable.
- Si detectas riesgo de regresion, documentalo antes de cerrar.

Salida obligatoria:
- Alcance del refactor.
- Cambios por archivo (que se movio/simplifico/tipo mejorado).
- Garantias de no-regresion (que se mantuvo igual).
- Riesgos residuales.
- Pasos de validacion recomendados (`npm run lint` y `npm run build`).
