"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { patientsService } from "@/lib/services/patients/patients.service";
import { notifyApiError } from "@/lib/utils/notify-error";
import { appointmentsService } from "@/lib/services/appointments/appointments.service";
import { useClinicalHistory } from "@/lib/hooks/clinical-history";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { useActiveConsultation } from "@/lib/store/useActiveConsultation";
import { getVisitEditability, isLockedVisit } from "./visit-editability";
import { PATIENT_TABS, resolveTab, type PatientTab } from "./patient-tabs";
import { localTodayInput, parseLocalValue } from "@/lib/datetime";
import { formatVisitDate } from "@/lib/utils/visit-eligibility";
import type { ConsultationCta } from "@/components/features/patients/clinical-history-page/continuity";
import type { UpdateMedicalHistoryRequest } from "@/lib/entity/clinical-history";
import type { Patient } from "@/lib/entity/patients";
import type { Appointment } from "@/lib/entity/appointment/appointments";

export interface UseClinicalHistoryPageParams {
  patientId: string;
  initialTab?: string;
  activeAppointmentId?: string;
  openFinalizeOnLoad?: boolean;
}

export function useClinicalHistoryPage({
  patientId,
  initialTab = "historia-clinica",
  activeAppointmentId,
  openFinalizeOnLoad = false,
}: UseClinicalHistoryPageParams) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>(() =>
    resolveTab(initialTab, { canViewTreatmentPlan: true }),
  );
  const [restoredAppointmentId, setRestoredAppointmentId] = useState<
    string | undefined
  >(undefined);
  const [historicAppointmentId, setHistoricAppointmentId] = useState<
    string | undefined
  >(undefined);
  const [showStartNow, setShowStartNow] = useState(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [visitHistoryAppointment, setVisitHistoryAppointment] =
    useState<Appointment | null>(null);
  const [medicalHistoryDrawerOpen, setMedicalHistoryDrawerOpen] =
    useState(false);
  const [savingMedicalHistory, setSavingMedicalHistory] = useState(false);
  const [editPatientOpen, setEditPatientOpen] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientLoading, setPatientLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState<unknown>(null);
  const [appointmentsEverLoaded, setAppointmentsEverLoaded] = useState(false);
  const [verifiedStatus, setVerifiedStatus] = useState<
    Appointment["status"] | undefined
  >(undefined);

  const {
    snapshot,
    loading: snapshotLoading,
    loadSnapshot,
    updateMedicalHistory,
    forbidden: snapshotForbidden,
    error: snapshotError,
  } = useClinicalHistory();
  const {
    appointmentId: persistedAppointmentId,
    patientId: persistedPatientId,
    start: startConsultation,
    end: endConsultation,
    isActiveFor,
    startTime: consultationStartTime,
  } = useActiveConsultation();
  const effectiveActiveAppointmentId =
    activeAppointmentId ?? restoredAppointmentId;

  const visitEditability = getVisitEditability({
    appointmentId: effectiveActiveAppointmentId,
    appointments,
    appointmentsLoading,
    verifiedStatus,
  });
  const activeAppointmentIsTerminal = isLockedVisit(visitEditability);
  const activeAppointmentIsClosed =
    visitEditability.kind === "locked" &&
    visitEditability.reason !== "not-started";
  useEffect(() => {
    const persistedMatchesCurrentPatient = persistedPatientId === patientId;
    const candidateAppointmentId =
      activeAppointmentId ??
      (persistedMatchesCurrentPatient ? persistedAppointmentId : undefined);
    if (!candidateAppointmentId) {
      setRestoredAppointmentId(undefined);
      setVerifiedStatus(undefined);
      return;
    }

    setVerifiedStatus(undefined);
    let cancelled = false;
    appointmentsService
      .getAppointmentById(candidateAppointmentId)
      .then((appointment) => {
        if (cancelled) return;
        const appointmentPatientId =
          appointment.patientId ?? appointment.patient_id;
        const isSamePatient = appointmentPatientId === patientId;
        const isActiveStatus = appointment.status === "in_progress";
        const shouldClearPersistedSession =
          persistedMatchesCurrentPatient &&
          persistedAppointmentId === candidateAppointmentId;
        if (isSamePatient) {
          setVerifiedStatus(appointment.status);
        }

        if (isSamePatient && appointment.status === "scheduled") {
          if (shouldClearPersistedSession) {
            endConsultation();
          }
          setRestoredAppointmentId(undefined);
          return;
        }
        if (!isSamePatient || !isActiveStatus) {
          if (shouldClearPersistedSession) {
            endConsultation();
          }
          setRestoredAppointmentId(undefined);
          if (activeAppointmentId) {
            setActiveTab(PATIENT_TABS.EVOLUTION);
            router.replace(`/patients/${patientId}`);
          }
          return;
        }
        if (!activeAppointmentId && persistedMatchesCurrentPatient) {
          setRestoredAppointmentId(candidateAppointmentId);
          setActiveTab(PATIENT_TABS.EVOLUTION);
          router.replace(
            `/patients/${patientId}?tab=${PATIENT_TABS.EVOLUTION}&appointmentId=${candidateAppointmentId}`,
          );
          return;
        }
        setRestoredAppointmentId(undefined);
      })
      .catch((error) => {
        if (cancelled) return;
        notifyApiError("No se pudo restaurar la consulta activa", error);

        const status = (error as Error & { status?: number }).status;
        const isInvalidAppointment =
          typeof status === "number" && status >= 400 && status < 500;
        if (!isInvalidAppointment) {
          setRestoredAppointmentId(undefined);
          return;
        }
        if (
          persistedMatchesCurrentPatient &&
          persistedAppointmentId === candidateAppointmentId
        ) {
          endConsultation();
        }
        setRestoredAppointmentId(undefined);
        if (activeAppointmentId) {
          setActiveTab(PATIENT_TABS.EVOLUTION);
          router.replace(`/patients/${patientId}`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    activeAppointmentId,
    persistedAppointmentId,
    persistedPatientId,
    patientId,
    endConsultation,
    router,
  ]);
  useEffect(() => {

    if (
      effectiveActiveAppointmentId &&
      patient &&
      !activeAppointmentIsTerminal
    ) {
      startConsultation({
        appointmentId: effectiveActiveAppointmentId,
        patientId,
        patientName: patient.name,
        criticalAlerts: [],
      });
    }
  }, [
    effectiveActiveAppointmentId,
    patientId,
    patient?.name,
    patient,
    startConsultation,
    activeAppointmentIsTerminal,
  ]);

  useEffect(() => {
    if (appointmentsLoading || appointmentsError || !activeAppointmentIsClosed)
      return;
    if (
      effectiveActiveAppointmentId &&
      isActiveFor(patientId, effectiveActiveAppointmentId)
    ) {
      endConsultation();
    }
    setRestoredAppointmentId(undefined);
    setActiveTab(PATIENT_TABS.EVOLUTION);
    if (activeAppointmentId) {
      router.replace(`/patients/${patientId}`);
    }
  }, [
    appointmentsLoading,
    appointmentsError,
    activeAppointmentIsClosed,
    activeAppointmentId,
    effectiveActiveAppointmentId,
    isActiveFor,
    endConsultation,
    router,
    patientId,
  ]);
  useEffect(() => {

    if (
      !effectiveActiveAppointmentId ||
      !snapshot ||
      !patient ||
      activeAppointmentIsTerminal
    )
      return;
    const allergies = snapshot.medicalHistory?.allergies ?? [];
    if (allergies.length === 0) return;

    startConsultation({
      appointmentId: effectiveActiveAppointmentId,
      patientId,
      patientName: patient.name,
      criticalAlerts: allergies.map((allergy) => `Alergia: ${allergy}`),
    });
  }, [
    effectiveActiveAppointmentId,
    patientId,
    patient,
    snapshot,
    startConsultation,
    activeAppointmentIsTerminal,
  ]);
  const isCurrentlyActiveConsultation =
    !!effectiveActiveAppointmentId &&
    isActiveFor(patientId, effectiveActiveAppointmentId) &&
    !activeAppointmentIsTerminal;
  useEffect(() => {
    if (!openFinalizeOnLoad || !isCurrentlyActiveConsultation) return;

    setActiveTab(PATIENT_TABS.ODONTOGRAM);
    setIsFinalizeModalOpen(true);
  }, [openFinalizeOnLoad, isCurrentlyActiveConsultation]);
  const { isAdmin, can, permissionsObj } = usePermission();
  const canManageAttachments =
    isAdmin || can("patients", PermissionAction.EDIT);
  const canEditMedicalHistory =
    isAdmin ||
    can("clinical_history", PermissionAction.EDIT) ||
    can("clinical_history", PermissionAction.CREATE);
  const canEditPatient = isAdmin || can("patients", PermissionAction.EDIT);

  const canViewClinicalHistory =
    isAdmin || (permissionsObj["clinical_history"] ?? 0) > 0;

  const canViewTreatmentPlan =
    isAdmin || (permissionsObj["odontogram"] ?? 0) > 0;

  const effectiveActiveTab: PatientTab = resolveTab(activeTab, {
    canViewTreatmentPlan,
  });
  useEffect(() => {
    let cancelled = false;
    setPatientLoading(true);
    patientsService
      .getPatientById(patientId)
      .then((nextPatient) => {
        if (!cancelled) {
          setPatient(nextPatient);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          notifyApiError("No se pudo cargar el paciente", error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPatientLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);
  useEffect(() => {
    loadSnapshot(patientId);
  }, [patientId, loadSnapshot]);
  const loadAppointments = useCallback(async () => {
    setAppointmentsLoading(true);
    try {
      const nextAppointments =
        await appointmentsService.getPatientAppointments(patientId);
      setAppointments(nextAppointments);
      setAppointmentsError(null);
    } catch (error) {
      notifyApiError("No se pudieron cargar las citas del paciente", error);
      setAppointmentsError(error);
    } finally {
      setAppointmentsLoading(false);
      setAppointmentsEverLoaded(true);
    }
  }, [patientId]);
  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleStartConsultation = useCallback(
    (appointmentId: string) => {
      setActiveTab(PATIENT_TABS.EVOLUTION);
      router.push(
        `/patients/${patientId}?tab=${PATIENT_TABS.EVOLUTION}&appointmentId=${appointmentId}`,
      );
      void loadAppointments();
    },
    [patientId, router, loadAppointments],
  );
  const handleStartNow = useCallback(
    (appointmentId: string) => {
      setShowStartNow(false);
      setActiveTab(PATIENT_TABS.EVOLUTION);
      router.push(
        `/patients/${patientId}?tab=${PATIENT_TABS.EVOLUTION}&appointmentId=${appointmentId}`,
      );
      void loadAppointments();
    },
    [patientId, router, loadAppointments],
  );
  const handleStartScheduledConsultation = useCallback(
    async (appointmentId: string) => {
      try {
        await appointmentsService.startAppointment(appointmentId);
        setVerifiedStatus("in_progress");
        setActiveTab(PATIENT_TABS.EVOLUTION);
        router.push(
          `/patients/${patientId}?tab=${PATIENT_TABS.EVOLUTION}&appointmentId=${appointmentId}`,
        );
      } catch (error) {
        notifyApiError("No se pudo iniciar la consulta", error);
      } finally {
        void loadAppointments();
      }
    },
    [patientId, router, loadAppointments],
  );
  const handleViewVisitHistory = useCallback((appointment: Appointment) => {
    setVisitHistoryAppointment(appointment);
  }, []);
  const handleSaveMedicalHistory = useCallback(
    async (data: UpdateMedicalHistoryRequest) => {
      setSavingMedicalHistory(true);
      try {
        await updateMedicalHistory(patientId, data);
        setMedicalHistoryDrawerOpen(false);
      } finally {
        setSavingMedicalHistory(false);
      }
    },
    [patientId, updateMedicalHistory],
  );
  const handleViewOdontogram = useCallback((appointmentId: string) => {
    setHistoricAppointmentId(appointmentId);
    setActiveTab(PATIENT_TABS.ODONTOGRAM);
  }, []);
  const handleBackToCurrentOdontogram = useCallback(() => {
    setHistoricAppointmentId(undefined);
  }, []);
  const consultationCta = ((): ConsultationCta => {
    if (!(isAdmin || can("appointments", PermissionAction.EDIT))) {
      return { kind: "hidden" };
    }
    if (visitEditability.kind === "editable") return { kind: "hidden" };

    if (appointmentsError && appointments.length === 0) {
      return { kind: "hidden" };
    }
    if (visitEditability.kind === "unknown") return { kind: "disabled" };
    if (appointmentsLoading && !appointmentsEverLoaded) {
      return { kind: "disabled" };
    }
    const inProgress = appointments.find((a) => a.status === "in_progress");
    if (inProgress) {
      return { kind: "continue", appointmentId: inProgress.id };
    }
    const today = localTodayInput();
    const todayScheduled = appointments
      .filter((a) => a.status === "scheduled" && a.date === today)
      .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))[0];
    if (todayScheduled) {
      return {
        kind: "start-scheduled",
        appointmentId: todayScheduled.id,
        time: todayScheduled.time ?? "",
        doctorName: todayScheduled.doctorName,
      };
    }
    return { kind: "start" };
  })();

  const visitRibbonState = (() => {
    if (historicAppointmentId) {
      const visit = appointments.find((a) => a.id === historicAppointmentId);
      return {
        kind: "historic" as const,
        dateLabel: visit ? formatVisitDate(parseLocalValue(visit.date)) : "una visita anterior",
      };
    }
    if (!isCurrentlyActiveConsultation) return null;
    const current = appointments.find(
      (a) => a.id === effectiveActiveAppointmentId,
    );
    return {
      kind: "active" as const,
      startedAt: consultationStartTime
        ? new Date(consultationStartTime).toISOString()
        : undefined,
      dateLabel: current ? formatVisitDate(parseLocalValue(current.date)) : "hoy",
      doctorName: current?.doctorName,
    };
  })();
  const openStartNow = useCallback(() => {
    setShowStartNow(true);
  }, []);
  const closeStartNow = useCallback(() => {
    setShowStartNow(false);
  }, []);
  const openFinalizeModal = useCallback(() => {

    setActiveTab(PATIENT_TABS.ODONTOGRAM);
    setIsFinalizeModalOpen(true);
  }, []);
  const closeFinalizeModal = useCallback(() => {
    setIsFinalizeModalOpen(false);
  }, []);

  const handleFinalizeSuccess = useCallback(() => {
    setIsFinalizeModalOpen(false);
    endConsultation();
    setActiveTab(PATIENT_TABS.EVOLUTION);
    void loadAppointments();
    router.replace(`/patients/${patientId}`);
    router.refresh();
  }, [endConsultation, loadAppointments, patientId, router]);
  const openMedicalHistoryDrawer = useCallback(() => {
    setMedicalHistoryDrawerOpen(true);
  }, []);
  const closeMedicalHistoryDrawer = useCallback(() => {
    setMedicalHistoryDrawerOpen(false);
  }, []);
  const openEditPatient = useCallback(() => {
    setEditPatientOpen(true);
  }, []);
  const closeEditPatient = useCallback(() => {
    setEditPatientOpen(false);
  }, []);

  const handlePatientPhotoChange = useCallback(
    async (photoUrl: string) => {
      if (!patient) return;
      const next = photoUrl || undefined;
      try {
        await patientsService.updatePatient({
          id: patient.id,
          name: patient.name,
          email: patient.email,
          phone: patient.phone,
          dateOfBirth: patient.dateOfBirth?.slice(0, 10),
          address: patient.address,
          gender: patient.gender,
          agreement: patient.agreement,
          active: patient.active,
          photoUrl: next,
        });

        setPatient({ ...patient, photoUrl: next });
      } catch (error) {
        notifyApiError(
          next ? "No se pudo guardar la foto" : "No se pudo quitar la foto",
          error,
          "La imagen se subió pero no quedó asociada al paciente. Inténtalo de nuevo.",
        );
      }
    },
    [patient],
  );
  const handleEditPatientSuccess = useCallback(() => {
    setEditPatientOpen(false);
    patientsService
      .getPatientById(patientId)
      .then(setPatient)
      .catch(() => {});
  }, [patientId]);
  const closeVisitHistory = useCallback(() => {
    setVisitHistoryAppointment(null);
  }, []);
  const handleViewVisitOdontogram = useCallback(
    (appointmentId: string) => {
      setVisitHistoryAppointment(null);
      handleViewOdontogram(appointmentId);
    },
    [handleViewOdontogram],
  );
  const handleSelectHistoricVisit = useCallback((appointmentId: string) => {
    setHistoricAppointmentId(appointmentId);
  }, []);
  return {
    patient,
    patientLoading,
    snapshot,
    snapshotLoading,
    snapshotForbidden,
    snapshotError,
    loadSnapshot,
    appointments,
    appointmentsLoading,
    appointmentsError,
    visitEditability,
    loadAppointments,
    activeTab: effectiveActiveTab,
    setActiveTab,
    showStartNow,
    closeStartNow,
    openStartNow,
    isFinalizeModalOpen,
    openFinalizeModal,
    closeFinalizeModal,
    visitHistoryAppointment,
    closeVisitHistory,
    medicalHistoryDrawerOpen,
    closeMedicalHistoryDrawer,
    openMedicalHistoryDrawer,
    savingMedicalHistory,
    editPatientOpen,
    closeEditPatient,
    openEditPatient,
    effectiveActiveAppointmentId,
    historicAppointmentId,
    isCurrentlyActiveConsultation,
    canManageAttachments,
    canEditMedicalHistory,
    canEditPatient,
    canViewTreatmentPlan,
    canViewClinicalHistory,
    isAdmin,
    can,
    handleStartConsultation,
    handleStartNow,
    handleStartScheduledConsultation,
    consultationCta,
    visitRibbonState,
    handleViewVisitHistory,
    handleSaveMedicalHistory,
    handleViewOdontogram,
    handleBackToCurrentOdontogram,
    handleFinalizeSuccess,
    handleEditPatientSuccess,
    handlePatientPhotoChange,
    handleViewVisitOdontogram,
    handleSelectHistoricVisit,
  };
}
