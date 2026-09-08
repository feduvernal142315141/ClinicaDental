import type { ToothNotation } from "@/lib/odontogram/notation";

export type ClinicScheduleDayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface ClinicScheduleDay {
  enabled: boolean;
  startTime?: string | null;
  endTime?: string | null;
}

export type ClinicSchedule = Record<ClinicScheduleDayKey, ClinicScheduleDay>;

export interface ClinicGeneralSettings {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  timezone: string;
  currency: string;
  subscriptionPlan?: string | null;
  schedule: ClinicSchedule;
  minimumAdvanceNoticePeriod?: number | null;
  standardAppointmentDuration?: number | null;
  cancellationLimitPerMonth?: number | null;
  allowOnlineReservations?: boolean | null;
  requireConfirmation?: boolean | null;
  sendReminders?: boolean | null;
  reminderTime?: number | null;
  /** URL absoluta del logo de la clínica (subido a Cloudinary). */
  logoUrl?: string | null;
  /**
   * Nomenclatura dental que la clínica lee en pantalla. OBLIGATORIA a
   * propósito: así olvidar la línea en el payload de guardado es un error de
   * `tsc` y no una reversión silenciosa de la elección de la clínica.
   * Es presentación: el dato guardado sigue siendo FDI siempre.
   */
  toothNotation: ToothNotation;
}

export type UpdateClinicGeneralSettingsRequest = Omit<
  ClinicGeneralSettings,
  "id" | "subscriptionPlan"
>;

export const CLINIC_SCHEDULE_DAYS: Array<{
  key: ClinicScheduleDayKey;
  label: string;
}> = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

export const DEFAULT_CLINIC_SCHEDULE: ClinicSchedule = {
  monday: { enabled: true, startTime: "08:00", endTime: "17:00" },
  tuesday: { enabled: true, startTime: "08:00", endTime: "17:00" },
  wednesday: { enabled: true, startTime: "08:00", endTime: "17:00" },
  thursday: { enabled: true, startTime: "08:00", endTime: "17:00" },
  friday: { enabled: true, startTime: "08:00", endTime: "17:00" },
  saturday: { enabled: false, startTime: null, endTime: null },
  sunday: { enabled: false, startTime: null, endTime: null },
};

export const DEFAULT_CLINIC_GENERAL_SETTINGS: ClinicGeneralSettings = {
  id: "",
  name: "Clínica",
  address: null,
  phone: null,
  timezone: "America/La_Paz",
  currency: "USD",
  subscriptionPlan: null,
  schedule: DEFAULT_CLINIC_SCHEDULE,
  minimumAdvanceNoticePeriod: 120,
  standardAppointmentDuration: 30,
  cancellationLimitPerMonth: 3,
  allowOnlineReservations: true,
  requireConfirmation: false,
  sendReminders: false,
  reminderTime: 1440,
  logoUrl: null,
  // FDI/ISO 3950, el estándar internacional (= DEFAULT_TOOTH_NOTATION del
  // módulo de notación, escrito como literal para que esta capa de entidades
  // no arrastre runtime del odontograma).
  toothNotation: "fdi",
};
