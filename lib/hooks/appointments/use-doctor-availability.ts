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
      .catch(() => {
        if (!cancelled) setDoctorOptions([]);
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
      .catch(() => {
        if (!cancelled) setDoctorSchedule(null);
      });
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  const disabledDate = useMemo(
    () => buildDisabledDate(doctorSchedule),
    [doctorSchedule],
  );
  const isWorkingDay = useCallback(
    (d: Dayjs) => isDoctorWorkingDay(doctorSchedule, d),
    [doctorSchedule],
  );
  const selectedDayWorked = useMemo(
    () => (date ? isDoctorWorkingDay(doctorSchedule, dayjs(date)) : false),
    [doctorSchedule, date],
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
      .catch(() => {
        if (!cancelled) setAvailableTimes([]);
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
    disabledDate,
    isWorkingDay,
    selectedDayWorked,
    availableTimes,
    availabilityLoading,
  };
}
