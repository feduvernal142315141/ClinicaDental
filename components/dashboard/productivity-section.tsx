"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Clock, Target, Users } from "lucide-react"
import { getProductivityStats } from "@/lib/analytics"
import { useEffect, useState } from "react"

export function ProductivitySection() {
  const [stats, setStats] = useState(getProductivityStats())

  useEffect(() => {
    setStats(getProductivityStats())
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Agenda & Productividad</h2>
        <p className="text-muted-foreground">Análisis de eficiencia y ocupación</p>
      </div>

      {/* Productivity KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Asistencia</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attendanceRate}%</div>
            <Progress value={stats.attendanceRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">Citas cumplidas vs canceladas/reagendadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo de Espera</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageWaitTime} min</div>
            <Badge variant={stats.averageWaitTime <= 15 ? "secondary" : "destructive"} className="mt-2">
              {stats.averageWaitTime <= 15 ? "Óptimo" : "Mejorable"}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">Promedio entre reserva y cita</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doctores Activos</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.doctorRankings.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Promedio{" "}
              {Math.round(
                stats.doctorRankings.reduce((acc, doc) => acc + doc.appointments, 0) / stats.doctorRankings.length,
              )}{" "}
              citas/doctor
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Doctor Rankings Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Doctores</CardTitle>
          <CardDescription>Ocupación y número de citas por doctor</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Doctor Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle por Doctor</CardTitle>
          <CardDescription>Métricas individuales de productividad</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.doctorRankings.map((doctor, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{doctor.name}</p>
                    <p className="text-sm text-muted-foreground">{doctor.appointments} citas programadas</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={doctor.occupancy >= 85 ? "default" : "secondary"}>
                    {doctor.occupancy}% ocupación
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
