"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { Tooth, TreatmentPlan } from "./types"
import { Calendar, CheckCircle2, Clock, Euro } from "lucide-react"

interface HistoryPanelProps {
  teeth: Tooth[]
  treatmentPlans: TreatmentPlan[]
}

export function HistoryPanel({ teeth, treatmentPlans }: HistoryPanelProps) {
  const allTreatments = teeth.flatMap((tooth) => [
    ...tooth.surfaceTreatments.map((t) => ({
      ...t,
      toothNumber: tooth.number,
      isSurface: true,
    })),
    ...tooth.treatments.map((t) => ({
      ...t,
      toothNumber: tooth.number,
      isSurface: false,
    })),
  ])

  const recentTreatments = allTreatments
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)

  const completedTreatments = allTreatments.filter((t) => t.status === "completed")
  const plannedTreatments = allTreatments.filter((t) => t.status === "planned")

  const totalPlanned = Number(plannedTreatments.reduce((sum, t) => sum + (Number(t.price) || 0), 0)) || 0
  const totalCompleted = Number(completedTreatments.reduce((sum, t) => sum + (Number(t.price) || 0), 0)) || 0

  const activePlans = treatmentPlans.filter((p) => p.status === "active")

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            Tratamientos Planificados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{plannedTreatments.length}</div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Euro className="w-3 h-3" />
            {totalPlanned.toFixed(2)} total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Tratamientos Completados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completedTreatments.length}</div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Euro className="w-3 h-3" />
            {totalCompleted.toFixed(2)} total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-500" />
            Planes Activos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activePlans.length}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {activePlans.reduce((sum, p) => sum + p.treatments.length, 0)} tratamientos
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>Últimos 10 tratamientos registrados</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {recentTreatments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No hay tratamientos registrados aún</p>
              ) : (
                recentTreatments.map((treatment) => (
                  <div
                    key={treatment.id}
                    className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono text-xs">
                          Diente {treatment.toothNumber}
                        </Badge>
                        {treatment.isSurface && 'surface' in treatment && (
                          <Badge variant="secondary" className="text-xs">
                            {treatment.surface}
                          </Badge>
                        )}
                        {!treatment.isSurface && 'surfaces' in treatment && treatment.surfaces && treatment.surfaces.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {treatment.surfaces.join(', ')}
                          </Badge>
                        )}
                        <Badge variant={treatment.status === "completed" ? "default" : "secondary"} className="text-xs">
                          {treatment.status === "completed" ? "Completado" : "Planificado"}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{treatment.type}</p>
                      <p className="text-xs text-muted-foreground">{treatment.description}</p>
                      {treatment.planName && (
                        <p className="text-xs text-muted-foreground mt-1">Plan: {treatment.planName}</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-semibold">{treatment.price}€</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(treatment.date).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
