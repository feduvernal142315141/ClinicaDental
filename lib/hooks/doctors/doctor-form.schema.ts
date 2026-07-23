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
import {
  checkDoctorDayWithinClinic,
  CLINIC_DAY_CLOSED_MESSAGE,
  clinicRangeMessage,
} from "@/lib/utils/schedule-bounds";
import type { DaySchedule } from "@/lib/entity/schedule";
import type { ClinicSchedule, ClinicScheduleDayKey } from "@/lib/entity/settings";

/** Géneros admitidos por el backend. */
export const DOCTOR_GENDERS = ["male", "female", "other"] as const;

const isTime = (t: string) => TIME_RE.test(t);

/** Claves de día, mismo orden que `WeekSchedule` / `ClinicSchedule`. */
const SCHEDULE_DAY_KEYS: ClinicScheduleDayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

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
 *
 * `clinicSchedule` acota el horario del doctor al horario global de la
 * clínica (ver `lib/utils/schedule-bounds.ts`): un día cerrado en la clínica
 * no puede habilitarse para el doctor, y en un día abierto el rango del
 * doctor debe quedar contenido en el de la clínica. Mientras el horario de
 * la clínica no haya cargado (`clinicSchedule` es `undefined`/`null`), no se
 * acota — degradación permisiva, el backend igual valida en el submit.
 */
export function makeDoctorFormSchema(
  requireRole: boolean,
  clinicSchedule?: Partial<ClinicSchedule> | null,
) {
  const scheduleSchema = z
    .object({
      monday: daySchedule,
      tuesday: daySchedule,
      wednesday: daySchedule,
      thursday: daySchedule,
      friday: daySchedule,
      saturday: daySchedule,
      sunday: daySchedule,
    })
    .superRefine((schedule, ctx) => {
      if (!clinicSchedule) return;

      SCHEDULE_DAY_KEYS.forEach((day) => {
        const dayValue = schedule[day] as DaySchedule;
        const result = checkDoctorDayWithinClinic(
          dayValue,
          clinicSchedule[day],
        );

        if (result.code === "clinic-closed") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: CLINIC_DAY_CLOSED_MESSAGE,
            path: [day, "enabled"],
          });
        } else if (result.code === "out-of-range") {
          const message = clinicRangeMessage(result.clinicStart, result.clinicEnd);
          // Anclar el error en el campo REALMENTE fuera de rango (inicio y/o fin),
          // no siempre en "hora de fin": si el inicio es anterior a la apertura de
          // la clínica, el mensaje debe salir bajo "hora de inicio".
          if (dayValue.startTime < result.clinicStart) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message,
              path: [day, "startTime"],
            });
          }
          if (dayValue.endTime > result.clinicEnd) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message,
              path: [day, "endTime"],
            });
          }
        }
      });
    });

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
    schedule: scheduleSchema,
  });
}

export const doctorFormSchema = makeDoctorFormSchema(true);

export type DoctorFormValues = z.infer<typeof doctorFormSchema>;
