"use client";

import { DataCard } from "@/components/ui/atomic/data-display/data-card";
import { CalendarPlus, CalendarCheck } from "lucide-react";
import type { GrowthConversions } from "@/lib/entity/growth";

interface GrowthConversionCardProps {
  conversions: GrowthConversions;
}

export function GrowthConversionCard({
  conversions,
}: GrowthConversionCardProps) {
  return (
    <DataCard title="Conversiones" description="Citas generadas y completadas">
      <div className="grid grid-cols-2 gap-6 py-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-400/25 dark:text-emerald-300">
            <CalendarPlus className="h-5 w-5" />
          </span>
          <div>
            <p className="text-2xl font-bold tabular-nums text-ink">
              {conversions.appointmentsCreated.toLocaleString("es")}
            </p>
            <p className="text-xs text-subtle">Citas generadas</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-300 tabular-nums">
              {(conversions.appointmentRate * 100).toFixed(1)}% de conversión
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600 ring-1 ring-amber-400/25 dark:text-amber-300">
            <CalendarCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-2xl font-bold tabular-nums text-ink">
              {conversions.appointmentsCompleted.toLocaleString("es")}
            </p>
            <p className="text-xs text-subtle">Citas completadas</p>
            <p className="text-xs text-amber-600 dark:text-amber-300 tabular-nums">
              {(conversions.attendanceRate * 100).toFixed(1)}% de asistencia
            </p>
          </div>
        </div>
      </div>
    </DataCard>
  );
}
