"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type {
  Tooth,
  ToothGlobalStatus,
  ToothSurface,
  ProcedurePlan,
  SurfaceDiagnosis,
  PulpalStatus,
  SurfaceTreatment,
  SurfaceCondition,
  ICDASScore,
} from "./types"
import { GLOBAL_STATUS_LABELS, GLOBAL_STATUS_COLORS } from "./types"
import { useState, useEffect } from "react"
import { SurfacesTab } from "./surfaces-tab"
import { DiagnosisTab } from "./diagnosis-tab"
import { PlanTab } from "./plan-tab"
import { PerformedTab } from "./performed-tab"
import { useOdontogramStore } from "@/lib/odontogram/store"
import { ToothTypeService } from "@/lib/odontogram/domain/odontogram/services"

interface ToothModalProps {
  tooth: Tooth | null
  isOpen: boolean
  onClose: () => void
  onUpdateGlobalStatus: (toothNumber: number, status: ToothGlobalStatus) => void
  onAddSurfaceTreatment?: (toothNumber: number, treatment: Omit<SurfaceTreatment, "id" | "date">) => void
  onAddSurfaceCondition?: (toothNumber: number, condition: Omit<SurfaceCondition, "id" | "diagnosedDate">) => void
  onDeleteCondition?: (toothNumber: number, conditionId: string) => void
  onCompleteTreatment?: (toothNumber: number, treatmentId: string) => void
  onDeleteTreatment?: (toothNumber: number, treatmentId: string) => void
  onApplyAndNext?: () => void
  initialSurfaces?: ToothSurface[]
}

function getToothDescription(toothNumber: number): string {
  const quadrant = Math.floor(toothNumber / 10)
  const position = toothNumber % 10

  const type = ToothTypeService.getToothTypeName(toothNumber)

  let location = ""
  if (quadrant === 1) location = "superior derecho"
  else if (quadrant === 2) location = "superior izquierdo"
  else if (quadrant === 3) location = "inferior izquierdo"
  else if (quadrant === 4) location = "inferior derecho"

  let positionName = ""
  if (position === 1) positionName = "central"
  else if (position === 2) positionName = "lateral"
  else if (position === 3) positionName = ""
  else if (position === 4) positionName = "primer"
  else if (position === 5) positionName = "segundo"
  else if (position === 6) positionName = "primer"
  else if (position === 7) positionName = "segundo"
  else if (position === 8) positionName = "tercer"

  return `${type} ${positionName} ${location}`.trim()
}

export function ToothModal({
  tooth,
  isOpen,
  onClose,
  onUpdateGlobalStatus,
  onApplyAndNext,
  initialSurfaces,
}: ToothModalProps) {
  const { addClinicalEvent, getToothEvents, updateClinicalEvent, clinicalEvents } = useOdontogramStore()

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [tempGlobalStatus, setTempGlobalStatus] = useState<ToothGlobalStatus>("healthy")
  const [activeTab, setActiveTab] = useState("superficies")
  const [selectedSurfaces, setSelectedSurfaces] = useState<ToothSurface[]>([])
  const [diagnoses, setDiagnoses] = useState<Map<ToothSurface, SurfaceDiagnosis>>(new Map())
  const [pulpalStatus, setPulpalStatus] = useState<PulpalStatus>("normal")
  const [plans, setPlans] = useState<ProcedurePlan[]>([])

  useEffect(() => {
    if (isOpen && tooth) {

      setTempGlobalStatus(tooth.globalStatus)
      setHasUnsavedChanges(false)
      setActiveTab("superficies")

      // Obtener eventos clínicos del diente desde el store
      const events = getToothEvents(tooth.number)

      // Extraer superficies con eventos
      const surfacesWithEvents = new Set<ToothSurface>()
      events.forEach((event) => {
        event.surfaces.forEach((surface) => surfacesWithEvents.add(surface))
      })
      const loadedSurfaces = Array.from(surfacesWithEvents)
      setSelectedSurfaces(loadedSurfaces)

      // Cargar diagnósticos
      const loadedDiagnoses = new Map<ToothSurface, SurfaceDiagnosis>()
      events
        .filter((e) => e.type === "diagnosis" && e.icdasScore !== undefined)
        .forEach((event) => {
          event.surfaces.forEach((surface) => {
            loadedDiagnoses.set(surface, {
              surface,
              icdasScore: event.icdasScore as ICDASScore,
              cariesActivity: "activa",
              nonCariousLesions: [],
              notes: event.notes || "",
              lastUpdate: event.createdAt,
            })
          })
        })
      setDiagnoses(loadedDiagnoses)

      // Cargar estado pulpar
      const endoEvent = events.find((e) => e.type === "endo")
      if (endoEvent && endoEvent.notes) {
        const pulpalMatch = endoEvent.notes.match(/Estado pulpar: (\w+)/)
        if (pulpalMatch) {
          const status = pulpalMatch[1] as PulpalStatus
          setPulpalStatus(status)
        }
      } else {
        setPulpalStatus("normal")
      }

      // Cargar planes
      const loadedPlans: ProcedurePlan[] = events
        .filter((e) => e.type === "plan" && e.status === "plan")
        .map((event) => ({
          id: event.id,
          toothNumber: tooth.number,
          surfaces: event.surfaces,
          procedureId: event.procedureId || "custom",
          displayName: event.procedureName || event.notes || "Procedimiento",
          category: event.category || "restaurador",
          status: "plan",
          priority: event.priority || "media",
          material: event.material,
          durationMin: event.durationMin || 30,
          cost: event.cost || 0,
          notes: event.notes,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
          authorId: event.authorId,
        }))

      setPlans(loadedPlans)

    }
  }, [isOpen, tooth, getToothEvents])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if ((e.ctrlKey || e.metaKey) && e.key === "Tab") {
        e.preventDefault()
        const tabs = ["superficies", "diagnostico", "plan", "realizado", "perio", "historial"]
        const currentIndex = tabs.indexOf(activeTab)
        const nextIndex = (currentIndex + 1) % tabs.length
        setActiveTab(tabs[nextIndex])
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, activeTab])

  if (!tooth) return null

  const handleStatusClick = (status: ToothGlobalStatus) => {
    if (status !== tempGlobalStatus) {
      setTempGlobalStatus(status)
      setHasUnsavedChanges(true)
    }
  }

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true)
    } else {
      onClose()
    }
  }

  const handleConfirmClose = () => {
    setShowConfirmDialog(false)
    setHasUnsavedChanges(false)
    onClose()
  }

  const handleSave = () => {
    if (!tooth) return

    if (hasUnsavedChanges && tempGlobalStatus !== tooth.globalStatus) {
      onUpdateGlobalStatus(tooth.number, tempGlobalStatus)
    }

    const currentDiagnoses = typeof window !== "undefined" ? (window as any).__currentDiagnoses : diagnoses
    if (currentDiagnoses && currentDiagnoses.size > 0) {
      
      currentDiagnoses.forEach((diagnosis: SurfaceDiagnosis, surface: ToothSurface) => {
        const existingEvent = getToothEvents(tooth.number).find(
          (e) => e.type === "diagnosis" && e.surfaces.includes(surface),
        )

        if (existingEvent) {
   
          updateClinicalEvent(existingEvent.id, {
            icdasScore: diagnosis.icdasScore,
            notes: diagnosis.notes || `ICDAS ${diagnosis.icdasScore}`,
            severity: diagnosis.icdasScore,
          })
        } else {
    
          addClinicalEvent({
            toothNumber: tooth.number,
            surfaces: [surface],
            level: "surface",
            type: "diagnosis",
            status: "open",
            severity: diagnosis.icdasScore,
            icdasScore: diagnosis.icdasScore,
            notes: diagnosis.notes || `ICDAS ${diagnosis.icdasScore}`,
          })
        }
      })
    }

    const currentPlans = typeof window !== "undefined" ? (window as any).__currentPlans : plans
    if (currentPlans && currentPlans.length > 0) {


      currentPlans.forEach((plan: ProcedurePlan, index: number) => {
        

        const existingPlanEvent = getToothEvents(tooth.number).find(
          (e) =>
            e.type === "plan" &&
            e.procedureId === plan.procedureId &&
            e.surfaces.length === plan.surfaces.length &&
            e.surfaces.every((s) => plan.surfaces.includes(s)),
        )

        if (existingPlanEvent) {
          const planStatus = plan.status === "done" ? "canceled" : plan.status
          
          updateClinicalEvent(existingPlanEvent.id, {
            status: planStatus,
            priority: plan.priority,
            material: plan.material,
            durationMin: plan.durationMin,
            cost: plan.cost,
            notes: `${plan.displayName}${plan.notes ? `: ${plan.notes}` : ""}`,
          })
        } else {
      
          addClinicalEvent({
            toothNumber: tooth.number,
            surfaces: plan.surfaces,
            level: plan.surfaces.length > 0 ? "surface" : "tooth",
            type: "plan",
            status: plan.status,
            procedureId: plan.procedureId,
            procedureName: plan.displayName,
            category: plan.category,
            priority: plan.priority,
            material: plan.material,
            durationMin: plan.durationMin,
            cost: plan.cost,
            notes: `${plan.displayName}${plan.notes ? `: ${plan.notes}` : ""}`,
          })
        }

       
        if (plan.status === "done") {
         

          // Buscar evento performed existente de manera más flexible
          const existingPerformedEvent = getToothEvents(tooth.number).find(
            (e) => e.type === "performed" && e.procedureId === plan.procedureId,
          )

          if (!existingPerformedEvent) {
            
            const newPerformedEvent = {
              toothNumber: tooth.number,
              surfaces: plan.surfaces,
              level: (plan.surfaces.length > 0 ? "surface" : "tooth") as "surface" | "tooth",
              type: "performed" as const,
              status: "done" as const,
              procedureId: plan.procedureId,
              procedureName: plan.displayName,
              category: plan.category,
              priority: plan.priority,
              material: plan.material,
              durationMin: plan.durationMin,
              cost: plan.cost,
              notes: `Realizado: ${plan.displayName}${plan.notes ? ` - ${plan.notes}` : ""}`,
            }
           

            const eventId = addClinicalEvent(newPerformedEvent)
            

            // Verificar inmediatamente que se guardó
            const verifyEvent = getToothEvents(tooth.number).find(
              (e) => e.type === "performed" && e.procedureId === plan.procedureId,
            )
           
          } 
        } 
      })
    }

    const currentPulpalStatus = typeof window !== "undefined" ? (window as any).__currentPulpalStatus : pulpalStatus
    if (currentPulpalStatus && currentPulpalStatus !== "normal") {     

      const existingEndoEvent = getToothEvents(tooth.number).find((e) => e.type === "endo")

      if (existingEndoEvent) {
        updateClinicalEvent(existingEndoEvent.id, {
          notes: `Estado pulpar: ${currentPulpalStatus}`,
        })
      } else {
        addClinicalEvent({
          toothNumber: tooth.number,
          surfaces: [],
          level: "tooth",
          type: "endo",
          status: "observation",
          notes: `Estado pulpar: ${currentPulpalStatus}`,
        })
      }
    }

    setHasUnsavedChanges(false)
    
  }

  const handleSaveAndClose = () => {
    handleSave()
    onClose()
  }

  const handleApplyAndNext = () => {
    handleSave()
    setHasUnsavedChanges(false)
    if (onApplyAndNext) {
      onApplyAndNext()
    }
  }

  const handleNavigateToTab = (tab: string) => {
    setActiveTab(tab)
  }

  const handleDiagnosesChange = (newDiagnoses: Map<ToothSurface, SurfaceDiagnosis>) => {
   
    setDiagnoses(newDiagnoses)
    setHasUnsavedChanges(true)
  }

  const handlePulpalStatusChange = (status: PulpalStatus) => {
    
    setPulpalStatus(status)
    setHasUnsavedChanges(true)
  }

  const handlePlansChange = (newPlans: ProcedurePlan[]) => {
   
    setPlans(newPlans)
    setHasUnsavedChanges(true)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="!max-w-[1400px] w-[95vw] max-h-[95vh] h-[95vh] flex flex-col p-6 gap-3">
          <DialogHeader className="space-y-1 pb-2 border-b">
            <DialogTitle className="text-2xl font-bold">Diente {tooth.number}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {getToothDescription(tooth.number)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 pb-3 border-b">
            <p className="text-xs font-semibold text-muted-foreground">Estado Global del Diente</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(GLOBAL_STATUS_LABELS) as ToothGlobalStatus[]).map((status) => {
                const isSelected = tempGlobalStatus === status
                return (
                  <Badge
                    key={status}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer px-3 py-1 text-xs font-medium transition-all hover:scale-105"
                    style={
                      isSelected
                        ? {
                            backgroundColor: GLOBAL_STATUS_COLORS[status],
                            borderColor: GLOBAL_STATUS_COLORS[status],
                            color: "white",
                          }
                        : {
                            borderColor: GLOBAL_STATUS_COLORS[status],
                            color: GLOBAL_STATUS_COLORS[status],
                          }
                    }
                    onClick={() => handleStatusClick(status)}
                  >
                    {GLOBAL_STATUS_LABELS[status]}
                  </Badge>
                )
              })}
            </div>
            {hasUnsavedChanges && <p className="text-xs text-amber-600 font-semibold">⚠️ Tienes cambios sin guardar</p>}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="flex flex-wrap justify-start gap-1 h-auto p-1 bg-muted rounded-md">
              <TabsTrigger value="superficies" className="text-sm px-4 py-2 flex-shrink-0">
                Superficies
              </TabsTrigger>
              <TabsTrigger value="diagnostico" className="text-sm px-4 py-2 flex-shrink-0">
                Diagnóstico (ICDAS)
              </TabsTrigger>
              <TabsTrigger value="plan" className="text-sm px-4 py-2 flex-shrink-0">
                Plan
              </TabsTrigger>
              <TabsTrigger value="realizado" className="text-sm px-4 py-2 flex-shrink-0">
                Realizado
              </TabsTrigger>
              <TabsTrigger value="perio" className="text-sm px-4 py-2 flex-shrink-0">
                Perio
              </TabsTrigger>
              <TabsTrigger value="historial" className="text-sm px-4 py-2 flex-shrink-0">
                Historial
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-3">
              <TabsContent value="superficies" className="mt-0 h-full">
                <SurfacesTab
                  tooth={tooth}
                  initialSurfaces={selectedSurfaces}
                  onNavigateToTab={handleNavigateToTab}
                  onSurfacesChange={setSelectedSurfaces}
                />
              </TabsContent>

              <TabsContent value="diagnostico" className="mt-0 h-full">
                <DiagnosisTab
                  tooth={tooth}
                  selectedSurfaces={selectedSurfaces}
                  initialDiagnoses={diagnoses}
                  initialPulpalStatus={pulpalStatus}
                  onNavigateToTab={handleNavigateToTab}
                  onDiagnosesChange={handleDiagnosesChange}
                  onPulpalStatusChange={handlePulpalStatusChange}
                />
              </TabsContent>

              <TabsContent value="plan" className="mt-0 h-full">
                <PlanTab
                  tooth={tooth}
                  selectedSurfaces={selectedSurfaces}
                  diagnoses={diagnoses}
                  pulpalStatus={pulpalStatus}
                  initialPlans={plans}
                  onNavigateToTab={handleNavigateToTab}
                  onPlansChange={handlePlansChange}
                />
              </TabsContent>

              <TabsContent value="realizado" className="mt-0 h-full">
                <PerformedTab
                  tooth={tooth}
                  selectedSurfaces={selectedSurfaces}
                  plans={plans}
                  onNavigateToTab={handleNavigateToTab}
                />
              </TabsContent>

              <TabsContent value="perio" className="mt-0">
                <div className="p-12 border-2 border-dashed rounded-lg text-center text-muted-foreground">
                  <p className="text-base">Contenido de Perio (próximamente)</p>
                </div>
              </TabsContent>

              <TabsContent value="historial" className="mt-0">
                <div className="p-12 border-2 border-dashed rounded-lg text-center text-muted-foreground">
                  <p className="text-base">Contenido de Historial (próximamente)</p>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-between items-center gap-4 pt-3 border-t">
            <Button variant="outline" onClick={handleClose} className="px-6 py-2 text-sm bg-transparent">
              Cancelar
            </Button>
            <div className="flex gap-3">
              <Button variant="default" onClick={handleSaveAndClose} className="px-6 py-2 text-sm">
                Guardar
              </Button>
              <Button variant="default" onClick={handleApplyAndNext} className="px-6 py-2 text-sm">
                Aplicar y seguir →
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sin guardar?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar en el diente {tooth.number}. Si cierras ahora, se perderán estos cambios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>Cerrar sin guardar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
