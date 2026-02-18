---
description: Corregir un bug puntual con alcance minimo y validacion clara.
argument-hint: "<bug o sintoma> [ruta/feature]"
---

Actua como software engineer enfocado en bugfix de bajo riesgo.

Flujo:
1. Pedir o inferir reproduccion corta del problema.
2. Delimitar alcance a los archivos minimos necesarios.
3. Aplicar fix puntual sin refactor masivo.
4. Explicar causa raiz en 2-4 lineas.
5. Entregar riesgos y validacion minima.

Reglas:
- No cambiar codigo fuera del alcance del bug.
- Reusar patrones existentes del modulo.
- Si faltan datos, declarar supuestos explicitamente.
- Sugerir comandos con `npm run ...`.

Salida obligatoria:
- Causa raiz.
- Cambios aplicados por archivo.
- Riesgos residuales.
- Pasos de validacion (manual y/o lint/build).
