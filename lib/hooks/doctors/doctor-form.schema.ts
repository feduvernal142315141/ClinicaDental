import { z } from "zod";

/** Géneros admitidos por el backend. */
export const DOCTOR_GENDERS = ["male", "female", "other"] as const;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
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
    name: z
      .string()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(100, "Máximo 100 caracteres"),
    email: z
      .string()
      .min(1, "El correo es obligatorio")
      .email("Correo electrónico no válido")
      .max(100, "Máximo 100 caracteres"),
    phone: z
      .string()
      .min(7, "Mínimo 7 caracteres")
      .max(20, "Máximo 20 caracteres")
      .regex(/^[0-9+\-\s()]+$/, "Teléfono no válido"),
    licenceNumber: z
      .string()
      .min(3, "Mínimo 3 caracteres")
      .max(50, "Máximo 50 caracteres"),
    specialty: z.string().max(100, "Máximo 100 caracteres").optional(),
    gender: z.enum(DOCTOR_GENDERS, { message: "El género es obligatorio" }),
    description: z.string().optional(),
    avatarUrl: z.string().optional(),
    roleId: requireRole
      ? z.string().min(1, "El rol es obligatorio")
      : z.string().optional(),
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
