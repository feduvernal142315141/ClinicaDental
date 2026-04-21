"use client";

import { KpiCard, KpiGrid } from "@/components/ui/atomic/data-display/kpi-card";
import { AlertCardGrid } from "@/components/ui/atomic/data-display/alert-card";
import { DataCard } from "@/components/ui/atomic/data-display/data-card";
import { Header } from "@/components/ui/atomic/layout/header";
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Users, UserPlus, Briefcase, AlertTriangle } from "lucide-react";
import { DashboardSummary } from "@/lib/entity/dashboard";

interface PatientsSectionProps {
  data: DashboardSummary;
}

export function PatientsSection({ data }: PatientsSectionProps) {
  const { patientSignals, serviceDemand } = data;

  const newVsRecurringData = [
    { name: "Nuevos", value: patientSignals.newPatients, color: "#3b82f6" },
    {
      name: "Recurrentes",
      value: patientSignals.recurringPatients,
      color: "#10b981",
    },
  ];

  const totalPatients =
    patientSignals.newPatients + patientSignals.recurringPatients;
  const topDemandData = serviceDemand.top.map((service) => ({
    name: service.serviceName || "Servicio sin nombre",
    Citas: service.appointmentCount,
    Estimado: service.estimatedRevenue,
  }));
  const bottomDemandData = serviceDemand.bottom.map((service) => ({
    name: service.serviceName || "Servicio sin nombre",
    Citas: service.appointmentCount,
    Estimado: service.estimatedRevenue,
  }));

  return (
    <div className="space-y-6">
      <Header
        level={2}
        size="lg"
        title="Análisis de Pacientes & Servicios"
        description="Segmentación y demanda de servicios"
      />

      {/* Patient Overview */}
      <KpiGrid cols={{ default: 1, md: 3 }} gap={6}>
        <KpiCard
          title="Total Pacientes Atendidos"
          value={patientSignals.uniquePatientsAttended}
          icon={Users}
          iconColor="text-blue-600"
        />

        <KpiCard
          variant="badges"
          title="Nuevos"
          value={patientSignals.newPatients}
          icon={UserPlus}
          iconColor="text-green-600"
          badges={[
            {
              label: `${
                totalPatients > 0
                  ? Math.round(
                      (patientSignals.newPatients / totalPatients) * 100,
                    )
                  : 0
              }%`,
              variant: "secondary",
            },
          ]}
        />

        <KpiCard
          variant="badges"
          title="Recurrentes"
          value={patientSignals.recurringPatients}
          icon={Users}
          iconColor="text-purple-600"
          badges={[
            {
              label: `${
                totalPatients > 0
                  ? Math.round(
                      (patientSignals.recurringPatients / totalPatients) * 100,
                    )
                  : 0
              }%`,
              variant: "secondary",
            },
          ]}
        />
      </KpiGrid>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New vs Recurring */}
        <DataCard
          title="Nuevos vs Recurrentes"
          description="Distribución de tipos de pacientes"
        >
          {totalPatients > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={newVsRecurringData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {newVsRecurringData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No hay pacientes atendidos en este periodo.
            </p>
          )}
          <div className="flex justify-center gap-4 mt-4">
            {newVsRecurringData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm">
                  {entry.name}: {entry.value}
                </span>
              </div>
            ))}
          </div>
        </DataCard>

        {/* Top Services */}
        <DataCard
          title="Mayor Demanda de Servicios"
          description="Citas no canceladas por servicio"
          icon={Briefcase}
          iconColor="text-blue-600"
        >
          {topDemandData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={topDemandData}>
                <defs>
                  <linearGradient
                    id="colorTopCitas"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={formatDemandTooltip} />
                <Area
                  type="monotone"
                  dataKey="Citas"
                  stroke="#3b82f6"
                  fill="url(#colorTopCitas)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No hay servicios asociados a citas no canceladas.
            </p>
          )}
        </DataCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataCard
          title="Menor Demanda de Servicios"
          description="Incluye servicios activos sin citas"
          icon={AlertTriangle}
          iconColor="text-amber-500"
        >
          {bottomDemandData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={bottomDemandData}>
                <defs>
                  <linearGradient
                    id="colorBottomCitas"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={formatDemandTooltip} />
                <Area
                  type="monotone"
                  dataKey="Citas"
                  stroke="#f59e0b"
                  fill="url(#colorBottomCitas)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No hay servicios activos para comparar demanda.
            </p>
          )}
        </DataCard>

        <DataCard
          title="Calidad de Datos de Agenda"
          description="Señales para mejorar estimaciones de demanda"
          icon={AlertTriangle}
          iconColor="text-amber-500"
        >
          <AlertCardGrid
            alerts={[
              {
                title: "Citas Sin Servicio",
                description: "No entran al ranking de demanda",
                badgeValue: serviceDemand.appointmentsWithoutService,
                variant:
                  serviceDemand.appointmentsWithoutService > 0
                    ? "warning"
                    : "success",
                badgeVariant: "secondary",
              },
              {
                title: "Servicios Sin Demanda",
                description: "Activos con cero citas",
                badgeValue: bottomDemandData.filter((item) => item.Citas === 0)
                  .length,
                variant: bottomDemandData.some((item) => item.Citas === 0)
                  ? "warning"
                  : "success",
                badgeVariant: "secondary",
              },
              {
                title: "Ticket Promedio",
                description: "Estimado sobre citas completadas",
                badgeValue: formatCurrency(data.kpis.averageTicket),
                variant: "info",
                badgeVariant: "outline",
              },
            ]}
            cols={{ default: 1 }}
            gap={3}
          />
        </DataCard>
      </div>
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

function formatDemandTooltip(value: number | string, name: string) {
  if (name === "Estimado") {
    return [formatCurrency(Number(value)), "Estimado no cobrado"];
  }
  return [value, name];
}
