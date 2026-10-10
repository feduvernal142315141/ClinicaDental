import type { ToothNotation } from "@/lib/odontogram/notation";

export const CLINIC_LANGUAGES = ["es", "en", "fr", "it", "pt"] as const;

export type ClinicLanguage = (typeof CLINIC_LANGUAGES)[number];

export function isClinicLanguage(value: unknown): value is ClinicLanguage {
  return (
    typeof value === "string" &&
    CLINIC_LANGUAGES.includes(value as ClinicLanguage)
  );
}

export function normalizeClinicLanguage(
  value?: string | null,
): ClinicLanguage | null {
  const normalized = value?.trim().toLowerCase().split(/[-_]/)[0];
  return isClinicLanguage(normalized) ? normalized : null;
}

export type ClinicScheduleDayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface SaturdayShift {
  startTime: string;
  endTime: string;
}

export interface SaturdayRule {
  pattern: "every" | "alternate" | "custom";
  anchorDate: string; // ISO: "2026-10-04"
  shifts: Record<string, SaturdayShift>; // { A: {...}, B: {...} }
  sequence: string[]; // ["A", "off"] or ["A", "A", "off", "off"]
}

export interface SaturdayPreviewItem {
  date: string;
  open: boolean;
  startTime?: string | null;
  endTime?: string | null;
  shiftKey: string;
}

export interface ClinicScheduleDay {
  enabled: boolean;
  startTime?: string | null;
  endTime?: string | null;
  saturdayRule?: SaturdayRule | null;
}

export type ClinicSchedule = Record<ClinicScheduleDayKey, ClinicScheduleDay>;

export interface ClinicGeneralSettings {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  timezone: string;
  currency: string;
  language: ClinicLanguage;
  subscriptionPlan?: string | null;
  schedule: ClinicSchedule;
  minimumAdvanceNoticePeriod?: number | null;
  standardAppointmentDuration?: number | null;
  cancellationLimitPerMonth?: number | null;
  allowOnlineReservations?: boolean | null;
  requireConfirmation?: boolean | null;
  sendReminders?: boolean | null;
  reminderTime?: number | null;
  /** Si el asistente de WhatsApp informa precios por chat. Omitido en el PUT, el backend conserva el valor. */
  assistantSharesPrices?: boolean | null;
  /** Nombre con el que se presenta el asistente de WhatsApp. Ausente o null = «Dalia». */
  assistantName?: string | null;
  /** URL absoluta del logo de la clínica (subido a Cloudinary). */
  logoUrl?: string | null;
  toothNotation: ToothNotation;
}

export type UpdateClinicGeneralSettingsRequest = Omit<
  ClinicGeneralSettings,
  "id" | "subscriptionPlan"
>;

export const DEFAULT_ASSISTANT_NAME = "Dalia";
export const ASSISTANT_NAME_MIN_LENGTH = 2;
export const ASSISTANT_NAME_MAX_LENGTH = 30;

/** Solo letras (con acentos y ñ) y un espacio simple entre palabras. */
const ASSISTANT_NAME_PATTERN = /^\p{L}+( \p{L}+)*$/u;

/** Recorta los extremos y colapsa los espacios repetidos, igual que el backend. */
export function normalizeAssistantName(value: string): string {
  return value.trim().replace(/ {2,}/g, " ");
}

export function isValidAssistantName(value: string): boolean {
  const name = normalizeAssistantName(value);
  return (
    name.length >= ASSISTANT_NAME_MIN_LENGTH &&
    name.length <= ASSISTANT_NAME_MAX_LENGTH &&
    ASSISTANT_NAME_PATTERN.test(name)
  );
}

/** Nombre a mostrar: un backend sin el campo (o vacío) equivale a «Dalia». */
export function resolveAssistantName(value?: string | null): string {
  const name = typeof value === "string" ? normalizeAssistantName(value) : "";
  return name || DEFAULT_ASSISTANT_NAME;
}

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
  language: "es",
  subscriptionPlan: null,
  schedule: DEFAULT_CLINIC_SCHEDULE,
  minimumAdvanceNoticePeriod: 120,
  standardAppointmentDuration: 30,
  cancellationLimitPerMonth: 3,
  allowOnlineReservations: true,
  requireConfirmation: false,
  sendReminders: false,
  reminderTime: 1440,
  assistantSharesPrices: true,
  assistantName: DEFAULT_ASSISTANT_NAME,
  logoUrl: null,
  toothNotation: "fdi",
};
