"use client";

import { Form, TimePicker, type TimePickerProps } from "antd";
import type { NamePath } from "antd/es/form/interface";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

export interface FormTimePickerProps extends Omit<
  TimePickerProps,
  "name" | "onChange" | "value"
> {
  /** Field name for form binding */
  name: NamePath;
  /** Field label */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether field is required */
  required?: boolean;
  /** Custom validation rules */
  rules?: unknown[];
  /** Help text below field */
  help?: string;
  /** Error message (external validation) */
  error?: string;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Time format (default: "HH:mm") */
  timeFormat?: string;
  /**
   * Container for the popup.
   * Useful inside modals to prevent click-through issues.
   */
  getPopupContainer?: (trigger: HTMLElement) => HTMLElement;
}

/**
 * Ant Design Form TimePicker component.
 * Wraps TimePicker with Form.Item for consistent styling.
 *
 * Stores the value as a string (e.g. "14:30") in the form,
 * converting to/from dayjs internally.
 *
 * @example
 * <FormTimePicker
 *   name="time"
 *   label="Hora"
 *   required
 *   placeholder="Seleccione hora"
 * />
 */
export function FormTimePicker({
  name,
  label,
  placeholder = "Seleccione hora",
  required = false,
  rules = [],
  help,
  error,
  disabled = false,
  loading = false,
  timeFormat = "HH:mm",
  getPopupContainer,
  ...timePickerProps
}: FormTimePickerProps) {
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
      getValueProps={(value) => ({
        value: value ? dayjs(value, timeFormat) : undefined,
      })}
      getValueFromEvent={(time: dayjs.Dayjs | null) =>
        time?.format(timeFormat) ?? undefined
      }
    >
      <TimePicker
        placeholder={placeholder}
        disabled={disabled || loading}
        format={timeFormat}
        style={{ width: "100%" }}
        size="large"
        getPopupContainer={getPopupContainer}
        needConfirm={false}
        {...timePickerProps}
      />
    </Form.Item>
  );
}
