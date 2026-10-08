import { z } from "zod";
import { requiredText } from "@/lib/validation/fields";
import { SEGMENT_MAX_CONDITIONS } from "@/lib/entity/growth";

/**
 * The value is checked against the field catalog of the audience when saving
 * (`buildSegmentConditions`): its type depends on the field and the operator.
 */
const conditionSchema = z.object({
  field: z.string().min(1, "El campo es obligatorio"),
  operator: z.string().min(1, "El operador es obligatorio"),
  value: z
    .union([
      z.string(),
      z.number(),
      z.boolean(),
      z.array(z.union([z.string(), z.number()])),
    ])
    .optional(),
});

export const growthSegmentFormSchema = z.object({
  audience: z.enum(["PATIENT", "LEAD"]),
  name: requiredText({ min: 3, max: 100, label: "El nombre" }),
  description: z
    .string()
    .trim()
    .max(500, "La descripción no puede superar los 500 caracteres")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  conditions: z
    .array(conditionSchema)
    .min(1, "Debe agregar al menos una condición")
    .max(SEGMENT_MAX_CONDITIONS, `Un segmento admite hasta ${SEGMENT_MAX_CONDITIONS} condiciones`),
});

export type GrowthSegmentFormValues = z.infer<typeof growthSegmentFormSchema>;
