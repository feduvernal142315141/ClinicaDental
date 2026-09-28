import { z } from "zod";
import { requiredText } from "@/lib/validation/fields";

const conditionSchema = z.object({
  field: z.string().min(1, "El campo es obligatorio"),
  operator: z.string().min(1, "El operador es obligatorio"),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.union([z.string(), z.number()])),
  ]),
});

export const growthSegmentFormSchema = z.object({
  name: requiredText({ min: 3, max: 100, label: "El nombre" }),
  description: z
    .string()
    .trim()
    .max(500, "La descripción no puede superar los 500 caracteres")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  conditions: z
    .array(conditionSchema)
    .min(1, "Debe agregar al menos una condición"),
});

export type GrowthSegmentFormValues = z.infer<typeof growthSegmentFormSchema>;
