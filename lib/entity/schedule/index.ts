/**
 * Schedule Entity Types
 *
 * Type definitions for doctor schedule
 */

export interface DaySchedule {
  enabled: boolean;
  startTime: string; // "09:00"
  endTime: string; // "18:00"
  breakStart?: string; // "13:00"
  breakEnd?: string; // "14:00"
}

export interface WeekSchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export const DAYS_OF_WEEK = [
  { key: "monday" as const, label: "Lunes", shortLabel: "Lun" },
  { key: "tuesday" as const, label: "Martes", shortLabel: "Mar" },
  { key: "wednesday" as const, label: "Miércoles", shortLabel: "Mié" },
  { key: "thursday" as const, label: "Jueves", shortLabel: "Jue" },
  { key: "friday" as const, label: "Viernes", shortLabel: "Vie" },
  { key: "saturday" as const, label: "Sábado", shortLabel: "Sáb" },
  { key: "sunday" as const, label: "Domingo", shortLabel: "Dom" },
] as const;

export const DEFAULT_DAY_SCHEDULE: DaySchedule = {
  enabled: false,
  startTime: "09:00",
  endTime: "18:00",
  breakStart: "",
  breakEnd: "",
};

export const DEFAULT_WEEK_SCHEDULE: WeekSchedule = {
  monday: {
    enabled: false,
    startTime: "09:00",
    endTime: "18:00",
    breakStart: "",
    breakEnd: "",
  },
  tuesday: {
    enabled: false,
    startTime: "09:00",
    endTime: "18:00",
    breakStart: "",
    breakEnd: "",
  },
  wednesday: {
    enabled: false,
    startTime: "09:00",
    endTime: "18:00",
    breakStart: "",
    breakEnd: "",
  },
  thursday: {
    enabled: false,
    startTime: "09:00",
    endTime: "18:00",
    breakStart: "",
    breakEnd: "",
  },
  friday: {
    enabled: false,
    startTime: "09:00",
    endTime: "18:00",
    breakStart: "",
    breakEnd: "",
  },
  saturday: {
    enabled: false,
    startTime: "09:00",
    endTime: "18:00",
    breakStart: "",
    breakEnd: "",
  },
  sunday: {
    enabled: false,
    startTime: "09:00",
    endTime: "18:00",
    breakStart: "",
    breakEnd: "",
  },
};
