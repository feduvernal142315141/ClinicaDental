"use client";

import { KpiCard, KpiGrid } from "@/components/ui/atomic/data-display/kpi-card";
import { ProgressList } from "@/components/ui/atomic/data-display/progress-list-item";
import { AlertCardGrid } from "@/components/ui/atomic/data-display/alert-card";
import { DataCard } from "@/components/ui/atomic/data-display/data-card";
import {
  Calendar,
  Target,
  Activity,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { Header } from "@/components/ui/atomic/layout/header";
import { DashboardSummary } from "@/lib/entity/dashboard";
import { formatClinicCurrency } from "@/lib/utils/clinic-regional-format";
import { useI18n } from "@/lib/contexts/i18n-context";

interface OverviewSectionProps {
  data: DashboardSummary;
  currency: string;
}

export function OverviewSection({ data, currency }: OverviewSectionProps) {
  const { t } = useI18n();
  const { kpis, doctorProductivity, serviceDemand, monthlyAppointments } = data;
  const cancellationAlert = `${kpis.todayCancelled} ${t("dashboard.signals.today")} · ${kpis.cancellationRate}% ${t("dashboard.signals.period")}`;
  const lowDemandCount = serviceDemand.bottom.filter(
    (service) => service.appointmentCount === 0,
  ).length;

  // Sparkline de tasa de asistencia por mes
  const attendanceSparkline = monthlyAppointments.map((m) => ({
    value:
      m.completed + m.cancelled > 0
        ? Math.round((m.completed / (m.completed + m.cancelled)) * 100)
        : 0,
  }));

  // Tendencia: comparar último mes vs penúltimo
  const attendanceTrend = (() => {
    if (attendanceSparkline.length < 2) return undefined;
    const last = attendanceSparkline[attendanceSparkline.length - 1].value;
    const prev = attendanceSparkline[attendanceSparkline.length - 2].value;
    const diff = last - prev;
    return {
      value: Math.abs(diff),
      label: t("dashboard.kpi.previousMonth"),
      color: (diff >= 0 ? "positive" : "negative") as "positive" | "negative",
    };
  })();

  return (
    <div className="space-y-6">
      <Header level={2} size="lg" title={t("dashboard.overview.title")} />

      {/* KPI Cards */}
      <KpiGrid cols={{ default: 1, md: 2, lg: 4 }} gap={6}>
        <KpiCard
          variant="badges"
          title={t("dashboard.kpi.todayAppointments")}
          value={kpis.todayTotal}
          icon={Calendar}
          accent="sky"
          badges={[
            {
              label: `${kpis.todayCompleted} ${t("dashboard.kpi.completed")}`,
              variant: "secondary",
            },
            {
              label: `${kpis.todayCancelled} ${t("dashboard.kpi.cancelled")}`,
              variant: "destructive",
            },
          ]}
        />

        <KpiCard
          title={t("dashboard.kpi.attendanceRate")}
          value={`${kpis.attendanceRate}%`}
          icon={Target}
          accent="emerald"
          description={t("dashboard.kpi.attendanceDescription")}
          sparkline={attendanceSparkline}
          trend={attendanceTrend}
        />

        <KpiCard
          variant="badges"
          title={t("dashboard.kpi.newPatients")}
          value={kpis.newPatients}
          icon={Activity}
          accent="violet"
          badges={[
            {
              label: `${data.patientSignals.uniquePatientsAttended} ${t("dashboard.kpi.attended")}`,
              variant: "outline",
            },
            {
              label: `${data.patientSignals.recurringPatients} ${t("dashboard.kpi.recurring")}`,
              variant: "outline",
            },
          ]}
        />

        <KpiCard
          variant="trend"
          title={t("dashboard.kpi.estimatedProduction")}
          value={formatClinicCurrency(kpis.estimatedProductionCompleted, currency)}
          icon={DollarSign}
          accent="brand"
          description={t("dashboard.kpi.productionDescription")}
          trend={{
            value: 0,
            label:
              t("dashboard.kpi.pipeline") +
              " " +
              formatClinicCurrency(kpis.estimatedPipelineScheduled, currency),
            color: "positive",
          }}
        />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <DataCard
          className="lg:col-span-7"
          title={t("dashboard.signals.title")}
          description={t("dashboard.signals.description")}
          icon={AlertTriangle}
          iconColor="text-amber-500"
        >
          <AlertCardGrid
            alerts={[
              {
                title: t("dashboard.signals.cancellations"),
                description: t("dashboard.signals.cancellationsDescription"),
                badgeValue: cancellationAlert,
                variant: kpis.cancellationRate > 20 ? "error" : "warning",
                badgeVariant:
                  kpis.cancellationRate > 20 ? "destructive" : "secondary",
              },
              {
                title: t("dashboard.signals.noServiceAppointments"),
                description: t("dashboard.signals.noServiceDescription"),
                badgeValue: serviceDemand.appointmentsWithoutService,
                variant:
                  serviceDemand.appointmentsWithoutService > 0
                    ? "warning"
                    : "success",
                badgeVariant: "secondary",
              },
              {
                title: t("dashboard.signals.lowDemand"),
                description: t("dashboard.signals.lowDemandDescription"),
                badgeValue: lowDemandCount,
                variant: lowDemandCount > 0 ? "warning" : "success",
                badgeVariant: "secondary",
              },
            ]}
            cols={{ default: 1 }}
            gap={4}
          />
        </DataCard>

        {/* Doctor Productivity */}
        <DataCard
          className="lg:col-span-5"
          title={t("dashboard.doctorsOccupancy.title")}
          description={t("dashboard.doctorsOccupancy.description")}
        >
          <ProgressList
            items={doctorProductivity.map((doc) => ({
              label: doc.doctorName,
              value: Math.round(doc.attendanceRate),
            }))}
            showPercentage
            progressHeight="md"
            spacing="md"
          />
        </DataCard>
      </div>
    </div>
  );
}
