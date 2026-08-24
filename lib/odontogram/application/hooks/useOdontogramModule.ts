import { useState, useMemo } from "react";
import { useOdontogramStore } from "@/lib/odontogram/store";
import type {
  ClinicalEvent,
  ToothSurface,
} from "@/lib/odontogram/domain/odontogram/types";

export function useOdontogramModule() {
  const {
    teeth,
    clinicalEvents,
    updateToothGlobalStatus,
    updateClinicalEvent,
    deleteClinicalEvent,
    getTooth,
    clearAll,
  } = useOdontogramStore();

  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [selectedSurface, setSelectedSurface] = useState<ToothSurface | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleToothClick = (toothNumber: number) => {
    setSelectedTooth(toothNumber);
    setSelectedSurface(null);
    setIsModalOpen(true);
  };

  // Desde la grilla solo se abre la pieza (handleToothClick). La preselección de
  // cara sobrevive únicamente al abrir un evento clínico ya registrado, que sí
  // sabe sobre qué superficies cae.
  const handleEventClick = (event: ClinicalEvent) => {
    setSelectedTooth(event.toothNumber);
    setSelectedSurface(event.surfaces.length > 0 ? event.surfaces[0] : null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSurface(null);
  };

  const handleClearAll = () => {
    clearAll();
    setIsModalOpen(false);
    setSelectedTooth(null);
    setSelectedSurface(null);
  };

  const currentTooth = selectedTooth ? getTooth(selectedTooth) || null : null;

  const eventsByType = useMemo(() => {
    const suggestionEvents = clinicalEvents.filter(
      (e) => e.type === "diagnosis" && e.automationHints?.suggestPlan,
    );

    return {
      diagnosis: clinicalEvents.filter((e) => e.type === "diagnosis"),
      suggestions: suggestionEvents,
      plan: clinicalEvents.filter(
        (e) => e.type === "plan" && e.status !== "canceled",
      ),
      performed: clinicalEvents.filter((e) => e.type === "performed"),
    };
  }, [clinicalEvents]);

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
      handleEventClick,
      handleCloseModal,
      handleClearAll,
      updateToothGlobalStatus,
      updateClinicalEvent,
      deleteClinicalEvent,
    },
  };
}
