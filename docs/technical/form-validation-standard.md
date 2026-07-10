# Estándar de validación de formularios (front-clinic)

**Fuente de verdad (código):** `lib/validation/fields.ts`
**Regla operativa (Claude Code):** `.claude/rules/form-validation.md`
**Relacionado:** memoria `clinic-flow-360-form-ux-standard` (UX: floating
labels, 3 estados, WCAG 2.2), `.claude/rules/frontend-bento.md`.

## Por qué existe

Antes de este estándar, cada formulario de dominio (`patient.schema.ts`,
`doctor-form.schema.ts`, `appointment-form.schema.ts`, `service-form.schema.ts`...)
re-declaraba sus propias reglas de nombre, correo, teléfono, fecha y
contraseña — con regex y mensajes ligeramente distintos entre pantallas.
`lib/validation/fields.ts` centraliza esas reglas en primitivas `zod`
componibles, de forma que:

- El comportamiento de validación es idéntico en toda la app (un paciente
  ve el mismo mensaje de error de correo en su ficha que un doctor en la
  suya).
- Un cambio de política (ej. subir el mínimo de contraseña) se hace en un
  solo archivo.
- Los mensajes están pre-redactados en español, específicos y accionables
  (requisito WCAG 2.2 — ver más abajo).

Nota de compatibilidad: el proyecto usa **zod v3** (`^3.25.76`), por eso las
primitivas usan `.email()` encadenado (API v3) y no `z.email()` (API v4).

## Tabla de campos

| Campo | Regla | Límites | Justificación |
|---|---|---|---|
| `fullName` | `trim` → colapsa espacios repetidos → valida | 2–80 caracteres, `\p{L}` Unicode + espacios/`'`/`.`/`-` | Nombres de persona reales usan letras acentuadas, apóstrofos (`O'Brien`), guiones compuestos y abreviaturas con punto; la clase Unicode `\p{L}` evita rechazar nombres no latinos. Nunca fuerza mayúsculas/minúsculas — el nombre de una persona no se "corrige". |
| `email` | `trim` → `toLowerCase()` → valida formato | máx 254 caracteres | Los correos no son case-sensitive en la práctica (RFC 5321 lo permite pero ningún proveedor real lo usa) — normalizar a minúsculas evita duplicados lógicos. 254 es el límite práctico de RFC 5321 (`local@domain` completo). |
| `phone` / `phoneOptional` | `trim` → `normalizePhone` (conserva `+` inicial, descarta separadores) → regex `PHONE_RE` | **7–15 dígitos**, prefijo `+` opcional, se permite `0` inicial | ITU-T **E.164** admite hasta 15 dígitos; el mínimo 7 y el `0` inicial permitido lo hacen **tolerante con números locales/legacy** para no bloquear la edición de registros existentes (decisión de producto), sin dejar de rechazar basura y longitudes fuera de rango. `phoneOptional` trata `""` como ausente para no persistir cadenas vacías. |
| `dateOfBirth` | `AAAA-MM-DD` (`ISO_DATE`) + `superRefine`: fecha real (rechaza rollover, ej. `2024-02-30`), no futura, ≤120 años | — | Mantiene el contrato de fecha del backend (`YYYY-MM-DD`) y evita datos imposibles sin acoplarse a reglas de negocio de edad mínima. |
| `dateOfBirthAdult(minAge = 18)` | `dateOfBirth` + edad mínima configurable | `minAge` por defecto 18 | Fábrica para formularios que exigen mayoría de edad (ej. alta de doctor) sin duplicar la lógica de fecha. |
| `address` | `trim`, opcional, `""` → `undefined` | máx 200 caracteres | Evita persistir cadenas vacías como si fueran un valor real; 200 caracteres cubre direcciones largas sin abrir la puerta a payloads arbitrarios. |
| `licenceNumber` | `trim` → `toUpperCase()` → valida | 3–50 caracteres, alfanumérico + espacios/guiones | Los números de licencia profesional se citan en mayúsculas en documentos oficiales; normalizar evita que `"mp-1234"` y `"MP-1234"` se traten como valores distintos. |
| `durationMinutes` / `durationMinutesOptional` | `z.coerce.number()` entero | 5–600 min (la variante opcional omite el mínimo de 5) | 600 min (10h) es un tope razonable contra errores de tipeo. **NO se exige múltiplo de 5** a nivel de esquema: la duración de una cita se autocompleta sumando la duración de los servicios (que pueden no ser múltiplos de 5) y hay datos guardados arbitrarios; el paso de 5 es solo `step={5}` en el input (ayuda de UI). |
| `otp` | `trim`, regex `^\d{6}$` | exactamente 6 dígitos | Contrato del backend de OTP (ver `API_CONTRACT.md`, flujo JWT+OTP). |
| `password` | `min(8)`, `max(64)`, `superRefine` por clase de carácter (mayúscula, minúscula, número, especial) con un mensaje por clase faltante | 8–64 caracteres | **NIST SP 800-63B**: recomienda mínimo 8 y permitir hasta 64+ sin imponer reglas de composición arbitrarias de más; aquí se mantiene un mínimo de composición pero con mensajes específicos por clase faltante (no un genérico "contraseña inválida") — cumple WCAG 2.2 3.3.3. Nunca se recorta (`trim`) ni se transforma el valor: un espacio en una contraseña es intencional. |
| `confirmPasswordRefine(passKey, confirmKey)` | `superRefine` de nivel objeto que compara dos claves | — | Reutilizable en cualquier formulario con "confirmar contraseña" (registro, reset, cambio de contraseña) sin repetir el `refine`. |
| `requiredId(label)` | Fábrica: `trim`, `min(1)` | — | Para selects/relaciones a otra entidad (`patientId`, `doctorId`, `roleId`...). El `label` arma el mensaje: `requiredId("El paciente")` → `"El paciente es obligatorio"`. |
| `requiredText({ min, max, label })` | Fábrica: `trim`, `min`, `max` opcional | `min` por defecto 1 | Para texto libre obligatorio que **no** es nombre de persona (nombre de servicio, rol, ocupación, motivo de cita truncado, etc.). |
| `optionalText({ max })` | Fábrica: `trim`, `max` opcional, `""` → `undefined` | — | Texto libre opcional (notas, descripciones) sin persistir cadenas vacías. |

Mensajes de error viven junto a cada regla (no en un catálogo aparte) para
que el `zodResolver` los entregue directo a `FormMessage` sin mapeo
intermedio.

## Cómo agregar validación a un formulario nuevo

1. **Compón el schema de dominio desde las primitivas.** En
   `lib/entity/<dominio>/*.schema.ts` o `lib/hooks/<dominio>/*-form.schema.ts`:

   ```ts
   import { z } from "zod";
   import {
     fullName,
     email,
     phone,
     requiredId,
     optionalText,
   } from "@/lib/validation/fields";

   export const patientFormSchema = z.object({
     fullName,
     email,
     phone,
     doctorId: requiredId("El doctor"),
     notes: optionalText({ max: 500 }),
   });

   export type PatientFormValues = z.infer<typeof patientFormSchema>;
   ```

   Si el campo necesita una regla que no existe todavía (ej. un nuevo tipo
   de identificador nacional), agrégala a `lib/validation/fields.ts` como
   una primitiva o fábrica nueva — no la declares inline en el schema de
   dominio.

2. **Conecta el schema con `zodResolver` y `mode: "onBlur"` (o `"onTouched"`).**

   ```ts
   const form = useForm<PatientFormValues>({
     resolver: zodResolver(patientFormSchema),
     mode: "onBlur",
     defaultValues: { ... },
   });
   ```

3. **Renderiza con `FormField` + `FormControl` + `FormMessage`** de
   `components/ui/atomic/forms` (o el patrón ya usado en el dominio
   vecino). Esto resuelve automáticamente `aria-invalid` +
   `aria-describedby` y el estado visual de 3 pasos (neutro/éxito/error).

   Para selects, usa `Select`/`MultiSelect` de `components/ui/controls/*` y
   **pasa siempre `onBlur={field.onBlur}`** al control — es lo que dispara
   la limpieza del error al elegir una opción y evita el falso "obligatorio"
   mientras el usuario busca en un `Select` `searchable`.

4. **Verifica** con el skill `verify-front` (tsc, build, lint de los
   archivos tocados) antes de dar el formulario por terminado.

## Seguimientos conocidos (pendientes, no bloqueantes)

- **Migrar los formularios de auth que aún no usan RHF+zod**: `login`,
  `forgot-password`, `validate-otp` (bajo `app/(auth)/*` o equivalente en
  `lib/auth/`) y `RescheduleModal` de citas. Deben recomponerse con
  `react-hook-form` + `zodResolver` usando las primitivas de
  `lib/validation/fields.ts` (`email`, `password`, `otp`, `requiredId`,
  etc.) en vez de su validación ad-hoc actual.
- **Ya migrados (parcial, campos que mapean al estándar):** `StartConsultationNowModal`
  (`doctorId` → `requiredId`), `general-settings-form.schema` (`name` →
  `requiredText`), `useTemplateForm` (`name`/`body` → `requiredText`),
  `useCampaignForm` y `LabelFormModal` (`name` → `requiredText`). Sus campos
  domain-specific (archivo base64, color hex, mensaje, teléfono nullable de
  clínica) se dejaron con reglas locales a propósito (no mapean a una primitiva).
- **Eliminar archivos AntD muertos de doctores**:
  `components/features/doctors/form/fields/SecurityFields.tsx` y
  `components/features/doctors/form/fields/RoleStatusFields.tsx` quedaron
  sin uso tras la migración del formulario de doctor a RHF+zod con los
  controles Bento — solo se re-exportan desde
  `components/features/doctors/index.ts` (líneas 14-15) pero ningún
  componente los importa ni renderiza (`DoctorForm.tsx` solo usa la prop
  booleana `showRoleStatusFields`, no el componente `RoleStatusFields`).
  Borrar ambos archivos y sus dos líneas de export en el barrel como parte
  de la limpieza de deuda antd (ver memoria
  `clinic-flow-360-antd-migration-status`).
