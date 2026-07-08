import { z } from "zod";

import { CLINIC_SCHEDULE_DAYS } from "@/lib/entity/settings";

/**
 * Esquema del formulario de Opciones Generales (RHF + zod).
 *
 * Fuente canónica de verdad para la validación del form. Mantiene las mismas
 * reglas que el form legacy de AntD (ver general-settings.tsx anterior),
 * incluyendo la validación cruzada de horarios (día habilitado requiere
 * apertura/cierre coherentes) y de `reminderTime` (requerido sólo si
 * `sendReminders` está activo), ahora expresadas de forma declarativa.
 *
 * Nota: `startTime`/`endTime` viajan como string ("" = sin definir) dentro
 * del form porque el control `TimeField` es controlado por string, no por
 * `string | null`; la conversión a `null` para días deshabilitados ocurre al
 * construir el payload de guardado (ver use-general-settings-form.ts).
 */

const scheduleDaySchema = z.object({
  enabled: z.boolean(),
  startTime: z.string().optional().default(""),
  endTime: z.string().optional().default(""),
});

const scheduleSchema = z.object({
  monday: scheduleDaySchema,
  tuesday: scheduleDaySchema,
  wednesday: scheduleDaySchema,
  thursday: scheduleDaySchema,
  friday: scheduleDaySchema,
  saturday: scheduleDaySchema,
  sunday: scheduleDaySchema,
});

export const generalSettingsFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(120, "El nombre debe tener máximo 120 caracteres"),
    address: z
      .string()
      .max(255, "La dirección debe tener máximo 255 caracteres")
      .nullable()
      .optional(),
    phone: z
      .string()
      .max(30, "El teléfono debe tener máximo 30 caracteres")
      .nullable()
      .optional(),
    timezone: z.string().min(1, "La zona horaria es requerida"),
    currency: z.string().min(1, "La moneda es requerida"),
    logoUrl: z.string().nullable().optional(),
    schedule: scheduleSchema,
    // minimumAdvanceNoticePeriod y cancellationLimitPerMonth eran opcionales
    // en el form legacy (sin regla "required" en antd); se preserva ese
    // comportamiento con `.optional()`.
    minimumAdvanceNoticePeriod: z
      .number({ invalid_type_error: "Debe ser mayor o igual a 0" })
      .min(0, "Debe ser mayor o igual a 0")
      .optional(),
    standardAppointmentDuration: z
      .number({ invalid_type_error: "La duración estándar es requerida" })
      .min(1, "Debe ser mayor que 0"),
    cancellationLimitPerMonth: z
      .number({ invalid_type_error: "Debe ser mayor o igual a 0" })
      .min(0, "Debe ser mayor o igual a 0")
      .optional(),
    allowOnlineReservations: z.boolean(),
    requireConfirmation: z.boolean(),
    sendReminders: z.boolean(),
    // Sólo requerido cuando sendReminders=true (validado en superRefine); por
    // eso aquí es opcional y con invalid_type_error suave.
    reminderTime: z
      .number({ invalid_type_error: "El tiempo de recordatorio es requerido" })
      .optional(),
  })
  .superRefine((values, ctx) => {
    for (const { key, label } of CLINIC_SCHEDULE_DAYS) {
      const day = values.schedule[key];
      if (!day.enabled) continue;

      if (!day.startTime || !day.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["schedule", key, "startTime"],
          message: `${label}: debe indicar hora de apertura y cierre.`,
        });
        continue;
      }

      if (day.startTime >= day.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["schedule", key, "startTime"],
          message: `${label}: la apertura debe ser menor que el cierre.`,
        });
      }
    }

    if (values.sendReminders) {
      if (values.reminderTime === undefined || values.reminderTime === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reminderTime"],
          message: "El tiempo de recordatorio es requerido",
        });
      } else if (values.reminderTime < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reminderTime"],
          message: "Debe ser mayor que 0",
        });
      }
    }
  });

export type GeneralSettingsFormValues = z.infer<typeof generalSettingsFormSchema>;
