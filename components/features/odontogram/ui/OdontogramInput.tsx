"use client";

import { Input as AntdInput } from "antd";
import type { ChangeEvent } from "react";

const { TextArea: AntdTextArea } = AntdInput;

export interface OdontogramInputProps {
  value?: string;
  defaultValue?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  type?: string;
  id?: string;
  style?: React.CSSProperties;
}

/**
 * Wrapper de Input AntD para el módulo odontograma.
 */
export function OdontogramInput({
  value,
  defaultValue,
  onChange,
  placeholder,
  disabled,
  className,
  type,
  id,
  style,
}: OdontogramInputProps) {
  return (
    <AntdInput
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      type={type}
      id={id}
      style={style}
    />
  );
}

export interface OdontogramTextAreaProps {
  value?: string;
  defaultValue?: string;
  onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  rows?: number;
  id?: string;
}

/**
 * Wrapper de TextArea AntD para el módulo odontograma.
 */
export function OdontogramTextArea({
  value,
  defaultValue,
  onChange,
  placeholder,
  disabled,
  className,
  rows = 3,
  id,
}: OdontogramTextAreaProps) {
  return (
    <AntdTextArea
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      rows={rows}
      id={id}
    />
  );
}
