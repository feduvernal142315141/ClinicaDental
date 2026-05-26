"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { patientsService } from "@/lib/services/patients/patients.service";
import { appointmentsService } from "@/lib/services/appointments/appointments.service";
import { useClinicalHistory } from "@/lib/hooks/clinical-history";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { useActiveConsultation } from "@/lib/store/useActiveConsultation";
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
  const normalizedInitialTab =
    initialTab === "odontogram"
      ? "odontograma"
      : (initialTab ??
        (activeAppointmentId ? "workspace" : "historia-clinica"));

  const [activeTab, setActiveTab] = useState(normalizedInitialTab);
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

  const {
    snapshot,
    loading: snapshotLoading,
    loadSnapshot,
    updateMedicalHistory,
  } = useClinicalHistory();

  const {
    appointmentId: persistedAppointmentId,
    patientId: persistedPatientId,
    start: startConsultation,
    end: endConsultation,
    isActiveFor,
  } = useActiveConsultation();

  const effectiveActiveAppointmentId =
    activeAppointmentId ?? restoredAppointmentId;

  useEffect(() => {
    const persistedMatchesCurrentPatient = persistedPatientId === patientId;
    const candidateAppointmentId =
      activeAppointmentId ??
      (persistedMatchesCurrentPatient ? persistedAppointmentId : undefined);

    if (!candidateAppointmentId) {
      setRestoredAppointmentId(undefined);
      return;
    }

    let cancelled = false;

    appointmentsService
      .getAppointmentById(candidateAppointmentId)
      .then((appointment) => {
        if (cancelled) return;

        const appointmentPatientId =
          appointment.patientId ?? appointment.patient_id;
        const isSamePatient = appointmentPatientId === patientId;
        const isActiveStatus =
          appointment.status === "in_progress" ||
          appointment.status === "scheduled";
        const shouldClearPersistedSession =
          persistedMatchesCurrentPatient &&
          persistedAppointmentId === candidateAppointmentId;

        if (!isSamePatient || !isActiveStatus) {
          if (shouldClearPersistedSession) {
            endConsultation();
          }
          setRestoredAppointmentId(undefined);
          if (activeAppointmentId) {
            setActiveTab("historia-clinica");
            router.replace(`/patients/${patientId}`);
          }
          return;
        }

        if (!activeAppointmentId && persistedMatchesCurrentPatient) {
          setRestoredAppointmentId(candidateAppointmentId);
          setActiveTab("workspace");
          router.replace(
            `/patients/${patientId}?tab=workspace&appointmentId=${candidateAppointmentId}`,
          );
          return;
        }

        setRestoredAppointmentId(undefined);
      })
      .catch(() => {
        if (cancelled) return;

        if (
          persistedMatchesCurrentPatient &&
          persistedAppointmentId === candidateAppointmentId
        ) {
          endConsultation();
        }

        setRestoredAppointmentId(undefined);
        if (activeAppointmentId) {
          setActiveTab("historia-clinica");
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
    if (effectiveActiveAppointmentId && patient) {
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
  ]);

  useEffect(() => {
    if (!effectiveActiveAppointmentId || !snapshot || !patient) return;

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
  ]);

  const isCurrentlyActiveConsultation =
    !!effectiveActiveAppointmentId &&
    isActiveFor(patientId, effectiveActiveAppointmentId);

  useEffect(() => {
    if (!openFinalizeOnLoad || !isCurrentlyActiveConsultation) return;

    setIsFinalizeModalOpen(true);
  }, [openFinalizeOnLoad, isCurrentlyActiveConsultation]);

  const { isAdmin, can } = usePermission();
  const canManageAttachments =
    isAdmin || can("patients", PermissionAction.EDIT);
  const canEditMedicalHistory =
    isAdmin ||
    can("clinical_history", PermissionAction.EDIT) ||
    can("clinical_history", PermissionAction.CREATE);
  const canEditPatient = isAdmin || can("patients", PermissionAction.EDIT);

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
      .catch(() => {})
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
    } catch {
      // ignore
    } finally {
      setAppointmentsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleStartConsultation = useCallback(
    (appointmentId: string) => {
      setActiveTab("workspace");
      router.push(
        `/patients/${patientId}?tab=workspace&appointmentId=${appointmentId}`,
      );
    },
    [patientId, router],
  );

  const handleStartNow = useCallback(
    (appointmentId: string) => {
      setShowStartNow(false);
      setActiveTab("workspace");
      router.push(
        `/patients/${patientId}?tab=workspace&appointmentId=${appointmentId}`,
      );
    },
    [patientId, router],
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
    setActiveTab("odontograma");
  }, []);

  const handleBackToCurrentOdontogram = useCallback(() => {
    setHistoricAppointmentId(undefined);
  }, []);

  const openStartNow = useCallback(() => {
    setShowStartNow(true);
  }, []);

  const closeStartNow = useCallback(() => {
    setShowStartNow(false);
  }, []);

  const openFinalizeModal = useCallback(() => {
    setIsFinalizeModalOpen(true);
  }, []);

  const closeFinalizeModal = useCallback(() => {
    setIsFinalizeModalOpen(false);
  }, []);

  const handleFinalizeSuccess = useCallback(() => {
    setIsFinalizeModalOpen(false);
    endConsultation();
    setActiveTab("historia-clinica");
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
    appointments,
    appointmentsLoading,
    activeTab,
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
    isAdmin,
    can,
    handleStartConsultation,
    handleStartNow,
    handleViewVisitHistory,
    handleSaveMedicalHistory,
    handleViewOdontogram,
    handleBackToCurrentOdontogram,
    handleFinalizeSuccess,
    handleEditPatientSuccess,
    handleViewVisitOdontogram,
    handleSelectHistoricVisit,
  };
}
