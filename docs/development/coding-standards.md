# Estándares de código

## TypeScript e imports

- Mantener `strict: true`; usar `unknown` y type guards en límites no confiables.
- Definir DTO y entidades en `lib/entity/*`; no duplicar interfaces de respuesta
  dentro de componentes.
- Preferir `import type` para imports exclusivamente tipados.
- Preferir alias `@/...`; usar relativos solo dentro de un módulo pequeño cuando
  mejoren legibilidad.
- No introducir `any` para silenciar errores. Si una API es inconsistente,
  normalizarla en el service o adapter y documentar la compatibilidad.
- Preservar exports públicos y barrels existentes; evitar ciclos de importación.

## React y Next.js

- Conservar el modelo de render del archivo tocado.
- Añadir `"use client"` únicamente si el archivo usa estado, efectos, eventos o
  APIs del navegador.
- Mantener layouts y metadata en servidor cuando sea posible.
- No crear Pages Router ni reemplazar route handlers por server actions de forma
  incidental.
- Leer storage y otras APIs de navegador después de montar; no durante render
  SSR.
- Limpiar timers, subscriptions y listeners en efectos.

## Componentes y UI

- Mantener páginas como composición y mover UI de dominio a
  `components/features/*`.
- Para código nuevo, empezar por `@/components/ui`, controles locales y tokens
  Bento.
- En una pantalla AntD existente, reutilizar wrappers
  `components/ui/antd/*`; no mezclar vocabularios arbitrariamente.
- No agregar código nuevo a un área legacy salvo que la tarea la toque
  explícitamente.
- Usar `lucide-react`, tokens semánticos y soporte claro/oscuro.
- Mantener copy visible en español e identificadores técnicos en inglés.

## Formularios

- Componer Zod desde `lib/validation/fields.ts`.
- Usar React Hook Form con `zodResolver` y validación `onBlur` o `onTouched`.
- Inferir el tipo desde el schema cuando sea viable.
- Usar `FormField`, `FormControl` y `FormMessage`; pasar `field.onBlur` a
  selects y controles compuestos.
- Distinguir valores vacíos de ausentes según el contrato. No transformar
  passwords.
- Mantener fechas `YYYY-MM-DD` y horas `HH:mm` en contratos existentes.

## Servicios y datos

- Mantener HTTP dentro de `lib/services/*`, adapters o route handlers.
- Reutilizar `apiInstance` y los helpers de `baseService`.
- Codificar endpoints en el service propietario, no en JSX.
- Validar explícitamente status y shape cuando el backend tenga respuestas
  históricas distintas.
- Lanzar errores normalizados desde el service; presentar feedback contextual
  desde hook o feature.
- Nunca construir nombres de columnas o filtros ad hoc si existe `lib/query/*`.

## Estado

- Usar estado local para comportamiento local.
- Usar hooks para orquestación reutilizable.
- Usar Context para dependencias globales ya modeladas.
- Usar Zustand cuando el dominio ya tenga store y acciones explícitas.
- Persistir solo lo necesario. No almacenar tokens, passwords o información
  clínica en stores nuevos sin una revisión de seguridad.

## Seguridad, permisos y privacidad

- Comprobar acciones con `usePermission` y `PermissionAction`.
- Tratar todo dato de URL, storage, JWT y API como no confiable.
- No registrar tokens, passwords, OTP, expedientes ni payloads clínicos.
- No colocar secretos en variables `NEXT_PUBLIC_*`.
- No renderizar HTML remoto sin sanitización y revisión explícita.

## Accesibilidad

- Mantener navegación por teclado, foco visible y nombres accesibles.
- Asociar errores con inputs mediante `aria-invalid` y `aria-describedby`.
- No depender solo del color para estados clínicos o de validación.
- Respetar contraste, reduced motion y tamaños de objetivo razonables.
- Verificar modales, drawers, selects buscables y tablas con teclado.

## Estilo y cambios

- Replicar formato y nombres del área antes de aplicar preferencias personales.
- Favorecer funciones pequeñas y retornos tempranos sobre anidación profunda.
- Comentar razones, invariantes y compatibilidad; no narrar código obvio.
- Mantener cambios mínimos y no mezclar refactors no solicitados.
- Actualizar documentación si cambia una frontera, contrato o procedimiento.
