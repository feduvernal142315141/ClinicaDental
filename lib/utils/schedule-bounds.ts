/**
 * Schedule bounds — doctor schedule acotado por el horario de la clínica.
 *
 * Módulo puro (sin React, sin UI): única fuente de la regla de comparación
 * entre el horario específico de un doctor y el horario global de la
 * clínica. Consumido por el schema zod del formulario de doctor y por la
 * UI (fila de horario por día) para no duplicar la lógica en dos lugares.
 *
 * Regla (ver contrato de alineación front/back):
 * 1. Día cerrado en la clínica (enabled === false) → el doctor no puede
 *    tener ese día enabled=true.
 * 2. En un día abierto, el rango del doctor [startTime,endTime] debe estar
 *    contenido (bordes inclusive) en [clinic.startTime, clinic.endTime].
 * 3. El break del doctor ya se valida por separado (start < breakStart <
 *    breakEnd < end); por transitividad queda dentro de la clínica, no se
 *    revalida aquí.
 *
 * Degradación permisiva: si la clínica no tiene ese día, o lo tiene abierto
 * pero con horas ausentes/ inválidas, esta función NO acota (paridad con
 * `AppointmentSchedulePolicyService.resolveEffectiveSchedule` del backend).
 */

import { TIME_RE } from "@/lib/validation/fields";
import type { DaySchedule } from "@/lib/entity/schedule";
import type { ClinicScheduleDay } from "@/lib/entity/settings";

/** Resultado de comparar el horario de un día del doctor contra la clínica. */
export type DayBoundResult =
  | { code: "ok" }
  | { code: "clinic-closed" }
  | { code: "out-of-range"; clinicStart: string; clinicEnd: string };

/** `true` si `t` es una hora "HH:mm" válida (24h, cero-padded). */
export function isTime(t: string | null | undefined): t is string {
  return typeof t === "string" && TIME_RE.test(t);
}

/**
 * `true` si la clínica abre ese día: el día está presente, `enabled` no es
 * `false`, y `startTime`/`endTime` son horas válidas con `startTime < endTime`.
 */
export function isClinicDayOpen(clinicDay?: ClinicScheduleDay): boolean {
  if (!clinicDay) return false;
  if (clinicDay.enabled === false) return false;
  if (!isTime(clinicDay.startTime) || !isTime(clinicDay.endTime)) return false;
  return clinicDay.startTime < clinicDay.endTime;
}

/**
 * Compara el horario del doctor para un día contra el horario de la
 * clínica para ese mismo día y devuelve el resultado tipado.
 *
 * Días con `day.enabled === false` nunca se acotan (apagado = sin regla).
 */
export function checkDoctorDayWithinClinic(
  day: DaySchedule,
  clinicDay: ClinicScheduleDay | undefined,
): DayBoundResult {
  if (!day.enabled) return { code: "ok" };

  // Clínica sin ese día configurado → permisivo, no acota.
  if (clinicDay === undefined) return { code: "ok" };

  if (clinicDay.enabled === false) return { code: "clinic-closed" };

  // Clínica abierta ese día pero con horas ausentes/ inválidas → permisivo.
  if (!isClinicDayOpen(clinicDay)) return { code: "ok" };

  const clinicStart = clinicDay.startTime as string;
  const clinicEnd = clinicDay.endTime as string;

  if (day.startTime < clinicStart || day.endTime > clinicEnd) {
    return { code: "out-of-range", clinicStart, clinicEnd };
  }

  return { code: "ok" };
}

/**
 * Rango legible de la clínica para ese día ("08:00–17:00"), o `null` si la
 * clínica no abre ese día o tiene horas inválidas.
 */
export function formatClinicRange(clinicDay?: ClinicScheduleDay): string | null {
  if (!isClinicDayOpen(clinicDay)) return null;
  return `${clinicDay!.startTime}–${clinicDay!.endTime}`;
}

/** Mensaje español exacto para el error "fuera de rango" (usa dash U+2013). */
export function clinicRangeMessage(clinicStart: string, clinicEnd: string): string {
  return `El horario debe estar dentro del horario de la clínica (${clinicStart}–${clinicEnd}).`;
}

/** Mensaje español exacto para el error "día cerrado". */
export const CLINIC_DAY_CLOSED_MESSAGE = "La clínica no abre este día.";
