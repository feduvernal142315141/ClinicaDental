"use client";

import { DataCard } from "@/components/ui/atomic/data-display/data-card";
import { Progress } from "@/components/ui/atomic/data-display/progress";
import type { GrowthEngagement } from "@/lib/entity/growth";

interface GrowthEngagementCardProps {
  engagement: GrowthEngagement;
}

interface MetricRow {
  label: string;
  value: number;
  rate?: number;
  color: string;
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export function GrowthEngagementCard({
  engagement,
}: GrowthEngagementCardProps) {
  const rows: MetricRow[] = [
    {
      label: "Enviados",
      value: engagement.sent,
      color: "text-brand",
    },
    {
      label: "Entregados",
      value: engagement.delivered,
      rate: engagement.deliveryRate,
      color: "text-sky-600 dark:text-sky-300",
    },
    {
      label: "Leídos",
      value: engagement.read,
      rate: engagement.readRate,
      color: "text-violet-600 dark:text-violet-300",
    },
    {
      label: "Respondieron",
      value: engagement.replied,
      rate: engagement.replyRate,
      color: "text-amber-600 dark:text-amber-300",
    },
    {
      label: "Fallidos",
      value: engagement.failed,
      color: "text-rose-600 dark:text-rose-300",
    },
  ];

  return (
    <DataCard title="Engagement" description="Métricas de interacción">
      <div className="space-y-4 py-2">
        {rows.map((row) => (
          <div key={row.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-subtle">{row.label}</span>
              <div className="flex items-center gap-2 tabular-nums">
                <span className="font-semibold text-ink">
                  {row.value.toLocaleString("es")}
                </span>
                {row.rate !== undefined && (
                  <span className={row.color}>{formatRate(row.rate)}</span>
                )}
              </div>
            </div>
            {row.rate !== undefined && (
              <Progress value={row.rate * 100} className="h-1.5" />
            )}
          </div>
        ))}
      </div>
    </DataCard>
  );
}
