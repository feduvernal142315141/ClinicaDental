"use client";

import { Form, Select as AntSelect, SelectProps as AntSelectProps } from "antd";
import { NamePath } from "antd/es/form/interface";

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps
  extends Omit<AntSelectProps, "name" | "options"> {
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
  /** Select options */
  options: SelectOption[];
  /** Allow multiple selection */
  multiple?: boolean;
  /** Show search filter */
  showSearch?: boolean;
  /** Allow clear */
  allowClear?: boolean;
  /** Loading state */
  loading?: boolean;
}

/**
 * Ant Design Form Select component
 * Wraps Select with Form.Item for consistent styling
 *
 * @example
 * <FormSelect
 *   name="roleId"
 *   label="Rol"
 *   required
 *   options={roles.map(r => ({ value: r.id, label: r.name }))}
 *   placeholder="Seleccione un rol"
 * />
 */
export function FormSelect({
  name,
  label,
  placeholder = "Seleccione...",
  required = false,
  rules = [],
  help,
  error,
  disabled = false,
  options,
  multiple = false,
  showSearch = true,
  allowClear = true,
  loading = false,
  ...selectProps
}: FormSelectProps) {
  const defaultRules = required
    ? [{ required: true, message: `${label || "Este campo"} es requerido` }]
    : [];

  const allRules = [...defaultRules, ...rules];

  return (
    <Form.Item
      name={name}
      label={label}
      rules={allRules}
      help={error || help}
      validateStatus={error ? "error" : undefined}
    >
      <AntSelect
        placeholder={placeholder}
        disabled={disabled}
        options={options}
        mode={multiple ? "multiple" : undefined}
        showSearch={showSearch}
        allowClear={allowClear}
        loading={loading}
        filterOption={(input, option) =>
          (option?.label?.toString() ?? "")
            .toLowerCase()
            .includes(input.toLowerCase())
        }
        {...selectProps}
      />
    </Form.Item>
  );
}
