"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { doctorsService } from "@/lib/services/doctors/doctors.service";
import { appointmentsService } from "@/lib/services/appointments/appointments.service";
import {
  buildDisabledDate,
  isDoctorWorkingDay,
} from "@/lib/utils/appointment-utils";
import type { WeekSchedule } from "@/lib/entity/schedule";
import { useClinicGeneralSettings } from "@/lib/hooks/settings/use-clinic-general-settings";
import { notifyApiError } from "@/lib/utils/notify-error";

export interface DoctorAvailabilityOption {
  id: string;
  name: string;
  specialty?: string;
}

interface UseDoctorAvailabilityParams {
  /** Si es false, no carga doctores (p.ej. modal cerrado). */
  enabled?: boolean;
  doctorId: string;
  /** `YYYY-MM-DD` (hora local). */
  date: string;
  /** Duración total a reservar; filtra slots donde el bloque completo cabe. */
  duration?: number;
  interval?: number;
}

/**
 * Disponibilidad del doctor reutilizable (misma fuente de verdad que el
 * formulario de citas): lista de doctores, horario del doctor seleccionado y
 * slots disponibles para una fecha/duración. Deriva `disabledDate`/`isWorkingDay`
 * para el `AvailabilityCalendar` y `availableTimes` para el `AvailabilitySlotPicker`.
 * El caller controla `doctorId`/`date`; el hook solo consulta.
 */
export function useDoctorAvailability({
  enabled = true,
  doctorId,
  date,
  duration,
  interval = 15,
}: UseDoctorAvailabilityParams) {
  const [doctorOptions, setDoctorOptions] = useState<DoctorAvailabilityOption[]>(
    [],
  );
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorSchedule, setDoctorSchedule] = useState<
    WeekSchedule | Record<string, unknown> | null
  >(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  // Horario EFECTIVO = doctor ∩ clínica (paridad con el backend). `rawSchedule`
  // es el horario tal cual lo configuró la clínica (parcial); `undefined`
  // mientras carga degrada a "solo horario del doctor" (ver appointment-utils).
  const { rawSchedule: clinicSchedule } = useClinicGeneralSettings();

  // Cargar doctores (con estado de carga).
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setDoctorsLoading(true);
    doctorsService
      .getDoctors({ page: 0, pageSize: 100 })
      .then((res) => {
        if (cancelled) return;
        setDoctorOptions(
          (res.entities ?? []).map((d) => ({
            id: d.id,
            name: d.name,
            specialty: d.specialty,
          })),
        );
      })
      .catch((error) => {
        if (!cancelled) {
          setDoctorOptions([]);
          notifyApiError("No se pudieron cargar los doctores", error);
        }
      })
      .finally(() => {
        if (!cancelled) setDoctorsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Cargar el horario del doctor seleccionado.
  useEffect(() => {
    if (!doctorId) {
      setDoctorSchedule(null);
      return;
    }
    let cancelled = false;
    doctorsService
      .getDoctorById(doctorId)
      .then((doc) => {
        if (!cancelled) {
          setDoctorSchedule(
            (doc.schedule as WeekSchedule | Record<string, unknown>) ?? null,
          );
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setDoctorSchedule(null);
          notifyApiError("No se pudo cargar el horario del doctor", error);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  const disabledDate = useMemo(
    () => buildDisabledDate(doctorSchedule, clinicSchedule),
    [doctorSchedule, clinicSchedule],
  );
  const isWorkingDay = useCallback(
    (d: Dayjs) => isDoctorWorkingDay(doctorSchedule, d, clinicSchedule),
    [doctorSchedule, clinicSchedule],
  );
  const selectedDayWorked = useMemo(
    () =>
      date
        ? isDoctorWorkingDay(doctorSchedule, dayjs(date), clinicSchedule)
        : false,
    [doctorSchedule, clinicSchedule, date],
  );

  // Cargar horarios disponibles (pasa la duración total → el backend filtra los
  // slots donde el bloque completo cabe).
  useEffect(() => {
    if (!doctorId || !date) {
      setAvailableTimes([]);
      return;
    }
    let cancelled = false;
    setAvailabilityLoading(true);
    appointmentsService
      .getDoctorAvailability(doctorId, date, interval, duration)
      .then((times) => {
        if (!cancelled) setAvailableTimes(times);
      })
      .catch((error) => {
        if (!cancelled) {
          setAvailableTimes([]);
          notifyApiError("No se pudo cargar la disponibilidad del doctor", error);
        }
      })
      .finally(() => {
        if (!cancelled) setAvailabilityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [doctorId, date, duration, interval]);

  return {
    doctorOptions,
    doctorsLoading,
    doctorSchedule,
    clinicSchedule,
    disabledDate,
    isWorkingDay,
    selectedDayWorked,
    availableTimes,
    availabilityLoading,
  };
}
