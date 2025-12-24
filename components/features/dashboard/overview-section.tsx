"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/atomic/data-display/card";
import { Badge } from "@/components/ui/atomic/data-display/badge";
import { Progress } from "@/components/ui/atomic/data-display/progress";
import { KpiCard, KpiGrid } from "@/components/ui/atomic/data-display/kpi-card";
import { ProgressList } from "@/components/ui/atomic/data-display/progress-list-item";
import { AlertCardGrid } from "@/components/ui/atomic/data-display/alert-card";
import { DataCard } from "@/components/ui/atomic/data-display/data-card";
import {
  Calendar,
  Users,
  Activity,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { getDashboardStats } from "@/lib/analytics";
import { useEffect, useState } from "react";
import { Header } from "@/components/ui/atomic/layout/header";

export function OverviewSection() {
  const [stats, setStats] = useState(getDashboardStats());

  useEffect(() => {
    setStats(getDashboardStats());
  }, []);

  return (
    <div className="space-y-6">
      <Header
        level={2}
        size="lg"
        title="Vista General"
        // description="Snapshot del estado actual de la clínica"
      />

      {/* KPI Cards */}
      <KpiGrid cols={{ default: 1, md: 2, lg: 4 }} gap={6}>
        <KpiCard
          variant="badges"
          title="Citas de Hoy"
          value={stats.todayAppointments.total}
          icon={Calendar}
          iconColor="text-blue-600"
          badges={[
            {
              label: `✅ ${stats.todayAppointments.completed} Cumplidas`,
              variant: "secondary",
            },
            {
              label: `❌ ${stats.todayAppointments.cancelled} Canceladas`,
              variant: "destructive",
            },
          ]}
        />

        <KpiCard
          variant="badges"
          title="Doctores Activos"
          value={stats.doctors.active}
          icon={Users}
          iconColor="text-green-600"
          badges={[
            {
              label: `Ocupación promedio: ${Math.round(
                stats.doctors.occupancy.reduce(
                  (acc, doc) => acc + doc.percentage,
                  0
                ) / stats.doctors.occupancy.length
              )}%`,
              variant: "outline",
            },
          ]}
        />

        <KpiCard
          variant="badges"
          title="Pacientes Este Mes"
          value={stats.patients.thisMonth}
          icon={Activity}
          iconColor="text-purple-600"
          badges={[
            {
              label: `🆕 ${stats.patients.new} Nuevos`,
              variant: "outline",
            },
            {
              label: `🔄 ${stats.patients.recurring} Recurrentes`,
              variant: "outline",
            },
          ]}
        />

        <KpiCard
          variant="trend"
          title="Ingresos Estimados"
          value={`$${stats.revenue.estimated.toLocaleString()}`}
          icon={DollarSign}
          iconColor="text-orange-600"
          trend={{
            value: stats.revenue.change,
            label: "vs mes anterior",
          }}
        />
      </KpiGrid>

      {/* Doctor Occupancy */}
      <DataCard
        title="Ocupación de Doctores"
        description="Porcentaje de agenda ocupada por doctor"
      >
        <ProgressList
          items={stats.doctors.occupancy.map((doctor) => ({
            label: doctor.name,
            value: doctor.percentage,
          }))}
          showPercentage
          progressHeight="md"
          spacing="md"
        />
      </DataCard>

      {/* Alerts */}
      <DataCard
        title="Alertas del Sistema"
        description="Situaciones que requieren atención"
        icon={AlertTriangle}
        iconColor="text-amber-500"
      >
        <AlertCardGrid
          alerts={[
            {
              title: "Pagos Pendientes",
              description: "Requieren seguimiento",
              badgeValue: stats.alerts.pendingPayments,
              variant: "error",
              badgeVariant: "destructive",
            },
            {
              title: "Sin Seguimiento",
              description: "Tratamientos pausados",
              badgeValue: stats.alerts.missedFollowups,
              variant: "warning",
              badgeVariant: "secondary",
              badgeClassName: "bg-amber-200 text-amber-800",
            },
            {
              title: "Cancelaciones Frecuentes",
              description: "Problemas de comunicación",
              badgeValue: stats.alerts.frequentCancellations,
              variant: "warning",
              badgeVariant: "secondary",
              badgeClassName: "bg-orange-200 text-orange-800",
            },
          ]}
          cols={{ default: 1, md: 3 }}
          gap={4}
        />
      </DataCard>
    </div>
  );
}
