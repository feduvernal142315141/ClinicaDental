import type { AvailabilitySlot } from "@/lib/entity/appointment";

/**
 * Props for the AppointmentCalendar component.
 */
export interface AppointmentCalendarProps {
  /** Availability slots to display on the calendar */
  slots: AvailabilitySlot[];
  /** Whether the data is loading */
  loading?: boolean;
  /** Selected date (YYYY-MM-DD) */
  selectedDate: string;
  /** Callback when calendar date changes */
  onDateChange: (date: string) => void;
  /** Callback when user schedules a slot */
  onScheduleSlot?: (slot: AvailabilitySlot) => void;
}

/**
 * Props for the SlotItem sub-component.
 */
export interface SlotItemProps {
  slot: AvailabilitySlot;
  onSchedule?: (slot: AvailabilitySlot) => void;
}
