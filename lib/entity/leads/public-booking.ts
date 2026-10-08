import { z } from "zod";

/**
 * Reservas en línea: lo que la clínica expone al público desde su sitio web.
 * Contrato de `GET|PUT /leads/public-booking/settings`. La clínica sale de la sesión.
 */

export interface LeadPublicBookingService {
  serviceId: string;
  /** Vacío: lo atiende cualquiera de los doctores habilitados. */
  doctorIds: string[];
}

export interface LeadPublicBookingSettings {
  /** Lo que la clínica eligió. */
  enabled: boolean;
  /** Si el sitio web está tomando reservas ahora mismo (puede ser `false` con `enabled` en `true`). */
  publiclyAvailable: boolean;
  doctorIds: string[];
  services: LeadPublicBookingService[];
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
  slotIntervalMinutes: number;
  /** Se devuelve al guardar: el backend rechaza con 409 si otra persona guardó antes. */
  version: number;
}

/** El `PUT` reemplaza la configuración completa. */
export type UpdateLeadPublicBookingSettingsRequest = Omit<LeadPublicBookingSettings, "publiclyAvailable">;

export type PublicBookingFormValues = Omit<LeadPublicBookingSettings, "publiclyAvailable" | "version">;

// ─── Límites que valida el backend ──────────────────────────────────

export const PUBLIC_BOOKING_LIMITS = {
  minAdvanceMinutes: { min: 0, max: 43_200 },
  maxAdvanceDays: { min: 1, max: 180 },
  slotIntervalMinutes: { min: 5, max: 240 },
  maxEntries: 100,
} as const;

export const PUBLIC_BOOKING_MIN_ADVANCE_OPTIONS = [30, 60, 120, 240, 720, 1440, 2880] as const;
export const PUBLIC_BOOKING_MAX_ADVANCE_OPTIONS = [7, 14, 30, 60, 90] as const;
export const PUBLIC_BOOKING_SLOT_INTERVAL_OPTIONS = [15, 20, 30, 60] as const;

export const PUBLIC_BOOKING_ACTIVATION_MESSAGE =
  "Para activar las reservas en línea elige al menos un doctor y un servicio.";
export const PUBLIC_BOOKING_VERSION_CONFLICT_MESSAGE = "Otra persona modificó esta configuración";
export const PUBLIC_BOOKING_UNAVAILABLE_LABEL = "Ya no disponible";
export const PUBLIC_BOOKING_NO_DURATION_NOTE = "Configura su duración en el catálogo para ofrecerlo en línea";

const { minAdvanceMinutes, maxAdvanceDays, slotIntervalMinutes } = PUBLIC_BOOKING_LIMITS;

export const publicBookingFormSchema = z.object({
  enabled: z.boolean(),
  doctorIds: z.array(z.string()),
  services: z.array(z.object({ serviceId: z.string(), doctorIds: z.array(z.string()) })),
  minAdvanceMinutes: z
    .number()
    .int()
    .min(minAdvanceMinutes.min, "La anticipación mínima no puede ser negativa.")
    .max(minAdvanceMinutes.max, `La anticipación mínima admite hasta ${minAdvanceMinutes.max} minutos.`),
  maxAdvanceDays: z
    .number()
    .int()
    .min(maxAdvanceDays.min, `Se puede reservar con ${maxAdvanceDays.min} a ${maxAdvanceDays.max} días de anticipación.`)
    .max(maxAdvanceDays.max, `Se puede reservar con ${maxAdvanceDays.min} a ${maxAdvanceDays.max} días de anticipación.`),
  slotIntervalMinutes: z
    .number()
    .int()
    .min(slotIntervalMinutes.min, `El intervalo debe estar entre ${slotIntervalMinutes.min} y ${slotIntervalMinutes.max} minutos.`)
    .max(slotIntervalMinutes.max, `El intervalo debe estar entre ${slotIntervalMinutes.min} y ${slotIntervalMinutes.max} minutos.`),
});

export const EMPTY_PUBLIC_BOOKING_FORM: PublicBookingFormValues = {
  enabled: false,
  doctorIds: [],
  services: [],
  minAdvanceMinutes: 120,
  maxAdvanceDays: 30,
  slotIntervalMinutes: 30,
};

export function publicBookingFormValues(settings: LeadPublicBookingSettings): PublicBookingFormValues {
  return {
    enabled: settings.enabled,
    doctorIds: [...(settings.doctorIds ?? [])],
    services: (settings.services ?? []).map((service) => ({
      serviceId: service.serviceId,
      doctorIds: [...(service.doctorIds ?? [])],
    })),
    minAdvanceMinutes: settings.minAdvanceMinutes,
    maxAdvanceDays: settings.maxAdvanceDays,
    slotIntervalMinutes: settings.slotIntervalMinutes,
  };
}

// ─── Estado en el sitio web ─────────────────────────────────────────

export type PublicBookingStatus = "active" | "pending" | "disabled";

export const PUBLIC_BOOKING_STATUS_LABELS: Record<PublicBookingStatus, string> = {
  active: "Activo en tu sitio web",
  pending: "Activado, pero aún no disponible en el sitio. Contacta a soporte.",
  disabled: "Desactivado",
};

export function publicBookingStatus(
  settings: Pick<LeadPublicBookingSettings, "enabled" | "publiclyAvailable">,
): PublicBookingStatus {
  if (!settings.enabled) return "disabled";
  return settings.publiclyAvailable ? "active" : "pending";
}

// ─── Textos de las reglas de agenda ─────────────────────────────────

export function formatBookingMinutes(minutes: number): string {
  if (minutes <= 0) return "Sin anticipación";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function formatBookingDays(days: number): string {
  return days === 1 ? "1 día" : `${days} días`;
}

/** Opciones de un selector; si el valor guardado no está entre ellas, se añade (nunca se cambia solo). */
export function bookingNumberOptions(
  options: readonly number[],
  current: number,
  format: (value: number) => string,
): { value: string; label: string }[] {
  const values = options.includes(current) ? [...options] : [...options, current].sort((a, b) => a - b);
  return values.map((value) => ({ value: String(value), label: format(value) }));
}

// ─── Catálogo, limpieza y validación ────────────────────────────────

/** Lo que hoy se puede ofrecer: doctores activos que atienden citas y servicios activos con duración. */
export interface PublicBookingCatalog {
  doctorIds: ReadonlySet<string>;
  serviceIds: ReadonlySet<string>;
}

/** Quita lo que ya no se puede ofrecer (doctor o servicio desactivado). Es lo que se envía al guardar. */
export function prunePublicBookingValues(
  values: PublicBookingFormValues,
  catalog: PublicBookingCatalog,
): PublicBookingFormValues {
  const doctorIds = values.doctorIds.filter((id) => catalog.doctorIds.has(id));
  const enabledDoctors = new Set(doctorIds);
  return {
    ...values,
    doctorIds,
    services: values.services
      .filter((service) => catalog.serviceIds.has(service.serviceId))
      .map((service) => ({
        serviceId: service.serviceId,
        doctorIds: service.doctorIds.filter((id) => enabledDoctors.has(id)),
      })),
  };
}

export interface PublicBookingProblems {
  /** Falta un doctor o un servicio para activar, o se supera el máximo. */
  general: string[];
  /** Servicios que se quedarían sin el doctor que tenían asignado: por id de servicio. */
  services: Record<string, string>;
}

/**
 * Reglas que el backend valida y que dependen del catálogo. `values` es lo que hay en pantalla
 * y `pruned` lo que se enviaría.
 */
export function publicBookingProblems(
  values: PublicBookingFormValues,
  pruned: PublicBookingFormValues,
): PublicBookingProblems {
  const general: string[] = [];
  const services: Record<string, string> = {};
  const { maxEntries } = PUBLIC_BOOKING_LIMITS;

  if (pruned.enabled && (pruned.doctorIds.length === 0 || pruned.services.length === 0)) {
    general.push(PUBLIC_BOOKING_ACTIVATION_MESSAGE);
  }
  if (pruned.doctorIds.length > maxEntries || pruned.services.length > maxEntries) {
    general.push(`Se admiten hasta ${maxEntries} doctores y ${maxEntries} servicios.`);
  }
  for (const service of pruned.services) {
    const before = values.services.find((item) => item.serviceId === service.serviceId);
    // Vacío significa "cualquier doctor": no se amplía en silencio quién atiende el servicio.
    if (before && before.doctorIds.length > 0 && service.doctorIds.length === 0) {
      services[service.serviceId] =
        "El doctor asignado ya no está disponible. Elige quién lo atiende o deja cualquier doctor habilitado.";
    }
  }
  return { general, services };
}

export function hasPublicBookingProblems(problems: PublicBookingProblems): boolean {
  return problems.general.length > 0 || Object.keys(problems.services).length > 0;
}

export function buildPublicBookingRequest(
  values: PublicBookingFormValues,
  version: number,
): UpdateLeadPublicBookingSettingsRequest {
  return {
    enabled: values.enabled,
    doctorIds: values.doctorIds,
    services: values.services.map((service) => ({ serviceId: service.serviceId, doctorIds: service.doctorIds })),
    minAdvanceMinutes: values.minAdvanceMinutes,
    maxAdvanceDays: values.maxAdvanceDays,
    slotIntervalMinutes: values.slotIntervalMinutes,
    version,
  };
}

function normalize(values: PublicBookingFormValues) {
  return JSON.stringify({
    ...values,
    doctorIds: [...values.doctorIds].sort(),
    services: values.services
      .map((service) => ({ serviceId: service.serviceId, doctorIds: [...service.doctorIds].sort() }))
      .sort((a, b) => a.serviceId.localeCompare(b.serviceId)),
  });
}

/** Igualdad sin importar el orden de las listas. */
export function samePublicBookingValues(a: PublicBookingFormValues, b: PublicBookingFormValues): boolean {
  return normalize(a) === normalize(b);
}

// ─── Cambios de selección ───────────────────────────────────────────

/** Al desmarcar un doctor se quita también de los servicios que lo tenían. */
export function setBookingDoctors(values: PublicBookingFormValues, doctorIds: string[]): PublicBookingFormValues {
  const enabled = new Set(doctorIds);
  return {
    ...values,
    doctorIds,
    services: values.services.map((service) => ({
      ...service,
      doctorIds: service.doctorIds.filter((id) => enabled.has(id)),
    })),
  };
}

export function toggleBookingDoctor(
  values: PublicBookingFormValues,
  doctorId: string,
  checked: boolean,
): PublicBookingFormValues {
  const without = values.doctorIds.filter((id) => id !== doctorId);
  return setBookingDoctors(values, checked ? [...without, doctorId] : without);
}

export function toggleBookingService(
  values: PublicBookingFormValues,
  serviceId: string,
  checked: boolean,
): PublicBookingFormValues {
  const without = values.services.filter((service) => service.serviceId !== serviceId);
  return { ...values, services: checked ? [...without, { serviceId, doctorIds: [] }] : without };
}

export function setBookingServiceDoctors(
  values: PublicBookingFormValues,
  serviceId: string,
  doctorIds: string[],
): PublicBookingFormValues {
  return {
    ...values,
    services: values.services.map((service) => (service.serviceId === serviceId ? { ...service, doctorIds } : service)),
  };
}
