"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { OdontogramGrid } from "./odontogram-grid";
import { ToothModal } from "./tooth-modal";
import {
  OdontogramButton,
  OdontogramConfirmProvider,
  OdontogramTabs,
  useOdontogramConfirm,
  OdontogramTabLabel,
  OdontogramEventCard,
  OdontogramEmptyState,
} from "@/components/odontogram/ui";
import type {
  OdontogramTabItem,
  OdontogramEventCardProps,
} from "@/components/odontogram/ui";
import {
  useOdontogramModule,
  useEventFormatting,
} from "@/lib/odontogram/application/hooks";
import { useOdontogramStore } from "@/lib/odontogram/store";
import type { ClinicalEvent } from "@/components/odontogram/types";

interface OdontogramModuleProps {
  initialTab?:
    | "odontogram"
    | "suggestions"
    | "diagnosis"
    | "plans"
    | "performed";
  showHeader?: boolean;
}

export function OdontogramModule(props: OdontogramModuleProps) {
  // El provider debe envolver al componente que llama a useOdontogramConfirm
  // (este mismo módulo y ToothModal), por eso se monta en un wrapper externo.
  return (
    <OdontogramConfirmProvider>
      <OdontogramModuleContent {...props} />
    </OdontogramConfirmProvider>
  );
}

function OdontogramModuleContent({
  initialTab = "odontogram",
  showHeader = true,
}: OdontogramModuleProps) {
  const {
    teeth,
    isModalOpen,
    currentTooth,
    selectedSurface,
    eventsByType,
    handlers,
  } = useOdontogramModule();
  const readOnly = useOdontogramStore((state) => state.readOnly);
  const [activeTab, setActiveTab] = useState(initialTab);

  const {
    getEventTagColor,
    getEventTypeLabel,
    formatEventDate,
    getEventDisplayName,
  } = useEventFormatting();
  const odontogramConfirm = useOdontogramConfirm();

  const {
    suggestions: suggestionEvents,
    diagnosis: diagnosisEvents,
    plan: planEvents,
    performed: performedEvents,
  } = eventsByType;

  const handleClearAll = () => {
    odontogramConfirm({
      title: "¿Estás seguro?",
      description:
        "Esta acción eliminará todos los datos del odontograma, incluyendo diagnósticos, planes y eventos clínicos. Esta acción no se puede deshacer.",
      okText: "Sí, limpiar todo",
      cancelText: "Cancelar",
      danger: true,
      onOk: handlers.handleClearAll,
    });
  };

  function renderEventList(events: ClinicalEvent[], emptyMessage: string) {
    if (events.length === 0) {
      return <OdontogramEmptyState description={emptyMessage} />;
    }

    return events.map((event) => (
      <OdontogramEventCard
        key={event.id}
        toothNumber={event.toothNumber}
        surfaces={event.surfaces}
        displayName={getEventDisplayName(event)}
        typeLabel={getEventTypeLabel(event.type)}
        tagColor={
          getEventTagColor(event.type) as OdontogramEventCardProps["tagColor"]
        }
        notes={event.notes}
        date={formatEventDate(event.createdAt)}
        onClick={() => handlers.handleEventClick(event)}
      />
    ));
  }

  const tabItems: OdontogramTabItem[] = [
    {
      key: "odontogram",
      label: "Odontograma",
      children: (
        <OdontogramGrid
          teeth={teeth}
          onSurfaceClick={handlers.handleSurfaceClick}
          onToothClick={handlers.handleToothClick}
        />
      ),
    },
    {
      key: "suggestions",
      label: (
        <OdontogramTabLabel
          label="Sugerencias"
          count={suggestionEvents.length}
        />
      ),
      children: (
        <div className="space-y-4">
          {renderEventList(suggestionEvents, "No hay sugerencias activas")}
        </div>
      ),
    },
    {
      key: "diagnosis",
      label: (
        <OdontogramTabLabel
          label="Diagnósticos"
          count={diagnosisEvents.length}
        />
      ),
      children: (
        <div className="space-y-4">
          {renderEventList(diagnosisEvents, "No hay diagnósticos registrados")}
        </div>
      ),
    },
    {
      key: "plans",
      label: <OdontogramTabLabel label="Planes" count={planEvents.length} />,
      children: (
        <div className="space-y-4">
          {renderEventList(planEvents, "No hay planes registrados")}
        </div>
      ),
    },
    {
      key: "performed",
      label: (
        <OdontogramTabLabel label="Realizados" count={performedEvents.length} />
      ),
      children: (
        <div className="space-y-4">
          {renderEventList(performedEvents, "No hay procedimientos realizados")}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full flex-1 min-h-0 space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Odontograma</h1>
            <p className="text-muted-foreground">
              Sistema de gestión dental profesional
            </p>
          </div>
          {activeTab === "odontogram" && (
            <OdontogramButton
              variant="outline"
              icon={<RotateCcw className="h-4 w-4" />}
              disabled={readOnly}
              onClick={handleClearAll}
            >
              Limpiar Todo
            </OdontogramButton>
          )}
        </div>
      )}

      <OdontogramTabs
        items={tabItems}
        defaultActiveKey={initialTab}
        onChange={(key) => setActiveTab(key as typeof initialTab)}
        className="flex-1 min-h-0"
      />

      <ToothModal
        tooth={currentTooth}
        isOpen={isModalOpen}
        initialSurface={selectedSurface}
        onClose={handlers.handleCloseModal}
        onUpdateGlobalStatus={handlers.updateToothGlobalStatus}
      />
    </div>
  );
}
