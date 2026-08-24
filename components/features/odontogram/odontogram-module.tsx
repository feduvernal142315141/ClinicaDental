"use client";

import { useCallback, useState } from "react";
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
import { ToothTypeService } from "@/lib/odontogram/domain/odontogram/services/ToothTypeService";
import type { ClinicalEvent } from "@/components/odontogram/types";
import type {
  OdontogramDictationAdapter,
  OdontogramDictationSelection,
} from "@/lib/odontogram/application/dictation";
import { OdontogramDictationControl } from "./odontogram-dictation-control";
import { OdontogramDictationProvider } from "./odontogram-dictation-session";

interface OdontogramModuleProps {
  initialTab?:
    | "odontogram"
    | "suggestions"
    | "diagnosis"
    | "plans"
    | "performed";
  showHeader?: boolean;
  dictationAdapter?: OdontogramDictationAdapter;
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
  dictationAdapter,
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

  /**
   * Pieza/caras con foco en el modal del diente (HU-DICT-011).
   *
   * Vive aquí, en la composición del módulo, y NO en el store: el runtime del
   * módulo (`lib/odontogram/OdontogramModule.tsx`) tiene un `storeApi.subscribe`
   * que agenda un PUT del odontograma ante CUALQUIER cambio de estado, así que
   * mover el foco guardaría el paciente. Tampoco lo aporta el host: el foco
   * nace y muere dentro del módulo, y sale de él solo como contexto de dictado.
   */
  const [dictationFocus, setDictationFocus] =
    useState<OdontogramDictationSelection | null>(null);

  const handleDictationFocusChange = useCallback(
    (focus: OdontogramDictationSelection | null) => {
      setDictationFocus((current) => {
        if (current === null && focus === null) return current;
        if (
          current &&
          focus &&
          current.toothNumber === focus.toothNumber &&
          current.surfaces.length === focus.surfaces.length &&
          current.surfaces.every(
            (surface, index) => surface === focus.surfaces[index],
          )
        ) {
          return current;
        }
        return focus;
      });
    },
    [],
  );

  /**
   * Con la pieza abierta, el dictado lo pinta el modal (HU-DICT-029): allí es
   * clicable y conoce el foco de primera mano. Esta bandera lo dice sin
   * duplicar la condición de apertura del modal, porque el foco es EXACTAMENTE
   * lo que `ToothModal` publica mientras está abierto sobre un diente — el
   * mismo instante en que monta su control compacto. Así nunca hay dos botones
   * de dictar a la vez (el motor, en cambio, es único por construcción: vive en
   * `OdontogramDictationProvider`).
   */
  const isToothSurfaceActive = dictationFocus !== null;

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

  /**
   * Lista de eventos con scroll propio: las tabs ocupan una altura fija, así
   * que el desbordamiento tiene que resolverse dentro del panel y no
   * recortarse contra el contenedor de la página.
   */
  function renderEventList(events: ClinicalEvent[], emptyMessage: string) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-4 pb-2">
          {events.length === 0 ? (
            <OdontogramEmptyState description={emptyMessage} />
          ) : (
            events.map((event) => (
              <OdontogramEventCard
                key={event.id}
                toothNumber={event.toothNumber}
                // La tarjeta pinta lo que le llegue, así que la traducción se
                // hace aquí: sin ella el listado enseñaría el CÓDIGO interno
                // ("mesialVestibular") en vez de la etiqueta clínica. La
                // abreviatura decide además palatino vs lingual por arcada, y
                // eso necesita el número de diente.
                surfaces={event.surfaces.map(
                  (surface) =>
                    ToothTypeService.getSurfaceLabel(event.toothNumber, surface)
                      .short,
                )}
                displayName={getEventDisplayName(event)}
                // Un preexistente no se "realizó" hoy: se DOCUMENTÓ. La fecha de
                // la tarjeta es su `createdAt` —el día del registro—, así que sin
                // este distintivo la lista afirmaría que lo hicimos nosotros.
                typeLabel={
                  event.preexisting ? "Previo" : getEventTypeLabel(event.type)
                }
                tagColor={
                  getEventTagColor(
                    event.type,
                  ) as OdontogramEventCardProps["tagColor"]
                }
                notes={event.notes}
                date={formatEventDate(event.createdAt)}
                onClick={() => handlers.handleEventClick(event)}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  const tabItems: OdontogramTabItem[] = [
    {
      key: "odontogram",
      label: "Odontograma",
      children: (
        <OdontogramGrid teeth={teeth} onToothClick={handlers.handleToothClick} />
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
      children: renderEventList(suggestionEvents, "No hay sugerencias activas"),
    },
    {
      key: "diagnosis",
      label: (
        <OdontogramTabLabel
          label="Diagnósticos"
          count={diagnosisEvents.length}
        />
      ),
      children: renderEventList(
        diagnosisEvents,
        "No hay diagnósticos registrados",
      ),
    },
    {
      key: "plans",
      label: <OdontogramTabLabel label="Planes" count={planEvents.length} />,
      children: renderEventList(planEvents, "No hay planes registrados"),
    },
    {
      key: "performed",
      label: (
        <OdontogramTabLabel label="Realizados" count={performedEvents.length} />
      ),
      children: renderEventList(
        performedEvents,
        "No hay procedimientos realizados",
      ),
    },
  ];

  return (
    <OdontogramDictationProvider
      adapter={dictationAdapter}
      lastSelection={dictationFocus}
    >
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

        {/* Con la pieza abierta manda el control compacto del modal; en otra
            pestaña el control se aparta solo, pero sin abandonar una grabación
            en curso (`hidden`). */}
        {isToothSurfaceActive ? null : (
          <OdontogramDictationControl hidden={activeTab !== "odontogram"} />
        )}

        <OdontogramTabs
          items={tabItems}
          defaultActiveKey={initialTab}
          onChange={(key) => setActiveTab(key as typeof initialTab)}
          fill
          className="flex-1"
        />

        <ToothModal
          tooth={currentTooth}
          isOpen={isModalOpen}
          initialSurface={selectedSurface}
          onFocusChange={handleDictationFocusChange}
          onClose={handlers.handleCloseModal}
          onUpdateGlobalStatus={handlers.updateToothGlobalStatus}
        />
      </div>
    </OdontogramDictationProvider>
  );
}
