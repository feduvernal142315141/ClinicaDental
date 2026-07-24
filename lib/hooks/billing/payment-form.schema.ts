import { z } from "zod";

export const paymentFormSchema = z.object({
  amount: z.coerce
    .number({ message: "Ingresa un monto válido" })
    .positive("El monto debe ser mayor a 0"),
  currency: z.string().min(1, "La moneda es obligatoria"),
  exchangeRate: z.coerce.number().positive().optional(),
  method: z.enum(["CASH", "CARD_POS", "TRANSFER", "ADVANCE", "OTHER"], {
    message: "Selecciona un método de pago",
  }),
  invoiceId: z.string().optional(),
  reference: z.string().max(80, "Máximo 80 caracteres").optional(),
  notes: z.string().max(500, "Máximo 500 caracteres").optional(),
  /** YYYY-MM-DDTHH:mm (input local) — se convierte a ISO al enviar */
  paidAtLocal: z.string().min(1, "La fecha es obligatoria"),
});

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;
