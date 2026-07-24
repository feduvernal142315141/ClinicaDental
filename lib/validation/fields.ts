/**
 * lib/validation/fields.ts
 *
 * Estándar canónico de validación 2026 para Clinic Flow 360 (front-clinic).
 *
 * Este archivo es la ÚNICA fuente de verdad para primitivas de validación zod
 * reutilizables (nombre, correo, teléfono, fechas, contraseña, etc.). Los
 * esquemas de dominio (`lib/entity/**​/*.schema.ts`) DEBEN componer estos
 * campos en lugar de re-declarar sus propias reglas/regex/mensajes.
 *
 * Basado en (2026 best practices):
 *   - HTML5 `email` (RFC 5321/5322 pragmático, no exhaustivo)
 *   - ITU-T E.164 para teléfonos internacionales
 *   - NIST SP 800-63B para políticas de contraseña
 *   - WCAG 2.2 para mensajería de error (específica, accionable, en español)
 *
 * Compatibilidad zod: este proyecto usa **zod v3** (`^3.25.76`). Por eso se
 * usa `.email()` encadenado (API v3) y NO `z.email()` (API v4). Si el
 * proyecto migra a zod v4 en el futuro, actualizar estas primitivas aquí
 * (un solo lugar) en vez de tocar cada esquema de dominio.
 *
 * Exports son nombrados y "tree-shakeable": importa solo lo que necesites.
 *
 *   import { fullName, email, phone } from "@/lib/validation/fields";
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Regex / constantes reutilizables
// ---------------------------------------------------------------------------

/** Nombres de persona: letra inicial, luego letras/marcas/espacios/apóstrofos/puntos/guiones. */
export const NAME_RE = /^\p{L}[\p{L}\p{M}\s'’.-]*$/u;

/** Fecha ISO simple `AAAA-MM-DD`. */
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Hora `HH:mm` en formato 24h. */
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Número de licencia: alfanumérico, puede incluir espacios y guiones. */
const LICENCE_RE = /^[A-Z0-9][A-Z0-9\s-]*$/;

/**
 * Normaliza un teléfono a formato E.164-friendly: recorta espacios, conserva
 * el "+" inicial si existe y elimina cualquier otro carácter no numérico.
 */
export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Teléfono válido tras normalizar: "+" inicial opcional y 7–15 dígitos.
 * Tolerante con números locales legacy (7 dígitos, 0 inicial) para no bloquear
 * la edición de registros existentes; sigue rechazando basura y longitudes fuera
 * de rango. E.164 admite hasta 15 dígitos.
 */
export const PHONE_RE = /^\+?\d{7,15}$/;

// ---------------------------------------------------------------------------
// Campos de persona / contacto
// ---------------------------------------------------------------------------

/** Nombre completo de persona. Nunca cambia mayúsculas/minúsculas del usuario. */
export const fullName = z
  .string({ required_error: "El nombre es obligatorio" })
  .trim()
  .transform((v) => v.replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(80, "El nombre no puede superar los 80 caracteres")
      .regex(NAME_RE, "Solo se permiten letras, espacios, guiones y apóstrofos"),
  );

/** Correo electrónico. Se normaliza a minúsculas (los correos no son case-sensitive). */
export const email = z
  .string({ required_error: "El correo electrónico es obligatorio" })
  .trim()
  .toLowerCase()
  .pipe(
    z
      .string()
      .min(1, "El correo electrónico es obligatorio")
      .email("Correo electrónico no válido")
      .max(254, "El correo no puede superar los 254 caracteres"),
  );

/**
 * Correo electrónico opcional: cadena vacía/solo espacios se trata como ausente.
 * Cuando hay valor, se normaliza a minúsculas y valida formato + longitud máxima.
 */
export const emailOptional = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v))
  .pipe(
    z
      .string()
      .email("Correo electrónico no válido")
      .max(254, "El correo no puede superar los 254 caracteres")
      .optional(),
  );

/** Teléfono internacional obligatorio (formato E.164 tolerante a separadores de entrada). */
export const phone = z
  .string({ required_error: "El teléfono es obligatorio" })
  .trim()
  .min(1, "El teléfono es obligatorio")
  .transform(normalizePhone)
  .pipe(
    z
      .string()
      .regex(PHONE_RE, "Teléfono no válido (revisa el número; ej: +505 8275-8275)"),
  );

/** Teléfono internacional opcional: cadena vacía se trata como ausente. */
export const phoneOptional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : normalizePhone(v)))
  .pipe(
    z
      .string()
      .regex(PHONE_RE, "Teléfono no válido (revisa el número; ej: +505 8275-8275)")
      .optional(),
  );

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

function checkDateOfBirth(val: string, ctx: z.RefinementCtx, minAge?: number) {
  const parsed = new Date(`${val}T00:00`);

  if (Number.isNaN(parsed.getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Fecha de nacimiento no válida" });
    return;
  }

  // Rechaza fechas con "rollover" (ej: 2024-02-30 -> se convierte en marzo).
  const [y, m, d] = val.split("-").map(Number);
  if (parsed.getFullYear() !== y || parsed.getMonth() !== m - 1 || parsed.getDate() !== d) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Fecha de nacimiento no válida" });
    return;
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (parsed > today) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La fecha de nacimiento debe ser en el pasado",
    });
    return;
  }

  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 120);
  if (parsed < minDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La fecha de nacimiento no puede ser mayor a 120 años",
    });
    return;
  }

  if (minAge !== undefined) {
    const ageDate = new Date(parsed);
    ageDate.setFullYear(ageDate.getFullYear() + minAge);
    if (ageDate > today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Debe ser mayor de ${minAge} años`,
      });
    }
  }
}

/** Fecha de nacimiento `AAAA-MM-DD`: obligatoria, pasada, sin restricción de edad mínima. */
export const dateOfBirth = z
  .string({ required_error: "La fecha de nacimiento es obligatoria" })
  .trim()
  .min(1, "La fecha de nacimiento es obligatoria")
  .regex(ISO_DATE, "Formato de fecha inválido (AAAA-MM-DD)")
  .superRefine((val, ctx) => checkDateOfBirth(val, ctx));

/** Fábrica: fecha de nacimiento con edad mínima (por defecto 18 años). */
export function dateOfBirthAdult(minAge = 18) {
  return z
    .string({ required_error: "La fecha de nacimiento es obligatoria" })
    .trim()
    .min(1, "La fecha de nacimiento es obligatoria")
    .regex(ISO_DATE, "Formato de fecha inválido (AAAA-MM-DD)")
    .superRefine((val, ctx) => checkDateOfBirth(val, ctx, minAge));
}

/** Hora `HH:mm` (24h), obligatoria. */
export const time = z
  .string({ required_error: "La hora es obligatoria" })
  .trim()
  .min(1, "La hora es obligatoria")
  .regex(TIME_RE, "Hora no válida (HH:mm)");

// ---------------------------------------------------------------------------
// Texto libre
// ---------------------------------------------------------------------------

/** Dirección opcional: cadena vacía se normaliza a `undefined` para no persistir "". */
export const address = z
  .string()
  .trim()
  .max(200, "La dirección no puede superar los 200 caracteres")
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

/** Número de licencia profesional ("Número de licencia" en la UI, no "colegiado"). */
export const licenceNumber = z
  .string({ required_error: "El número de licencia es obligatorio" })
  .trim()
  .toUpperCase()
  .pipe(
    z
      .string()
      .min(3, "El número de licencia debe tener al menos 3 caracteres")
      .max(50, "El número de licencia no puede superar los 50 caracteres")
      .regex(LICENCE_RE, "Número de licencia no válido (letras, números y guiones)"),
  );

// ---------------------------------------------------------------------------
// Numéricos
// ---------------------------------------------------------------------------

/**
 * Duración en minutos: entero, entre 5 y 600.
 * NO se exige múltiplo de 5 a nivel de esquema: la duración de una cita se
 * autocompleta sumando la duración de los servicios (que pueden no ser
 * múltiplos de 5) y hay datos guardados con valores arbitrarios; el paso de 5
 * es solo una ayuda de UI (`step={5}` en el input), no una regla de validación.
 */
export const durationMinutes = z.coerce
  .number({ invalid_type_error: "La duración es obligatoria", required_error: "La duración es obligatoria" })
  .int("La duración debe ser un número entero de minutos")
  .min(5, "La duración mínima es de 5 minutos")
  .max(600, "La duración no puede superar los 600 minutos");

/** Duración en minutos opcional: entero, ≤600, sin exigir mínimo ni presencia. */
export const durationMinutesOptional = z.coerce
  .number({ invalid_type_error: "La duración debe ser un número entero de minutos" })
  .int("La duración debe ser un número entero de minutos")
  .max(600, "La duración no puede superar los 600 minutos")
  .optional();

// ---------------------------------------------------------------------------
// Seguridad
// ---------------------------------------------------------------------------

/** Código OTP de 6 dígitos. */
export const otp = z
  .string({ required_error: "El código es obligatorio" })
  .trim()
  .min(1, "El código es obligatorio")
  .regex(/^\d{6}$/, "El código debe tener 6 dígitos");

/**
 * Contraseña (NIST SP 800-63B): 8-64 caracteres, con mensajes específicos
 * por clase de carácter faltante. Nunca se recorta ni normaliza el valor.
 */
export const password = z
  .string({ required_error: "La contraseña es obligatoria" })
  .min(1, "La contraseña es obligatoria")
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(64, "La contraseña no puede superar los 64 caracteres")
  .superRefine((val, ctx) => {
    if (!/[A-Z]/.test(val)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Falta al menos una letra mayúscula" });
    }
    if (!/[a-z]/.test(val)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Falta al menos una letra minúscula" });
    }
    if (!/\d/.test(val)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Falta al menos un número" });
    }
    if (!/[^A-Za-z0-9]/.test(val)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Falta al menos un carácter especial" });
    }
  });

/**
 * Agrega a un esquema `z.object` una validación cruzada de "las contraseñas
 * coinciden". Uso:
 *
 *   const schema = z.object({
 *     password: password,
 *     confirmPassword: z.string(),
 *   }).superRefine(confirmPasswordRefine("password", "confirmPassword"));
 *
 * También puede pasarse directo a `.refine()` si se prefiere esa forma:
 *
 *   const schema = baseSchema.refine(...) // no aplica aquí
 *
 * `confirmPasswordRefine` devuelve la función refine lista para usar con
 * `.superRefine()`, que añade el error en el campo `confirmKey`.
 */
export function confirmPasswordRefine<K extends string, C extends string>(
  passKey: K,
  confirmKey: C,
) {
  return (data: Record<K | C, unknown>, ctx: z.RefinementCtx) => {
    if (data[passKey] !== data[confirmKey]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [confirmKey],
        message: "Las contraseñas no coinciden",
      });
    }
  };
}

// ---------------------------------------------------------------------------
// Genéricos / fábricas
// ---------------------------------------------------------------------------

/**
 * Fábrica: id requerido (selects, referencias a entidades). `label` describe el
 * campo, ej: "El paciente". Para etiquetas femeninas pasa `message` explícito
 * (ej: `requiredId("La fecha", "La fecha es obligatoria")`) y evitar el
 * desajuste de género del "es obligatorio" por defecto (masculino).
 */
export function requiredId(label: string, message = `${label} es obligatorio`) {
  return z
    .string({ required_error: message })
    .trim()
    .min(1, message);
}

/**
 * Fábrica: texto libre requerido para campos NO-nombre (nombre/código de
 * servicio, nombre de rol, ocupación, etc.). Usa `fullName` para nombres de
 * persona en su lugar.
 */
export function requiredText({
  min = 1,
  max,
  label = "Este campo",
}: {
  min?: number;
  max?: number;
  label?: string;
}) {
  // Con min<=1 el fallo de longitud significa "vacío" → mensaje de obligatorio,
  // no "debe tener al menos 1 caracteres" (agramatical).
  const minMessage =
    min <= 1
      ? `${label} es obligatorio`
      : `${label} debe tener al menos ${min} caracteres`;

  let schema = z
    .string({ required_error: `${label} es obligatorio` })
    .trim()
    .min(min, minMessage);

  if (max !== undefined) {
    schema = schema.max(max, `${label} no puede superar los ${max} caracteres`);
  }

  return schema;
}

/** Fábrica: texto libre opcional. Cadena vacía se normaliza a `undefined`. */
export function optionalText({ max }: { max?: number } = {}) {
  let schema = z.string().trim();
  if (max !== undefined) {
    schema = schema.max(max, `Este campo no puede superar los ${max} caracteres`);
  }
  return schema.optional().transform((v) => (v === "" || v === undefined ? undefined : v));
}
