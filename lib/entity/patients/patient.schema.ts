/**
 * patient.schema.ts
 *
 * Fuente canónica de verdad para validación de formularios de paciente.
 * Compone las primitivas compartidas de `@/lib/validation/fields` en vez de
 * redeclarar reglas/regex/mensajes propios. Usada por `usePatientForm`
 * (alta/edición de paciente) y por `QuickPatientModal` (alta rápida desde
 * el formulario de cita), que reutiliza este MISMO esquema para que ambos
 * flujos nunca diverjan.
 *
 * Reglas SENSIBLES / NO-BLOQUEANTES:
 *   - Nombre: `fullName` (mín. 2 caracteres, solo letras/espacios/guiones/apóstrofos).
 *   - Email: `email` (formato válido, normalizado a minúsculas).
 *   - Teléfono: `phone` (formato internacional, normalizado tipo E.164).
 *   - Fecha de nacimiento: `dateOfBirth` (requerida, pasada, no mayor a 120 años; SIN restricción de edad mínima).
 *   - Género requerido (M / F).
 *   - Dirección: `address` (opcional; cadena vacía se normaliza a `undefined`).
 *   - Convenio (agreement) opcional, por defecto true.
 */

import { z } from "zod";
import { fullName, email, phone, dateOfBirth, address } from "@/lib/validation/fields";

export const patientFormSchema = z.object({
  name: fullName,

  email,

  phone,

  dateOfBirth,

  gender: z.enum(["M", "F"], {
    message: "El género es obligatorio",
  }),

  address,

  agreement: z.boolean().optional().default(true),
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;
