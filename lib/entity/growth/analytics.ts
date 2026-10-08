/**
 * Growth Analytics entities — B7.1 contracts.
 * Aligned with backend: GrowthDashboardResponse, GrowthAnalyticsRepository records.
 *
 * IMPORTANT semantics:
 * - Dashboard summary = PERIOD ACTIVITY (events within from/to window).
 *   Funnel can be non-monotonic.
 * - Campaign list/detail = LIFETIME metrics.
 */

// ── Dashboard summary (GrowthDashboardResponse) ────────────────────────────

export interface GrowthDashboardResponse {
  period: { from: string; to: string };
  campaigns: {
    total: number;
    active: number;
    completed: number;
  };
  funnel: GrowthFunnelStage[];
  engagement: GrowthEngagement;
  conversions: GrowthConversions;
  value: GrowthValueMetrics;
}

export interface GrowthFunnelStage {
  stage: string;
  count: number;
  rateFromPrevious: number;
  rateFromStart: number;
}

export interface GrowthEngagement {
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  failed: number;
  /** 0..1 */
  deliveryRate: number;
  /** 0..1 */
  readRate: number;
  /** 0..1 */
  replyRate: number;
}

export interface GrowthConversions {
  appointmentsCreated: number;
  appointmentsCompleted: number;
  /** 0..1 */
  appointmentRate: number;
  /** 0..1 */
  attendanceRate: number;
}

export interface GrowthValueMetrics {
  attributedValue: number;
  averagePerCompletedAppointment: number;
  currency: string | null;
}

// ── Campaign performance (CampaignPerformanceRow) ───────────────────────────

export interface GrowthCampaignPerformanceRow {
  campaignId: string;
  name: string;
  campaignType: string;
  growthStatus: string;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  estimatedAudienceCount: number;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  failed: number;
  appointmentsCreated: number;
  appointmentsCompleted: number;
  attributedValue: number;
}

// ── Campaign detail analytics (CampaignDetailAnalytics) ─────────────────────

export interface GrowthCampaignDetailAnalytics {
  campaignId: string;
  name: string;
  campaignType: string;
  growthStatus: string;
  estimatedAudienceCount: number;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  failed: number;
  appointmentsCreated: number;
  appointmentsCompleted: number;
  attributedValue: number;
  /** Attribution breakdown — flat counts, not nested objects */
  attributionContextWamid: number;
  attributionQuickReply: number;
  attributionTemporalFallback: number;
}

// ── Campaign conversion (individual rows from GET /conversions) ─────────────

export interface GrowthCampaignConversion {
  id: string;
  campaignId: string;
  campaignMessageId: string;
  /** `null` when the recipient was still a prospect. */
  patientId: string | null;
  leadId?: string | null;
  conversionType: "REPLIED" | "APPOINTMENT_CREATED" | "APPOINTMENT_COMPLETED";
  appointmentId?: string;
  doctorId?: string;
  serviceId?: string;
  serviceName?: string;
  attributedValue: number;
  attributedValueSource?: string;
  currency?: string;
  attributionMethod: string;
  convertedAt: string;
}

export interface GrowthCampaignConversionsResponse {
  entities: GrowthCampaignConversion[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}
