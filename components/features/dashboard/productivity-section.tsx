"use client";

import { KpiCard, KpiGrid } from "@/components/ui/atomic/data-display/kpi-card";
import { DataCard } from "@/components/ui/atomic/data-display/data-card";
import { MetricCard } from "@/components/ui/atomic/data-display/metric-card";
import { Header } from "@/components/ui/atomic/layout/header";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Target, Users } from "lucide-react";
import { DashboardSummary } from "@/lib/entity/dashboard";
import { useChartPalette } from "@/lib/hooks/dashboard/use-chart-palette";
import { useI18n } from "@/lib/contexts/i18n-context";
import type { ClinicLanguage } from "@/lib/entity/settings";

interface ProductivitySectionProps {
  data: DashboardSummary;
}

const MONTH_NAMES: Record<ClinicLanguage, string[]> = {
  es: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  fr: ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"],
  it: ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"],
  pt: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
};

/** "YYYY-MM" → "Ene 25" */
function formatMonthLabel(yyyyMm: string, monthNames: string[]): string {
  const [year, month] = yyyyMm.split("-");
  const idx = parseInt(month, 10) - 1;
  return `${monthNames[idx]} ${year.slice(2)}`;
}

/**
 * Rellena todos los meses entre el primero y el último que aparezcan
 * en monthlyAppointments, poniendo 0 en los meses sin datos.
 */
function buildFullMonthSeries(
  monthlyAppointments: {
    month: string;
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
  }[],
  labels: { completed: string; scheduled: string; cancelled: string },
  monthNames: string[],
) {
  if (monthlyAppointments.length === 0) return [];

  const byMonth = new Map(monthlyAppointments.map((m) => [m.month, m]));

  const sorted = [...monthlyAppointments].sort((a, b) =>
    a.month.localeCompare(b.month),
  );
  const first = sorted[0].month;
  const last = sorted[sorted.length - 1].month;

  const [fy, fm] = first.split("-").map(Number);
  const [ly, lm] = last.split("-").map(Number);

  const result = [];
  let y = fy,
    m = fm;
  while (y < ly || (y === ly && m <= lm)) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const entry = byMonth.get(key);
    result.push({
      name: formatMonthLabel(key, monthNames),
      [labels.completed]: entry?.completed ?? 0,
      [labels.scheduled]: entry?.scheduled ?? 0,
      [labels.cancelled]: entry?.cancelled ?? 0,
    });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return result;
}

export function ProductivitySection({ data }: ProductivitySectionProps) {
  const { language, t } = useI18n();
  const { kpis, doctorProductivity, monthlyAppointments } = data;
  const c = useChartPalette();
  const chartLabels = {
    completed: t("dashboard.chart.completed"),
    scheduled: t("dashboard.chart.scheduled"),
    cancelled: t("dashboard.chart.cancelled"),
  };

  const axisTick = { fill: c.axis, fontSize: 12 } as const;
  const tooltipContentStyle = {
    background: c.tooltipBg,
    border: `1px solid ${c.tooltipBorder}`,
    color: c.tooltipText,
    borderRadius: 12,
  } as const;
  const tooltipLabelStyle = { color: c.tooltipText } as const;
  const tooltipItemStyle = { color: c.tooltipText } as const;

  const chartData = buildFullMonthSeries(
    monthlyAppointments,
    chartLabels,
    MONTH_NAMES[language],
  );
  const hasMonthlyData = monthlyAppointments.some((month) => month.total > 0);

  return (
    <div className="space-y-6">
      <Header
        level={2}
        size="lg"
        title={t("dashboard.productivity.title")}
        description={t("dashboard.productivity.description")}
      />

      {/* Productivity KPIs */}
      <KpiGrid cols={{ default: 1, md: 3 }} gap={6}>
        <MetricCard
          title={t("dashboard.kpi.attendanceRate")}
          value={`${kpis.attendanceRate}%`}
          icon={Target}
          iconColor="text-emerald-600"
          progressValue={kpis.attendanceRate}
          description={`${t("dashboard.kpi.completed")} vs ${t("dashboard.kpi.cancelled")}`}
        />

        <MetricCard
          title={t("dashboard.productivity.cancellationRate")}
          value={`${kpis.cancellationRate}%`}
          icon={Target}
          iconColor="text-rose-600"
          progressValue={kpis.cancellationRate}
          description={t("dashboard.productivity.periodTotal")}
        />

        <KpiCard
          title={t("dashboard.productivity.activeDoctors")}
          value={kpis.activeDoctors}
          icon={Users}
          iconColor="text-indigo-600"
          description={
            doctorProductivity.length > 0
              ? `${t("dashboard.productivity.average")} ${Math.round(
                  doctorProductivity.reduce(
                    (acc, d) => acc + d.totalAppointments,
                    0,
                  ) / doctorProductivity.length,
                )} ${t("dashboard.productivity.appointmentsPerDoctor")}`
              : undefined
          }
        />
      </KpiGrid>

      {/* Monthly Appointments Chart */}
      <DataCard
        title={t("dashboard.productivity.monthlyEvents")}
        description={t("dashboard.productivity.monthlyEventsDescription")}
      >
        {hasMonthlyData ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCumplidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={c.success} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={c.success} stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="colorProgramadas"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={c.brand} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={c.brand} stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="colorCanceladas"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={c.danger} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={c.danger} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={c.grid}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                angle={chartData.length > 8 ? -35 : 0}
                textAnchor={chartData.length > 8 ? "end" : "middle"}
                height={chartData.length > 8 ? 50 : 30}
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                tick={axisTick}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={tooltipContentStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey={chartLabels.completed}
                stroke={c.success}
                fill="url(#colorCumplidas)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey={chartLabels.scheduled}
                stroke={c.brand}
                fill="url(#colorProgramadas)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey={chartLabels.cancelled}
                stroke={c.danger}
                fill="url(#colorCanceladas)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t("dashboard.productivity.noAppointments")}
          </p>
        )}
      </DataCard>

      {/* Doctor Rankings */}
      <DataCard
        title={t("dashboard.productivity.doctorRanking")}
        description={t("dashboard.productivity.doctorRankingDescription")}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={doctorProductivity.map((d) => ({
              name: d.doctorName,
              [chartLabels.completed]: d.completed,
              [chartLabels.cancelled]: d.cancelled,
            }))}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={c.grid}
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={axisTick}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={tooltipContentStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
              cursor={{ fill: "var(--hover)" }}
            />
            <Bar dataKey={chartLabels.completed} fill={c.brand} radius={[4, 4, 0, 0]} />
            <Bar dataKey={chartLabels.cancelled} fill={c.accent} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </DataCard>
    </div>
  );
}
