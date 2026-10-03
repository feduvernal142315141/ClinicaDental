"use client";

import { AlertTriangle } from "lucide-react";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Textarea } from "@/components/ui";
import type { DocumentForm } from "@/lib/hooks/billing/use-document-form";
import { discountPercentOfGross } from "@/lib/utils/billing-currency";
import { localTodayInput } from "@/lib/datetime";
import { NumberInput } from "./NumberInput";

interface DocumentFooterFieldsProps {
  form: DocumentForm;
  canDiscount: boolean;
  isAdmin: boolean;
  maxDiscountPercent?: number;
  dateLabel: string;
  /** Monto bruto de líneas que no están en el formulario (cargos seleccionados). */
  extraGross?: number;
  disableAmounts?: boolean;
}

/** Descuento global, fecha (validez o vencimiento) y notas. */
export function DocumentFooterFields({
  form,
  canDiscount,
  isAdmin,
  maxDiscountPercent,
  dateLabel,
  extraGross = 0,
  disableAmounts,
}: DocumentFooterFieldsProps) {
  const lines = form.watch("lines");
  const discount = Number(form.watch("discount")) || 0;
  const percent = discountPercentOfGross(
    [
      ...lines.map((line) => ({
        quantity: Number(line.quantity) || 0,
        unitPrice: Number(line.unitPrice) || 0,
        discount: Number(line.discount) || 0,
      })),
      ...(extraGross > 0 ? [{ quantity: 1, unitPrice: extraGross }] : []),
    ],
    discount,
  );
  const overCap = !isAdmin && maxDiscountPercent !== undefined && percent > maxDiscountPercent;
  const notesLength = (form.watch("notes") ?? "").length;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {canDiscount && (
        <FormField
          control={form.control}
          name="discount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descuento global</FormLabel>
              <FormControl>
                <NumberInput {...field} min={0} disabled={disableAmounts} />
              </FormControl>
              {overCap && (
                <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  El descuento total ({percent}%) supera el máximo permitido ({maxDiscountPercent}%).
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <FormField
        control={form.control}
        name="date"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{dateLabel}</FormLabel>
            <FormControl>
              <Input type="date" {...field} value={field.value ?? ""} min={localTodayInput()} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Notas</FormLabel>
            <FormControl>
              <Textarea {...field} value={field.value ?? ""} rows={2} maxLength={500} placeholder="Opcional" />
            </FormControl>
            <div className="flex justify-between gap-2">
              <FormMessage />
              <span className="ml-auto text-xs tabular-nums text-subtle">{notesLength}/500</span>
            </div>
          </FormItem>
        )}
      />
    </div>
  );
}
