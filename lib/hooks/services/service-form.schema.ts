import { z } from "zod";

import {
  SERVICE_ASSISTANT_DESCRIPTION_MAX,
  hasAssistantControlCharacters,
} from "@/lib/entity/services";
import { es } from "@/lib/i18n/locales/es";
import type { TranslationKey } from "@/lib/i18n/translations";

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

type ServiceFormTranslator = (key: TranslationKey) => string;

/**
 * Esquema del formulario de servicios (RHF + zod).
 * El símbolo del odontograma se valida condicionalmente al modo elegido.
 */
export function createServiceFormSchema(t: ServiceFormTranslator) {
  return z
    .object({
      // No usamos `fullName`: el nombre del servicio puede incluir dígitos
      // (ej: "Radiografía panorámica 3D"), algo que la regex de nombre de
      // persona (NAME_RE) rechaza.
      code: z
        .string({ required_error: t("services.validation.codeRequired") })
        .trim()
        .min(1, t("services.validation.codeRequired"))
        .max(20, t("services.validation.codeMax")),
      name: z
        .string({ required_error: t("services.validation.nameRequired") })
        .trim()
        .min(3, t("services.validation.nameMin"))
        .max(100, t("services.validation.nameMax")),
      type: z.enum(SERVICE_TYPE_VALUES, {
        required_error: t("services.validation.typeRequired"),
        invalid_type_error: t("services.validation.typeRequired"),
      }),
      cost: z
        .number({
          // Campo vacío → `undefined` → required_error (antes caía en el
          // "Required" por defecto de zod, en inglés). NaN/tipo inválido →
          // invalid_type_error.
          required_error: t("services.validation.costRequired"),
          invalid_type_error: t("services.validation.costRequired"),
        })
        .min(0, t("services.validation.costNegative"))
        .max(999999.99, t("services.validation.costMax"))
        .refine(
          (v) => Math.round(v * 100) / 100 === v,
          t("services.validation.costDecimals"),
        ),
      // Mantenemos el rango int/0..600 tal cual (en vez de componer
      // `durationMinutesOptional`, que exige múltiplos de 5): endurecer esa
      // regla podría romper la edición de servicios ya guardados con una
      // duración que no sea múltiplo de 5.
      duration: z
        .number({ invalid_type_error: t("services.validation.durationInvalid") })
        .int(t("services.validation.durationInteger"))
        .min(0, t("services.validation.durationNegative"))
        .max(600, t("services.validation.durationMax"))
        .optional(),
      category: z
        .enum(SERVICE_CATEGORY_VALUES, {
          invalid_type_error: t("services.validation.categoryInvalid"),
        })
        .optional(),
      // Sin `description`: el backend no tiene ese campo (ni en Service, ni en
      // Create/UpdateServiceCommand, ni en los response models). Se tecleaba,
      // se enviaba y se perdía.
      documentationTemplateId: z.union([z.string().uuid(), z.literal("")]).optional(),
      documentSignatureRequired: z.boolean().optional(),
      odontogramEnabled: z.boolean(),
      odontogramSymbolMode: z.enum(SYMBOL_MODE_VALUES, {
        required_error: t("services.validation.symbolModeRequired"),
        invalid_type_error: t("services.validation.symbolModeRequired"),
      }),
      symbolText: z
        .string()
        .max(5, t("services.validation.symbolTextMax"))
        .optional(),
      /** base64 de una imagen recién subida (modo ASSET) */
      symbolImage: z.string().optional(),
      /** URL existente del símbolo (prefill en edición, modo ASSET) */
      symbolUrl: z.string().optional(),
      // Perfil del asistente: NO viaja en POST/PUT /services, se guarda aparte
      // con PUT /services/{id}/assistant-profile (ver use-service-form).
      assistantVisible: z.boolean(),
      assistantDescription: z
        .string()
        .refine(
          (v) => v.trim().length <= SERVICE_ASSISTANT_DESCRIPTION_MAX,
          t("services.validation.assistantDescriptionMax"),
        )
        .refine(
          (v) => !hasAssistantControlCharacters(v),
          t("services.validation.assistantDescriptionSingleLine"),
        ),
    })
    .superRefine((val, ctx) => {
      if (val.documentSignatureRequired && !val.documentationTemplateId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["documentationTemplateId"], message: t("services.documentation.requiredTemplate") });
      }
      if (!val.odontogramEnabled) return;
      if (val.odontogramSymbolMode === "TEXT" && !val.symbolText?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["symbolText"],
          message: t("services.validation.symbolTextRequired"),
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
          message: t("services.validation.symbolImageRequired"),
        });
      }
    });
}

export const serviceFormSchema = createServiceFormSchema((key) => es[key]);

export type ServiceFormValues = z.infer<
  ReturnType<typeof createServiceFormSchema>
>;
