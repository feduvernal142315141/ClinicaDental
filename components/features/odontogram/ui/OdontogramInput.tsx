"use client";

import type { ChangeEvent, FocusEvent } from "react";

import { Input, Textarea } from "@/components/ui";

export interface OdontogramInputProps {
  value?: string;
  defaultValue?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  /** Acepta también handlers sin argumento (p. ej. guardar al salir del campo). */
  onBlur?: ((e: FocusEvent<HTMLInputElement>) => void) | (() => void);
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  type?: string;
  id?: string;
  style?: React.CSSProperties;
}

/**
 * Wrapper de Input para el módulo odontograma sobre el Input Bento
 * de `@/components/ui`. Mantiene la API pública original
 * (onChange con ChangeEvent para leer e.target.value).
 */
export function OdontogramInput({
  value,
  defaultValue,
  onChange,
  onBlur,
  placeholder,
  disabled,
  className,
  type,
  id,
  style,
}: OdontogramInputProps) {
  return (
    <Input
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      onBlur={onBlur}
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
 * Wrapper de TextArea para el módulo odontograma sobre el Textarea Bento
 * de `@/components/ui`.
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
    <Textarea
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
