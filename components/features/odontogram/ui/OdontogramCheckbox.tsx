"use client";

import { Checkbox as AntdCheckbox } from "antd";
import type { ReactNode } from "react";

export interface OdontogramCheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
  id?: string;
}

/**
 * Wrapper de Checkbox AntD para el módulo odontograma.
 * Reemplaza Checkbox de Radix manteniendo API compatible.
 */
export function OdontogramCheckbox({
  checked,
  defaultChecked,
  onChange,
  disabled,
  children,
  className,
  id,
}: OdontogramCheckboxProps) {
  return (
    <AntdCheckbox
      checked={checked}
      defaultChecked={defaultChecked}
      onChange={(e) => onChange?.(e.target.checked)}
      disabled={disabled}
      className={className}
      id={id}
    >
      {children}
    </AntdCheckbox>
  );
}
