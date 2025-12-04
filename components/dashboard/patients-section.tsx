"use client";

import {
  KpiCard,
  KpiCardWithBadges,
  KpiGrid,
} from "@/components/ui/atomic/data-display/kpi-card";
import { AlertCard } from "@/components/ui/atomic/data-display/alert-card";
import { DataCard } from "@/components/ui/atomic/data-display/data-card";
import { SectionHeader } from "@/components/ui/atomic/layout/section-header";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Users, UserPlus, UserX, AlertCircle } from "lucide-react";
import { getPatientAnalytics } from "@/lib/analytics";
import { useEffect, useState } from "react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export function PatientsSection() {
  const [analytics, setAnalytics] = useState(getPatientAnalytics());

  useEffect(() => {
    setAnalytics(getPatientAnalytics());
  }, []);

  const newVsRecurringData = [
    { name: "Nuevos", value: analytics.newVsRecurring.new, color: "#3b82f6" },
    {
      name: "Recurrentes",
      value: analytics.newVsRecurring.recurring,
      color: "#10b981",
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Análisis de Pacientes"
        description="Segmentación y comportamiento de pacientes"
        size="lg"
      />

      {/* Patient Overview */}
      <KpiGrid cols={{ default: 1, md: 4 }} gap={6}>
        <KpiCard
          title="Total Pacientes"
          value={
            analytics.newVsRecurring.new + analytics.newVsRecurring.recurring
          }
          icon={Users}
          iconColor="text-blue-600"
        />

        <KpiCardWithBadges
          title="Nuevos"
          value={analytics.newVsRecurring.new}
          icon={UserPlus}
          iconColor="text-green-600"
          badges={[
            {
              label: `${Math.round(
                (analytics.newVsRecurring.new /
                  (analytics.newVsRecurring.new +
                    analytics.newVsRecurring.recurring)) *
                  100
              )}%`,
              variant: "secondary",
            },
          ]}
        />

        <KpiCardWithBadges
          title="Recurrentes"
          value={analytics.newVsRecurring.recurring}
          icon={Users}
          iconColor="text-purple-600"
          badges={[
            {
              label: `${Math.round(
                (analytics.newVsRecurring.recurring /
                  (analytics.newVsRecurring.new +
                    analytics.newVsRecurring.recurring)) *
                  100
              )}%`,
              variant: "secondary",
            },
          ]}
        />

        <KpiCardWithBadges
          title="Cancelaciones"
          value={analytics.frequentCancellations.length}
          icon={UserX}
          iconColor="text-red-600"
          badges={[
            {
              label: "Frecuentes",
              variant: "destructive",
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
          <div className="flex justify-center gap-4 mt-4">
            {newVsRecurringData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                ></div>
                <span className="text-sm">
                  {entry.name}: {entry.value}
                </span>
              </div>
            ))}
          </div>
        </DataCard>

        {/* Demographics by Age */}
        <DataCard
          title="Distribución por Edad"
          description="Segmentación demográfica"
        >
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics.demographics.ageGroups}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </DataCard>
      </div>

      {/* Problem Patients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Frequent Cancellations */}
        <DataCard
          title="Cancelaciones Frecuentes"
          description="Pacientes con problemas de comunicación"
          icon={AlertCircle}
          iconColor="text-amber-500"
          contentClassName="space-y-3"
        >
          {analytics.frequentCancellations.map((patient, index) => (
            <AlertCard
              key={index}
              title={patient.name}
              description="Requiere seguimiento"
              badgeValue={`${patient.cancellations} cancelaciones`}
              variant="warning"
              badgeVariant="destructive"
            />
          ))}
        </DataCard>

        {/* Missed Follow-ups */}
        <DataCard
          title="Sin Seguimiento"
          description="Pacientes con tratamientos pausados"
          icon={AlertCircle}
          iconColor="text-red-500"
          contentClassName="space-y-3"
        >
          {analytics.missedFollowups.map((patient, index) => (
            <AlertCard
              key={index}
              title={patient.name}
              description={`Última visita: ${new Date(
                patient.lastVisit
              ).toLocaleDateString()}`}
              badgeValue="Contactar"
              variant="error"
              badgeVariant="destructive"
            />
          ))}
        </DataCard>
      </div>
    </div>
  );
}
