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
 *
 * `providerTypeIds` es el conjunto de `id`s del catálogo de tipos de usuario
 * (`GET /user-types`) con `attendsAppointments=true` (ver
 * `deriveProviderUserTypeIds` en `lib/entity/userType`) — reemplaza la
 * comparación contra la lista fija `CLINICAL_USER_TYPES`: la especialidad
 * solo es obligatoria si el tipo elegido pertenece a ese conjunto. Mientras
 * el catálogo no haya cargado (`providerTypeIds` es `undefined`), no se exige
 * (degradación permisiva, igual que `clinicSchedule`).
 */
export function makeDoctorFormSchema(
  requireRole: boolean,
  clinicSchedule?: Partial<ClinicSchedule> | null,
  providerTypeIds?: Set<string>,
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

  return z
    .object({
      name: fullName,
      email: email,
      phone: phone,
      // Requerido para TODOS los tipos de usuario (número de identificación,
      // no licencia profesional): el backend lo exige sin distinción de
      // tipo, así que no se relaja aquí para no divergir del contrato.
      licenceNumber: licenceNumber,
      specialty: optionalText({ max: 100 }),
      gender: z.enum(DOCTOR_GENDERS, { message: "El género es obligatorio" }),
      // Tipo de usuario (profesión/cargo): ORTOGONAL al Rol (permisos).
      // FK al catálogo gestionable (`GET /user-types`), no un código fijo.
      userTypeId: requiredId("El tipo de usuario"),
      description: optionalText({ max: 1000 }),
      avatarUrl: z.string().optional(),
      roleId: requireRole ? requiredId("El rol") : z.string().optional(),
      active: z.boolean(),
      schedule: scheduleSchema,
    })
    .superRefine((values, ctx) => {
      // La especialidad solo es obligatoria para tipos de usuario que
      // atienden citas (`attendsAppointments=true` en el catálogo); para el
      // resto queda opcional. `providerTypeIds` ausente (catálogo aún sin
      // cargar) ⇒ no se exige, el backend igual valida en el submit.
      if (
        providerTypeIds?.has(values.userTypeId) &&
        !values.specialty
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La especialidad es obligatoria para personal clínico",
          path: ["specialty"],
        });
      }
    });
}

export const doctorFormSchema = makeDoctorFormSchema(true);

export type DoctorFormValues = z.infer<typeof doctorFormSchema>;
