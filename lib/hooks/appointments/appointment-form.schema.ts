import { z } from "zod";

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
 * Reemplaza las `rules` de Ant Design por validación declarativa con zod.
 */
export const appointmentFormSchema = z.object({
  patientId: z.string().min(1, "El paciente es obligatorio"),
  doctorId: z.string().min(1, "El doctor es obligatorio"),
  date: z.string().min(1, "La fecha es obligatoria"),
  time: z.string().min(1, "La hora es obligatoria"),
  duration: z
    .number({ invalid_type_error: "La duración es obligatoria" })
    .int()
    .positive("La duración es obligatoria"),
  type: z.enum(APPOINTMENT_TYPES, { message: "El tipo es obligatorio" }),
  reason: z.string().optional(),
  notes: z.string().optional(),
  serviceIds: z.array(z.string()).optional(),
  labelIds: z.array(z.string()).optional(),
});

export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;
