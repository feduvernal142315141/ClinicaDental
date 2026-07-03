"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { OdontogramModule, createApiOdontogramAdapter, createHistoricOdontogramAdapter } from "@/lib/odontogram";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { useAuth } from "@/lib/contexts/auth-context";
import { useOdontogramByVisit } from "@/lib/hooks/odontogram/useOdontogramByVisit";
import { OdontogramReadOnlyOverlay } from "@/components/features/odontogram/ui/OdontogramReadOnlyOverlay";
import { OdontogramHistoryTimeline } from "@/components/features/odontogram/ui/OdontogramHistoryTimeline";
import type { Appointment } from "@/lib/entity/appointment/appointments";
import { notify } from "@/lib/utils/notify";
import { useAutosaveStatus } from "@/lib/store/useAutosaveStatus";

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
  /** CTA del overlay solo-lectura cuando no hay consulta activa. */
  onStartConsultation?: () => void;
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
  onStartConsultation,
  finalizeOpen,
  onFinalizeClose,
  onFinalizeSuccess,
}: PatientOdontogramPanelProps) {
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

  // Una cita finalizada (completed) NO debe ser editable: red de seguridad
  // determinista frente a la redirección asíncrona de la página.
  const activeAppointment = useMemo(
    () => appointments?.find((a) => a.id === activeAppointmentId),
    [appointments, activeAppointmentId],
  );
  const isCompleted = activeAppointment?.status === "completed";

  // El odontograma es documentación clínica: su edición se gatea con permiso
  // clínico (clinical_history), no con patients:EDIT.
  const canEditClinical =
    isAdmin ||
    can("clinical_history", PermissionAction.EDIT) ||
    can("clinical_history", PermissionAction.CREATE);

  // US-03: odontogram is read-only when no active consultation, historic mode,
  // a finalized visit, or insufficient clinical permission.
  const readOnly =
    isHistoricMode || !activeAppointmentId || isCompleted || !canEditClinical;

  // Motivo del modo solo-lectura → feedback coherente en el overlay.
  // Precedencia: sin permiso (no accionable) > finalizada > sin consulta.
  const readOnlyReason: "no-consultation" | "completed" | "no-permission" | null =
    isHistoricMode
      ? null
      : !canEditClinical
        ? "no-permission"
        : isCompleted
          ? "completed"
          : !activeAppointmentId
            ? "no-consultation"
            : null;

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
        {showSpinner && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-canvas/60 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        )}
          <OdontogramModule
            patientId={patient.id}
            clinicId={clinicId}
            adapter={adapter}
            readOnly={readOnly}
            showHeader={false}
            initialTab="odontogram"
            onSaveStart={
              !readOnly && !isHistoricMode
                ? () => useAutosaveStatus.getState().markSaving()
                : undefined
            }
            onSaveSuccess={
              !readOnly && !isHistoricMode
                ? () => useAutosaveStatus.getState().markSaved()
                : undefined
            }
            onError={() => {
              // Solo marca error de autosave en edición real (no en carga
              // histórica/solo-lectura, donde no hay sesión de guardado activa).
              if (!readOnly && !isHistoricMode) {
                useAutosaveStatus.getState().markError();
              }
              notify.error("No se pudo sincronizar el odontograma", {
                description:
                  "Tus últimos cambios podrían no haberse guardado. Revisa tu conexión y vuelve a intentarlo; si continúa, contacta a soporte.",
              });
            }}
            finalizeOpen={finalizeOpen}
            onFinalizeClose={onFinalizeClose}
            onFinalizeSuccess={onFinalizeSuccess}
          />
        {/* Read-only overlay — coherente para todos los motivos (no histórico) */}
        {readOnly && !isHistoricMode && readOnlyReason && (
          <OdontogramReadOnlyOverlay
            reason={readOnlyReason}
            onStartConsultation={onStartConsultation}
          />
        )}
      </div>
    </div>
  );
}
