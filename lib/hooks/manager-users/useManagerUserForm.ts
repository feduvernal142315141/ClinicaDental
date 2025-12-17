"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ManagerUserFormData,
  ChangePasswordFormData,
  DEFAULT_MANAGER_USER_FORM,
  validateManagerUserForm,
  validatePassword,
} from "@/lib/entity/manager-users";

interface UseManagerUserFormOptions {
  /** Initial form data (for editing) */
  initialData?: Partial<ManagerUserFormData>;
  /** Whether this is an edit form (password not required) */
  isEdit?: boolean;
}

interface UseManagerUserFormReturn {
  // Form state
  formData: ManagerUserFormData;
  errors: Record<string, string>;
  isDirty: boolean;
  isValid: boolean;

  // Field handlers
  setField: <K extends keyof ManagerUserFormData>(
    field: K,
    value: ManagerUserFormData[K]
  ) => void;
  setFields: (fields: Partial<ManagerUserFormData>) => void;

  // Form actions
  validate: () => boolean;
  reset: () => void;
  resetToInitial: () => void;
  setError: (field: string, message: string) => void;
  clearError: (field: string) => void;
  clearAllErrors: () => void;

  // Password validation
  passwordStrength: {
    isValid: boolean;
    errors: string[];
  };
}

/**
 * Hook for managing manager user form state and validation
 *
 * @example
 * const {
 *   formData,
 *   errors,
 *   setField,
 *   validate,
 *   isValid
 * } = useManagerUserForm({ isEdit: false });
 *
 * // Update field
 * setField('names', 'Juan Carlos');
 *
 * // Validate before submit
 * if (validate()) {
 *   await createUser(formData);
 * }
 */
export function useManagerUserForm(
  options: UseManagerUserFormOptions = {}
): UseManagerUserFormReturn {
  const { initialData, isEdit = false } = options;

  // Merge initial data with defaults
  const getInitialFormData = useCallback(
    (): ManagerUserFormData => ({
      ...DEFAULT_MANAGER_USER_FORM,
      ...initialData,
    }),
    [initialData]
  );

  const [formData, setFormData] = useState<ManagerUserFormData>(
    getInitialFormData()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [initialFormData] = useState<ManagerUserFormData>(getInitialFormData());

  /**
   * Password strength validation
   */
  const passwordStrength = formData.password
    ? validatePassword(formData.password)
    : { isValid: true, errors: [] };

  /**
   * Check if form is valid (no errors)
   */
  const isValid = Object.keys(errors).length === 0;

  /**
   * Set a single field value
   */
  const setField = useCallback(
    <K extends keyof ManagerUserFormData>(
      field: K,
      value: ManagerUserFormData[K]
    ) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);

      // Clear error when field is modified
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    },
    []
  );

  /**
   * Set multiple field values at once
   */
  const setFields = useCallback((fields: Partial<ManagerUserFormData>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
    setIsDirty(true);

    // Clear errors for modified fields
    setErrors((prev) => {
      const newErrors = { ...prev };
      Object.keys(fields).forEach((field) => {
        delete newErrors[field];
      });
      return newErrors;
    });
  }, []);

  /**
   * Validate the entire form
   */
  const validate = useCallback((): boolean => {
    const validation = validateManagerUserForm({
      names: formData.names,
      identificationNumber: formData.identificationNumber,
      email: formData.email,
      financialInstitutions: formData.financialInstitutions,
      password: isEdit ? undefined : formData.password,
    });

    // Additional validations
    const additionalErrors: Record<string, string> = {};

    // Check required fields
    if (!formData.identificationTypeId) {
      additionalErrors.identificationTypeId =
        "Debe seleccionar un tipo de identificación";
    }

    if (!formData.roleId) {
      additionalErrors.roleId = "Debe seleccionar un rol";
    }

    // Password confirmation (for new users or when changing password)
    if (
      formData.password &&
      formData.confirmPassword &&
      formData.password !== formData.confirmPassword
    ) {
      additionalErrors.confirmPassword = "Las contraseñas no coinciden";
    }

    // Password strength (for new users or when changing password)
    if (!isEdit && formData.password && !passwordStrength.isValid) {
      additionalErrors.password =
        passwordStrength.errors[0] || "Contraseña no válida";
    }

    const allErrors = { ...validation.errors, ...additionalErrors };
    setErrors(allErrors);

    return Object.keys(allErrors).length === 0;
  }, [formData, isEdit, passwordStrength]);

  /**
   * Reset form to empty defaults
   */
  const reset = useCallback(() => {
    setFormData(DEFAULT_MANAGER_USER_FORM);
    setErrors({});
    setIsDirty(false);
  }, []);

  /**
   * Reset form to initial data
   */
  const resetToInitial = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
    setIsDirty(false);
  }, [initialFormData]);

  /**
   * Set error for a specific field
   */
  const setError = useCallback((field: string, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  /**
   * Clear error for a specific field
   */
  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Reset form when initial data changes
  useEffect(() => {
    if (initialData) {
      setFormData(getInitialFormData());
      setIsDirty(false);
    }
  }, [initialData, getInitialFormData]);

  return {
    // Form state
    formData,
    errors,
    isDirty,
    isValid,

    // Field handlers
    setField,
    setFields,

    // Form actions
    validate,
    reset,
    resetToInitial,
    setError,
    clearError,
    clearAllErrors,

    // Password validation
    passwordStrength,
  };
}

// ============================================
// CHANGE PASSWORD FORM HOOK
// ============================================

interface UseChangePasswordFormReturn {
  formData: ChangePasswordFormData;
  errors: Record<string, string>;
  isValid: boolean;
  passwordStrength: { isValid: boolean; errors: string[] };
  setField: <K extends keyof ChangePasswordFormData>(
    field: K,
    value: string
  ) => void;
  validate: () => boolean;
  reset: () => void;
}

/**
 * Hook for managing change password form
 */
export function useChangePasswordForm(): UseChangePasswordFormReturn {
  const [formData, setFormData] = useState<ChangePasswordFormData>({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const passwordStrength = formData.newPassword
    ? validatePassword(formData.newPassword)
    : { isValid: true, errors: [] };

  const isValid = Object.keys(errors).length === 0;

  const setField = useCallback(
    <K extends keyof ChangePasswordFormData>(field: K, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    },
    []
  );

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.oldPassword) {
      newErrors.oldPassword = "Ingrese su contraseña actual";
    }

    if (!formData.newPassword) {
      newErrors.newPassword = "Ingrese la nueva contraseña";
    } else if (!passwordStrength.isValid) {
      newErrors.newPassword = passwordStrength.errors[0];
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirme la nueva contraseña";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, passwordStrength]);

  const reset = useCallback(() => {
    setFormData({
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setErrors({});
  }, []);

  return {
    formData,
    errors,
    isValid,
    passwordStrength,
    setField,
    validate,
    reset,
  };
}
