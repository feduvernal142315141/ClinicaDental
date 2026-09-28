"use client";

import { DataCard } from "@/components/ui/atomic/data-display/data-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { Coins, Info } from "lucide-react";
import type { GrowthValueMetrics } from "@/lib/entity/growth";

interface GrowthAttributedValueCardProps {
  data: GrowthValueMetrics;
}

function formatCurrency(value: number, currency: string | null): string {
  if (!currency)
    return value.toLocaleString("es", { maximumFractionDigits: 2 });
  try {
    return new Intl.NumberFormat("es", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value.toLocaleString("es", { maximumFractionDigits: 2 })} ${currency}`;
  }
}

export function GrowthAttributedValueCard({
  data,
}: GrowthAttributedValueCardProps) {
  return (
    <DataCard
      title="Valor atribuido"
      icon={Coins}
      iconColor="text-amber-600"
      description="Estimación basada en citas completadas"
    >
      <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            Estimación basada en el costo del servicio asociado a las citas
            completadas. No representa ingresos cobrados.
          </TooltipContent>
        </Tooltip>
        No representa ingresos cobrados
      </div>
      <div className="flex items-end gap-8 py-4">
        <div>
          <p className="text-3xl font-bold tabular-nums text-ink">
            {formatCurrency(data.attributedValue, data.currency)}
          </p>
          <p className="text-xs text-subtle mt-1">Valor total estimado</p>
        </div>
        {data.averagePerCompletedAppointment > 0 && (
          <div>
            <p className="text-lg font-semibold tabular-nums text-ink">
              {formatCurrency(
                data.averagePerCompletedAppointment,
                data.currency,
              )}
            </p>
            <p className="text-xs text-subtle mt-1">
              Promedio por cita completada
            </p>
          </div>
        )}
      </div>
    </DataCard>
  );
}
