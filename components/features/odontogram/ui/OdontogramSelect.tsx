"use client";

import type { ReactNode } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { cn } from "@/lib/utils/utils";

export interface OdontogramSelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface OdontogramSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  options: OdontogramSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Id del trigger. Necesario para que un `<label>` externo lo referencie. */
  id?: string;
  /**
   * Id del elemento que etiqueta el control. Es la vía CORRECTA de etiquetar
   * este Select: el trigger es un `<button>` de Radix y `htmlFor` no le da
   * nombre accesible de forma fiable.
   */
  "aria-labelledby"?: string;
  /** Nombre accesible literal, si no hay un `<label>` visible al que apuntar. */
  "aria-label"?: string;
  /** Id del texto de ayuda/error asociado. */
  "aria-describedby"?: string;
}

/**
 * Wrapper de Select para el módulo odontograma sobre el Select Radix
 * del barrel `@/components/ui`. Mantiene la API pública original
 * (value / onChange / options) para que los consumidores no cambien.
 *
 * Para etiquetarlo, envuélvelo en `OdontogramField` y reparte sus ids:
 * `<OdontogramField label="Estado">{(control) => <OdontogramSelect {...control} … />}</OdontogramField>`
 */
export function OdontogramSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
  style,
  id,
  "aria-labelledby": ariaLabelledBy,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: OdontogramSelectProps) {
  // Radix Select no soporta value="": con "" no muestra el placeholder
  // de forma fiable y un SelectItem con value="" lanza un error.
  const normalizedValue = value === "" ? undefined : value;
  const safeOptions = options.filter((option) => option.value !== "");

  return (
    <Select
      value={normalizedValue}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        className={cn("w-full", className)}
        style={style}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {safeOptions.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
