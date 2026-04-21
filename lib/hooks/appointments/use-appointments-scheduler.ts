import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { App } from "antd";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { appointmentsService } from "@/lib/services/appointments";
import { doctorsService } from "@/lib/services/doctors";
import { getDoctorColor } from "@/lib/constants/scheduler-colors";
import {
  getWeekDays,
  getMonthDays,
  calcEventPosition,
  resolveOverlaps,
} from "@/lib/utils/scheduler-layout";
import type {
  Appointment,
  SchedulerViewMode,
  SchedulerDoctorOption,
  SchedulerDateRange,
  SchedulerEvent,
} from "@/lib/entity/appointment";

dayjs.extend(isoWeek);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_CONCURRENT = 6;
const SLOT_HEIGHT = 48; // px per 30-min slot
const START_HOUR = 7;
const END_HOUR = 21;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCacheKey(doctorId: string, date: string): string {
  return `${doctorId}-${date}`;
}

function computeDateRange(
  viewMode: SchedulerViewMode,
  currentDate: string,
): SchedulerDateRange {
  const ref = dayjs(currentDate);

  switch (viewMode) {
    case "day":
      return { start: ref.format("YYYY-MM-DD"), end: ref.format("YYYY-MM-DD") };
    case "week": {
      const monday = ref.isoWeekday(1);
      const sunday = ref.isoWeekday(7);
      return {
        start: monday.format("YYYY-MM-DD"),
        end: sunday.format("YYYY-MM-DD"),
      };
    }
    case "month": {
      return {
        start: ref.startOf("month").format("YYYY-MM-DD"),
        end: ref.endOf("month").format("YYYY-MM-DD"),
      };
    }
  }
}

function getDatesInRange(range: SchedulerDateRange): string[] {
  const dates: string[] = [];
  let cursor = dayjs(range.start);
  const end = dayjs(range.end);
  while (!cursor.isAfter(end, "day")) {
    dates.push(cursor.format("YYYY-MM-DD"));
    cursor = cursor.add(1, "day");
  }
  return dates;
}

/** Run async tasks with a concurrency limit. */
async function batchedAllSettled<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  for (let i = 0; i < tasks.length; i += limit) {
    const batch = tasks.slice(i, i + limit);
    const batchResults = await Promise.allSettled(batch.map((fn) => fn()));
    results.push(...batchResults);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseAppointmentsSchedulerOptions {
  defaultViewMode?: SchedulerViewMode;
}

export function useAppointmentsScheduler(
  options: UseAppointmentsSchedulerOptions = {},
) {
  const { defaultViewMode = "week" } = options;
  const { modal } = App.useApp();

  // ---- State ---------------------------------------------------------------
  const [viewMode, setViewMode] = useState<SchedulerViewMode>(defaultViewMode);
  const [currentDate, setCurrentDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [doctors, setDoctors] = useState<SchedulerDoctorOption[]>([]);
  const [visibleDoctorIds, setVisibleDoctorIds] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(false);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // We use a ref for the cache so that writes inside async closures always
  // read the latest version without triggering re-renders per entry.
  const cacheRef = useRef<Map<string, Appointment[]>>(new Map());

  // Trigger to force re-computation of events from cache
  const [cacheVersion, setCacheVersion] = useState(0);

  // ---- Derived values ------------------------------------------------------
  const dateRange = useMemo(
    () => computeDateRange(viewMode, currentDate),
    [viewMode, currentDate],
  );

  const datesInRange = useMemo(() => getDatesInRange(dateRange), [dateRange]);

  const weekDays = useMemo(() => {
    if (viewMode === "week") return getWeekDays(currentDate);
    return [];
  }, [viewMode, currentDate]);

  const monthDays = useMemo(() => {
    if (viewMode === "month") return getMonthDays(currentDate);
    return [];
  }, [viewMode, currentDate]);

  // ---- Load doctors --------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setDoctorsLoading(true);
      try {
        const response = await doctorsService.getDoctors({
          page: 0,
          pageSize: 100,
        });
        if (cancelled) return;

        const list: SchedulerDoctorOption[] = (response.entities ?? []).map(
          (doc, idx) => ({
            id: doc.id,
            name: doc.name,
            specialty: doc.specialty,
            color: getDoctorColor(idx),
            visible: true,
          }),
        );

        setDoctors(list);
        setVisibleDoctorIds(new Set(list.map((d) => d.id)));
      } catch {
        if (!cancelled) setError("Error al cargar especialistas");
      } finally {
        if (!cancelled) setDoctorsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Fetch appointments for the visible range ----------------------------
  const fetchRange = useCallback(
    async (doctorIds: Set<string>, dates: string[]) => {
      if (doctorIds.size === 0 || dates.length === 0) return;

      const cache = cacheRef.current;
      const tasks: (() => Promise<void>)[] = [];

      for (const doctorId of doctorIds) {
        for (const date of dates) {
          const key = buildCacheKey(doctorId, date);
          if (cache.has(key)) continue;

          tasks.push(async () => {
            try {
              const data = await appointmentsService.getDoctorAppointments(
                doctorId,
                date,
              );
              cache.set(key, data);
            } catch {
              // On failure keep the key absent so it retries next time.
            }
          });
        }
      }

      if (tasks.length === 0) {
        // Everything was already cached — just bump version to recompute
        setCacheVersion((v) => v + 1);
        return;
      }

      setLoading(true);
      setError(null);

      await batchedAllSettled(tasks, MAX_CONCURRENT);

      setCacheVersion((v) => v + 1);
      setLoading(false);
    },
    [],
  );

  // Auto-fetch when range or visible doctors change
  useEffect(() => {
    fetchRange(visibleDoctorIds, datesInRange);
  }, [visibleDoctorIds, datesInRange, fetchRange]);

  // ---- Build events from cache ---------------------------------------------
  const events: SchedulerEvent[] = useMemo(() => {
    // cacheVersion used to trigger recalc
    void cacheVersion;

    const cache = cacheRef.current;
    const allEvents: SchedulerEvent[] = [];

    for (const doctorId of visibleDoctorIds) {
      const doc = doctors.find((d) => d.id === doctorId);
      const color = doc?.color ?? "#999";

      for (const date of datesInRange) {
        const key = buildCacheKey(doctorId, date);
        const appointments = cache.get(key);
        if (!appointments) continue;

        for (const appt of appointments) {
          if (appt.status === "cancelled") continue;
          const pos = calcEventPosition(
            appt.time,
            appt.duration,
            START_HOUR,
            SLOT_HEIGHT,
          );
          allEvents.push({
            appointment: appt,
            doctorColor: color,
            top: pos.top,
            height: pos.height,
            column: 0,
            totalColumns: 1,
          });
        }
      }
    }

    return allEvents;
  }, [cacheVersion, visibleDoctorIds, doctors, datesInRange]);

  /** Events grouped by date with overlaps resolved. */
  const eventsByDay = useMemo(() => {
    const map = new Map<string, SchedulerEvent[]>();

    for (const date of datesInRange) {
      const dayEvents = events.filter((e) => e.appointment.date === date);
      map.set(date, resolveOverlaps(dayEvents));
    }

    return map;
  }, [events, datesInRange]);

  // ---- Navigation ----------------------------------------------------------
  const goToday = useCallback(() => {
    setCurrentDate(dayjs().format("YYYY-MM-DD"));
  }, []);

  const goPrev = useCallback(() => {
    setCurrentDate((prev) => {
      const ref = dayjs(prev);
      switch (viewMode) {
        case "day":
          return ref.subtract(1, "day").format("YYYY-MM-DD");
        case "week":
          return ref.subtract(1, "week").format("YYYY-MM-DD");
        case "month":
          return ref.subtract(1, "month").format("YYYY-MM-DD");
      }
    });
  }, [viewMode]);

  const goNext = useCallback(() => {
    setCurrentDate((prev) => {
      const ref = dayjs(prev);
      switch (viewMode) {
        case "day":
          return ref.add(1, "day").format("YYYY-MM-DD");
        case "week":
          return ref.add(1, "week").format("YYYY-MM-DD");
        case "month":
          return ref.add(1, "month").format("YYYY-MM-DD");
      }
    });
  }, [viewMode]);

  const goToDate = useCallback((date: string) => {
    setCurrentDate(date);
  }, []);

  // ---- Doctor visibility ---------------------------------------------------
  const toggleDoctor = useCallback((doctorId: string) => {
    setVisibleDoctorIds((prev) => {
      const next = new Set(prev);
      if (next.has(doctorId)) next.delete(doctorId);
      else next.add(doctorId);
      return next;
    });
  }, []);

  const selectAllDoctors = useCallback(() => {
    setVisibleDoctorIds(new Set(doctors.map((d) => d.id)));
  }, [doctors]);

  const clearAllDoctors = useCallback(() => {
    setVisibleDoctorIds(new Set());
  }, []);

  // ---- Cache invalidation --------------------------------------------------
  const invalidateCache = useCallback(
    (doctorId?: string, date?: string) => {
      const cache = cacheRef.current;

      if (doctorId && date) {
        cache.delete(buildCacheKey(doctorId, date));
      } else if (doctorId) {
        for (const key of cache.keys()) {
          if (key.startsWith(`${doctorId}-`)) cache.delete(key);
        }
      } else {
        cache.clear();
      }

      // Re-fetch the current range
      fetchRange(visibleDoctorIds, datesInRange);
    },
    [fetchRange, visibleDoctorIds, datesInRange],
  );

  // ---- Cancel appointment --------------------------------------------------
  const cancelAppointment = useCallback(
    (appointment: Appointment) => {
      modal.confirm({
        title: "¿Cancelar cita?",
        content: `Se cancelará la cita de ${appointment.patientName ?? "paciente"} a las ${appointment.time || "--:--"}.`,
        okText: "Cancelar cita",
        okType: "danger",
        cancelText: "Volver",
        onOk: async () => {
          try {
            await appointmentsService.cancelAppointment(appointment.id);
            // Invalidate this specific doctor + date and refetch
            const doctorId =
              appointment.doctorId ?? appointment.doctor_id ?? "";
            if (doctorId && appointment.date) {
              cacheRef.current.delete(
                buildCacheKey(doctorId, appointment.date),
              );
              fetchRange(new Set([doctorId]), [appointment.date]);
            } else {
              invalidateCache();
            }
          } catch {
            // Error notification handled by interceptor
          }
        },
      });
    },
    [modal, fetchRange, invalidateCache],
  );

  // ---- Complete appointment ------------------------------------------------
  const completeAppointment = useCallback(
    (appointment: Appointment) => {
      modal.confirm({
        title: "¿Marcar cita como realizada?",
        content: `Se marcará como realizada la cita de ${appointment.patientName ?? "paciente"} del ${appointment.date} a las ${appointment.time || "--:--"}. Esta acción no se puede deshacer.`,
        okText: "Sí, marcar como realizada",
        okType: "primary",
        cancelText: "Cancelar",
        onOk: async () => {
          try {
            await appointmentsService.completeAppointment(appointment.id);
            // Invalidate this specific doctor + date and refetch
            const doctorId =
              appointment.doctorId ?? appointment.doctor_id ?? "";
            if (doctorId && appointment.date) {
              cacheRef.current.delete(
                buildCacheKey(doctorId, appointment.date),
              );
              fetchRange(new Set([doctorId]), [appointment.date]);
            } else {
              invalidateCache();
            }
          } catch {
            // Error notification handled by interceptor
          }
        },
      });
    },
    [modal, fetchRange, invalidateCache],
  );

  // ---- Return --------------------------------------------------------------
  return {
    // View
    viewMode,
    setViewMode,
    currentDate,
    dateRange,
    weekDays,
    monthDays,
    datesInRange,

    // Doctors
    doctors,
    doctorsLoading,
    visibleDoctorIds,
    toggleDoctor,
    selectAllDoctors,
    clearAllDoctors,

    // Events
    events,
    eventsByDay,
    loading,
    error,

    // Navigation
    goToday,
    goPrev,
    goNext,
    goToDate,

    // Actions
    cancelAppointment,
    completeAppointment,
    invalidateCache,

    // Constants for grids
    startHour: START_HOUR,
    endHour: END_HOUR,
    slotHeight: SLOT_HEIGHT,
  };
}
