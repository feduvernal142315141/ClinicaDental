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
import type { UpdateMedicalHistoryRequest } from "@/lib/entity/clinical-history";
import type { Patient } from "@/lib/entity/patients";
import type { Appointment } from "@/lib/entity/appointment/appointments";

export interface UseClinicalHistoryPageParams {
  patientId: string;
  initialTab?: string;
  activeAppointmentId?: string;
  openFinalizeOnLoad?: boolean;
}

/** Valor canónico de la pestaña del plan de tratamiento en `?tab=`. */
export const TREATMENT_PLAN_TAB = "plan-tratamiento";

/**
 * Alias aceptados en el deep-link `?tab=`. Existen para que un enlace ya
 * repartido (correo, ficha impresa, otro módulo) no aterrice en una pestaña
 * inexistente, que Radix pinta como contenido en blanco.
 */
const TAB_ALIASES: Record<string, string> = {
  odontogram: "odontograma",
  plan: TREATMENT_PLAN_TAB,
  "plan-de-tratamiento": TREATMENT_PLAN_TAB,
  "treatment-plan": TREATMENT_PLAN_TAB,
};

export function useClinicalHistoryPage({
  patientId,
  initialTab = "historia-clinica",
  activeAppointmentId,
  openFinalizeOnLoad = false,
}: UseClinicalHistoryPageParams) {
  const router = useRouter();
  const normalizedInitialTab = initialTab
    ? (TAB_ALIASES[initialTab] ?? initialTab)
    : activeAppointmentId
      ? "workspace"
      : "historia-clinica";

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

  // Estado REAL de la cita "activa" según la lista del backend ya cargada
  // (getPatientAppointments) — la MISMA fuente que gatea la editabilidad del
  // odontograma en PatientOdontogramPanel. Se usa para reconciliar el store
  // local persistido (useActiveConsultation), que no conoce el status ni caduca,
  // y así evitar el desfase que dejaba un Workspace "activo" (timer eterno) con
  // el odontograma silenciosamente en solo-lectura. `undefined` mientras la lista
  // carga o si la cita no está en ella → se trata como NO terminal (fail-open).
  const activeAppointmentFromList = appointments.find(
    (a) => a.id === effectiveActiveAppointmentId,
  );
  const activeAppointmentIsTerminal =
    !!activeAppointmentFromList &&
    activeAppointmentFromList.status !== "in_progress" &&
    activeAppointmentFromList.status !== "scheduled";

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
      .catch((error) => {
        if (cancelled) return;

        notifyApiError("No se pudo restaurar la consulta activa", error);

        // Distinguir cita inválida (4xx del backend) de fallo transitorio
        // (red/5xx, sin status): solo la primera justifica purgar la sesión
        // persistida y expulsar del workspace. Ante un fallo transitorio se
        // conserva la sesión (fail-open) y solo se avisa.
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
    // No re-armar el store para una cita ya terminal (finalizada/cancelada):
    // eso perpetuaba la sesión stale que compite con la reconciliación de abajo.
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

  // Reconciliación con el backend: si la cita "activa" ya aparece finalizada/
  // cancelada en la lista, purgar la sesión local stale (endConsultation) para
  // que NO se muestre un Workspace activo con el odontograma bloqueado en
  // silencio. Guardado por `!appointmentsLoading` para no purgar durante la carga
  // y solo dispara con un status terminal EXPLÍCITO de la lista (fail-open).
  useEffect(() => {
    if (appointmentsLoading || !activeAppointmentIsTerminal) return;
    // Solo purgar el store si REALMENTE apunta a esta cita (ownership guard):
    // no pisar una consulta activa distinta si se abre por URL una cita ya
    // finalizada. La navegación/reset de tab sí es incondicional.
    if (
      effectiveActiveAppointmentId &&
      isActiveFor(patientId, effectiveActiveAppointmentId)
    ) {
      endConsultation();
    }
    setRestoredAppointmentId(undefined);
    setActiveTab("historia-clinica");
    if (activeAppointmentId) {
      router.replace(`/patients/${patientId}`);
    }
  }, [
    appointmentsLoading,
    activeAppointmentIsTerminal,
    activeAppointmentId,
    effectiveActiveAppointmentId,
    isActiveFor,
    endConsultation,
    router,
    patientId,
  ]);

  useEffect(() => {
    // Mismo guard que el efecto de re-arranque: NO re-armar el store (ni con
    // alertas de alergia) para una cita ya terminal, o se deshace el purge y
    // queda un estado fantasma de "consulta activa" en el shell global.
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

    // Mismo motivo que en `openFinalizeModal`: el modal solo existe dentro del
    // Workspace. Al entrar por enlace con `openFinalizeOnLoad` la pestaña
    // inicial por defecto es Historia Clínica, así que sin esto el modal se
    // "abría" sobre una pestaña que no lo monta.
    setActiveTab("workspace");
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

  // Plan de tratamiento: el backend lo protege con `hasAuthority('odontogram')`,
  // una autoridad de MÓDULO sin bits de acción — se concede en cuanto el rol
  // tiene el módulo con cualquier valor. Por eso NO se puede usar `can(...,
  // EDIT)` aquí: eso gatearía una pantalla de solo lectura con un permiso de
  // escritura. Sin el módulo, tanto el listado de planes como el
  // `POST /treatment-plans` del get-or-create responden 403, así que la pestaña
  // se oculta entera en vez de enseñar un error que el usuario no puede resolver.
  const canViewTreatmentPlan =
    isAdmin || (permissionsObj["odontogram"] ?? 0) > 0;

  // Un `?tab=plan-tratamiento` de alguien sin el módulo dejaría a Radix sin
  // contenido que montar (pantalla en blanco). Se resuelve al leer, no con otro
  // estado, para no encadenar un render extra en cada carga.
  const effectiveActiveTab =
    activeTab === TREATMENT_PLAN_TAB && !canViewTreatmentPlan
      ? "historia-clinica"
      : activeTab;

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
    } catch (error) {
      notifyApiError("No se pudieron cargar las citas del paciente", error);
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

  // La pestaña "odontograma" SOLO se monta cuando no hay consulta activa
  // (ClinicalHistoryPage la condiciona a `!isCurrentlyActiveConsultation`).
  // Durante una consulta activa el odontograma vive dentro de "workspace":
  // fijar "odontograma" dejaba el panel en blanco justo al entrar al historial
  // desde el drawer de visitas.
  const handleViewOdontogram = useCallback(
    (appointmentId: string) => {
      setHistoricAppointmentId(appointmentId);
      setActiveTab(isCurrentlyActiveConsultation ? "workspace" : "odontograma");
    },
    [isCurrentlyActiveConsultation],
  );

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
    // El banner de consulta activa es de PÁGINA y su botón "Finalizar consulta"
    // se ve desde cualquier pestaña, pero el modal de cierre se renderiza dentro
    // del módulo del odontograma, que solo vive en el Workspace. Radix desmonta
    // las pestañas inactivas, así que pulsarlo desde Historia Clínica encendía
    // el estado y no pintaba nada: el botón parecía roto.
    // Volver al Workspace además es lo coherente: el modal resume lo ejecutado
    // en el odontograma, que es justo lo que esa pestaña muestra.
    setActiveTab("workspace");
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

  /**
   * Cambia la foto del paciente desde la tarjeta de perfil, sin abrir el modal.
   *
   * Manda la ficha COMPLETA a propósito: `PUT /patients/{id}` sobrescribe TODOS
   * los campos que recibe, así que un payload parcial (solo la foto) dejaría
   * nombre, teléfono, nacimiento y género en null. Es exactamente el fallo que
   * tenía `togglePatientStatus` cuando mandaba `{id, active}` a secas.
   */
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
        // Refresco optimista: la tarjeta ya muestra la imagen que acaba de subir
        // el AvatarField, así que no hace falta releer la ficha entera.
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
    appointments,
    appointmentsLoading,
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
    handlePatientPhotoChange,
    handleViewVisitOdontogram,
    handleSelectHistoricVisit,
  };
}
