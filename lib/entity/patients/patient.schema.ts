/**
 * patient.schema.ts
 *
 * Fuente canónica de verdad para validación de formularios de paciente.
 * Reglas SENSIBLES / NO-BLOQUEANTES:
 *   - Nombre mínimo 2 caracteres.
 *   - Email válido.
 *   - Teléfono tolerante: dígitos, +, espacios, guiones, paréntesis (mín 6 chars).
 *   - Fecha de nacimiento requerida, pasada, no mayor a 120 años; SIN restricción de edad mínima.
 *   - Género requerido (M / F).
 *   - Dirección opcional.
 *   - Convenio (agreement) opcional, por defecto true.
 */

import { z } from "zod";

/** Regex tolerante: admite dígitos, +, espacios, guiones y paréntesis, mín 6 caracteres. */
const PHONE_REGEX = /^[\d\s+\-()]{6,}$/;

export const patientFormSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres"),

  email: z
    .string()
    .min(1, "El correo electrónico es obligatorio")
    .email("Correo electrónico no válido"),

  phone: z
    .string()
    .min(1, "El teléfono es obligatorio")
    .regex(
      PHONE_REGEX,
      "Teléfono no válido (solo dígitos, +, espacios, guiones y paréntesis; mínimo 6 caracteres)",
    ),

  dateOfBirth: z
    .string()
    .min(1, "La fecha de nacimiento es obligatoria")
    .refine(
      (val) => {
        const d = new Date(`${val}T00:00`);
        return !Number.isNaN(d.getTime());
      },
      { message: "Fecha de nacimiento no válida" },
    )
    .refine(
      (val) => {
        const d = new Date(`${val}T00:00`);
        const today = new Date();
        // Permitir el mismo día (nacido hoy) pero no fechas futuras
        today.setHours(23, 59, 59, 999);
        return d <= today;
      },
      { message: "La fecha de nacimiento debe ser en el pasado" },
    )
    .refine(
      (val) => {
        const d = new Date(`${val}T00:00`);
        const minDate = new Date();
        minDate.setFullYear(minDate.getFullYear() - 120);
        return d >= minDate;
      },
      { message: "La fecha de nacimiento no puede ser mayor a 120 años" },
    ),

  gender: z.enum(["M", "F"], {
    message: "El género es obligatorio",
  }),

  address: z.string().optional(),

  agreement: z.boolean().optional().default(true),
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;
