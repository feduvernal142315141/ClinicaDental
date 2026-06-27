"use client";

import { useState } from "react";
import { KpiCard, KpiGrid } from "@/components/ui/atomic/data-display/kpi-card";
import { AlertCardGrid } from "@/components/ui/atomic/data-display/alert-card";
import { DataCard } from "@/components/ui/atomic/data-display/data-card";
import { Header } from "@/components/ui/atomic/layout/header";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { Users, UserPlus, Briefcase, AlertTriangle } from "lucide-react";
import { DashboardSummary, ServiceDemandItem } from "@/lib/entity/dashboard";
import { useChartTheme } from "@/lib/hooks/use-chart-theme";
import {
  formatClinicCurrency,
  formatClinicCurrencyShort,
} from "@/lib/utils/clinic-regional-format";

type DemandSource = "consolidated" | "appointments" | "plans" | "performed";

interface PatientsSectionProps {
  data: DashboardSummary;
  currency: string;
}

export function PatientsSection({ data, currency }: PatientsSectionProps) {
  const { patientSignals, serviceDemand } = data;
  const chart = useChartTheme();
  const [topSource, setTopSource] = useState<DemandSource>("consolidated");
  const [bottomSource, setBottomSource] =
    useState<DemandSource>("appointments");

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

  const resolveSource = (source: DemandSource): ServiceDemandItem[] => {
    switch (source) {
      case "appointments":
        return serviceDemand.topByAppointments ?? [];
      case "plans":
        return serviceDemand.topByPlans ?? [];
      case "performed":
        return serviceDemand.topByPerformed ?? [];
      default:
        return serviceDemand.top ?? [];
    }
  };

  const topDemandData = resolveSource(topSource).map((s) => ({
    name: s.serviceName || "Sin nombre",
    Citas: s.appointmentCount,
    Estimado: s.estimatedRevenue,
  }));

  const bottomDemandData = resolveSource(bottomSource).map((s) => ({
    name: s.serviceName || "Sin nombre",
    Citas: s.appointmentCount,
    Estimado: s.estimatedRevenue,
  }));

  const categoryData = (serviceDemand.categoryDistribution ?? []).map((c) => ({
    name: c.category,
    Citas: c.appointmentCount,
    Planes: c.planCount,
    Realizados: c.performedCount,
  }));

  const CATEGORY_COLORS = ["#3b82f6", "#10b981", "#f59e0b"];

  const truncateLabel = (value: string, max = 14): string => {
    if (!value) return "";
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
  };

  const sourceTabs: { key: DemandSource; label: string }[] = [
    { key: "consolidated", label: "Consolidado" },
    { key: "appointments", label: "Citas" },
    { key: "plans", label: "Planes" },
    { key: "performed", label: "Realizados" },
  ];

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
                <Tooltip
                  contentStyle={chart.tooltip.contentStyle}
                  labelStyle={chart.tooltip.labelStyle}
                  itemStyle={chart.tooltip.itemStyle}
                />
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

        {/* Category distribution */}
        <DataCard
          title="Distribución por Categoría"
          description="Citas · Planes · Realizados del odontograma"
        >
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={chart.axisTick}
                  width={90}
                />
                <Tooltip
                  contentStyle={chart.tooltip.contentStyle}
                  labelStyle={chart.tooltip.labelStyle}
                  itemStyle={chart.tooltip.itemStyle}
                />
                <Legend />
                {CATEGORY_COLORS.map((color, idx) => {
                  const keys = ["Citas", "Planes", "Realizados"] as const;
                  return (
                    <Bar
                      key={keys[idx]}
                      dataKey={keys[idx]}
                      fill={color}
                      stackId="a"
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Sin datos de categorías para el periodo.
            </p>
          )}
        </DataCard>
      </div>

      {/* Top & Bottom demand with source tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Demand */}
        <DataCard
          title="Mayor Demanda de Servicios"
          description="Selecciona la fuente de datos"
          icon={Briefcase}
          iconColor="text-blue-600"
        >
          <SourceTabs
            tabs={sourceTabs}
            active={topSource}
            onChange={setTopSource}
          />
          {topDemandData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart
                data={topDemandData}
                margin={{ top: 10, right: 12, left: 0, bottom: 8 }}
              >
                <defs>
                  <linearGradient
                    id="colorTopCitas"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
                <XAxis
                  dataKey="name"
                  tick={chart.axisTick}
                  angle={topDemandData.length > 4 ? -35 : 0}
                  textAnchor={topDemandData.length > 4 ? "end" : "middle"}
                  height={topDemandData.length > 4 ? 80 : 32}
                  interval={0}
                  tickMargin={8}
                  tickFormatter={(v: string) => truncateLabel(v)}
                />
                <YAxis
                  yAxisId="left"
                  allowDecimals={false}
                  tick={chart.axisTick}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={chart.axisTick}
                  tickFormatter={(v) =>
                    formatClinicCurrencyShort(Number(v), currency)
                  }
                />
                <Tooltip
                  formatter={(value, name) =>
                    formatDemandTooltip(
                      value as number | string,
                      name as string,
                      currency,
                    )
                  }
                  contentStyle={chart.tooltip.contentStyle}
                  labelStyle={chart.tooltip.labelStyle}
                  itemStyle={chart.tooltip.itemStyle}
                />
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  wrapperStyle={{ paddingTop: 12 }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="Citas"
                  fill="url(#colorTopCitas)"
                  stroke="#3b82f6"
                  strokeWidth={0}
                />
                <Bar
                  yAxisId="left"
                  dataKey="Citas"
                  fill="#3b82f6"
                  barSize={28}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Estimado"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Sin datos para la fuente seleccionada.
            </p>
          )}
        </DataCard>

        {/* Bottom demand */}
        <DataCard
          title="Menor Demanda de Servicios"
          description="Incluye servicios activos sin actividad"
          icon={AlertTriangle}
          iconColor="text-amber-500"
        >
          <SourceTabs
            tabs={sourceTabs.filter((t) => t.key !== "consolidated")}
            active={
              bottomSource === "consolidated" ? "appointments" : bottomSource
            }
            onChange={setBottomSource}
          />
          {bottomDemandData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart
                data={bottomDemandData}
                margin={{ top: 10, right: 12, left: 0, bottom: 8 }}
              >
                <defs>
                  <linearGradient
                    id="colorBottomCitas"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
                <XAxis
                  dataKey="name"
                  tick={chart.axisTick}
                  angle={bottomDemandData.length > 4 ? -35 : 0}
                  textAnchor={bottomDemandData.length > 4 ? "end" : "middle"}
                  height={bottomDemandData.length > 4 ? 80 : 32}
                  interval={0}
                  tickMargin={8}
                  tickFormatter={(v: string) => truncateLabel(v)}
                />
                <YAxis
                  yAxisId="left"
                  allowDecimals={false}
                  tick={chart.axisTick}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={chart.axisTick}
                  tickFormatter={(v) =>
                    formatClinicCurrencyShort(Number(v), currency)
                  }
                />
                <Tooltip
                  formatter={(value, name) =>
                    formatDemandTooltip(
                      value as number | string,
                      name as string,
                      currency,
                    )
                  }
                  contentStyle={chart.tooltip.contentStyle}
                  labelStyle={chart.tooltip.labelStyle}
                  itemStyle={chart.tooltip.itemStyle}
                />
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  wrapperStyle={{ paddingTop: 12 }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="Citas"
                  fill="url(#colorBottomCitas)"
                  stroke="#f59e0b"
                  strokeWidth={0}
                />
                <Bar
                  yAxisId="left"
                  dataKey="Citas"
                  fill="#f59e0b"
                  barSize={28}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Estimado"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Sin datos para la fuente seleccionada.
            </p>
          )}
        </DataCard>
      </div>

      {/* Data quality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                badgeValue: (serviceDemand.bottom ?? []).filter(
                  (item) => item.appointmentCount === 0,
                ).length,
                variant: (serviceDemand.bottom ?? []).some(
                  (item) => item.appointmentCount === 0,
                )
                  ? "warning"
                  : "success",
                badgeVariant: "secondary",
              },
              {
                title: "Ticket Promedio",
                description: "Estimado sobre citas completadas",
                badgeValue: formatClinicCurrency(data.kpis.averageTicket, currency),
                variant: "info",
                badgeVariant: "outline",
              },
            ]}
            cols={{ default: 1 }}
            gap={3}
          />
        </DataCard>

        {/* Conversion summary */}
        <DataCard
          title="Conversión Plan → Realizado"
          description="Top 5 servicios con mayor planificación"
        >
          {(serviceDemand.planConversion ?? []).length > 0 ? (
            <div className="space-y-3 mt-2">
              {serviceDemand.planConversion.slice(0, 5).map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate max-w-[180px]">
                      {item.serviceName}
                    </span>
                    <span className="font-medium text-muted-foreground tabular-nums">
                      {item.conversionRate.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{
                        width: `${Math.min(item.conversionRate, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sin datos de conversión para el periodo.
            </p>
          )}
        </DataCard>
      </div>
    </div>
  );
}

// ── Source tabs component ────────────────────────────────────────────

interface SourceTabsProps {
  tabs: { key: DemandSource; label: string }[];
  active: DemandSource;
  onChange: (source: DemandSource) => void;
}

function SourceTabs({ tabs, active, onChange }: SourceTabsProps) {
  return (
    <div className="flex gap-1 mb-3 p-1 bg-muted rounded-md w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            active === tab.key
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function formatDemandTooltip(value: number | string, name: string, currency: string) {
  if (name === "Estimado") {
    return [
      formatClinicCurrency(Number(value), currency),
      "Estimado no cobrado",
    ];
  }
  return [value, name];
}
