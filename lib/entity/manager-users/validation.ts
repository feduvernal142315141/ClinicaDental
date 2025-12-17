/**
 * Password validation rules based on API requirements
 */
export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 20,
  requireNumber: true,
  requireLowercase: true,
  requireUppercase: true,
  requireSpecialChar: true,
  specialChars: "!@#&()–{}:;',?/*~$^+=<>",
} as const;

/**
 * Password validation regex pattern
 * - 8-20 characters
 * - At least 1 number
 * - At least 1 lowercase letter
 * - At least 1 uppercase letter
 * - At least 1 special character
 */
export const PASSWORD_REGEX =
  /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#&()\–{}\:;',\?\/\*~\$\^\+=<>]).{8,20}$/;

/**
 * Email validation regex pattern
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validates password against all rules
 * @param password Password to validate
 * @returns Object with isValid flag and array of error messages
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(
      `La contraseña debe tener al menos ${PASSWORD_RULES.minLength} caracteres`
    );
  }

  if (password.length > PASSWORD_RULES.maxLength) {
    errors.push(
      `La contraseña no debe exceder ${PASSWORD_RULES.maxLength} caracteres`
    );
  }

  if (!/[0-9]/.test(password)) {
    errors.push("La contraseña debe contener al menos un número");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("La contraseña debe contener al menos una letra minúscula");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("La contraseña debe contener al menos una letra mayúscula");
  }

  if (!/[!@#&()\–{}\:;',\?\/\*~\$\^\+=<>]/.test(password)) {
    errors.push(
      `La contraseña debe contener al menos un carácter especial (${PASSWORD_RULES.specialChars})`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates email format
 * @param email Email to validate
 * @returns true if valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Validates required fields for manager user creation
 * @param data Form data to validate
 * @returns Object with isValid flag and errors object
 */
export function validateManagerUserForm(data: {
  names: string;
  identificationNumber: string;
  email: string;
  financialInstitutions: string[];
  password?: string;
}): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!data.names || data.names.trim() === "") {
    errors.names = "Los nombres no pueden estar vacíos";
  }

  if (!data.identificationNumber || data.identificationNumber.trim() === "") {
    errors.identificationNumber =
      "El número de identificación no puede estar vacío";
  }

  if (!data.email || data.email.trim() === "") {
    errors.email = "El correo electrónico no puede estar vacío";
  } else if (!validateEmail(data.email)) {
    errors.email = "Formato de correo electrónico no válido";
  }

  if (!data.financialInstitutions || data.financialInstitutions.length === 0) {
    errors.financialInstitutions =
      "Debe seleccionar al menos una entidad financiera";
  }

  if (data.password !== undefined) {
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors[0];
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * User status options for select fields
 */
export const USER_STATUS_OPTIONS = [
  { value: true, label: "Activo" },
  { value: false, label: "Inactivo" },
] as const;

/**
 * Default form values for creating a new manager user
 */
export const DEFAULT_MANAGER_USER_FORM = {
  identificationTypeId: "",
  identificationNumber: "",
  names: "",
  surnames: "",
  email: "",
  cellphone: "",
  password: "",
  confirmPassword: "",
  roleId: "",
  financialInstitutions: [] as string[],
  active: true,
};
