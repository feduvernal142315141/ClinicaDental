"use client"

import { useState, useMemo, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Play, Pause, Clock, Upload, Trash2, CheckCircle2, Plus, Save, ArrowRight, Undo2 } from "lucide-react"
import type {
  Tooth,
  ToothSurface,
  ProcedurePlan,
  PerformedProcedure,
  PerformedStatus,
  PerformedOutcome,
  MaterialUsed,
  PatientRiskLevel,
  ProcedureCatalogItem,
} from "./types"
import { GLOBAL_STATUS_LABELS, PLAN_STATUS_LABELS, PROCEDURE_CATALOG, PROCEDURE_PROTOCOLS } from "./types"
import { useOdontogramStore } from "@/lib/odontogram/store"

interface PerformedTabProps {
  tooth: Tooth
  selectedSurfaces: ToothSurface[]
  plans?: ProcedurePlan[]
  patientRisk?: PatientRiskLevel
  visitId?: string
  operatorId?: string
  onNavigateToTab?: (tab: string) => void
  onSave?: (performed: PerformedProcedure[]) => void
}

function getToothTypeName(toothNumber: number): string {
  const lastDigit = toothNumber % 10
  if (lastDigit === 1 || lastDigit === 2) return "Incisivo"
  if (lastDigit === 3) return "Canino"
  if (lastDigit === 4 || lastDigit === 5) return "Premolar"
  if (lastDigit === 6 || lastDigit === 7 || lastDigit === 8) return "Molar"
  return "Diente"
}

function generateId(): string {
  return `performed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function PerformedTab({
  tooth,
  selectedSurfaces,
  plans = [],
  patientRisk = "medio",
  visitId,
  operatorId,
  onNavigateToTab,
  onSave,
}: PerformedTabProps) {
  const { clinicalEvents } = useOdontogramStore()

  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(new Set())
  const [isAdHoc, setIsAdHoc] = useState(false)
  const [selectedAdHocProcedure, setSelectedAdHocProcedure] = useState<ProcedureCatalogItem | null>(null)
  const [activePerformedId, setActivePerformedId] = useState<string | null>(null)

  const performedFromStore = useMemo(() => {    

    const performedEvents = clinicalEvents.filter((e) => {
      const matches = e.toothNumber === tooth.number && e.type === "performed"
      if (matches) {
        console.log("Evento 'performed' encontrado:", {
          id: e.id,
          procedureName: e.procedureName,
          notes: e.notes,
          surfaces: e.surfaces,
          status: e.status,
        })
      }
      return matches
    })   

    const mapped = performedEvents.map((event) => ({
      id: event.id,
      visitId: event.visitId,
      toothNumber: event.toothNumber,
      surfaces: event.surfaces,
      procedureId: event.procedureId || "",
      fromPlanId: event.id,
      status: "done" as PerformedStatus,
      materials: [],
      durationMin: event.durationMin || 0,
      timer: { totalMinutes: event.durationMin || 0 },
      attachments: [],
      outcome: "ok" as PerformedOutcome,
      operatorId: event.authorId,
      notes: event.notes,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }))
    
    return mapped
  }, [clinicalEvents, tooth.number])

  const [performed, setPerformed] = useState<PerformedProcedure[]>([])

  useEffect(() => {    

    if (performedFromStore.length > 0) {
     
      setPerformed(performedFromStore)

      if (!activePerformedId) {
       
        setActivePerformedId(performedFromStore[0].id)
      }
    } else if (performedFromStore.length === 0 && performed.length > 0) {

      setPerformed([])
      setActivePerformedId(null)
    }
  }, [performedFromStore, activePerformedId])

  const pendingPlans = useMemo(() => {
    return plans.filter((p) => p.toothNumber === tooth.number && (p.status === "plan" || p.status === "in_progress"))
  }, [plans, tooth.number])

  const activePerformed = useMemo(() => {
    return performed.find((p) => p.id === activePerformedId)
  }, [performed, activePerformedId])

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(planId)) {
        newSet.delete(planId)
      } else {
        newSet.add(planId)
      }
      return newSet
    })
  }

  const handleMarkAsPerformed = () => {
    const selectedPlans = pendingPlans.filter((p) => selectedPlanIds.has(p.id))

    const newPerformed: PerformedProcedure[] = selectedPlans.map((plan) => {
      const protocolSteps = PROCEDURE_PROTOCOLS[plan.procedureId] || []

      return {
        id: generateId(),
        visitId,
        toothNumber: tooth.number,
        surfaces: plan.surfaces,
        procedureId: plan.procedureId,
        fromPlanId: plan.id,
        status: "done",
        materials: [],
        durationMin: plan.durationMin,
        timer: { totalMinutes: 0 },
        attachments: [],
        outcome: "ok",
        operatorId,
        protocol: {
          procedureId: plan.procedureId,
          steps: protocolSteps.map((step, idx) => ({
            id: `step-${idx}`,
            name: step,
            completed: false,
          })),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    })

    setPerformed((prev) => [...prev, ...newPerformed])
    if (newPerformed.length > 0) {
      setActivePerformedId(newPerformed[0].id)
    }
    setSelectedPlanIds(new Set())
  }

  const handleAddAdHoc = () => {
    if (!selectedAdHocProcedure) return

    const protocolSteps = PROCEDURE_PROTOCOLS[selectedAdHocProcedure.id] || []

    const newPerformed: PerformedProcedure = {
      id: generateId(),
      visitId,
      toothNumber: tooth.number,
      surfaces: selectedSurfaces,
      adHocName: selectedAdHocProcedure.name,
      procedureId: selectedAdHocProcedure.id,
      status: "done",
      materials: [],
      durationMin: selectedAdHocProcedure.estimatedDuration,
      timer: { totalMinutes: 0 },
      attachments: [],
      outcome: "ok",
      operatorId,
      protocol: {
        procedureId: selectedAdHocProcedure.id,
        steps: protocolSteps.map((step, idx) => ({
          id: `step-${idx}`,
          name: step,
          completed: false,
        })),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setPerformed((prev) => [...prev, newPerformed])
    setActivePerformedId(newPerformed.id)
    setIsAdHoc(false)
    setSelectedAdHocProcedure(null)
  }

  const handleUpdatePerformed = (id: string, updates: Partial<PerformedProcedure>) => {
    setPerformed((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    )
  }

  const handleToggleProtocolStep = (performedId: string, stepId: string) => {
    setPerformed((prev) =>
      prev.map((p) => {
        if (p.id !== performedId || !p.protocol) return p

        return {
          ...p,
          protocol: {
            ...p.protocol,
            steps: p.protocol.steps.map((step) =>
              step.id === stepId ? { ...step, completed: !step.completed } : step,
            ),
          },
          updatedAt: new Date().toISOString(),
        }
      }),
    )
  }

  const handleAddMaterial = (performedId: string) => {
    const newMaterial: MaterialUsed = {
      brand: "",
      shade: "",
      lot: "",
      expiration: "",
    }

    handleUpdatePerformed(performedId, {
      materials: [...(activePerformed?.materials || []), newMaterial],
    })
  }

  const handleUpdateMaterial = (performedId: string, index: number, updates: Partial<MaterialUsed>) => {
    const materials = [...(activePerformed?.materials || [])]
    materials[index] = { ...materials[index], ...updates }
    handleUpdatePerformed(performedId, { materials })
  }

  const handleRemoveMaterial = (performedId: string, index: number) => {
    const materials = [...(activePerformed?.materials || [])]
    materials.splice(index, 1)
    handleUpdatePerformed(performedId, { materials })
  }

  const handleStartTimer = (performedId: string) => {
    handleUpdatePerformed(performedId, {
      timer: {
        startedAt: new Date().toISOString(),
        totalMinutes: activePerformed?.timer?.totalMinutes || 0,
      },
    })
  }

  const handleStopTimer = (performedId: string) => {
    if (!activePerformed?.timer?.startedAt) return

    const startTime = new Date(activePerformed.timer.startedAt).getTime()
    const endTime = new Date().getTime()
    const elapsedMinutes = Math.round((endTime - startTime) / 60000)

    handleUpdatePerformed(performedId, {
      timer: {
        stoppedAt: new Date().toISOString(),
        totalMinutes: (activePerformed.timer.totalMinutes || 0) + elapsedMinutes,
      },
      durationMin: (activePerformed.timer.totalMinutes || 0) + elapsedMinutes,
    })
  }

  const handleSave = () => {
    if (onSave) {
      onSave(performed)
    }
  }

  const handleRemovePerformed = (id: string) => {
    setPerformed((prev) => prev.filter((p) => p.id !== id))
    if (activePerformedId === id) {
      setActivePerformedId(null)
    }
  }

  const getRiskColor = (risk: PatientRiskLevel) => {
    if (risk === "bajo") return "bg-green-100 text-green-800 border-green-300"
    if (risk === "medio") return "bg-amber-100 text-amber-800 border-amber-300"
    return "bg-red-100 text-red-800 border-red-300"
  }

  const getStatusColor = (status: PerformedStatus) => {
    if (status === "done") return "bg-blue-100 text-blue-800 border-blue-300"
    if (status === "in_progress") return "bg-purple-100 text-purple-800 border-purple-300"
    if (status === "partial") return "bg-amber-100 text-amber-800 border-amber-300"
    return "bg-gray-100 text-gray-800 border-gray-300"
  }

  if (selectedSurfaces.length === 0 && pendingPlans.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground mb-4">Selecciona superficies o crea un plan primero</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => onNavigateToTab?.("superficies")}>
            ← Superficies
          </Button>
          <Button variant="outline" onClick={() => onNavigateToTab?.("plan")}>
            ← Plan
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4 h-full">
      {/* Header compacto */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold">Realizado · Diente {tooth.number}</h3>
          <p className="text-sm text-muted-foreground">
            {getToothTypeName(tooth.number)} · {selectedSurfaces.length} superficie
            {selectedSurfaces.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className={getRiskColor(patientRisk)}>
            Riesgo: {patientRisk.charAt(0).toUpperCase() + patientRisk.slice(1)}
          </Badge>
          <Badge variant="outline" className="bg-muted">
            {GLOBAL_STATUS_LABELS[tooth.globalStatus]}
          </Badge>
        </div>
      </div>

      {/* Panel principal: dos columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
        {/* Columna izquierda: Selección y protocolos */}
        <div className="space-y-4">
          {/* Planes pendientes */}
          {pendingPlans.length > 0 && (
            <Card className="p-4 shadow-sm">
              <Label className="text-sm font-semibold mb-3 block">Planes pendientes ({pendingPlans.length})</Label>
              <div className="space-y-2 mb-3">
                {pendingPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-start gap-2 p-2 rounded border hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleSelectPlan(plan.id)}
                  >
                    <Checkbox
                      checked={selectedPlanIds.has(plan.id)}
                      onCheckedChange={() => handleSelectPlan(plan.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{plan.displayName}</p>
                      {plan.surfaces.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {plan.surfaces.map((s) => (
                            <Badge key={s} variant="outline" className="text-xs">
                              {s.charAt(0).toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 mx-auto" />
                          {plan.durationMin} min
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {PLAN_STATUS_LABELS[plan.status]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                className="w-full"
                disabled={selectedPlanIds.size === 0}
                onClick={handleMarkAsPerformed}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Marcar como realizado ({selectedPlanIds.size})
              </Button>
            </Card>
          )}

          {/* Ad-hoc */}
          <Card className="p-4 shadow-sm">
            <Label className="text-sm font-semibold mb-3 block">Procedimiento Ad-hoc</Label>
            <p className="text-xs text-muted-foreground mb-3">Registra algo no planificado</p>

            {!isAdHoc ? (
              <Button size="sm" variant="outline" className="w-full bg-transparent" onClick={() => setIsAdHoc(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Añadir procedimiento
              </Button>
            ) : (
              <div className="space-y-3">
                <Select
                  value={selectedAdHocProcedure?.id || ""}
                  onValueChange={(id) => {
                    const proc = PROCEDURE_CATALOG.find((p) => p.id === id)
                    setSelectedAdHocProcedure(proc || null)
                  }}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecciona procedimiento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PROCEDURE_CATALOG.map((proc) => (
                      <SelectItem key={proc.id} value={proc.id}>
                        {proc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => setIsAdHoc(false)}
                  >
                    Cancelar
                  </Button>
                  <Button size="sm" className="flex-1" disabled={!selectedAdHocProcedure} onClick={handleAddAdHoc}>
                    Añadir
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Protocolo dinámico */}
          {activePerformed?.protocol && (
            <Card className="p-4 shadow-sm">
              <Label className="text-sm font-semibold mb-3 block">Protocolo</Label>
              <div className="space-y-2">
                {activePerformed.protocol.steps.map((step) => (
                  <div key={step.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={step.completed}
                      onCheckedChange={() => handleToggleProtocolStep(activePerformed.id, step.id)}
                    />
                    <span className={`text-sm ${step.completed ? "line-through text-muted-foreground" : ""}`}>
                      {step.name}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Completados: {activePerformed.protocol.steps.filter((s) => s.completed).length} /{" "}
                  {activePerformed.protocol.steps.length}
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Columna derecha: Detalle del acto */}
        <div className="space-y-4">
          {performed.length === 0 ? (
            <Card className="p-8 text-center border-2 border-dashed">
              <p className="text-sm text-muted-foreground">No hay procedimientos realizados</p>
              <p className="text-xs text-muted-foreground mt-1">
                Marca planes como realizados o añade procedimientos ad-hoc
              </p>
            </Card>
          ) : (
            <>
              {/* Selector de procedimiento activo */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {performed.map((p) => (
                  <Button
                    key={p.id}
                    size="sm"
                    variant={activePerformedId === p.id ? "default" : "outline"}
                    onClick={() => setActivePerformedId(p.id)}
                    className="flex-shrink-0"
                  >
                    {p.adHocName ||
                      PROCEDURE_CATALOG.find((proc) => proc.id === p.procedureId)?.name ||
                      "Procedimiento"}
                  </Button>
                ))}
              </div>

              {/* Detalle del procedimiento activo */}
              {activePerformed && (
                <Card className="p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-base font-semibold">
                        {activePerformed.adHocName ||
                          PROCEDURE_CATALOG.find((p) => p.id === activePerformed.procedureId)?.name}
                      </h4>
                      {activePerformed.surfaces.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {activePerformed.surfaces.map((s) => (
                            <Badge key={s} variant="outline" className="text-xs">
                              {s.charAt(0).toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemovePerformed(activePerformed.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {/* Estado */}
                    <div>
                      <Label className="text-sm mb-2 block">Estado</Label>
                      <Select
                        value={activePerformed.status}
                        onValueChange={(v) =>
                          handleUpdatePerformed(activePerformed.id, { status: v as PerformedStatus })
                        }
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hecho">Hecho</SelectItem>
                          <SelectItem value="en-curso">En curso</SelectItem>
                          <SelectItem value="parcial">Parcial</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Timer */}
                    <div>
                      <Label className="text-sm mb-2 block">Tiempo</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 p-3 rounded border bg-muted/30 text-center">
                          <p className="text-2xl font-bold">{activePerformed.timer?.totalMinutes || 0}</p>
                          <p className="text-xs text-muted-foreground">minutos</p>
                        </div>
                        {!activePerformed.timer?.startedAt || activePerformed.timer?.stoppedAt ? (
                          <Button size="sm" onClick={() => handleStartTimer(activePerformed.id)}>
                            <Play className="w-4 h-4 mr-1" />
                            Iniciar
                          </Button>
                        ) : (
                          <Button size="sm" variant="destructive" onClick={() => handleStopTimer(activePerformed.id)}>
                            <Pause className="w-4 h-4 mr-1" />
                            Detener
                          </Button>
                        )}
                      </div>
                      <Input
                        type="number"
                        value={activePerformed.durationMin}
                        onChange={(e) =>
                          handleUpdatePerformed(activePerformed.id, { durationMin: Number(e.target.value) })
                        }
                        placeholder="O ingresa manualmente..."
                        className="mt-2 text-sm"
                      />
                    </div>

                    {/* Materiales */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm">Materiales</Label>
                        <Button size="sm" variant="outline" onClick={() => handleAddMaterial(activePerformed.id)}>
                          <Plus className="w-3 h-3 mr-1" />
                          Añadir
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {activePerformed.materials.map((material, idx) => (
                          <div key={idx} className="p-3 rounded border bg-muted/20">
                            <div className="flex items-start justify-between mb-2">
                              <Label className="text-xs">Material {idx + 1}</Label>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleRemoveMaterial(activePerformed.id, idx)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs mb-1 block">Marca</Label>
                                <Input
                                  value={material.brand}
                                  onChange={(e) =>
                                    handleUpdateMaterial(activePerformed.id, idx, { brand: e.target.value })
                                  }
                                  placeholder="Ej. 3M Filtek"
                                  className="text-xs h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs mb-1 block">Sombra/Color</Label>
                                <Input
                                  value={material.shade || ""}
                                  onChange={(e) =>
                                    handleUpdateMaterial(activePerformed.id, idx, { shade: e.target.value })
                                  }
                                  placeholder="Ej. A2"
                                  className="text-xs h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs mb-1 block">Lote</Label>
                                <Input
                                  value={material.lot || ""}
                                  onChange={(e) =>
                                    handleUpdateMaterial(activePerformed.id, idx, { lot: e.target.value })
                                  }
                                  placeholder="Número de lote"
                                  className="text-xs h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs mb-1 block">Caducidad</Label>
                                <Input
                                  type="date"
                                  value={material.expiration || ""}
                                  onChange={(e) =>
                                    handleUpdateMaterial(activePerformed.id, idx, { expiration: e.target.value })
                                  }
                                  className="text-xs h-8"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Resultado */}
                    <div>
                      <Label className="text-sm mb-2 block">Resultado</Label>
                      <Select
                        value={activePerformed.outcome}
                        onValueChange={(v) =>
                          handleUpdatePerformed(activePerformed.id, { outcome: v as PerformedOutcome })
                        }
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ok">Satisfactorio</SelectItem>
                          <SelectItem value="complicacion">Complicación</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Notas clínicas */}
                    <div>
                      <Label className="text-sm mb-2 block">Notas clínicas</Label>
                      <Textarea
                        value={activePerformed.notes || ""}
                        onChange={(e) => handleUpdatePerformed(activePerformed.id, { notes: e.target.value })}
                        placeholder="Observaciones del procedimiento..."
                        className="text-sm min-h-20"
                      />
                    </div>

                    {/* Recomendaciones */}
                    <div>
                      <Label className="text-sm mb-2 block">Recomendaciones</Label>
                      <Input
                        value={activePerformed.recommendation || ""}
                        onChange={(e) => handleUpdatePerformed(activePerformed.id, { recommendation: e.target.value })}
                        placeholder="Indicaciones post-tratamiento..."
                        className="text-sm"
                      />
                    </div>

                    {/* Adjuntos */}
                    <div>
                      <Label className="text-sm mb-2 block">Evidencia (Rx/Fotos)</Label>
                      <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/30 transition-colors cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Arrastra archivos aquí o haz clic para subir</p>
                        <p className="text-xs text-muted-foreground mt-1">Fotos, Rx, documentos</p>
                      </div>
                      {activePerformed.attachments.length > 0 && (
                        <div className="mt-2 flex gap-2">
                          {activePerformed.attachments.map((att, idx) => (
                            <div
                              key={idx}
                              className="w-16 h-16 rounded border bg-muted flex items-center justify-center"
                            >
                              <span className="text-xs">📎</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Firma */}
                    <div>
                      <Label className="text-sm mb-2 block">Operador</Label>
                      <Input
                        value={activePerformed.operatorId || ""}
                        onChange={(e) => handleUpdatePerformed(activePerformed.id, { operatorId: e.target.value })}
                        placeholder="ID o nombre del operador"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer con botones */}
      {performed.length > 0 && (
        <div className="flex justify-between items-center gap-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setPerformed([])}>
            <Undo2 className="w-4 h-4 mr-2" />
            Deshacer todo
          </Button>
          <div className="flex gap-3">
            <Button variant="default" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>
            <Button variant="default" onClick={handleSave}>
              Guardar y siguiente diente
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
