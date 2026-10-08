"use client";

import { KpiCard, KpiGrid } from "@/components/ui/atomic/data-display/kpi-card";
import {
  Megaphone,
  Send,
  MessageCircleReply,
  CalendarPlus,
  CalendarCheck,
  Coins,
} from "lucide-react";
import type { GrowthDashboardResponse } from "@/lib/entity/growth";

interface GrowthKpiCardsProps {
  data: GrowthDashboardResponse;
}

function formatCurrency(value: number, currency: string | null): string {
  if (!currency) return value.toLocaleString("es", { maximumFractionDigits: 2 });
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

export function GrowthKpiCards({ data }: GrowthKpiCardsProps) {
  const { campaigns, engagement, conversions, value: attributedValue } = data;

  return (
    <KpiGrid cols={{ default: 2, md: 3, lg: 6 }} gap={4}>
      <KpiCard
        title="Campañas activas"
        value={campaigns.active}
        icon={Megaphone}
        accent="brand"
        description={`${campaigns.total} total · ${campaigns.completed} completadas`}
      />
      <KpiCard
        title="Mensajes enviados"
        value={engagement.sent.toLocaleString("es")}
        icon={Send}
        accent="sky"
        description={`${(engagement.deliveryRate * 100).toFixed(1)}% entregados`}
      />
      <KpiCard
        title="Respuestas"
        value={engagement.replied.toLocaleString("es")}
        icon={MessageCircleReply}
        accent="violet"
        description={`${(engagement.replyRate * 100).toFixed(1)}% tasa de respuesta`}
      />
      <KpiCard
        title="Citas generadas"
        value={conversions.appointmentsCreated.toLocaleString("es")}
        icon={CalendarPlus}
        accent="emerald"
        description={`${(conversions.appointmentRate * 100).toFixed(1)}% de conversión`}
      />
      <KpiCard
        title="Citas completadas"
        value={conversions.appointmentsCompleted.toLocaleString("es")}
        icon={CalendarCheck}
        accent="amber"
        description={`${(conversions.attendanceRate * 100).toFixed(1)}% de asistencia`}
      />
      <KpiCard
        title="Valor atribuido"
        value={formatCurrency(
          attributedValue.attributedValue,
          attributedValue.currency,
        )}
        icon={Coins}
        accent="rose"
        description="Estimación basada en citas completadas"
      />
    </KpiGrid>
  );
}
