import type { LeadFilters, LeadListQuery } from "@/lib/entity/leads";

/**
 * Claves de React Query de "Adquisición de pacientes". Todo cuelga de `["leads"]` para poder
 * invalidar o descartar el módulo entero de una vez (p. ej. cuando se apaga desde el Control Center).
 */
export const leadKeys = {
  all: ["leads"] as const,
  lists: () => ["leads", "list"] as const,
  list: (query: LeadListQuery) => ["leads", "list", query] as const,
  pipelines: () => ["leads", "pipeline"] as const,
  pipeline: (filters: LeadFilters) => ["leads", "pipeline", filters] as const,
  detail: (id: string) => ["leads", "detail", id] as const,
  activities: (id: string) => ["leads", "activity", id] as const,
  activity: (id: string, page: number) => ["leads", "activity", id, page] as const,
  byConversation: (conversationId: string) => ["leads", "by-conversation", conversationId] as const,
  matches: (phone: string, email: string) => ["leads", "matches", phone, email] as const,
  publicBookingSettings: () => ["leads", "public-booking-settings"] as const,
};

/** Catálogos de otros módulos (servicios, usuarios): sobreviven aunque se descarte `["leads"]`. */
export const leadCatalogKeys = {
  services: ["lead-catalog", "services"] as const,
  users: ["lead-catalog", "users"] as const,
  providers: ["lead-catalog", "providers"] as const,
  bookingDoctors: ["lead-catalog", "booking-doctors"] as const,
  bookingServices: ["lead-catalog", "booking-services"] as const,
  availability: (doctorId: string, date: string, duration: number) =>
    ["lead-catalog", "availability", doctorId, date, duration] as const,
};
