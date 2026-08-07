"use client";

import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BadgePercent } from "lucide-react";
import { Modal } from "@/components/ui/primitives/custom";
import { Button } from "@/components/ui/primitives/shadcn/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@/components/ui/atomic/forms";
import type { TreatmentPlanItem, UpdatePlanItemRequest } from "@/lib/entity/odontogram";
import {
  formatClinicCurrencyExact,
  getClinicCurrencySymbol,
} from "@/lib/utils/clinic-regional-format";

/** Cifra con hasta dos decimales, con coma o punto. */
const AMOUNT_RE = /^\d{1,9}([.,]\d{1,2})?$/;

const MAX_REASON_LENGTH = 200;

function parseAmount(raw: string): number {
  return Number(raw.trim().replace(",", "."));
}

/**
 * Importe BRUTO de la línea: lo que costaría sin descuento.
 * Es el tope del descuento y el número contra el que se compara en el diálogo.
 */
function grossAmount(item: TreatmentPlanItem): number {
  return (item.unitCost ?? 0) * Math.max(item.quantity ?? 1, 0);
}

/**
 * Reglas del descuento. Dos vienen del servidor y una es un tope propio:
 *
 * - Motivo OBLIGATORIO en cuanto el importe pasa de 0 — el backend responde 422
 *   sin él (`UpdateTreatmentPlanItemCommandValidator`). Se comprueba aquí para
 *   que el aviso salga junto al campo vacío y no como un toast rojo después de
 *   escribir la cifra.
 * - Nada de descuentos negativos: también los rechaza el servidor.
 * - El tope al importe de la línea es NUESTRO. El servidor no lo valida: su
 *   `lineTotal()` recorta el resultado a cero, así que un descuento de 500 sobre
 *   una línea de 300 se guarda entero y la fila acaba mostrando «Descuento
 *   500,00» sobre un importe de 0,00 — una rebaja de 200 que nadie concedió, en
 *   un documento que el paciente firma.
 */
function buildDiscountSchema(maxAmount: number, maxAmountLabel: string) {
  return z
    .object({
      amount: z
        .string()
        .trim()
        .min(1, "Indica el importe del descuento. Escribe 0 para quitarlo."),
      reason: z
        .string()
        .trim()
        .max(
          MAX_REASON_LENGTH,
          `El motivo no puede pasar de ${MAX_REASON_LENGTH} caracteres.`,
        ),
    })
    .superRefine((values, ctx) => {
      if (!AMOUNT_RE.test(values.amount)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amount"],
          message:
            "Escribe solo cifras, con dos decimales como mucho (por ejemplo 25,50).",
        });
        return;
      }
      if (parseAmount(values.amount) > maxAmount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amount"],
          message: `El descuento no puede superar el importe de la línea (${maxAmountLabel}).`,
        });
      }
      if (parseAmount(values.amount) > 0 && values.reason.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reason"],
          message:
            "Indica el motivo: un descuento sin justificar no se puede defender ante el paciente.",
        });
      }
    });
}

type DiscountFormValues = { amount: string; reason: string };

interface PlanItemDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: TreatmentPlanItem;
  /** Moneda congelada del plan. Aquí NO se convierte nada (ADR-32). */
  currency: string;
  /** PATCH null-aware. `false` si falló (ya avisado) o si se descartó. */
  onSubmit: (changes: UpdatePlanItemRequest) => Promise<boolean>;
}

/**
 * PlanItemDiscountDialog
 *
 * Aplica, cambia o quita el descuento de UNA línea del plan.
 *
 * Manda solo `discountAmount` y `discountReason`: el PATCH es null-aware y
 * cualquier otro campo que viajara aquí sobrescribiría lo que hubiera. El
 * importe final NO se calcula en el cliente — se manda el descuento y se relee
 * el `lineTotal` que devuelva el servidor.
 *
 * Escribir 0 quita el descuento y limpia el motivo (`""`, que el servidor sí
 * escribe; omitirlo dejaría colgado el motivo de un descuento que ya no existe).
 */
export function PlanItemDiscountDialog({
  open,
  onOpenChange,
  item,
  currency,
  onSubmit,
}: PlanItemDiscountDialogProps) {
  const gross = grossAmount(item);
  const grossLabel = formatClinicCurrencyExact(gross, currency);

  const schema = useMemo(
    () => buildDiscountSchema(gross, grossLabel),
    [gross, grossLabel],
  );

  const form = useForm<DiscountFormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      amount: String(item.discountAmount ?? 0),
      reason: item.discountReason ?? "",
    },
  });

  const wasOpenRef = useRef(false);

  // El diálogo se monta una vez por fila y se reutiliza en cada apertura: sin
  // esto, corregir un descuento después de haberlo cancelado partiría de los
  // valores tecleados la vez anterior en lugar de los guardados.
  //
  // Solo en la transición cerrado→abierto. Cualquier mutación de la tabla
  // recarga las líneas y cambiaría la identidad de `item`; hacer `reset` ahí
  // borraría de golpe el importe y el motivo a medio escribir.
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      form.reset({
        amount: String(item.discountAmount ?? 0),
        reason: item.discountReason ?? "",
      });
    }
    wasOpenRef.current = open;
  }, [open, item.discountAmount, item.discountReason, form]);

  const submit = form.handleSubmit(async (values) => {
    const amount = parseAmount(values.amount);
    const saved = await onSubmit({
      discountAmount: amount,
      // Con 0 se manda "" a propósito: es la única forma de borrar el motivo
      // anterior (el servidor solo escribe los campos que llegan no nulos).
      discountReason: amount > 0 ? values.reason : "",
    });
    if (saved) onOpenChange(false);
  });

  const submitting = form.formState.isSubmitting;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      icon={<BadgePercent className="h-5 w-5" />}
      title="Aplicar descuento"
      description={`${item.serviceName} · importe de la línea ${grossLabel}`}
    >
      <Form {...form}>
        <form onSubmit={submit} noValidate className="flex flex-col">
          <div className="space-y-4 px-6 pb-6">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Importe del descuento</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-subtle"
                      >
                        {getClinicCurrencySymbol(currency)}
                      </span>
                      {/* `inputMode="decimal"` y NO `type="number"`: el teclado
                          numérico sale igual, pero sin las flechas que cambian
                          la cifra con la rueda del ratón por encima del campo. */}
                      <Input
                        {...field}
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="0"
                        disabled={submitting}
                        className="pl-9 tabular-nums"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Se resta del importe de la línea. Escribe 0 para quitar el
                    descuento.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      maxLength={MAX_REASON_LENGTH}
                      autoComplete="off"
                      placeholder="Ej: convenio de la empresa"
                      disabled={submitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Obligatorio si el descuento es mayor que 0. Se guarda con la
                    línea y aparece bajo el servicio en el presupuesto.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-hairline px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando…" : "Guardar descuento"}
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  );
}
