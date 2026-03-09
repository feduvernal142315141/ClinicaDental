"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import type { TreatmentPlan, Tooth } from "./types"
import { useState } from "react"
import { Plus, CheckCircle2, XCircle, Clock } from "lucide-react"

interface TreatmentPlansProps {
  plans: TreatmentPlan[]
  teeth: Tooth[]
  onCreatePlan: (plan: Omit<TreatmentPlan, "id" | "createdDate" | "treatments">) => void
  onCompletePlan: (planId: string) => void
  onCancelPlan: (planId: string) => void
}

export function TreatmentPlans({ plans, teeth, onCreatePlan, onCompletePlan, onCancelPlan }: TreatmentPlansProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [planName, setPlanName] = useState("")
  const [planDescription, setPlanDescription] = useState("")

  const handleCreatePlan = () => {
    if (!planName) return

    onCreatePlan({
      name: planName,
      description: planDescription,
      status: "active",
    })

    setPlanName("")
    setPlanDescription("")
    setIsCreating(false)
  }

  const getPlanProgress = (plan: TreatmentPlan) => {
    const planTreatments = teeth.flatMap((tooth) => tooth.treatments.filter((t) => t.planName === plan.name))
    const completed = planTreatments.filter((t) => t.status === "completed").length
    const total = planTreatments.length
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Planes de Tratamiento</h2>
          <p className="text-muted-foreground">Gestiona y organiza tratamientos por planes</p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Plan
          </Button>
        )}
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Crear Nuevo Plan</CardTitle>
            <CardDescription>Define un plan de tratamiento para organizar procedimientos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Nombre del Plan</Label>
              <Input
                id="plan-name"
                placeholder="Ej: Tratamiento Integral Q1 2024"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-description">Descripción</Label>
              <Textarea
                id="plan-description"
                placeholder="Describe el objetivo del plan"
                value={planDescription}
                onChange={(e) => setPlanDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreatePlan}>Crear Plan</Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => {
          const progress = getPlanProgress(plan)
          const planTreatments = teeth.flatMap((tooth) =>
            tooth.treatments.filter((t) => t.planName === plan.name).map((t) => ({ ...t, toothNumber: tooth.number })),
          )

          return (
            <Card key={plan.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {plan.name}
                      <Badge
                        variant={
                          plan.status === "completed"
                            ? "default"
                            : plan.status === "cancelled"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {plan.status === "completed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {plan.status === "cancelled" && <XCircle className="w-3 h-3 mr-1" />}
                        {plan.status === "active" && <Clock className="w-3 h-3 mr-1" />}
                        {plan.status === "completed"
                          ? "Completado"
                          : plan.status === "cancelled"
                            ? "Cancelado"
                            : "Activo"}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className="font-medium">
                      {progress.completed} / {progress.total}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                </div>

                {planTreatments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Tratamientos:</p>
                    <div className="space-y-1">
                      {planTreatments.slice(0, 3).map((treatment) => (
                        <div key={treatment.id} className="text-sm flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            #{treatment.toothNumber}
                          </Badge>
                          <span className="text-muted-foreground">{treatment.type}</span>
                          {treatment.status === "completed" && (
                            <CheckCircle2 className="w-3 h-3 text-green-500 ml-auto" />
                          )}
                        </div>
                      ))}
                      {planTreatments.length > 3 && (
                        <p className="text-xs text-muted-foreground">+{planTreatments.length - 3} más</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Creado: {new Date(plan.createdDate).toLocaleDateString()}
                </div>

                {plan.status === "active" && (
                  <div className="flex gap-2">
                    {progress.percentage === 100 && (
                      <Button size="sm" onClick={() => onCompletePlan(plan.id)}>
                        Marcar Completado
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => onCancelPlan(plan.id)}>
                      Cancelar Plan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {plans.length === 0 && !isCreating && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No hay planes de tratamiento creados</p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Primer Plan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
