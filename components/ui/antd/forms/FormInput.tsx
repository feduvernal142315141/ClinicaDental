"use client";

import { Form, Input, InputProps } from "antd";
import { NamePath } from "antd/es/form/interface";

export interface FormInputProps extends Omit<InputProps, "name"> {
  /** Field name for form binding */
  name: NamePath;
  /** Field label */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether field is required */
  required?: boolean;
  /** Custom validation rules */
  rules?: any[];
  /** Help text below field */
  help?: string;
  /** Error message (external validation) */
  error?: string;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Input type */
  type?: "text" | "email" | "password" | "tel" | "number";
}

/**
 * Ant Design Form Input component
 * Wraps Input with Form.Item for consistent styling
 *
 * @example
 * <FormInput
 *   name="email"
 *   label="Correo Electrónico"
 *   type="email"
 *   required
 *   placeholder="usuario@ejemplo.com"
 * />
 */
export function FormInput({
  name,
  label,
  placeholder,
  required = false,
  rules = [],
  help,
  error,
  disabled = false,
  type = "text",
  ...inputProps
}: FormInputProps) {
  const defaultRules = required
    ? [{ required: true, message: `${label || "Este campo"} es requerido` }]
    : [];

  // Add email validation if type is email
  const emailRule =
    type === "email"
      ? [{ type: "email" as const, message: "Formato de correo no válido" }]
      : [];

  const allRules = [...defaultRules, ...emailRule, ...rules];

  const InputComponent = type === "password" ? Input.Password : Input;

  return (
    <Form.Item
      name={name}
      label={label}
      rules={allRules}
      help={error || help}
      validateStatus={error ? "error" : undefined}
    >
      <InputComponent
        placeholder={placeholder}
        disabled={disabled}
        type={type === "password" ? undefined : type}
        {...inputProps}
      />
    </Form.Item>
  );
}
