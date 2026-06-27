import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { App } from "antd";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { appointmentsService } from "@/lib/services/appointments";
import { doctorsService } from "@/lib/services/doctors";
import { notify } from "@/lib/utils/notify";
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

const SLOT_HEIGHT = 48; // px per 30-min slot
const START_HOUR = 7;
const END_HOUR = 21;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRangeCacheKey(
  startDate: string,
  endDate: string,
  doctorIds: string[],
): string {
  return `${startDate}|${endDate}|${[...doctorIds].sort().join(",")}`;
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
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Cache keyed by `${startDate}|${endDate}|${sortedDoctorIds}`.
   * Each entry stores all appointments returned for that range.
   */
  const cacheRef = useRef<Map<string, Appointment[]>>(new Map());

  /**
   * Monotonically-increasing sequence number used as a stale-request guard.
   * Each call to fetchRange increments it; the async closure captures its
   * value at the time of the call and aborts if it no longer matches.
   */
  const fetchSeqRef = useRef(0);

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

  // ---- Fetch appointments for the visible range (single request) -----------
  const fetchRange = useCallback(
    async (doctorIds: Set<string>, range: SchedulerDateRange) => {
      const ids = [...doctorIds];
      if (ids.length === 0) return;

      const cacheKey = buildRangeCacheKey(range.start, range.end, ids);

      // Already cached — just bump version to recompute events
      if (cacheRef.current.has(cacheKey)) {
        setCacheVersion((v) => v + 1);
        return;
      }

      // Capture sequence number to detect stale responses
      fetchSeqRef.current += 1;
      const seq = fetchSeqRef.current;

      setLoading(true);
      setError(null);

      try {
        const data = await appointmentsService.getAppointmentsByRange({
          startDate: range.start,
          endDate: range.end,
          doctorIds: ids,
        });

        // Discard if a newer request has already been fired
        if (seq !== fetchSeqRef.current) return;

        cacheRef.current.set(cacheKey, data);
        setCacheVersion((v) => v + 1);
      } catch {
        if (seq === fetchSeqRef.current) {
          setError("Error al cargar citas del calendario");
        }
      } finally {
        if (seq === fetchSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  // Auto-fetch when range or visible doctors change
  useEffect(() => {
    fetchRange(visibleDoctorIds, dateRange);
  }, [visibleDoctorIds, dateRange, fetchRange]);

  // ---- Build events from cache ---------------------------------------------
  const events: SchedulerEvent[] = useMemo(() => {
    void cacheVersion;

    const ids = [...visibleDoctorIds];
    if (ids.length === 0) return [];

    const cacheKey = buildRangeCacheKey(dateRange.start, dateRange.end, ids);
    const appointments = cacheRef.current.get(cacheKey) ?? [];

    const allEvents: SchedulerEvent[] = [];

    for (const appt of appointments) {
      if (appt.status === "cancelled") continue;

      const doctorId = appt.doctorId ?? appt.doctor_id ?? "";
      if (!visibleDoctorIds.has(doctorId)) continue;

      const doc = doctors.find((d) => d.id === doctorId);
      const color = doc?.color ?? "#999";

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

    return allEvents;
  }, [cacheVersion, visibleDoctorIds, doctors, dateRange]);

  /** Events grouped by date with overlaps resolved. */
  const eventsByDay = useMemo(() => {
    const map = new Map<string, SchedulerEvent[]>();

    for (const date of datesInRange) {
      const dayEvents = events.filter((e) => e.appointment.date === date);
      const labelFiltered =
        selectedLabelIds.size === 0
          ? dayEvents
          : dayEvents.filter(
              (e) =>
                e.appointment.labels?.some((l) =>
                  selectedLabelIds.has(l.id),
                ) ?? false,
            );
      map.set(date, resolveOverlaps(labelFiltered));
    }

    return map;
  }, [events, datesInRange, selectedLabelIds]);

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

  // ---- Label filter --------------------------------------------------------
  const toggleLabel = useCallback((labelId: string) => {
    setSelectedLabelIds((prev) => {
      const next = new Set(prev);
      if (next.has(labelId)) next.delete(labelId);
      else next.add(labelId);
      return next;
    });
  }, []);

  const clearLabels = useCallback(() => setSelectedLabelIds(new Set()), []);

  // ---- Cache invalidation --------------------------------------------------
  const invalidateCache = useCallback(
    (doctorId?: string) => {
      const cache = cacheRef.current;

      if (doctorId) {
        // Drop all range keys that include this doctorId
        for (const key of cache.keys()) {
          const parts = key.split("|");
          const ids = parts[2]?.split(",") ?? [];
          if (ids.includes(doctorId)) cache.delete(key);
        }
      } else {
        cache.clear();
      }

      fetchRange(visibleDoctorIds, dateRange);
    },
    [fetchRange, visibleDoctorIds, dateRange],
  );

  // ---- Reschedule by drag (optimista + rollback) ---------------------------
  const rescheduleByDrag = useCallback(
    async (appointment: Appointment, newDate: string, newTime: string) => {
      if (appointment.date === newDate && appointment.time === newTime) return;

      // Local → ISO UTC (regla de oro: el string sin zona se interpreta local).
      const start = dayjs(`${newDate}T${newTime}`);
      if (!start.isValid()) return; // defensivo (no debería pasar tras el clamp)

      const id = appointment.id;
      const prev = {
        date: appointment.date,
        time: appointment.time,
        startAt: appointment.scheduledStartAt,
        endAt: appointment.scheduledEndAt,
      };
      const startIso = start.toISOString();
      const endIso = start
        .add(appointment.duration || 30, "minute")
        .toISOString();

      // Parche optimista del cache (mueve el evento al instante).
      const patch = (
        d: string,
        t: string,
        startAt?: string,
        endAt?: string,
      ) => {
        let changed = false;
        for (const [key, list] of cacheRef.current.entries()) {
          const idx = list.findIndex((a) => a.id === id);
          if (idx >= 0) {
            const copy = list.slice();
            copy[idx] = {
              ...copy[idx],
              date: d,
              time: t,
              scheduledStartAt: startAt,
              scheduledEndAt: endAt,
            };
            cacheRef.current.set(key, copy);
            changed = true;
          }
        }
        if (changed) setCacheVersion((v) => v + 1);
      };

      patch(newDate, newTime, startIso, endIso);

      try {
        await appointmentsService.rescheduleAppointment(id, {
          scheduledStartAt: startIso,
          scheduledEndAt: endIso,
        });
        // El parche optimista ya refleja el resultado; NO invalidamos aquí para
        // evitar el flash de skeleton (invalidateCache vacía + recarga global).
        notify.success("Cita reagendada.");
      } catch {
        // El interceptor de Axios ya notifica el error (incl. el 409 con el
        // mensaje del backend); aquí sólo revertimos el parche optimista.
        patch(prev.date, prev.time, prev.startAt, prev.endAt);
      }
    },
    [],
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
            const doctorId = appointment.doctorId ?? appointment.doctor_id;
            invalidateCache(doctorId);
          } catch {
            // Error notification handled by interceptor
          }
        },
      });
    },
    [modal, invalidateCache],
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
            const doctorId = appointment.doctorId ?? appointment.doctor_id;
            invalidateCache(doctorId);
          } catch {
            // Error notification handled by interceptor
          }
        },
      });
    },
    [modal, invalidateCache],
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

    // Label filter
    selectedLabelIds,
    toggleLabel,
    clearLabels,

    // Actions
    cancelAppointment,
    completeAppointment,
    rescheduleByDrag,
    invalidateCache,

    // Constants for grids
    startHour: START_HOUR,
    endHour: END_HOUR,
    slotHeight: SLOT_HEIGHT,
  };
}
