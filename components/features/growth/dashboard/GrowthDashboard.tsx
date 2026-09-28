"use client";

import { useState } from "react";
import { Header } from "@/components/ui/atomic/layout/header";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui";
import { BarChart3 } from "lucide-react";
import { useGrowthAnalytics } from "@/lib/hooks/growth";
import {
  GrowthDateFilter,
  getDefaultDateFilter,
  type DateFilterValue,
} from "./GrowthDateFilter";
import { GrowthKpiCards } from "./GrowthKpiCards";
import { GrowthFunnel } from "./GrowthFunnel";
import { GrowthEngagementCard } from "./GrowthEngagementCard";
import { GrowthConversionCard } from "./GrowthConversionCard";
import { GrowthAttributedValueCard } from "./GrowthAttributedValueCard";


export function GrowthDashboard() {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(
    getDefaultDateFilter,
  );

  const { data, loading, error } = useGrowthAnalytics({
    from: dateFilter.from,
    to: dateFilter.to,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Header
          level={1}
          title="Growth"
          description="Analítica de campañas y conversiones"
        />
        <GrowthDateFilter value={dateFilter} onChange={setDateFilter} />
      </div>

      {error && !loading && !data && (
        <EmptyState
          icon={BarChart3}
          title="Sin datos de Growth"
          description="No hay analíticas disponibles para el período seleccionado. Crea campañas y segmentos para empezar a generar datos."
          variant="card"
        />
      )}

      {error && !loading && data && (
        <Alert variant="destructive">
          <AlertDescription>No se pudo actualizar el resumen de Growth.</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="flex items-center justify-center min-h-64">
          <LoadingSpinner message="Cargando Growth..." />
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6">
          <GrowthKpiCards data={data} />
          <GrowthFunnel funnel={data.funnel} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GrowthEngagementCard engagement={data.engagement} />
            <GrowthConversionCard conversions={data.conversions} />
          </div>
          <GrowthAttributedValueCard data={data.value} />
        </div>
      )}
    </div>
  );
}
