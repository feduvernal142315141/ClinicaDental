import { z } from "zod";
import {
  ISO_DATE,
  durationMinutes,
  optionalText,
  requiredId,
  time,
} from "@/lib/validation/fields";

/** Tipos de cita admitidos (espejo de AppointmentType del backend). */
export const APPOINTMENT_TYPES = [
  "consultation",
  "control",
  "emergency",
  "follow_up",
  "routine",
] as const;

/**
 * Esquema de validación del formulario de citas.
 * Compone las primitivas compartidas de `@/lib/validation/fields` en lugar
 * de re-declarar sus propias reglas.
 */
export const appointmentFormSchema = z.object({
  patientId: requiredId("El paciente"),
  doctorId: requiredId("El doctor"),
  date: requiredId("La fecha", "La fecha es obligatoria").regex(
    ISO_DATE,
    "Formato de fecha inválido (AAAA-MM-DD)",
  ),
  time,
  duration: durationMinutes,
  type: z.enum(APPOINTMENT_TYPES, { message: "El tipo es obligatorio" }),
  reason: optionalText({ max: 1000 }),
  notes: optionalText({ max: 1000 }),
  serviceIds: z.array(z.string()).optional(),
  labelIds: z.array(z.string()).optional(),
});

export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;
