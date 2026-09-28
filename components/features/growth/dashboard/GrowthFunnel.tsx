"use client";

import { DataCard } from "@/components/ui/atomic/data-display/data-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { Info } from "lucide-react";
import type { GrowthFunnelStage } from "@/lib/entity/growth";
import { cn } from "@/lib/utils/utils";

/** Map backend stage keys to Spanish display labels */
const STAGE_LABELS: Record<string, string> = {
  sent: "Enviados",
  delivered: "Entregados",
  read: "Leídos",
  replied: "Respondieron",
  appointments_created: "Citas generadas",
  appointmentsCreated: "Citas generadas",
  appointments_completed: "Citas completadas",
  appointmentsCompleted: "Citas completadas",
};

/** Deterministic bar colour by position */
const BAR_COLORS = [
  "bg-brand",
  "bg-sky-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-emerald-600",
];

interface GrowthFunnelProps {
  funnel: GrowthFunnelStage[];
}

export function GrowthFunnel({ funnel }: GrowthFunnelProps) {
  const steps = funnel;
  const maxValue = Math.max(...steps.map((s) => s.count), 1);

  return (
    <DataCard
      title="Embudo de conversión"
      description="Actividad en el período seleccionado"
    >
      <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            Las métricas reflejan eventos ocurridos dentro del período
            seleccionado. Es posible que los conteos no sean monotónicos
            (ej: más entregados que enviados) porque algunos mensajes
            pudieron enviarse antes del período y entregarse dentro de él.
          </TooltipContent>
        </Tooltip>
        Período de actividad — puede no ser monotónico
      </div>
      <div className="space-y-3 py-2">
        {steps.map((step, i) => {
          const label = STAGE_LABELS[step.stage] ?? step.stage;
          const barWidth =
            maxValue > 0 ? (step.count / maxValue) * 100 : 0;

          return (
            <div key={step.stage} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink">{label}</span>
                <div className="flex items-center gap-3 text-xs text-subtle tabular-nums">
                  <span className="font-semibold text-ink">
                    {step.count.toLocaleString("es")}
                  </span>
                  {i > 0 && (
                    <>
                      <span title="Tasa vs paso anterior">
                        {(step.rateFromPrevious * 100).toFixed(1)}%
                      </span>
                      <span
                        className="text-muted-foreground"
                        title="Tasa vs inicio"
                      >
                        ({(step.rateFromStart * 100).toFixed(1)}% total)
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="h-6 w-full rounded-lg bg-hover">
                <div
                  className={cn(
                    "h-full rounded-lg transition-all duration-500",
                    BAR_COLORS[i] ?? "bg-brand",
                  )}
                  style={{ width: `${Math.max(barWidth, 1)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </DataCard>
  );
}
