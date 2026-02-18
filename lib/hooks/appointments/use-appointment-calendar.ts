import { useCallback, useMemo } from "react";
import dayjs, { type Dayjs } from "dayjs";
import type { AvailabilitySlot } from "@/lib/entity/appointment";

interface UseAppointmentCalendarParams {
  /** Slots to display — provided by the parent from availability endpoint */
  slots: AvailabilitySlot[];
  /** Currently selected date in YYYY-MM-DD format */
  selectedDate: string;
  /** Callback to update selected date in parent */
  onDateChange: (date: string) => void;
}

interface UseAppointmentCalendarReturn {
  /** Currently selected date */
  selectedDate: Dayjs;
  /** Slots grouped by date string for cell rendering */
  slotsByDate: Map<string, AvailabilitySlot[]>;
  /** Slots filtered for the selected date */
  selectedDateSlots: AvailabilitySlot[];
  /** Change the selected date */
  onSelectDate: (date: Dayjs) => void;
  /** Called when the calendar panel (month/year) changes */
  onPanelChange: (date: Dayjs) => void;
}

/**
 * Hook that derives date-grouped availability views from slot data.
 * Selection state lives in the parent, and this hook only adapts it for UI.
 */
export function useAppointmentCalendar({
  slots,
  selectedDate,
  onDateChange,
}: UseAppointmentCalendarParams): UseAppointmentCalendarReturn {
  const selectedDateValue = useMemo(
    () => dayjs(selectedDate, "YYYY-MM-DD"),
    [selectedDate],
  );

  const slotsByDate = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>();
    for (const slot of slots) {
      const key = slot.date?.split("T")[0];
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(slot);
    }
    return map;
  }, [slots]);

  const selectedDateSlots = useMemo(
    () => slotsByDate.get(selectedDateValue.format("YYYY-MM-DD")) ?? [],
    [slotsByDate, selectedDateValue],
  );

  const onSelectDate = useCallback((date: Dayjs) => {
    onDateChange(date.format("YYYY-MM-DD"));
  }, [onDateChange]);

  const onPanelChange = useCallback((date: Dayjs) => {
    onDateChange(date.format("YYYY-MM-DD"));
  }, [onDateChange]);

  return {
    selectedDate: selectedDateValue,
    slotsByDate,
    selectedDateSlots,
    onSelectDate,
    onPanelChange,
  };
}
