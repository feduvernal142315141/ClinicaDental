/**
 * Growth Campaign entities — B1-B6 contracts.
 * Aligned with backend: GetGrowthCampaignResponseModel, CreateGrowthCampaignCommand,
 * UpdateGrowthCampaignCommand, CampaignGrowthStatus, CampaignType.
 */

import type { SegmentAudience } from "./segments";

export type GrowthCampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";

/**
 * Backend CampaignType enum — functional type of campaign.
 * NOT the template category (MARKETING/UTILITY).
 */
export type GrowthCampaignType =
  | "REACTIVATION"
  | "NO_SHOW"
  | "CANCELLED_WITHOUT_RESCHEDULE"
  | "PROMOTION"
  | "SERVICE_SPECIFIC"
  | "BIRTHDAY"
  | "MANUAL"
  | "FOLLOW_UP";

export const CAMPAIGN_TYPE_LABELS: Record<GrowthCampaignType, string> = {
  REACTIVATION: "Reactivación",
  NO_SHOW: "No asistió",
  CANCELLED_WITHOUT_RESCHEDULE: "Canceló sin reagendar",
  PROMOTION: "Promoción",
  SERVICE_SPECIFIC: "Servicio específico",
  BIRTHDAY: "Cumpleaños",
  MANUAL: "Manual",
  FOLLOW_UP: "Seguimiento",
};

/**
 * Backend GetGrowthCampaignResponseModel — exact field names.
 */
export interface GrowthCampaign {
  id: string;
  name: string;
  description?: string;
  campaignType: string;
  /** Backend field name is `growthStatus`, not `status` */
  growthStatus: GrowthCampaignStatus;
  segmentId?: string;
  segmentName?: string;
  templateId?: string;
  templateName?: string;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  estimatedAudienceCount?: number;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalReplied: number;
  totalFailed: number;
  active: boolean;
  createdAt: string;
  /** Audience of its segment. Absent on a backend older than audiences: treat as PATIENT. */
  audience?: SegmentAudience | string;
  /** Prospects that became patients after receiving it; `null` on a patient campaign. Detail only. */
  convertedLeads?: number | null;
}

export interface GrowthCampaignListResponse {
  entities: GrowthCampaign[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface GrowthCampaignQueryParams {
  page?: number;
  pageSize?: number;
  filters?: string[];
  orders?: string[];
}

/**
 * Backend CreateGrowthCampaignCommand — exact fields.
 * scheduledAt is Instant (ISO 8601 string with timezone, e.g. "2026-10-01T14:00:00Z").
 */
export interface CreateGrowthCampaignRequest {
  name: string;
  description?: string;
  campaignType: GrowthCampaignType;
  segmentId: string;
  templateId: string;
  scheduledAt?: string;
}

/**
 * Backend UpdateGrowthCampaignCommand — exact fields.
 */
export interface UpdateGrowthCampaignRequest {
  name?: string;
  description?: string;
  campaignType?: GrowthCampaignType;
  segmentId?: string;
  templateId?: string;
  scheduledAt?: string;
}

// ── Recipients (GET /growth/campaigns/{id}/messages) ────────────────────────

export type GrowthCampaignDeliveryStatus =
  | "PENDING"
  | "PROCESSING"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED"
  | "SKIPPED";

export const CAMPAIGN_DELIVERY_STATUS_LABELS: Record<GrowthCampaignDeliveryStatus, string> = {
  PENDING: "Pendiente",
  PROCESSING: "Enviando",
  SENT: "Enviado",
  DELIVERED: "Entregado",
  READ: "Leído",
  FAILED: "Falló",
  SKIPPED: "Omitido",
};

export function campaignDeliveryStatusLabel(status: string): string {
  return CAMPAIGN_DELIVERY_STATUS_LABELS[status as GrowthCampaignDeliveryStatus] ?? status;
}

/** One recipient of a campaign. A prospect has `leadId` and no `patientId`. */
export interface GrowthCampaignMessage {
  id: string;
  campaignId: string;
  patientId: string | null;
  leadId?: string | null;
  phone: string;
  deliveryStatus: GrowthCampaignDeliveryStatus | string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  repliedAt?: string | null;
  failedAt?: string | null;
  /** Why it failed or was skipped, in Spanish: shown as it comes. */
  failureReason?: string | null;
}

/**
 * Without permission over `leads`, `entities` arrives empty and `pagination.total` is still the
 * real number: show the total, never who.
 */
export interface GrowthCampaignMessagesResponse {
  entities: GrowthCampaignMessage[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

// ── Templates for a campaign to prospects ───────────────────────────────────

/** `{{1}}` = recipient's name, `{{2}}` = clinic's name. Nothing else can be filled for a prospect. */
export const CAMPAIGN_LEAD_MAX_TEMPLATE_VARIABLES = 2;

/** Highest `{{N}}` the template body uses; 0 when it has no variables (same rule as the backend). */
export function campaignTemplateVariableCount(body: string | null | undefined): number {
  if (!body) return 0;
  let max = 0;
  for (const match of body.matchAll(/\{\{(\d+)\}\}/g)) {
    max = Math.max(max, Number(match[1]));
  }
  return max;
}

/** A campaign to prospects is rejected when its template asks for more than two variables. */
export function isTemplateSupportedForLeads(body: string | null | undefined): boolean {
  return campaignTemplateVariableCount(body) <= CAMPAIGN_LEAD_MAX_TEMPLATE_VARIABLES;
}

export const CAMPAIGN_LEAD_TEMPLATE_UNSUPPORTED_MESSAGE =
  "Esta plantilla usa más de dos variables. Para prospectos solo se pueden completar el nombre del prospecto y el de la clínica: elige otra plantilla.";
