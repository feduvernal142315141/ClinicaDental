import { z } from "zod";
import {
  amountSchema,
  currencyCodeSchema,
  exchangeRateValueSchema,
  lineItemInputSchema,
  MAX_LINES,
} from "@/lib/entity/billing/schemas";
import { calcSubtotal } from "@/lib/utils/billing-currency";

/**
 * Formulario de presupuesto / recibo. Reutiliza las reglas del contrato (límites y mensajes
 * del backend) y añade las que dependen del contexto: tasa obligatoria si la moneda no es la
 * base, fechas no pasadas y descuento global ≤ subtotal.
 */

export const lineFormSchema = lineItemInputSchema;

export type LineFormValues = z.input<typeof lineFormSchema>;

interface DocumentFormOptions {
  baseCurrency: string;
  /** "YYYY-MM-DD" local de hoy. */
  today: string;
  /** Recibos: puede no haber líneas manuales si hay cargos seleccionados. */
  allowEmptyLines?: boolean;
  dateLabel: "La validez" | "El vencimiento";
}

export function makeDocumentFormSchema({ baseCurrency, today, allowEmptyLines, dateLabel }: DocumentFormOptions) {
  return z
    .object({
      patientId: z.string().min(1, "Selecciona un paciente."),
      treatmentPlanId: z.string().optional(),
      lines: z.array(lineFormSchema).max(MAX_LINES, `Un documento admite como máximo ${MAX_LINES} líneas.`),
      chargeIds: z.array(z.string()),
      discount: amountSchema({ label: "El descuento" }),
      currency: currencyCodeSchema,
      exchangeRate: exchangeRateValueSchema.optional(),
      date: z.string().optional(),
      notes: z.string().max(500, "Las notas admiten como máximo 500 caracteres.").optional(),
    })
    .superRefine((values, ctx) => {
      if (!allowEmptyLines && values.lines.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lines"], message: "Agrega al menos una línea." });
      }
      if (allowEmptyLines && values.lines.length === 0 && values.chargeIds.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lines"],
          message: "Agrega al menos una línea o selecciona un cargo.",
        });
      }
      if (values.currency !== baseCurrency && values.exchangeRate === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["exchangeRate"],
          message: `Indica la tasa: unidades de ${values.currency} por 1 ${baseCurrency}.`,
        });
      }
      if (values.date && values.date < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["date"],
          message: `${dateLabel} no puede estar en el pasado.`,
        });
      }
      const lines = values.lines.filter(
        (line) => Number.isFinite(line.quantity) && Number.isFinite(line.unitPrice),
      );
      const subtotal = calcSubtotal(lines);
      if (values.discount > subtotal + 1e-9 && values.chargeIds.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["discount"], message: "El descuento supera el subtotal." });
      }
    });
}

export type DocumentFormValues = z.infer<ReturnType<typeof makeDocumentFormSchema>>;

export function emptyLine(): LineFormValues {
  return { description: "", quantity: 1, unitPrice: 0, discount: 0 };
}
