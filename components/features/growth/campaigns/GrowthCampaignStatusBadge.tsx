"use client";

import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/ui/atomic/data-display/status-badge";
import { useI18n } from "@/lib/contexts/i18n-context";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { GrowthCampaignStatus } from "@/lib/entity/growth";

const STATUS_CONFIG: Record<
  GrowthCampaignStatus,
  { labelKey: TranslationKey; tone: StatusBadgeTone }
> = {
  DRAFT: { labelKey: "growth.campaign.status.draft", tone: "neutral" },
  SCHEDULED: { labelKey: "growth.campaign.status.scheduled", tone: "info" },
  RUNNING: { labelKey: "growth.campaign.status.running", tone: "progress" },
  PAUSED: { labelKey: "growth.campaign.status.paused", tone: "warning" },
  COMPLETED: { labelKey: "growth.campaign.status.completed", tone: "success" },
  CANCELLED: { labelKey: "growth.campaign.status.cancelled", tone: "neutral" },
  FAILED: { labelKey: "growth.campaign.status.failed", tone: "danger" },
};

interface GrowthCampaignStatusBadgeProps {
  status: GrowthCampaignStatus;
  className?: string;
}

export function GrowthCampaignStatusBadge({
  status,
  className,
}: GrowthCampaignStatusBadgeProps) {
  const { t } = useI18n();
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <StatusBadge tone={config.tone} className={className}>
      {t(config.labelKey)}
    </StatusBadge>
  );
}
