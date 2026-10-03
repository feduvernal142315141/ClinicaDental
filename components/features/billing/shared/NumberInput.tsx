"use client";

import { forwardRef } from "react";
import { Input } from "@/components/ui";

interface NumberInputProps
  extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: number | undefined | null;
  onChange: (value: number | undefined) => void;
  /** Decimales permitidos (montos: 2, tasas: 8). */
  decimals?: number;
}

/**
 * Input numérico para react-hook-form: "" → `undefined` (nunca NaN), coma o punto decimal.
 * La validación de decimales la hace el schema (con el mensaje del backend).
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { value, onChange, decimals = 2, ...props },
  ref,
) {
  return (
    <Input
      {...props}
      ref={ref}
      type="number"
      inputMode="decimal"
      step={decimals === 0 ? 1 : 1 / 10 ** decimals}
      value={value ?? ""}
      onChange={(event) => {
        const raw = event.target.value.replace(",", ".");
        if (raw === "") return onChange(undefined);
        const parsed = Number(raw);
        onChange(Number.isFinite(parsed) ? parsed : undefined);
      }}
      className={["tabular-nums", props.className].filter(Boolean).join(" ")}
    />
  );
});
