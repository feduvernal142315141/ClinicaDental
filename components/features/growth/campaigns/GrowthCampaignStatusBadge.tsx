"use client";

import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/ui/atomic/data-display/status-badge";
import type { GrowthCampaignStatus } from "@/lib/entity/growth";

const STATUS_CONFIG: Record<
  GrowthCampaignStatus,
  { label: string; tone: StatusBadgeTone }
> = {
  DRAFT: { label: "Borrador", tone: "neutral" },
  SCHEDULED: { label: "Programada", tone: "info" },
  RUNNING: { label: "En curso", tone: "progress" },
  PAUSED: { label: "Pausada", tone: "warning" },
  COMPLETED: { label: "Completada", tone: "success" },
  CANCELLED: { label: "Cancelada", tone: "neutral" },
  FAILED: { label: "Fallida", tone: "danger" },
};

interface GrowthCampaignStatusBadgeProps {
  status: GrowthCampaignStatus;
  className?: string;
}

export function GrowthCampaignStatusBadge({
  status,
  className,
}: GrowthCampaignStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <StatusBadge tone={config.tone} className={className}>
      {config.label}
    </StatusBadge>
  );
}
