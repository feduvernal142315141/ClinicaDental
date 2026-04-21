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

interface OverviewSectionProps {
  data: DashboardSummary;
}

export function OverviewSection({ data }: OverviewSectionProps) {
  const { kpis, doctorProductivity, serviceDemand } = data;
  const cancellationAlert = `${kpis.todayCancelled} hoy · ${kpis.cancellationRate}% periodo`;
  const lowDemandCount = serviceDemand.bottom.filter(
    (service) => service.appointmentCount === 0,
  ).length;

  return (
    <div className="space-y-6">
      <Header level={2} size="lg" title="Vista General" />

      {/* KPI Cards */}
      <KpiGrid cols={{ default: 1, md: 2, lg: 4 }} gap={6}>
        <KpiCard
          variant="badges"
          title="Citas de Hoy"
          value={kpis.todayTotal}
          icon={Calendar}
          iconColor="text-blue-600"
          badges={[
            {
              label: `${kpis.todayCompleted} cumplidas`,
              variant: "secondary",
            },
            {
              label: `${kpis.todayCancelled} canceladas`,
              variant: "destructive",
            },
          ]}
        />

        <KpiCard
          title="Tasa de Asistencia"
          value={`${kpis.attendanceRate}%`}
          icon={Target}
          iconColor="text-green-600"
          description="Citas cumplidas sobre cumplidas + canceladas"
        />

        <KpiCard
          variant="badges"
          title="Pacientes Nuevos"
          value={kpis.newPatients}
          icon={Activity}
          iconColor="text-purple-600"
          badges={[
            {
              label: `${data.patientSignals.uniquePatientsAttended} atendidos`,
              variant: "outline",
            },
            {
              label: `${data.patientSignals.recurringPatients} recurrentes`,
              variant: "outline",
            },
          ]}
        />

        <KpiCard
          variant="badges"
          title="Producción Estimada"
          value={formatCurrency(kpis.estimatedProductionCompleted)}
          icon={DollarSign}
          iconColor="text-orange-600"
          description="Servicios completados, no cobrado"
          badges={[
            {
              label: `Pipeline ${formatCurrency(kpis.estimatedPipelineScheduled)}`,
              variant: "outline",
            },
            {
              label: `Cancelado ${formatCurrency(kpis.estimatedLossCancelled)}`,
              variant: "secondary",
            },
          ]}
        />
      </KpiGrid>

      <DataCard
        title="Señales Operativas"
        description="Indicadores para revisar agenda y calidad de registro"
        icon={AlertTriangle}
        iconColor="text-amber-500"
      >
        <AlertCardGrid
          alerts={[
            {
              title: "Cancelaciones",
              description: "Impacto potencial en agenda",
              badgeValue: cancellationAlert,
              variant: kpis.cancellationRate > 20 ? "error" : "warning",
              badgeVariant:
                kpis.cancellationRate > 20 ? "destructive" : "secondary",
            },
            {
              title: "Citas Sin Servicio",
              description: "No aportan demanda ni estimado",
              badgeValue: serviceDemand.appointmentsWithoutService,
              variant:
                serviceDemand.appointmentsWithoutService > 0
                  ? "warning"
                  : "success",
              badgeVariant: "secondary",
            },
            {
              title: "Baja Demanda",
              description: "Servicios activos sin citas",
              badgeValue: lowDemandCount,
              variant: lowDemandCount > 0 ? "warning" : "success",
              badgeVariant: "secondary",
            },
          ]}
          cols={{ default: 1, md: 3 }}
          gap={4}
        />
      </DataCard>

      {/* Doctor Productivity */}
      <DataCard
        title="Ocupación de Doctores"
        description="Tasa de asistencia por doctor en el período"
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
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}
