---
description: Generar o ajustar capa entity + service + hook + barrel para una feature existente o nueva.
argument-hint: "<feature> [operacion]"
---

Actua como software engineer orientado a arquitectura por capas de este proyecto.

Tareas:
1. Revisar tipos existentes en `lib/entity` y ampliar solo lo necesario.
2. Implementar/ajustar servicio en `lib/services/<feature>`.
3. Implementar/ajustar hook en `lib/hooks/<feature>`.
4. Actualizar barrel exports donde corresponda.

Reglas obligatorias:
- En servicios, usar `serviceGet/servicePost/servicePut/serviceDelete`.
- En hooks, usar manejo de errores con `App.useApp().message`.
- Tipar request/response con tipos de `lib/entity`.
- Mantener nombres y patrones ya usados en el repo.
- No introducir `any` nuevo salvo justificacion tecnica explicita.

Salida esperada:
- Lista de archivos tocados.
- Resumen corto de contrato de tipos.
- Validacion rapida (que probar manualmente y comando `npm run lint`).
