"use client";

import { Form, Switch as AntSwitch, SwitchProps as AntSwitchProps } from "antd";
import { NamePath } from "antd/es/form/interface";

export interface FormSwitchProps extends Omit<AntSwitchProps, "name"> {
  /** Field name for form binding */
  name: NamePath;
  /** Field label */
  label?: string;
  /** Help text below field */
  help?: string;
  /** Error message (external validation) */
  error?: string;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Text when checked */
  checkedText?: string;
  /** Text when unchecked */
  uncheckedText?: string;
}

/**
 * Ant Design Form Switch component
 * Wraps Switch with Form.Item for consistent styling
 *
 * @example
 * <FormSwitch
 *   name="active"
 *   label="Estado"
 *   checkedText="Activo"
 *   uncheckedText="Inactivo"
 * />
 */
export function FormSwitch({
  name,
  label,
  help,
  error,
  disabled = false,
  checkedText,
  uncheckedText,
  ...switchProps
}: FormSwitchProps) {
  return (
    <Form.Item
      name={name}
      label={label}
      valuePropName="checked"
      help={error || help}
      validateStatus={error ? "error" : undefined}
    >
      <AntSwitch
        disabled={disabled}
        checkedChildren={checkedText}
        unCheckedChildren={uncheckedText}
        {...switchProps}
      />
    </Form.Item>
  );
}
