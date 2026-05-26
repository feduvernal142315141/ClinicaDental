"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { App, Spin } from "antd";
import { OdontogramModule, createApiOdontogramAdapter, createHistoricOdontogramAdapter } from "@/lib/odontogram";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { useAuth } from "@/lib/contexts/auth-context";
import { useOdontogramByVisit } from "@/lib/hooks/odontogram/useOdontogramByVisit";
import { OdontogramReadOnlyOverlay } from "@/components/features/odontogram/ui/OdontogramReadOnlyOverlay";
import { OdontogramHistoryTimeline } from "@/components/features/odontogram/ui/OdontogramHistoryTimeline";
import type { Appointment } from "@/lib/entity/appointment/appointments";

interface PatientOdontogramPanelProps {
  patient: {
    id: string;
    clinicId?: string;
  };
  activeAppointmentId?: string;
  /** Historic clinical visit is currently identified by the appointment id. */
  historicAppointmentId?: string;
  onClearHistoric?: () => void;
  /** All patient appointments — used to build the history timeline */
  appointments?: Appointment[];
  /** Called when user selects a historic visit from the timeline */
  onSelectHistoricVisit?: (appointmentId: string) => void;
  finalizeOpen?: boolean;
  onFinalizeClose?: () => void;
  onFinalizeSuccess?: (result: { followUpId?: string }) => void;
}

export function PatientOdontogramPanel({
  patient,
  activeAppointmentId,
  historicAppointmentId,
  onClearHistoric,
  appointments,
  onSelectHistoricVisit,
  finalizeOpen,
  onFinalizeClose,
  onFinalizeSuccess,
}: PatientOdontogramPanelProps) {
  const { message } = App.useApp();
  const { can, isAdmin } = usePermission();
  const { user } = useAuth();

  const clinicId = patient.clinicId ?? "";

  // Local transitioning flag — set immediately on visit change for instant Spin
  const [isTransitioning, setIsTransitioning] = useState(false);

  const { snapshot: historicSnapshot, loading: historicLoading, load: loadHistoric } =
    useOdontogramByVisit(historicAppointmentId);

  useEffect(() => {
    if (historicAppointmentId) {
      loadHistoric(historicAppointmentId);
    }
  }, [historicAppointmentId, loadHistoric]);

  // Clear transitioning once the async load finishes
  useEffect(() => {
    if (!historicLoading) {
      setIsTransitioning(false);
    }
  }, [historicLoading]);

  // Wrap onSelectHistoricVisit to activate Spin immediately
  const handleSelectVisit = useCallback(
    (appointmentId: string) => {
      if (appointmentId === activeAppointmentId) {
        onClearHistoric?.();
      } else {
        setIsTransitioning(true); // Spin NOW, before the parent even updates the prop
        onSelectHistoricVisit?.(appointmentId);
      }
    },
    [activeAppointmentId, onClearHistoric, onSelectHistoricVisit],
  );

  const handleReturnToCurrent = useCallback(() => {
    setIsTransitioning(false);
    onClearHistoric?.();
  }, [onClearHistoric]);

  const apiAdapter = useMemo(
    () =>
      createApiOdontogramAdapter({
        authorId: user?.id ?? "",
        clinicId,
        visitId: activeAppointmentId,
      }),
    [user?.id, clinicId, activeAppointmentId],
  );

  const historicAdapter = useMemo(() => {
    if (!historicSnapshot) return null;
    return createHistoricOdontogramAdapter(historicSnapshot.state);
  }, [historicSnapshot]);

  const isHistoricMode = !!historicAppointmentId;
  // US-03: odontogram is read-only when no active consultation OR in historic mode
  const readOnly = isHistoricMode || !activeAppointmentId || !(isAdmin || can("patients", PermissionAction.EDIT));

  const adapter = isHistoricMode && historicAdapter ? historicAdapter : apiAdapter;

  // Show spinner when transitioning OR when the hook is loading
  const showSpinner = isTransitioning || (isHistoricMode && historicLoading);

  return (
    <div className="flex flex-col h-full">
      {/* US-03: Historical navigation timeline — moved to TOP for visibility */}
      {appointments && appointments.length > 1 && (
        <OdontogramHistoryTimeline
          appointments={appointments}
          historicAppointmentId={historicAppointmentId}
          activeAppointmentId={activeAppointmentId}
          onSelectVisit={handleSelectVisit}
          onReturnToCurrent={handleReturnToCurrent}
        />
      )}

      {/* Historic: "no data" notice — only if snapshot failed to load (timeline handles "Volver" action) */}
      {isHistoricMode && !historicLoading && !isTransitioning && !historicSnapshot && (
        <div className="mb-3 flex items-center justify-center rounded-md border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm text-yellow-700">
          Vista histórica — Sin datos disponibles para esta cita.
        </div>
      )}

      {/* Odontogram + conditional overlays — always mounted to avoid flash */}
      <div className="flex-1 min-h-0 relative">
        <Spin
          spinning={showSpinner}
          delay={100}
          size="large"
        >
          <OdontogramModule
            patientId={patient.id}
            clinicId={clinicId}
            adapter={adapter}
            readOnly={readOnly}
            showHeader={false}
            initialTab="odontogram"
            onError={() => {
              message.error("No se pudo sincronizar el odontograma del paciente");
            }}
            finalizeOpen={finalizeOpen}
            onFinalizeClose={onFinalizeClose}
            onFinalizeSuccess={onFinalizeSuccess}
          />
        </Spin>
        {/* Read-only overlay — shown when no active consultation and not in historic mode */}
        {!activeAppointmentId && !isHistoricMode && (
          <OdontogramReadOnlyOverlay />
        )}
      </div>
    </div>
  );
}
