import type { Appointment } from "./appointments";

// ---------------------------------------------------------------------------
// View mode
// ---------------------------------------------------------------------------

export type SchedulerViewMode = "day" | "week" | "month";

// ---------------------------------------------------------------------------
// Doctor option for the sidebar
// ---------------------------------------------------------------------------

export interface SchedulerDoctorOption {
  id: string;
  name: string;
  specialty?: string;
  color: string;
  visible: boolean;
}

// ---------------------------------------------------------------------------
// Date range (inclusive)
// ---------------------------------------------------------------------------

export interface SchedulerDateRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

// ---------------------------------------------------------------------------
// Rendered event
// ---------------------------------------------------------------------------

export interface SchedulerEvent {
  appointment: Appointment;
  doctorColor: string;
  /** Pixels from grid top */
  top: number;
  /** Pixels height */
  height: number;
  /** Sub-column index when events overlap (0-based) */
  column: number;
  /** Total sub-columns in this overlap group */
  totalColumns: number;
}
