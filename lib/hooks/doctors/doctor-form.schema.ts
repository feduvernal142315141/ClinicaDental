import { z } from "zod";
import {
  TIME_RE,
  fullName,
  email,
  phone,
  licenceNumber,
  optionalText,
  requiredId,
} from "@/lib/validation/fields";

/** Géneros admitidos por el backend. */
export const DOCTOR_GENDERS = ["male", "female", "other"] as const;

const isTime = (t: string) => TIME_RE.test(t);

/**
 * Día del horario. Cuando está habilitado, exige horas válidas con inicio < fin
 * y un descanso coherente. (El antd original no validaba esto — mejora.)
 */
const daySchedule = z
  .object({
    enabled: z.boolean(),
    startTime: z.string(),
    endTime: z.string(),
    breakStart: z.string(),
    breakEnd: z.string(),
  })
  .superRefine((d, ctx) => {
    if (!d.enabled) return;
    if (!isTime(d.startTime) || !isTime(d.endTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Horario inválido",
        path: ["endTime"],
      });
      return;
    }
    if (d.startTime >= d.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La hora de inicio debe ser anterior a la de fin",
        path: ["endTime"],
      });
    }
    if (isTime(d.breakStart) && isTime(d.breakEnd) && d.breakStart >= d.breakEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El descanso es inválido",
        path: ["breakEnd"],
      });
    }
  });

/**
 * Esquema del formulario de doctor (alta/edición). Espeja las reglas antd.
 * `requireRole` permite relajar `roleId` cuando la sección Acceso no se muestra
 * (p. ej. en "Mi perfil", donde el formulario se monta con showRoleStatusFields=false).
 * NOTA: el formulario NO captura contraseña (la fija el flujo OTP del doctor).
 */
export function makeDoctorFormSchema(requireRole: boolean) {
  return z.object({
    name: fullName,
    email: email,
    phone: phone,
    licenceNumber: licenceNumber,
    specialty: optionalText({ max: 100 }),
    gender: z.enum(DOCTOR_GENDERS, { message: "El género es obligatorio" }),
    description: optionalText({ max: 1000 }),
    avatarUrl: z.string().optional(),
    roleId: requireRole ? requiredId("El rol") : z.string().optional(),
    active: z.boolean(),
    schedule: z.object({
      monday: daySchedule,
      tuesday: daySchedule,
      wednesday: daySchedule,
      thursday: daySchedule,
      friday: daySchedule,
      saturday: daySchedule,
      sunday: daySchedule,
    }),
  });
}

export const doctorFormSchema = makeDoctorFormSchema(true);

export type DoctorFormValues = z.infer<typeof doctorFormSchema>;
