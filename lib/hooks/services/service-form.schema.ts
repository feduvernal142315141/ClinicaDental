import { z } from "zod";

/**
 * Tuplas espejo de los uniones del entity (lib/entity/services). zod necesita
 * tuplas literales; el `z.infer` resultante coincide exactamente con
 * ServiceType / OdontogramSymbolMode / ServiceCategory.
 */
export const SERVICE_TYPE_VALUES = [
  "TREATMENT",
  "PROCEDURE",
  "PRODUCT",
  "ADVANCE",
] as const;

export const SYMBOL_MODE_VALUES = ["NONE", "TEXT", "ASSET", "MANUAL"] as const;

export const SERVICE_CATEGORY_VALUES = [
  "DIAGNOSTICO",
  "PREVENTIVO",
  "RESTAURADOR",
  "ENDODONCIA",
  "PERIODONCIA",
  "PROTESIS",
  "IMPLANTE",
  "CIRUGIA",
  "ORTODONCIA",
  "ESTETICO",
  "GENERAL",
] as const;

/**
 * Esquema del formulario de servicios (RHF + zod).
 * El símbolo del odontograma se valida condicionalmente al modo elegido.
 */
export const serviceFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "El código es obligatorio")
      .max(20, "El código debe tener máximo 20 caracteres"),
    name: z
      .string()
      .trim()
      .min(1, "El nombre es obligatorio")
      .min(3, "El nombre debe tener mínimo 3 caracteres")
      .max(100, "El nombre debe tener máximo 100 caracteres"),
    type: z.enum(SERVICE_TYPE_VALUES),
    cost: z
      .number({ invalid_type_error: "El costo es obligatorio" })
      .min(0, "El costo no puede ser negativo"),
    duration: z
      .number({ invalid_type_error: "Duración inválida" })
      .int("La duración debe ser un número entero de minutos")
      .min(0, "La duración no puede ser negativa")
      .max(600, "La duración no puede superar 600 minutos")
      .optional(),
    category: z.enum(SERVICE_CATEGORY_VALUES).optional(),
    description: z
      .string()
      .max(500, "La descripción debe tener máximo 500 caracteres")
      .optional(),
    odontogramEnabled: z.boolean(),
    odontogramSymbolMode: z.enum(SYMBOL_MODE_VALUES),
    symbolText: z
      .string()
      .max(5, "Máximo 5 caracteres")
      .optional(),
    /** base64 de una imagen recién subida (modo ASSET) */
    symbolImage: z.string().optional(),
    /** URL existente del símbolo (prefill en edición, modo ASSET) */
    symbolUrl: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.odontogramEnabled) return;
    if (val.odontogramSymbolMode === "TEXT" && !val.symbolText?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["symbolText"],
        message: "El texto del símbolo es obligatorio",
      });
    }
    if (
      val.odontogramSymbolMode === "ASSET" &&
      !val.symbolImage &&
      !val.symbolUrl
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["symbolImage"],
        message: "Debe subir una imagen para el símbolo",
      });
    }
  });

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;
