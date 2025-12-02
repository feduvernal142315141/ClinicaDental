"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { Users, UserPlus, UserX, AlertCircle } from "lucide-react"
import { getPatientAnalytics } from "@/lib/analytics"
import { useEffect, useState } from "react"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"]

export function PatientsSection() {
  const [analytics, setAnalytics] = useState(getPatientAnalytics())

  useEffect(() => {
    setAnalytics(getPatientAnalytics())
  }, [])

  const newVsRecurringData = [
    { name: "Nuevos", value: analytics.newVsRecurring.new, color: "#3b82f6" },
    { name: "Recurrentes", value: analytics.newVsRecurring.recurring, color: "#10b981" },
  ]

  const genderData = [
    { name: "Masculino", value: analytics.demographics.gender.male, color: "#3b82f6" },
    { name: "Femenino", value: analytics.demographics.gender.female, color: "#ec4899" },
    { name: "Otro", value: analytics.demographics.gender.other, color: "#8b5cf6" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Análisis de Pacientes</h2>
        <p className="text-muted-foreground">Segmentación y comportamiento de pacientes</p>
      </div>

      {/* Patient Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pacientes</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.newVsRecurring.new + analytics.newVsRecurring.recurring}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nuevos</CardTitle>
            <UserPlus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.newVsRecurring.new}</div>
            <Badge variant="secondary" className="mt-1">
              {Math.round(
                (analytics.newVsRecurring.new / (analytics.newVsRecurring.new + analytics.newVsRecurring.recurring)) *
                  100,
              )}
              %
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recurrentes</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.newVsRecurring.recurring}</div>
            <Badge variant="secondary" className="mt-1">
              {Math.round(
                (analytics.newVsRecurring.recurring /
                  (analytics.newVsRecurring.new + analytics.newVsRecurring.recurring)) *
                  100,
              )}
              %
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelaciones</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.frequentCancellations.length}</div>
            <Badge variant="destructive" className="mt-1">
              Frecuentes
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New vs Recurring */}
        <Card>
          <CardHeader>
            <CardTitle>Nuevos vs Recurrentes</CardTitle>
            <CardDescription>Distribución de tipos de pacientes</CardDescription>
          </CardHeader>
          <CardContent>
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
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                  <span className="text-sm">
                    {entry.name}: {entry.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Demographics by Age */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Edad</CardTitle>
            <CardDescription>Segmentación demográfica</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.demographics.ageGroups}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Problem Patients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Frequent Cancellations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Cancelaciones Frecuentes
            </CardTitle>
            <CardDescription>Pacientes con problemas de comunicación</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.frequentCancellations.map((patient, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <div>
                    <p className="font-medium text-amber-800">{patient.name}</p>
                    <p className="text-sm text-amber-600">Requiere seguimiento</p>
                  </div>
                  <Badge variant="destructive">{patient.cancellations} cancelaciones</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Missed Follow-ups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Sin Seguimiento
            </CardTitle>
            <CardDescription>Pacientes con tratamientos pausados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.missedFollowups.map((patient, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-red-800">{patient.name}</p>
                    <p className="text-sm text-red-600">
                      Última visita: {new Date(patient.lastVisit).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="destructive">Contactar</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
