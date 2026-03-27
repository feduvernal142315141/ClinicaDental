"use client";

import { useState } from "react";
import { Button } from "antd";
import { OdontogramGrid } from "./odontogram-grid";
import { ToothModal } from "./tooth-modal";
import {
  OdontogramTabs,
  useOdontogramConfirm,
  OdontogramTabLabel,
  OdontogramEventCard,
  OdontogramEmptyState,
} from "@/components/odontogram/ui";
import type { OdontogramTabItem } from "@/components/odontogram/ui";
import { RedoOutlined } from "@ant-design/icons";
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

export function OdontogramModule({
  initialTab = "odontogram",
  showHeader = true,
}: OdontogramModuleProps) {
  const {
    teeth,
    selectedSurface,
    isModalOpen,
    currentTooth,
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
        tagColor={getEventTagColor(event.type)}
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
    <div className="space-y-6">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Odontograma</h1>
            <p className="text-muted-foreground">
              Sistema de gestión dental profesional
            </p>
          </div>
          {activeTab === "odontogram" && (
            <Button
              icon={<RedoOutlined />}
              disabled={readOnly}
              onClick={handleClearAll}
            >
              Limpiar Todo
            </Button>
          )}
        </div>
      )}

      <OdontogramTabs
        items={tabItems}
        defaultActiveKey={initialTab}
        onChange={(key) => setActiveTab(key as typeof initialTab)}
      />

      <ToothModal
        tooth={currentTooth}
        isOpen={isModalOpen}
        onClose={handlers.handleCloseModal}
        onUpdateGlobalStatus={handlers.updateToothGlobalStatus}
        onAddSurfaceTreatment={handlers.addSurfaceTreatment}
        onAddSurfaceCondition={handlers.addSurfaceCondition}
        onDeleteCondition={handlers.deleteSurfaceCondition}
        onCompleteTreatment={handlers.completeTreatment}
        onDeleteTreatment={handlers.deleteTreatment}
        initialSurfaces={selectedSurface ? [selectedSurface] : undefined}
      />
    </div>
  );
}
