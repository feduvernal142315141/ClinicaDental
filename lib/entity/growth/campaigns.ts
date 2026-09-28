/**
 * Growth Campaign entities — B1-B6 contracts.
 * Aligned with backend: GetGrowthCampaignResponseModel, CreateGrowthCampaignCommand,
 * UpdateGrowthCampaignCommand, CampaignGrowthStatus, CampaignType.
 */

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
