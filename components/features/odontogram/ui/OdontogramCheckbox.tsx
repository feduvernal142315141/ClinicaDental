"use client";

import { useId } from "react";
import type { ReactNode } from "react";

import { Checkbox } from "@/components/ui";
import { cn } from "@/lib/utils/utils";

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
 * Wrapper de Checkbox para el módulo odontograma sobre el Checkbox Radix
 * de `@/components/ui`. El Checkbox Radix renderiza un <button>, así que
 * la etiqueta usa htmlFor + id para que el click en el texto togglee.
 * Normaliza "indeterminate" a false en onChange(checked: boolean).
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
  const autoId = useId();
  const checkboxId = id ?? autoId;

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Checkbox
        id={checkboxId}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={(state) => onChange?.(state === true)}
        disabled={disabled}
      />
      {children != null && (
        <label
          htmlFor={checkboxId}
          className={cn(
            "cursor-pointer select-none text-sm text-ink",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          {children}
        </label>
      )}
    </span>
  );
}
