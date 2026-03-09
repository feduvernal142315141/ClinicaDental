import { useState, useMemo } from "react"
import { useOdontogramStore } from "@/lib/odontogram/store"
import type { ToothSurface, ClinicalEvent } from "@/lib/odontogram/domain/odontogram/types"
import { useToothNavigation } from "./useToothNavigation"

export function useOdontogramModule() {
  const {
    teeth,
    clinicalEvents,
    updateToothGlobalStatus,
    addSurfaceTreatment,
    addSurfaceCondition,
    deleteSurfaceCondition,
    completeTreatment,
    deleteTreatment,
    updateClinicalEvent,
    deleteClinicalEvent,
    getTooth,
    clearAll,
  } = useOdontogramStore()

  const { getNextToothInArch } = useToothNavigation()

  const [selectedTooth, setSelectedTooth] = useState<number | null>(null)
  const [selectedSurface, setSelectedSurface] = useState<ToothSurface | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleToothClick = (toothNumber: number) => {
    setSelectedTooth(toothNumber)
    setSelectedSurface(null)
    setIsModalOpen(true)
  }

  const handleSurfaceClick = (toothNumber: number, surface: ToothSurface) => {
    setSelectedTooth(toothNumber)
    setSelectedSurface(surface)
    setIsModalOpen(true)
  }

  const handleApplyAndNext = () => {
    if (selectedTooth) {
      const nextTooth = getNextToothInArch(selectedTooth)
      if (nextTooth) {
        setSelectedTooth(nextTooth)
        setSelectedSurface(null)
      }
    }
  }

  const handleEventClick = (event: ClinicalEvent) => {
    setSelectedTooth(event.toothNumber)
    setSelectedSurface(event.surfaces.length > 0 ? event.surfaces[0] : null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedSurface(null)
  }

  const handleClearAll = () => {
    clearAll()
    setIsModalOpen(false)
    setSelectedTooth(null)
    setSelectedSurface(null)
  }

  const currentTooth = selectedTooth ? getTooth(selectedTooth) || null : null

  const eventsByType = useMemo(() => {
    return {
      diagnosis: clinicalEvents.filter((e) => e.type === "diagnosis"),
      plan: clinicalEvents.filter((e) => e.type === "plan"),
      performed: clinicalEvents.filter((e) => e.type === "performed"),
    }
  }, [clinicalEvents])

  return {
    teeth,
    clinicalEvents,
    selectedTooth,
    selectedSurface,
    isModalOpen,
    currentTooth,
    eventsByType,
    handlers: {
      handleToothClick,
      handleSurfaceClick,
      handleApplyAndNext,
      handleEventClick,
      handleCloseModal,
      handleClearAll,
      updateToothGlobalStatus,
      addSurfaceTreatment,
      addSurfaceCondition,
      deleteSurfaceCondition,
      completeTreatment,
      deleteTreatment,
      updateClinicalEvent,
      deleteClinicalEvent,
    },
  }
}
