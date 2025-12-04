"use client";

import { KpiCard, KpiGrid } from "@/components/ui/atomic/data-display/kpi-card";
import { DataCard } from "@/components/ui/atomic/data-display/data-card";
import { DoctorList } from "@/components/ui/atomic/data-display/doctor-list-item";
import { MetricCard } from "@/components/ui/atomic/data-display/metric-card";
import { SectionHeader } from "@/components/ui/atomic/layout/section-header";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Clock, Target, Users } from "lucide-react";
import { getProductivityStats } from "@/lib/analytics";
import { useEffect, useState } from "react";

export function ProductivitySection() {
  const [stats, setStats] = useState(getProductivityStats());

  useEffect(() => {
    setStats(getProductivityStats());
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Agenda & Productividad"
        description="Análisis de eficiencia y ocupación"
        size="lg"
      />

      {/* Productivity KPIs */}
      <KpiGrid cols={{ default: 1, md: 3 }} gap={6}>
        <MetricCard
          title="Tasa de Asistencia"
          value={`${stats.attendanceRate}%`}
          icon={Target}
          iconColor="text-green-600"
          progressValue={stats.attendanceRate}
          description="Citas cumplidas vs canceladas/reagendadas"
        />

        <MetricCard
          title="Tiempo de Espera"
          value={`${stats.averageWaitTime} min`}
          icon={Clock}
          iconColor="text-blue-600"
          badge={{
            label: stats.averageWaitTime <= 15 ? "Óptimo" : "Mejorable",
            variant: stats.averageWaitTime <= 15 ? "secondary" : "destructive",
          }}
          description="Promedio entre reserva y cita"
        />

        <KpiCard
          title="Doctores Activos"
          value={stats.doctorRankings.length}
          icon={Users}
          iconColor="text-purple-600"
          description={`Promedio ${Math.round(
            stats.doctorRankings.reduce(
              (acc, doc) => acc + doc.appointments,
              0
            ) / stats.doctorRankings.length
          )} citas/doctor`}
        />
      </KpiGrid>

      {/* Doctor Rankings Chart */}
      <DataCard
        title="Ranking de Doctores"
        description="Ocupación y número de citas por doctor"
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.doctorRankings}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="occupancy" fill="#3b82f6" name="Ocupación %" />
            <Bar dataKey="appointments" fill="#10b981" name="Citas" />
          </BarChart>
        </ResponsiveContainer>
      </DataCard>

      {/* Doctor Details Table */}
      <DataCard
        title="Detalle por Doctor"
        description="Métricas individuales de productividad"
      >
        <DoctorList
          doctors={stats.doctorRankings}
          spacing="md"
          icon={Users}
          occupancyThreshold={85}
        />
      </DataCard>
    </div>
  );
}
