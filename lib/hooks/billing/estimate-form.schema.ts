import { z } from "zod";

const lineItemSchema = z.object({
  serviceId: z.string().optional(),
  description: z.string().min(1, "La descripción es obligatoria").max(200),
  toothRef: z.string().max(10).optional(),
  quantity: z.coerce
    .number({ message: "Cantidad inválida" })
    .positive("La cantidad debe ser mayor a 0"),
  unitPrice: z.coerce
    .number({ message: "Precio inválido" })
    .min(0, "El precio no puede ser negativo"),
  discount: z.coerce.number().min(0).optional().default(0),
});

export const estimateFormSchema = z.object({
  patientId: z.string().min(1, "El paciente es obligatorio"),
  treatmentPlanId: z.string().optional(),
  currency: z.string().min(1, "La moneda es obligatoria"),
  exchangeRate: z.coerce.number().positive().optional().default(1),
  discount: z.coerce.number().min(0).optional().default(0),
  validUntil: z.string().optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(["DRAFT", "SENT"]).default("DRAFT"),
  items: z
    .array(lineItemSchema)
    .min(1, "Agrega al menos un ítem al presupuesto"),
});

export type EstimateFormValues = z.infer<typeof estimateFormSchema>;
export type EstimateLineItemValues = z.infer<typeof lineItemSchema>;
