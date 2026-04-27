"use client";

import { useMemo, useEffect } from "react";
import { App } from "antd";
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
  historicVisitId?: string;
  onClearHistoric?: () => void;
  /** All patient appointments — used to build the history timeline */
  appointments?: Appointment[];
  /** Called when user wants to start a consultation from the overlay */
  onStartConsultation?: () => void;
  /** Called when user selects a historic visit from the timeline */
  onSelectHistoricVisit?: (appointmentId: string) => void;
  finalizeOpen?: boolean;
  onFinalizeClose?: () => void;
  onFinalizeSuccess?: (result: { followUpId?: string }) => void;
}

export function PatientOdontogramPanel({
  patient,
  activeAppointmentId,
  historicVisitId,
  onClearHistoric,
  appointments,
  onStartConsultation,
  onSelectHistoricVisit,
  finalizeOpen,
  onFinalizeClose,
  onFinalizeSuccess,
}: PatientOdontogramPanelProps) {
  const { message } = App.useApp();
  const { can, isAdmin } = usePermission();
  const { user } = useAuth();

  const clinicId = patient.clinicId ?? "";

  const { snapshot: historicSnapshot, loading: historicLoading, load: loadHistoric } =
    useOdontogramByVisit(historicVisitId);

  useEffect(() => {
    if (historicVisitId) {
      loadHistoric(historicVisitId);
    }
  }, [historicVisitId, loadHistoric]);

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

  const isHistoricMode = !!historicVisitId;
  // US-03: odontogram is read-only when no active consultation OR in historic mode
  const readOnly = isHistoricMode || !activeAppointmentId || !(isAdmin || can("patients", PermissionAction.EDIT));

  // While loading historic snapshot, show nothing or loading
  if (isHistoricMode && historicLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
        Cargando vista histórica...
      </div>
    );
  }

  const adapter = isHistoricMode && historicAdapter ? historicAdapter : apiAdapter;

  return (
    <div className="flex flex-col h-full">
      {/* US-03: Historical navigation timeline — moved to TOP for visibility */}
      {appointments && appointments.length > 1 && (
        <OdontogramHistoryTimeline
          appointments={appointments}
          historicAppointmentId={historicVisitId}
          activeAppointmentId={activeAppointmentId}
          onSelectVisit={(appointmentId) => {
            if (appointmentId === activeAppointmentId) {
              onClearHistoric?.();
            } else {
              onSelectHistoricVisit?.(appointmentId);
            }
          }}
          onReturnToCurrent={onClearHistoric ?? (() => {})}
        />
      )}

      {/* Historic: "no data" notice — only if snapshot failed to load (timeline handles "Volver" action) */}
      {isHistoricMode && !historicSnapshot && (
        <div className="mb-3 flex items-center justify-center rounded-md border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm text-yellow-700">
          Vista histórica — Sin datos disponibles para esta cita.
        </div>
      )}

      {/* Odontogram + conditional read-only overlay */}
      <div className="flex-1 min-h-0 relative">
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
        {/* Read-only overlay — shown when no active consultation and not in historic mode */}
        {!activeAppointmentId && !isHistoricMode && (
          <OdontogramReadOnlyOverlay />
        )}
      </div>
    </div>
  );
}
