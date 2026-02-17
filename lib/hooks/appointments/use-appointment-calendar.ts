import { useCallback, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import type { Appointment } from "@/lib/entity/appointment";

interface UseAppointmentCalendarParams {
  /** Appointments to display — provided by the parent (e.g. from useAppointments) */
  appointments: Appointment[];
}

interface UseAppointmentCalendarReturn {
  /** Currently selected date */
  selectedDate: Dayjs;
  /** Appointments grouped by date string for cell rendering */
  appointmentsByDate: Map<string, Appointment[]>;
  /** Appointments filtered for the selected date */
  selectedDateAppointments: Appointment[];
  /** Change the selected date */
  onSelectDate: (date: Dayjs) => void;
  /** Called when the calendar panel (month/year) changes */
  onPanelChange: (date: Dayjs) => void;
}

/**
 * Hook that manages calendar selection state and derives
 * date-grouped views from the provided appointments list.
 *
 * It does NOT fetch data — the parent is responsible for supplying
 * the appointments array (Single Responsibility / Dependency Inversion).
 */
export function useAppointmentCalendar({
  appointments,
}: UseAppointmentCalendarParams): UseAppointmentCalendarReturn {
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const apt of appointments) {
      const key = apt.date?.split("T")[0]; // normalise "2026-02-17T…" → "2026-02-17"
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(apt);
    }
    return map;
  }, [appointments]);

  const selectedDateAppointments = useMemo(
    () => appointmentsByDate.get(selectedDate.format("YYYY-MM-DD")) ?? [],
    [appointmentsByDate, selectedDate],
  );

  const onSelectDate = useCallback((date: Dayjs) => {
    setSelectedDate(date);
  }, []);

  const onPanelChange = useCallback((date: Dayjs) => {
    setSelectedDate(date);
  }, []);

  return {
    selectedDate,
    appointmentsByDate,
    selectedDateAppointments,
    onSelectDate,
    onPanelChange,
  };
}
