import { z } from "zod";

import { optionalText, requiredText } from "@/lib/validation/fields";

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
    // No usamos `fullName`: el nombre del servicio puede incluir dígitos
    // (ej: "Radiografía panorámica 3D"), algo que la regex de nombre de
    // persona (NAME_RE) rechaza.
    code: requiredText({ min: 1, max: 20, label: "El código" }),
    name: requiredText({ min: 3, max: 100, label: "El nombre" }),
    type: z.enum(SERVICE_TYPE_VALUES),
    cost: z
      .number({ invalid_type_error: "El costo es obligatorio" })
      .min(0, "El costo no puede ser negativo")
      .max(999999.99, "El costo no puede superar $999,999.99")
      .refine(
        (v) => Math.round(v * 100) / 100 === v,
        "El costo admite máximo 2 decimales",
      ),
    // Mantenemos el rango int/0..600 tal cual (en vez de componer
    // `durationMinutesOptional`, que exige múltiplos de 5): endurecer esa
    // regla podría romper la edición de servicios ya guardados con una
    // duración que no sea múltiplo de 5.
    duration: z
      .number({ invalid_type_error: "Duración inválida" })
      .int("La duración debe ser un número entero de minutos")
      .min(0, "La duración no puede ser negativa")
      .max(600, "La duración no puede superar 600 minutos")
      .optional(),
    category: z.enum(SERVICE_CATEGORY_VALUES).optional(),
    description: optionalText({ max: 500 }),
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
