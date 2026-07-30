"use client";

import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { OdontogramModule, createApiOdontogramAdapter, createHistoricOdontogramAdapter } from "@/lib/odontogram";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { useAuth } from "@/lib/contexts/auth-context";
import { useOdontogramByVisit } from "@/lib/hooks/odontogram/useOdontogramByVisit";
import { useClinicGeneralSettings } from "@/lib/hooks/settings";
import { DEFAULT_CLINIC_GENERAL_SETTINGS } from "@/lib/entity/settings";
import { OdontogramReadOnlyOverlay } from "@/components/features/odontogram/ui/OdontogramReadOnlyOverlay";
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
  /** True mientras la lista de citas aún carga (evita fail-closed prematuro). */
  appointmentsLoading?: boolean;
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
  appointmentsLoading,
  onSelectHistoricVisit,
  finalizeOpen,
  onFinalizeClose,
  onFinalizeSuccess,
}: PatientOdontogramPanelProps) {
  const { can, isAdmin } = usePermission();
  const { user } = useAuth();
  // Moneda de la clínica: el módulo del odontograma no puede leer ajustes
  // (frontera), así que el host se la inyecta para que los importes se pinten
  // con el símbolo real configurado en Opciones Generales.
  const { settings } = useClinicGeneralSettings();

  const clinicId = patient.clinicId ?? "";

  // Local transitioning flag — set immediately on visit change for instant Spin
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

  // El spinner se retira SOLO cuando lo cargado corresponde a la visita pedida.
  // Antes se limpiaba con `!historicLoading` a secas, así que al encadenar dos
  // visitas el spinner desaparecía descubriendo el snapshot de la anterior bajo
  // la fecha de la nueva.
  useEffect(() => {
    if (!historicAppointmentId) {
      setIsTransitioning(false);
      return;
    }
    if (!historicLoading && loadedVisitId === historicAppointmentId) {
      setIsTransitioning(false);
    }
  }, [historicAppointmentId, historicLoading, loadedVisitId]);

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

  // Sin snapshot NO se cae al adapter en vivo: pintaría el odontograma de HOY
  // bajo la fecha de una visita pasada, o sea una afirmación clínica falsa sobre
  // el paciente. Con "" el adapter no puede parsear y devuelve null, y el módulo
  // monta un odontograma vacío (nunca el del presente).
  const historicAdapter = useMemo(
    () => createHistoricOdontogramAdapter(historicSnapshot?.state ?? ""),
    [historicSnapshot],
  );

  const isHistoricMode = !!historicAppointmentId;

  // Regla ÚNICA de elegibilidad, compartida con la barra de contexto: antes el
  // anfitrión montaba la navegación con `appointments.length > 1` y el
  // componente decidía por su cuenta, así que con citas canceladas se montaba
  // una barra que no pintaba nada.
  const eligibleVisits = useMemo(
    () => getEligibleVisits(appointments, activeAppointmentId),
    [appointments, activeAppointmentId],
  );
  const hasVisitHistory = eligibleVisits.length >= 2;

  const historicVisitDate = useMemo(() => {
    const visit = eligibleVisits.find(
      (v) => v.appointmentId === historicAppointmentId,
    );
    // Fallback a la lista completa: el drawer de visitas puede abrir una cita
    // que el filtro de elegibilidad no incluye, y la fecha es la identidad del
    // registro que se está mostrando.
    return (
      visit?.parsedDate ??
      findAppointmentDate(appointments, historicAppointmentId)
    );
  }, [appointments, eligibleVisits, historicAppointmentId]);

  const historicShortLabel = formatVisitDate(historicVisitDate);
  const historicLongLabel = formatVisitDateLong(historicVisitDate);

  // Aviso UNA sola vez, al cruzar del presente al pasado. El cruce de frontera
  // es el momento del riesgo; un toast por cada visita recorrida sería ruido
  // justo donde vinimos a quitarlo.
  const wasHistoricRef = useRef(false);
  useEffect(() => {
    if (isHistoricMode && !wasHistoricRef.current) {
      // `warning` y no `info`: el aviso pertenece al mismo vocabulario ámbar que
      // el resto del modo histórico (barra teñida, píldora con candado, marco).
      // En azul se leía como una notificación cualquiera del sistema.
      notify.warning(`Estás viendo el odontograma del ${historicShortLabel}`, {
        description: (
          <span className="flex items-center gap-1.5">
            <RotateCcw
              // Gira en sentido inverso: el gesto de "rebobinar" señala la
              // salida antes de leer el texto. Se detiene con motion-reduce.
              className="h-3.5 w-3.5 shrink-0 animate-spin [animation-direction:reverse] [animation-duration:3s] motion-reduce:animate-none"
              aria-hidden
            />
            Es un registro de solo lectura. Vuelve a hoy para editar.
          </span>
        ),
        // El aviso deja de ser un callejón sin salida: la vuelta al presente se
        // resuelve desde el propio toast, sin ir a buscar el botón de la barra.
        button: {
          title: "Volver a hoy",
          onClick: handleReturnToCurrent,
        },
      });
    }
    wasHistoricRef.current = isHistoricMode;
  }, [isHistoricMode, historicShortLabel, handleReturnToCurrent]);

  // El odontograma es editable durante una visita ACTIVA (in_progress/scheduled)
  // y solo-lectura si la visita EXISTE en la lista con status terminal
  // (completed/cancelled/no-show). Whitelist (no blacklist "=== completed") para
  // alinear la editabilidad con la MISMA regla que decide si la consulta está
  // activa. Fail-open mientras la lista aún carga (activeAppointment undefined):
  // no bloquear la edición de una consulta recién abierta.
  const activeAppointment = useMemo(
    () => appointments?.find((a) => a.id === activeAppointmentId),
    [appointments, activeAppointmentId],
  );
  const isActiveVisitStatus =
    activeAppointment?.status === "in_progress" ||
    activeAppointment?.status === "scheduled";
  // Fail-CLOSED una vez cargada la lista: si HAY una cita en contexto y tras cargar
  // no está activa (finalizada/cancelada, o no aparece en la lista), la edición se
  // bloquea — integridad clínico-legal de la visita. Durante la carga NO se bloquea,
  // para no flashear "solo lectura".
  // Sin cita en contexto NO aplica: el odontograma se puede llenar fuera de una
  // consulta (volcar la ficha en papel de un paciente anterior al sistema).
  const isNonEditableVisit =
    !!activeAppointmentId && !appointmentsLoading && !isActiveVisitStatus;

  // El odontograma es documentación clínica: su edición se gatea con la
  // autoridad 'odontogram' (backend @PreAuthorize), no con clinical_history
  // ni con patients:EDIT.
  const canEditClinical =
    isAdmin ||
    can("odontogram", PermissionAction.EDIT) ||
    can("odontogram", PermissionAction.CREATE);

  // Solo lectura por: modo histórico, visita finalizada o falta de permiso.
  // "Sin consulta" ya NO bloquea: el permiso es lo único que manda.
  const readOnly = isHistoricMode || isNonEditableVisit || !canEditClinical;

  // Motivo del modo solo-lectura → feedback coherente en el overlay.
  // Precedencia: sin permiso (no accionable) > visita finalizada.
  const readOnlyReason: "completed" | "no-permission" | null = isHistoricMode
    ? null
    : !canEditClinical
      ? "no-permission"
      : isNonEditableVisit
        ? "completed"
        : null;

  // Edición fuera de consulta: se guarda el estado actual del paciente, pero no
  // queda snapshot en el historial por visita (el backend no lo escribe sin cita).
  const isOutOfConsultationEditing = !readOnly && !isHistoricMode && !activeAppointmentId;

  // El estado de autoguardado lo pinta el banner de la consulta activa: fuera de
  // una consulta no hay dónde mostrarlo, así que no se marca (evita dejar un
  // "error al guardar" colgado que reaparezca en la siguiente consulta).
  const tracksAutosaveStatus = !readOnly && !isHistoricMode && !!activeAppointmentId;

  const adapter = isHistoricMode ? historicAdapter : apiAdapter;

  // Show spinner when transitioning OR when the hook is loading
  const showSpinner = isTransitioning || (isHistoricMode && historicLoading);

  // Histórico sin nada que mostrar. Se distingue el fallo de lectura del vacío
  // real: un 500/timeout deja el snapshot en null igual que una visita sin
  // registro, y afirmar "no se registró nada" cuando en realidad no se pudo leer
  // es afirmar algo del paciente a partir de un error de red.
  const historicUnavailable =
    isHistoricMode && !historicLoading && !isTransitioning && !historicSnapshot;
  const historicFailed = historicUnavailable && !!historicError;

  // Bloque tabs + lienzo. En modo histórico se envuelve con el marco ámbar.
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
            readOnly={readOnly}
            currency={
              settings?.currency ?? DEFAULT_CLINIC_GENERAL_SETTINGS.currency
            }
            showHeader={false}
            initialTab="odontogram"
            onSaveStart={
              tracksAutosaveStatus
                ? () => useAutosaveStatus.getState().markSaving()
                : undefined
            }
            onSaveSuccess={
              tracksAutosaveStatus
                ? () => useAutosaveStatus.getState().markSaved()
                : undefined
            }
            onError={() => {
              // Solo marca error de autosave en edición real (no en carga
              // histórica/solo-lectura, donde no hay sesión de guardado activa).
              if (tracksAutosaveStatus) {
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
          <OdontogramReadOnlyOverlay reason={readOnlyReason} />
        )}
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 flex-1">
      {/* Barra de contexto de visita — sustituye al carrusel del historial */}
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

      {/* WCAG 4.1.3: el cambio de modo se anuncia al confirmar, no al navegar */}
      <p role="status" aria-live="polite" className="sr-only">
        {!isHistoricMode
          ? "Viendo el estado actual. Edición habilitada."
          : historicFailed
            ? `No se pudo cargar el registro del ${historicLongLabel}.`
            : historicUnavailable
              ? `La visita del ${historicLongLabel} no tiene registro de odontograma.`
              : `Viendo el registro del ${historicLongLabel}. Solo lectura.`}
      </p>

      {/* Señal ÚNICA y discreta: el usuario debe saber que lo que escribe no
          pertenece a ninguna visita. Sin banner ni modal. */}
      {isOutOfConsultationEditing && (
        <div className="mb-3 flex items-center justify-center">
          <StatusBadge tone="neutral">
            Editando fuera de una consulta — los cambios no quedan ligados a
            ninguna visita
          </StatusBadge>
        </div>
      )}

      {/* Histórico sin datos: la barra de contexto ya ofrece "Volver a hoy" */}
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
          {/* Sin registro (o sin poder leerlo) no se monta el lienzo: un
              odontograma vacío bajo la fecha de la visita se leería como "ese
              día el paciente no tenía ningún hallazgo". */}
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
