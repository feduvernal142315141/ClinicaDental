"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Users,
  Activity,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { getDashboardStats } from "@/lib/analytics";
import { useEffect, useState } from "react";

export function OverviewSection() {
  const [stats, setStats] = useState(getDashboardStats());

  useEffect(() => {
    setStats(getDashboardStats());
  }, []);

  const revenueChange = stats.revenue.change > 0 ? "increase" : "decrease";
  const TrendIcon = stats.revenue.change > 0 ? TrendingUp : TrendingDown;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Vista General</h2>
        <p className="text-muted-foreground">
          Snapshot del estado actual de la clínica
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas de Hoy</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.todayAppointments.total}
            </div>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                ✅ {stats.todayAppointments.completed} Cumplidas
              </Badge>
              <Badge variant="destructive" className="text-xs">
                ❌ {stats.todayAppointments.cancelled} Canceladas
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Doctores Activos
            </CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.doctors.active}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Ocupación promedio:{" "}
              {Math.round(
                stats.doctors.occupancy.reduce(
                  (acc, doc) => acc + doc.percentage,
                  0
                ) / stats.doctors.occupancy.length
              )}
              %
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pacientes Este Mes
            </CardTitle>
            <Activity className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.patients.thisMonth}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                🆕 {stats.patients.new} Nuevos
              </Badge>
              <Badge variant="outline" className="text-xs">
                🔄 {stats.patients.recurring} Recurrentes
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ingresos Estimados
            </CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.revenue.estimated.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendIcon
                className={`h-3 w-3 ${
                  revenueChange === "increase"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              />
              <span
                className={`text-xs ${
                  revenueChange === "increase"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {Math.abs(stats.revenue.change)}% vs mes anterior
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Doctor Occupancy */}
      <Card>
        <CardHeader>
          <CardTitle>Ocupación de Doctores</CardTitle>
          <CardDescription>
            Porcentaje de agenda ocupada por doctor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.doctors.occupancy.map((doctor, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{doctor.name}</span>
                <span className="text-muted-foreground">
                  {doctor.percentage}%
                </span>
              </div>
              <Progress value={doctor.percentage} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Alertas del Sistema
          </CardTitle>
          <CardDescription>Situaciones que requieren atención</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-red-800">
                  Pagos Pendientes
                </p>
                <p className="text-xs text-red-600">Requieren seguimiento</p>
              </div>
              <Badge variant="destructive">
                {stats.alerts.pendingPayments}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Sin Seguimiento
                </p>
                <p className="text-xs text-amber-600">Tratamientos pausados</p>
              </div>
              <Badge
                variant="secondary"
                className="bg-amber-200 text-amber-800"
              >
                {stats.alerts.missedFollowups}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-orange-800">
                  Cancelaciones Frecuentes
                </p>
                <p className="text-xs text-orange-600">
                  Problemas de comunicación
                </p>
              </div>
              <Badge
                variant="secondary"
                className="bg-orange-200 text-orange-800"
              >
                {stats.alerts.frequentCancellations}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
