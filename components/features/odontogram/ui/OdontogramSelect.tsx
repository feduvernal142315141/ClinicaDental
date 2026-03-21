"use client";

import { Select as AntdSelect } from "antd";
import type { ReactNode } from "react";

export interface OdontogramSelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface OdontogramSelectProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: OdontogramSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  allowClear?: boolean;
}

/**
 * Wrapper de Select AntD para el módulo odontograma.
 * Reemplaza Select/SelectContent/SelectItem/SelectTrigger/SelectValue de Radix.
 */
export function OdontogramSelect({
  value,
  defaultValue,
  onChange,
  options,
  placeholder,
  disabled,
  className,
  style,
  allowClear = false,
}: OdontogramSelectProps) {
  return (
    <AntdSelect
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      style={{ width: "100%", ...style }}
      allowClear={allowClear}
    />
  );
}
