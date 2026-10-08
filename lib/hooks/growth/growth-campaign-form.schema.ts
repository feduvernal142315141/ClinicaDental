import { z } from "zod";
import { requiredText, requiredId } from "@/lib/validation/fields";

const CAMPAIGN_TYPES = [
  "REACTIVATION",
  "NO_SHOW",
  "CANCELLED_WITHOUT_RESCHEDULE",
  "PROMOTION",
  "SERVICE_SPECIFIC",
  "BIRTHDAY",
  "MANUAL",
  "FOLLOW_UP",
] as const;

export const growthCampaignFormSchema = z.object({
  name: requiredText({ min: 3, max: 100, label: "El nombre" }),
  description: z
    .string()
    .trim()
    .max(500, "La descripción no puede superar los 500 caracteres")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  campaignType: z.enum(CAMPAIGN_TYPES, {
    required_error: "El tipo de campaña es obligatorio",
  }),
  segmentId: requiredId("El segmento"),
  templateId: requiredId("La plantilla", "La plantilla es obligatoria"),
  /** ISO 8601 instant string for scheduling (optional — set here, used by /schedule endpoint) */
  scheduledAt: z
    .string()
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export type GrowthCampaignFormValues = z.infer<typeof growthCampaignFormSchema>;
