"use client";

import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import {
  OdontogramModule,
  createApiOdontogramAdapter,
  createApiOdontogramDictationAdapter,
  createHistoricOdontogramAdapter,
  type OdontogramSnapshot,
} from "@/lib/odontogram";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { useAuth } from "@/lib/contexts/auth-context";
import { useOdontogramByVisit } from "@/lib/hooks/odontogram/useOdontogramByVisit";
import { useClinicGeneralSettings } from "@/lib/hooks/settings";
import { useToothNotation } from "@/lib/contexts/tooth-notation-context";
import { useOdontogramDictationAvailability } from "@/lib/hooks/speech/use-odontogram-dictation-availability";
import { DEFAULT_CLINIC_GENERAL_SETTINGS } from "@/lib/entity/settings";
import {
  OdontogramReadOnlyOverlay,
  type OdontogramReadOnlyReason,
} from "@/components/features/odontogram/ui/OdontogramReadOnlyOverlay";
import { OdontogramVisitContextBar } from "@/components/features/odontogram/ui/OdontogramVisitContextBar";
import { OdontogramHistoricFrame } from "@/components/features/odontogram/ui/OdontogramHistoricFrame";
import { StatusBadge } from "@/components/ui";
import {
  findAppointmentDate,
  formatVisitDate,
  formatVisitDateLong,
  getEligibleVisits,
} from "@/lib/utils/visit-eligibility";
import type { Appointment } from "@/lib/entity/appointment/appointments";
import type { VisitEditability } from "@/lib/hooks/patients/clinical-history-page/visit-editability";
import { notify } from "@/lib/utils/notify";
import { useAutosaveStatus } from "@/lib/store/useAutosaveStatus";
import type { DentitionType } from "@/lib/odontogram/domain/odontogram/constants/dentition.constants";

interface PatientOdontogramPanelProps {
  patient: {
    id: string;
    clinicId?: string;
  };
  defaultDentition: DentitionType;
  onDentitionChange?: (dentition: DentitionType) => void;
  activeAppointmentId?: string;
  historicAppointmentId?: string;
  onClearHistoric?: () => void;
  appointments?: Appointment[];
  visitEditability: VisitEditability;
  onSelectHistoricVisit?: (appointmentId: string) => void;
  finalizeOpen?: boolean;
  onFinalizeClose?: () => void;
  onFinalizeSuccess?: (result: { followUpId?: string }) => void;
}
function readOnlyReasonFor(
  editability: VisitEditability,
): OdontogramReadOnlyReason | null {
  switch (editability.kind) {
    case "no-visit":
    case "unknown":
    case "editable":
      return null;
    case "locked":
      switch (editability.reason) {
        case "terminal":
          return "completed";
        case "not-started":
          return "not-started";
        case "not-listed":
          return "unverified";
        default: {
          const _never: never = editability.reason;
          return _never;
        }
      }
    default: {
      const _never: never = editability;
      return _never;
    }
  }
}
export function PatientOdontogramPanel({
  patient,
  defaultDentition,
  onDentitionChange,
  activeAppointmentId,
  historicAppointmentId,
  onClearHistoric,
  appointments,
  visitEditability,
  onSelectHistoricVisit,
  finalizeOpen,
  onFinalizeClose,
  onFinalizeSuccess,
}: PatientOdontogramPanelProps) {
  const { can, isAdmin } = usePermission();
  const { user } = useAuth();

  const { settings } = useClinicGeneralSettings();
  const { notation } = useToothNotation();
  const clinicId = patient.clinicId ?? "";
  const [isTransitioning, setIsTransitioning] = useState(false);
  const {
    snapshot: historicSnapshot,
    loading: historicLoading,
    error: historicError,
    load: loadHistoric,
    loadedVisitId,
  } = useOdontogramByVisit();
  useEffect(() => {
    if (historicAppointmentId) {
      loadHistoric(historicAppointmentId);
    }
  }, [historicAppointmentId, loadHistoric]);

  useEffect(() => {
    if (!historicAppointmentId) {
      setIsTransitioning(false);
      return;
    }
    if (!historicLoading && loadedVisitId === historicAppointmentId) {
      setIsTransitioning(false);
    }
  }, [historicAppointmentId, historicLoading, loadedVisitId]);
  const handleSelectVisit = useCallback(
    (appointmentId: string) => {
      if (appointmentId === activeAppointmentId) {
        onClearHistoric?.();
      } else {
        setIsTransitioning(true);
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

  const dictationAdapter = useMemo(
    () => createApiOdontogramDictationAdapter(),
    [],
  );

  // Sin snapshot NO se cae al adapter en vivo: pintaría el odontograma de HOY
  // bajo la fecha de una visita pasada, o sea una afirmación clínica falsa sobre
  // el paciente. Con "" el adapter no puede parsear y devuelve null, y el módulo
  // monta un odontograma vacío (nunca el del presente).
  const historicAdapter = useMemo(
    () => createHistoricOdontogramAdapter(historicSnapshot?.state ?? ""),
    [historicSnapshot],
  );
  const isHistoricMode = !!historicAppointmentId;
  const eligibleVisits = useMemo(
    () => getEligibleVisits(appointments, activeAppointmentId),
    [appointments, activeAppointmentId],
  );
  const hasVisitHistory = eligibleVisits.length >= 2;
  const historicVisitDate = useMemo(() => {
    const visit = eligibleVisits.find(
      (v) => v.appointmentId === historicAppointmentId,
    );

    return (
      visit?.parsedDate ??
      findAppointmentDate(appointments, historicAppointmentId)
    );
  }, [appointments, eligibleVisits, historicAppointmentId]);
  const historicShortLabel = formatVisitDate(historicVisitDate);
  const historicLongLabel = formatVisitDateLong(historicVisitDate);

  const wasHistoricRef = useRef(false);
  useEffect(() => {
    if (isHistoricMode && !wasHistoricRef.current) {
      notify.warning(`Estás viendo el odontograma del ${historicShortLabel}`, {
        description: (
          <span className="flex items-center gap-1.5">
            <RotateCcw
              className="h-3.5 w-3.5 shrink-0 animate-spin [animation-direction:reverse] [animation-duration:3s] motion-reduce:animate-none"
              aria-hidden
            />
            Es un registro de solo lectura. Vuelve a hoy para editar.
          </span>
        ),
        button: {
          title: "Volver a hoy",
          onClick: handleReturnToCurrent,
        },
      });
    }
    wasHistoricRef.current = isHistoricMode;
  }, [isHistoricMode, historicShortLabel, handleReturnToCurrent]);
  const isNonEditableVisit = visitEditability.kind === "locked";
  const canEditClinical =
    isAdmin ||
    can("odontogram", PermissionAction.EDIT) ||
    can("odontogram", PermissionAction.CREATE);

  // El endpoint de voz conserva la autoridad de historia clínica. La acción se
  // ofrece solo cuando el usuario puede editar el odontograma Y llamar al
  // endpoint; así evitamos mostrar un botón que terminaría necesariamente en 403.
  const canUseClinicalDictation =
    isAdmin ||
    can("clinical_history", PermissionAction.EDIT) ||
    can("clinical_history", PermissionAction.CREATE);

  // Interruptor por clínica: el control ni se monta si el dictado está apagado
  // (o si sus recursos no cargaron en el backend). Se consulta desde el host
  // para no romper la frontera del módulo, y solo cuando tendría sentido
  // ofrecerlo. Solo un `enabled: false` explícito lo apaga: un 404 (backend sin
  // desplegar todavía) o un corte de red dejan el control montado, porque el POST
  // ya se defiende solo con un 503 explicado. Ocultarlo por un fallo transitorio
  // haría desaparecer la función sin que nadie pueda saber por qué.
  const isDictationEnabled = useOdontogramDictationAvailability(
    !isHistoricMode && canUseClinicalDictation,
  );

  // Solo lectura por: modo histórico, visita finalizada o falta de permiso.
  // "Sin consulta" ya NO bloquea: el permiso es lo único que manda.
  const readOnly = isHistoricMode || isNonEditableVisit || !canEditClinical;
  const readOnlyReason: OdontogramReadOnlyReason | null = isHistoricMode
    ? null
    : !canEditClinical
      ? "no-permission"
      : readOnlyReasonFor(visitEditability);
  const isOutOfConsultationEditing =
    !readOnly && !isHistoricMode && !activeAppointmentId;

  const tracksAutosaveStatus =
    !readOnly && !isHistoricMode && !!activeAppointmentId;

  const adapter = isHistoricMode ? historicAdapter : apiAdapter;
  const showSpinner = isTransitioning || (isHistoricMode && historicLoading);

  // Callbacks estables: OdontogramModule re-ejecuta su efecto de carga si
  // cambia la identidad de onError, y se re-suscribe si cambian
  // onChange/onSaveStart/onSaveSuccess — ambos cleanups cancelan el guardado
  // armado. Por eso el flag va en un ref y las deps quedan vacías.
  const tracksAutosaveRef = useRef(tracksAutosaveStatus);
  useEffect(() => {
    tracksAutosaveRef.current = tracksAutosaveStatus;
  });
  const handleSaveStart = useCallback(() => {
    if (tracksAutosaveRef.current) {
      useAutosaveStatus.getState().markSaving();
    }
  }, []);
  const handleSaveSuccess = useCallback(() => {
    if (tracksAutosaveRef.current) {
      useAutosaveStatus.getState().markSaved();
    }
  }, []);
  const handleError = useCallback(() => {
    if (tracksAutosaveRef.current) {
      useAutosaveStatus.getState().markError();
    }
    notify.error("No se pudo sincronizar el odontograma", {
      description:
        "Tus últimos cambios podrían no haberse guardado. Revisa tu conexión y vuelve a intentarlo; si continúa, contacta a soporte.",
    });
  }, []);
  const handleSnapshotChange = useCallback(
    (snapshot: OdontogramSnapshot) => {
      if (snapshot.dentition) onDentitionChange?.(snapshot.dentition);
    },
    [onDentitionChange],
  );

  const historicUnavailable =
    isHistoricMode && !historicLoading && !isTransitioning && !historicSnapshot;
  const historicFailed = historicUnavailable && !!historicError;
  const odontogramBlock = (
    <div className="flex-1 min-h-0 relative flex flex-col">
      {showSpinner && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-canvas/60 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      )}
      <OdontogramModule
        patientId={patient.id}
        clinicId={clinicId}
        adapter={adapter}
        dictationAdapter={
          !isHistoricMode && canUseClinicalDictation && isDictationEnabled
            ? dictationAdapter
            : undefined
        }
        readOnly={readOnly}
        currency={
          settings?.currency ?? DEFAULT_CLINIC_GENERAL_SETTINGS.currency
        }
        notation={notation}
        showHeader={false}
        initialTab="odontogram"
        defaultDentition={defaultDentition}
        onChange={isHistoricMode ? undefined : handleSnapshotChange}
        onSaveStart={handleSaveStart}
        onSaveSuccess={handleSaveSuccess}
        onError={handleError}
        finalizeOpen={finalizeOpen}
        onFinalizeClose={onFinalizeClose}
        onFinalizeSuccess={onFinalizeSuccess}
      />
      {readOnly && !isHistoricMode && readOnlyReason && (
        <OdontogramReadOnlyOverlay reason={readOnlyReason} />
      )}
    </div>
  );
  return (
    <div className="flex flex-col h-full min-h-0 flex-1">
      {hasVisitHistory && appointments && (
        <OdontogramVisitContextBar
          appointments={appointments}
          historicAppointmentId={historicAppointmentId}
          activeAppointmentId={activeAppointmentId}
          onSelectVisit={handleSelectVisit}
          onReturnToCurrent={handleReturnToCurrent}
          loading={showSpinner}
        />
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {!isHistoricMode
          ? "Viendo el estado actual. Edición habilitada."
          : historicFailed
            ? `No se pudo cargar el registro del ${historicLongLabel}.`
            : historicUnavailable
              ? `La visita del ${historicLongLabel} no tiene registro de odontograma.`
              : `Viendo el registro del ${historicLongLabel}. Solo lectura.`}
      </p>
      {isOutOfConsultationEditing && (
        <div className="mb-3 flex items-center justify-center">
          <StatusBadge tone="neutral">
            Editando fuera de una consulta — los cambios no quedan ligados a
            ninguna visita
          </StatusBadge>
        </div>
      )}
      {historicUnavailable && (
        <div className="mb-3 flex items-center justify-center">
          <StatusBadge tone={historicFailed ? "danger" : "warning"}>
            {historicFailed
              ? "No se pudo cargar el odontograma de esta visita — vuelve a intentarlo"
              : "Vista histórica — sin datos disponibles para esta visita"}
          </StatusBadge>
        </div>
      )}
      {isHistoricMode ? (
        <OdontogramHistoricFrame visitLabel={historicShortLabel}>
          {historicUnavailable ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-subtle">
              {historicFailed
                ? "No se pudo leer el registro de esta visita. Revisa tu conexión y vuelve a intentarlo."
                : "Esta visita no tiene un registro de odontograma guardado."}
            </div>
          ) : (
            odontogramBlock
          )}
        </OdontogramHistoricFrame>
      ) : (
        odontogramBlock
      )}
    </div>
  );
}
