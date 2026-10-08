/**
 * Política de contraseñas — ÚNICA fuente de verdad del front.
 *
 * Replica la regla del backend (`/auth/reset-password` y cambio de contraseña), que rechaza con
 * 400 "Contraseña nueva no válida" todo lo que no cumpla:
 *
 *   /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};:'",.<>?/\\|`~]).{14,}$/
 *
 * Detalles que importan:
 * - Minúscula y mayúscula son solo a-z y A-Z: las tildes y la "ñ" no cuentan.
 * - El carácter especial debe ser de la lista exacta: un espacio, "¡", "€" o "§" no cuentan.
 * - Un salto de línea invalida la contraseña (el `.` del backend no lo acepta).
 * - El backend no impone máximo; el front conserva 64 para acotar el campo.
 *
 * Todas las pantallas que definen una contraseña (bienvenida, restablecer, cambiar) y el
 * indicador de fortaleza consumen este módulo. No dupliques estas reglas en otro sitio.
 */

export const PASSWORD_MIN_LENGTH = 14;
export const PASSWORD_MAX_LENGTH = 64;

/** Lista exacta de caracteres especiales que reconoce el backend. */
export const PASSWORD_SPECIAL_CHARACTERS = "!@#$%^&*()_-+=[]{};:'\",.<>?/\\|`~";

const SPECIAL_CHARACTER = /[!@#$%^&*()_\-+=\[\]{};:'",.<>?/\\|`~]/;
// Construida desde string: los separadores de línea Unicode no pueden ir literales en el fuente.
const LINE_BREAK = new RegExp("[\\r\\n\\u2028\\u2029]");

export type PasswordRuleId = "length" | "lowercase" | "uppercase" | "digit" | "special";

export interface PasswordRule {
  id: PasswordRuleId;
  /** Texto del indicador de fortaleza. */
  label: string;
  /** Mensaje de error del formulario cuando falta la regla. */
  message: string;
  test: (password: string) => boolean;
}

/** Las cinco reglas, en el orden en que se muestran. */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: "length",
    label: `Entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres`,
    message: `La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres`,
    test: (password) =>
      password.length >= PASSWORD_MIN_LENGTH &&
      password.length <= PASSWORD_MAX_LENGTH &&
      !LINE_BREAK.test(password),
  },
  {
    id: "lowercase",
    label: "Una letra minúscula (a-z)",
    message: "Falta al menos una letra minúscula (a-z, sin tildes)",
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "uppercase",
    label: "Una letra mayúscula (A-Z)",
    message: "Falta al menos una letra mayúscula (A-Z, sin tildes)",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "digit",
    label: "Un número",
    message: "Falta al menos un número",
    test: (password) => /\d/.test(password),
  },
  {
    id: "special",
    label: "Un carácter especial (! @ # $ % …)",
    message: `Falta al menos un carácter especial de esta lista: ${PASSWORD_SPECIAL_CHARACTERS.split("").join(" ")}`,
    test: (password) => SPECIAL_CHARACTER.test(password),
  },
];

/** Reglas que la contraseña todavía no cumple. */
export function failedPasswordRules(password: string): PasswordRule[] {
  return PASSWORD_RULES.filter((rule) => !rule.test(password));
}

/** `true` solo si cumple las CINCO reglas (lo mismo que aceptará el backend). */
export function isPasswordValid(password: string): boolean {
  return failedPasswordRules(password).length === 0;
}

export type PasswordStrengthLevel = "weak" | "medium" | "good" | "excellent";

export interface PasswordStrength {
  met: number;
  total: number;
  /** 0 a 100, para la barra. */
  percent: number;
  level: PasswordStrengthLevel;
  label: string;
  /** Igual que `isPasswordValid`: solo así se puede enviar. */
  valid: boolean;
}

const STRENGTH_LABELS: Record<PasswordStrengthLevel, string> = {
  weak: "Débil",
  medium: "Media",
  good: "Casi lista",
  excellent: "Excelente",
};

/**
 * Fortaleza para el indicador. "Excelente" significa exactamente "cumple las cinco reglas":
 * nunca se muestra si falta alguna.
 */
export function getPasswordStrength(password: string): PasswordStrength {
  const total = PASSWORD_RULES.length;
  const met = total - failedPasswordRules(password).length;
  const level: PasswordStrengthLevel =
    met === total ? "excellent" : met === total - 1 ? "good" : met >= 3 ? "medium" : "weak";
  return {
    met,
    total,
    percent: (met / total) * 100,
    level,
    label: STRENGTH_LABELS[level],
    valid: met === total,
  };
}
