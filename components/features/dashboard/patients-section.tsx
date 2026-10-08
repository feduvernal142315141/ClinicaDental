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
import { useChartPalette } from "@/lib/hooks/dashboard/use-chart-palette";
import {
  formatClinicCurrency,
  formatClinicCurrencyShort,
} from "@/lib/utils/clinic-regional-format";
import { useI18n } from "@/lib/contexts/i18n-context";

type DemandSource = "consolidated" | "appointments" | "plans" | "performed";

interface PatientsSectionProps {
  data: DashboardSummary;
  currency: string;
}

export function PatientsSection({ data, currency }: PatientsSectionProps) {
  const { t } = useI18n();
  const { patientSignals, serviceDemand } = data;
  const c = useChartPalette();
  const [topSource, setTopSource] = useState<DemandSource>("consolidated");
  const [bottomSource, setBottomSource] =
    useState<DemandSource>("appointments");

  const tooltipContentStyle = {
    background: c.tooltipBg,
    border: `1px solid ${c.tooltipBorder}`,
    color: c.tooltipText,
    borderRadius: 12,
  };
  const tooltipLabelStyle = { color: c.tooltipText };
  const tooltipItemStyle = { color: c.tooltipText };
  const axisTick = { fill: c.axis };
  const chartLabels = {
    appointments: t("dashboard.chart.appointments"),
    plans: t("dashboard.chart.plans"),
    performed: t("dashboard.chart.performed"),
    estimated: t("dashboard.chart.estimated"),
    uncollectedEstimate: t("dashboard.chart.uncollectedEstimate"),
  };

  const newVsRecurringData = [
    {
      name: t("dashboard.kpi.newPatients"),
      value: patientSignals.newPatients,
      color: c.brand,
    },
    {
      name: t("dashboard.kpi.recurring"),
      value: patientSignals.recurringPatients,
      color: c.success,
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
    name: s.serviceName || t("dashboard.patients.unnamed"),
    [chartLabels.appointments]: s.appointmentCount,
    [chartLabels.estimated]: s.estimatedRevenue,
  }));

  const bottomDemandData = resolveSource(bottomSource).map((s) => ({
    name: s.serviceName || t("dashboard.patients.unnamed"),
    [chartLabels.appointments]: s.appointmentCount,
    [chartLabels.estimated]: s.estimatedRevenue,
  }));

  const categoryData = (serviceDemand.categoryDistribution ?? []).map((c) => ({
    name: c.category,
    [chartLabels.appointments]: c.appointmentCount,
    [chartLabels.plans]: c.planCount,
    [chartLabels.performed]: c.performedCount,
  }));

  const CATEGORY_COLORS = c.series.slice(0, 3);

  const truncateLabel = (value: string, max = 14): string => {
    if (!value) return "";
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
  };

  const sourceTabs: { key: DemandSource; label: string }[] = [
    { key: "consolidated", label: t("dashboard.patients.source.consolidated") },
    { key: "appointments", label: t("dashboard.patients.source.appointments") },
    { key: "plans", label: t("dashboard.patients.source.plans") },
    { key: "performed", label: t("dashboard.patients.source.performed") },
  ];

  return (
    <div className="space-y-6">
      <Header
        level={2}
        size="lg"
        title={t("dashboard.patients.title")}
        description={t("dashboard.patients.description")}
      />

      {/* Patient Overview */}
      <KpiGrid cols={{ default: 1, md: 3 }} gap={6}>
        <KpiCard
          title={t("dashboard.patients.totalAttended")}
          value={patientSignals.uniquePatientsAttended}
          icon={Users}
          iconColor="text-blue-600"
        />

        <KpiCard
          variant="badges"
          title={t("dashboard.kpi.newPatients")}
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
          title={t("dashboard.kpi.recurring")}
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
          title={t("dashboard.patients.newVsRecurring")}
          description={t("dashboard.patients.typeDistribution")}
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
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {t("dashboard.patients.noAttended")}
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
          title={t("dashboard.patients.categoryDistribution")}
          description={t("dashboard.patients.categoryDescription")}
        >
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                <XAxis type="number" allowDecimals={false} tick={axisTick} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={axisTick}
                  width={90}
                />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Legend />
                {CATEGORY_COLORS.map((color, idx) => {
                  const keys = [
                    chartLabels.appointments,
                    chartLabels.plans,
                    chartLabels.performed,
                  ] as const;
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
              {t("dashboard.patients.noCategoryData")}
            </p>
          )}
        </DataCard>
      </div>

      {/* Top & Bottom demand with source tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Demand */}
        <DataCard
          title={t("dashboard.patients.topDemand")}
          description={t("dashboard.patients.selectSource")}
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
                    <stop offset="5%" stopColor={c.brand} stopOpacity={0.6} />
                    <stop offset="95%" stopColor={c.brand} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                <XAxis
                  dataKey="name"
                  tick={axisTick}
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
                  tick={axisTick}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={axisTick}
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
                      chartLabels.estimated,
                      chartLabels.uncollectedEstimate,
                    )
                  }
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  wrapperStyle={{ paddingTop: 12 }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey={chartLabels.appointments}
                  fill="url(#colorTopCitas)"
                  stroke={c.brand}
                  strokeWidth={0}
                />
                <Bar
                  yAxisId="left"
                  dataKey={chartLabels.appointments}
                  fill={c.brand}
                  barSize={28}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey={chartLabels.estimated}
                  stroke={c.success}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {t("dashboard.patients.noSourceData")}
            </p>
          )}
        </DataCard>

        {/* Bottom demand */}
        <DataCard
          title={t("dashboard.patients.bottomDemand")}
          description={t("dashboard.patients.bottomDemandDescription")}
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
                    <stop offset="5%" stopColor={c.warning} stopOpacity={0.6} />
                    <stop offset="95%" stopColor={c.warning} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                <XAxis
                  dataKey="name"
                  tick={axisTick}
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
                  tick={axisTick}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={axisTick}
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
                      chartLabels.estimated,
                      chartLabels.uncollectedEstimate,
                    )
                  }
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  wrapperStyle={{ paddingTop: 12 }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey={chartLabels.appointments}
                  fill="url(#colorBottomCitas)"
                  stroke={c.warning}
                  strokeWidth={0}
                />
                <Bar
                  yAxisId="left"
                  dataKey={chartLabels.appointments}
                  fill={c.warning}
                  barSize={28}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey={chartLabels.estimated}
                  stroke={c.danger}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {t("dashboard.patients.noSourceData")}
            </p>
          )}
        </DataCard>
      </div>

      {/* Data quality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataCard
          title={t("dashboard.patients.dataQuality")}
          description={t("dashboard.patients.dataQualityDescription")}
          icon={AlertTriangle}
          iconColor="text-amber-500"
        >
          <AlertCardGrid
            alerts={[
              {
                title: t("dashboard.signals.noServiceAppointments"),
                description: t("dashboard.patients.notInDemandRanking"),
                badgeValue: serviceDemand.appointmentsWithoutService,
                variant:
                  serviceDemand.appointmentsWithoutService > 0
                    ? "warning"
                    : "success",
                badgeVariant: "secondary",
              },
              {
                title: t("dashboard.patients.servicesNoDemand"),
                description: t("dashboard.patients.activeZeroAppointments"),
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
                title: t("dashboard.patients.averageTicket"),
                description: t("dashboard.patients.averageTicketDescription"),
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
          title={t("dashboard.patients.conversion")}
          description={t("dashboard.patients.conversionDescription")}
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
              {t("dashboard.patients.noConversionData")}
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

function formatDemandTooltip(
  value: number | string,
  name: string,
  currency: string,
  estimatedLabel: string,
  uncollectedEstimateLabel: string,
) {
  if (name === estimatedLabel) {
    return [
      formatClinicCurrency(Number(value), currency),
      uncollectedEstimateLabel,
    ];
  }
  return [value, name];
}
