/**
 * Adquisición de pacientes (módulo LEAD_CRM).
 *
 * Tipos, enumerados y reglas puras del contrato `/leads`. En la interfaz un lead se llama
 * "prospecto". El frontend nunca envía `clinicId` (sale de la sesión) ni crea el paciente:
 * reservar o convertir es una sola llamada que el backend resuelve de forma atómica.
 */

/** Módulo de `GET /clinic/capabilities` → `modules` que enciende esta sección. */
export const LEAD_CRM_MODULE = "LEAD_CRM";

// ─── Enumerados ─────────────────────────────────────────────────────

export const LEAD_STAGES = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

/** Etapas a las que se llega con `POST /leads/{id}/stage`. Las otras dos tienen su operación. */
export const LEAD_OPEN_STAGES = ["NEW", "CONTACTED", "QUALIFIED"] as const;
export type LeadOpenStage = (typeof LEAD_OPEN_STAGES)[number];

export type LeadOutcome = "OPEN" | "CONVERTED" | "LOST" | "EXISTING_PATIENT";

export type LeadLostReason = "NOT_INTERESTED" | "NO_RESPONSE" | "EXISTING_PATIENT" | "NOT_A_LEAD" | "OTHER";

/** Motivos que admite `POST /leads/{id}/lose` (EXISTING_PATIENT sale de confirmar una coincidencia). */
export const LEAD_LOSE_REASONS = ["NOT_INTERESTED", "NO_RESPONSE", "NOT_A_LEAD", "OTHER"] as const;
export type LeadLoseReason = (typeof LEAD_LOSE_REASONS)[number];

export const LEAD_TEMPERATURES = ["COLD", "WARM", "HOT"] as const;
export type LeadTemperature = (typeof LEAD_TEMPERATURES)[number];

export const LEAD_SOURCES = [
  "WHATSAPP",
  "WEBSITE",
  "LANDING_PAGE",
  "META_ADS",
  "GOOGLE_ADS",
  "INSTAGRAM",
  "FACEBOOK",
  "REFERRAL",
  "MANUAL",
  "OTHER",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export type LeadPatientMatchStatus = "NONE" | "POSSIBLE" | "CONFIRMED" | "DISMISSED";
export type LeadConversionMethod = "BOOKING" | "MANUAL";
export type LeadConsentStatus = "UNKNOWN" | "OPTED_IN" | "OPTED_OUT";
export type LeadFollowUpStatus = "PENDING" | "DONE" | "CANCELLED";
export type LeadMatchedBy = "PHONE" | "EMAIL" | "PHONE_AND_EMAIL";
export type LeadActorType = "USER" | "AI" | "SYSTEM";

export type LeadActivityType =
  | "CREATED"
  | "SOURCE_ADDED"
  | "NOTE_ADDED"
  | "STAGE_CHANGED"
  | "TEMPERATURE_CHANGED"
  | "ASSIGNED"
  | "FOLLOW_UP_SCHEDULED"
  | "FOLLOW_UP_COMPLETED"
  | "PATIENT_MATCH_RESOLVED"
  | "CONVERTED"
  | "CAMPAIGN_SENT";

// ─── Etiquetas ──────────────────────────────────────────────────────

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  NEW: "Nuevo",
  CONTACTED: "Contactado",
  QUALIFIED: "Calificado",
  CONVERTED: "Convertido",
  LOST: "Cerrado",
};

export const LEAD_OUTCOME_LABELS: Record<LeadOutcome, string> = {
  OPEN: "Abierto",
  CONVERTED: "Convertido",
  LOST: "Perdido",
  EXISTING_PATIENT: "Ya era paciente",
};

export const LEAD_LOST_REASON_LABELS: Record<LeadLostReason, string> = {
  NOT_INTERESTED: "No le interesó",
  NO_RESPONSE: "No respondió",
  EXISTING_PATIENT: "Ya era paciente",
  NOT_A_LEAD: "No era un prospecto",
  OTHER: "Otro",
};

export const LEAD_TEMPERATURE_LABELS: Record<LeadTemperature, string> = {
  COLD: "Frío",
  WARM: "Tibio",
  HOT: "Caliente",
};
export const LEAD_UNCLASSIFIED_LABEL = "Sin clasificar";

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  WHATSAPP: "WhatsApp",
  WEBSITE: "Sitio web",
  LANDING_PAGE: "Landing",
  META_ADS: "Meta Ads",
  GOOGLE_ADS: "Google Ads",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  REFERRAL: "Referido",
  MANUAL: "Manual",
  OTHER: "Otro",
};

export const LEAD_CONVERSION_METHOD_LABELS: Record<LeadConversionMethod, string> = {
  BOOKING: "Con cita",
  MANUAL: "Manual",
};

export const LEAD_CONSENT_LABELS: Record<LeadConsentStatus, string> = {
  UNKNOWN: "Sin registrar",
  OPTED_IN: "Aceptó",
  OPTED_OUT: "No acepta",
};

export const LEAD_FOLLOW_UP_STATUS_LABELS: Record<LeadFollowUpStatus, string> = {
  PENDING: "Pendiente",
  DONE: "Hecho",
  CANCELLED: "Cancelado",
};

export const LEAD_MATCHED_BY_LABELS: Record<LeadMatchedBy, string> = {
  PHONE: "Mismo teléfono",
  EMAIL: "Mismo correo",
  PHONE_AND_EMAIL: "Mismo teléfono y correo",
};

// ─── Modelos ────────────────────────────────────────────────────────

export interface Lead {
  id: string;
  fullName: string | null;
  phone: string | null;
  phoneE164: string | null;
  phoneVerified: boolean;
  email: string | null;
  stage: LeadStage;
  outcome: LeadOutcome;
  lostReason: LeadLostReason | null;
  temperature: LeadTemperature | null;
  source: LeadSource;
  sourceDetail: string | null;
  sourceCampaign: string | null;
  externalLeadId: string | null;
  sourceMetadata: Record<string, unknown> | null;
  interestServiceId: string | null;
  interestServiceName: string | null;
  interestNote: string | null;
  assignedToUserId: string | null;
  conversationId: string | null;
  patientMatchStatus: LeadPatientMatchStatus;
  matchedPatientId: string | null;
  patientId: string | null;
  convertedAt: string | null;
  conversionMethod: LeadConversionMethod | null;
  firstAppointmentId: string | null;
  consentStatus: LeadConsentStatus;
  consentSource: string | null;
  consentAt: string | null;
  lastActivityAt: string | null;
  nextFollowUpAt: string | null;
  overdueFollowUp: boolean;
  version: number;
  createdAt: string | null;
  createdBy: string | null;
}

export interface LeadPagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface LeadPage {
  entities: Lead[];
  pagination: LeadPagination;
}

export interface LeadPipeline {
  stages: { stage: LeadStage; count: number }[];
  lostAsExistingPatient: number;
  overdueFollowUps: number;
  pendingPatientMatches: number;
}

/** Los seguimientos usan `createAt` / `createBy` (sin "d"), tal cual los devuelve el backend. */
export interface LeadFollowUp {
  id: string;
  leadId: string;
  dueAt: string;
  note: string | null;
  assignedToUserId: string | null;
  status: LeadFollowUpStatus;
  completedAt: string | null;
  completedBy: string | null;
  createAt: string | null;
  createBy: string | null;
}

export interface LeadPatientMatch {
  patientId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  matchedBy: LeadMatchedBy;
}

export interface LeadDetail {
  lead: Lead;
  followUps: LeadFollowUp[];
  patientMatches: LeadPatientMatch[];
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: LeadActivityType | string;
  actorType: LeadActorType | string;
  actorUserId: string | null;
  actorName: string | null;
  payload: Record<string, unknown> | null;
  occurredAt: string;
}

export interface LeadActivityPage {
  entities: LeadActivity[];
  pagination: LeadPagination;
}

export interface LeadMatches {
  openLeads: Lead[];
  patients: LeadPatientMatch[];
}

export interface LeadByConversation {
  lead: Lead | null;
}

export interface LeadFromConversationResult {
  lead: Lead;
  created: boolean;
}

export interface LeadConversionAppointment {
  id: string;
  doctorId: string;
  date: string;
  time: string;
  duration: number;
}

export interface LeadConversionResult {
  lead: Lead;
  patientId: string;
  patientCreated: boolean;
  appointment: LeadConversionAppointment | null;
  replayed: boolean;
}

// ─── Filtros y peticiones ───────────────────────────────────────────

/** Filtros de `GET /leads` y `GET /leads/pipeline` (este último ignora `stage`). */
export interface LeadFilters {
  q?: string;
  stage?: LeadStage;
  temperature?: LeadTemperature;
  unclassified?: boolean;
  source?: LeadSource;
  assignedToUserId?: string;
  unassigned?: boolean;
  interestServiceId?: string;
  /** Instantes ISO-8601 UTC. `createdTo` y `lastActivityTo` son exclusivos. */
  createdFrom?: string;
  createdTo?: string;
  lastActivityFrom?: string;
  lastActivityTo?: string;
  overdueFollowUp?: boolean;
  pendingPatientMatch?: boolean;
}

export interface LeadListQuery extends LeadFilters {
  page?: number;
  pageSize?: number;
}

export interface CreateLeadRequest {
  fullName?: string;
  phone?: string;
  email?: string;
  source?: LeadSource;
  sourceDetail?: string;
  sourceCampaign?: string;
  interestServiceId?: string;
  interestNote?: string;
  temperature?: LeadTemperature;
  assignedToUserId?: string;
  note?: string;
  allowDuplicate?: boolean;
}

/** Campos que `PATCH /leads/{id}` puede vaciar nombrándolos en `clear`. */
export type LeadClearableField =
  | "fullName"
  | "phone"
  | "email"
  | "temperature"
  | "interest"
  | "interestNote"
  | "sourceDetail"
  | "sourceCampaign";

export interface UpdateLeadRequest {
  version: number;
  fullName?: string;
  phone?: string;
  email?: string;
  temperature?: LeadTemperature;
  interestServiceId?: string;
  interestNote?: string;
  sourceDetail?: string;
  sourceCampaign?: string;
  clear?: LeadClearableField[];
}

export interface ScheduleFollowUpRequest {
  dueAt: string;
  note?: string;
  assignedToUserId?: string;
}

export interface LoseLeadRequest {
  reason: LeadLoseReason;
  note?: string;
}

export interface LeadFromConversationRequest {
  conversationId: string;
  fullName?: string;
  interestServiceId?: string;
  interestNote?: string;
}

export interface BookLeadRequest {
  doctorId: string;
  /** `YYYY-MM-DD` en hora local de la clínica. */
  date: string;
  /** `HH:mm`. */
  time: string;
  duration?: number;
  type?: string;
  notes?: string;
  serviceIds?: string[];
  fullName?: string;
  existingPatientId?: string | null;
}

export interface ConvertLeadRequest {
  fullName?: string;
  existingPatientId?: string | null;
}

export type ResolvePatientMatchRequest =
  | { decision: "DISMISS" }
  | { decision: "CONFIRM"; patientId: string };

// ─── Reglas puras ───────────────────────────────────────────────────

export type LeadStatusKey = LeadOpenStage | "CONVERTED" | "LOST" | "EXISTING_PATIENT";
export type LeadStatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface LeadStatus {
  key: LeadStatusKey;
  label: string;
  tone: LeadStatusTone;
}

const OPEN_STAGE_TONES: Record<LeadOpenStage, LeadStatusTone> = {
  NEW: "info",
  CONTACTED: "neutral",
  QUALIFIED: "warning",
};

/**
 * Estado que se pinta para un prospecto. Manda `outcome`, no `stage`:
 * `EXISTING_PATIENT` llega con `stage: "LOST"` pero se muestra "Ya era paciente" (neutro),
 * nunca "Perdido".
 */
export function leadStatus(lead: Pick<Lead, "stage" | "outcome">): LeadStatus {
  switch (lead.outcome) {
    case "CONVERTED":
      return { key: "CONVERTED", label: LEAD_OUTCOME_LABELS.CONVERTED, tone: "success" };
    case "EXISTING_PATIENT":
      return { key: "EXISTING_PATIENT", label: LEAD_OUTCOME_LABELS.EXISTING_PATIENT, tone: "neutral" };
    case "LOST":
      return { key: "LOST", label: LEAD_OUTCOME_LABELS.LOST, tone: "danger" };
    default: {
      const stage: LeadOpenStage = isOpenStage(lead.stage) ? lead.stage : "NEW";
      return { key: stage, label: LEAD_STAGE_LABELS[stage], tone: OPEN_STAGE_TONES[stage] };
    }
  }
}

export function isOpenStage(stage: string): stage is LeadOpenStage {
  return (LEAD_OPEN_STAGES as readonly string[]).includes(stage);
}

export function isLeadOpen(lead: Pick<Lead, "outcome">): boolean {
  return lead.outcome === "OPEN";
}

/** Cerrado sin convertir (perdido o ya era paciente): se puede reabrir. */
export function isLeadClosed(lead: Pick<Lead, "outcome">): boolean {
  return lead.outcome === "LOST" || lead.outcome === "EXISTING_PATIENT";
}

/** Mientras la coincidencia esté sin resolver, reservar y convertir responden 409. */
export function hasPendingPatientMatch(lead: Pick<Lead, "patientMatchStatus">): boolean {
  return lead.patientMatchStatus === "POSSIBLE";
}

/** Nombre a mostrar: un prospecto de WhatsApp puede no tener nombre → su teléfono. */
export function leadDisplayName(lead: Pick<Lead, "fullName" | "phone" | "phoneE164" | "email">): string {
  return (
    lead.fullName?.trim() ||
    lead.phone?.trim() ||
    lead.phoneE164?.trim() ||
    lead.email?.trim() ||
    "Prospecto sin nombre"
  );
}

export function leadTemperatureLabel(temperature: LeadTemperature | null | undefined): string {
  return temperature ? LEAD_TEMPERATURE_LABELS[temperature] : LEAD_UNCLASSIFIED_LABEL;
}

export function leadSourceLabel(source: string): string {
  return LEAD_SOURCE_LABELS[source as LeadSource] ?? source;
}

/** Seguimiento pendiente cuya fecha ya pasó. */
export function isFollowUpOverdue(followUp: Pick<LeadFollowUp, "status" | "dueAt">, now = Date.now()): boolean {
  if (followUp.status !== "PENDING") return false;
  const due = new Date(followUp.dueAt).getTime();
  return !Number.isNaN(due) && due < now;
}

/** Suma del contador del menú: seguimientos vencidos + coincidencias sin resolver. */
export function pipelineAttentionCount(pipeline: LeadPipeline | undefined): number {
  if (!pipeline) return 0;
  return (pipeline.overdueFollowUps ?? 0) + (pipeline.pendingPatientMatches ?? 0);
}

export function pipelineStageCount(pipeline: LeadPipeline | undefined, stage: LeadStage): number {
  return pipeline?.stages.find((entry) => entry.stage === stage)?.count ?? 0;
}

// ─── Línea de tiempo ────────────────────────────────────────────────

const ACTIVITY_TITLES: Record<LeadActivityType, string> = {
  CREATED: "Prospecto creado",
  SOURCE_ADDED: "Nuevo contacto registrado",
  NOTE_ADDED: "Nota",
  STAGE_CHANGED: "Cambio de etapa",
  TEMPERATURE_CHANGED: "Cambio de temperatura",
  ASSIGNED: "Cambio de responsable",
  FOLLOW_UP_SCHEDULED: "Seguimiento programado",
  FOLLOW_UP_COMPLETED: "Seguimiento cerrado",
  PATIENT_MATCH_RESOLVED: "Coincidencia con paciente resuelta",
  CONVERTED: "Convertido en paciente",
  CAMPAIGN_SENT: "Campaña enviada",
};

export interface LeadActivityDescription {
  title: string;
  /** Detalle opcional; ausente cuando el `payload` no trae lo esperado. */
  detail?: string;
  /** Campaña del evento `CAMPAIGN_SENT`, para enlazarla. */
  campaignId?: string;
}

function text(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stageOrOutcomeLabel(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return (
    LEAD_STAGE_LABELS[value as LeadStage] ??
    LEAD_OUTCOME_LABELS[value as LeadOutcome] ??
    undefined
  );
}

/**
 * Frase para un evento de la línea de tiempo. Tolerante por diseño: el `payload` cambia según
 * el tipo, así que si falta una clave esperada (o el tipo es desconocido) devuelve solo el
 * título. Nunca lanza.
 */
export function describeLeadActivity(
  activity: Pick<LeadActivity, "type" | "payload">,
  formatDateTime: (iso: string) => string = (iso) => iso,
): LeadActivityDescription {
  const title = ACTIVITY_TITLES[activity.type as LeadActivityType] ?? "Actividad";
  const payload = activity.payload && typeof activity.payload === "object" ? activity.payload : {};

  try {
    switch (activity.type) {
      case "CREATED":
      case "SOURCE_ADDED": {
        const source = text(payload, "source");
        return source ? { title, detail: `Origen: ${leadSourceLabel(source)}` } : { title };
      }
      case "NOTE_ADDED":
        return { title, detail: text(payload, "note") };
      case "STAGE_CHANGED": {
        const from = stageOrOutcomeLabel(text(payload, "from") ?? text(payload, "fromStage"));
        const to = stageOrOutcomeLabel(text(payload, "to"));
        const reason = text(payload, "reason");
        const reasonLabel = reason ? LEAD_LOST_REASON_LABELS[reason as LeadLostReason] ?? undefined : undefined;
        const note = text(payload, "note");
        if (!to) return { title };
        const parts = [from ? `${from} → ${to}` : `Pasó a ${to}`, reasonLabel, note].filter(Boolean);
        return { title: payload.reopened === true ? "Prospecto reabierto" : title, detail: parts.join(" · ") };
      }
      case "TEMPERATURE_CHANGED": {
        const to = text(payload, "to");
        const from = text(payload, "from");
        if (!to && !from) return { title };
        const label = (value: string | undefined) =>
          value ? LEAD_TEMPERATURE_LABELS[value as LeadTemperature] ?? LEAD_UNCLASSIFIED_LABEL : LEAD_UNCLASSIFIED_LABEL;
        return { title, detail: `${label(from)} → ${label(to)}` };
      }
      case "ASSIGNED":
        return { title, detail: text(payload, "to") ? undefined : "Quedó sin responsable" };
      case "FOLLOW_UP_SCHEDULED": {
        const dueAt = text(payload, "dueAt");
        const note = text(payload, "note");
        const parts = [dueAt ? `Para el ${formatDateTime(dueAt)}` : undefined, note].filter(Boolean);
        return parts.length ? { title, detail: parts.join(" · ") } : { title };
      }
      case "FOLLOW_UP_COMPLETED":
        return { title, detail: text(payload, "note") };
      case "PATIENT_MATCH_RESOLVED": {
        const decision = text(payload, "decision");
        if (decision === "CONFIRM") return { title, detail: "Se confirmó que ya era paciente" };
        if (decision === "DISMISS") return { title, detail: "Se descartó: es otra persona" };
        return { title };
      }
      case "CONVERTED": {
        const method = text(payload, "method");
        const label = method ? LEAD_CONVERSION_METHOD_LABELS[method as LeadConversionMethod] : undefined;
        return label ? { title, detail: `Conversión: ${label.toLowerCase()}` } : { title };
      }
      case "CAMPAIGN_SENT": {
        const name = text(payload, "campaignName");
        const template = text(payload, "templateName");
        return {
          title: name ? `Se le envió la campaña «${name}»` : "Se le envió una campaña",
          detail: template ? `Plantilla: ${template}` : undefined,
          campaignId: text(payload, "campaignId"),
        };
      }
      default:
        return { title };
    }
  } catch {
    return { title };
  }
}

export function leadActorLabel(activity: Pick<LeadActivity, "actorType" | "actorName">): string {
  if (activity.actorType === "AI") return "Recepcionista IA";
  if (activity.actorType === "SYSTEM") return "Sistema";
  return activity.actorName?.trim() || "Usuario";
}

export * from "./public-booking";
