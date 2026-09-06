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

/**
 * Se re-exporta para no romper a los consumidores que ya lo importaban de aquí.
 * La definición canónica vive ahora en `patient-tabs.ts`, junto al resolvedor.
 */
export const TREATMENT_PLAN_TAB = PATIENT_TABS.TREATMENT_PLAN;

export function useClinicalHistoryPage({
  patientId,
  initialTab = "historia-clinica",
  activeAppointmentId,
  openFinalizeOnLoad = false,
}: UseClinicalHistoryPageParams) {
  const router = useRouter();
  // La normalización pasa por `resolveTab`, que es TOTAL: cualquier alias o
  // valor desconocido cae en una pestaña que existe. Antes un `?tab=` fuera de
  // la lista dejaba a Radix sin contenido que montar.
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
  // Status leído por id en el efecto de restauración. Hasta ahora se calculaba y
  // se tiraba; se conserva porque es el ÚNICO dato fiable cuando la cita no está
  // en la lista (capada a 100 y sin canceladas).
  const [verifiedStatus, setVerifiedStatus] = useState<
    Appointment["status"] | undefined
  >(undefined);

  // `forbidden` y `error` se consumen a propósito: sin ellos un 403 dejaba
  // `snapshot` en null y las columnas pintaban "Sin alergias registradas", es
  // decir, un fallo de permisos presentado como afirmación médica.
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

  // Editabilidad de la visita en contexto. Se calcula UNA vez aquí y se pasa a
  // `PatientOdontogramPanel` por prop: antes cada uno tenía su propia regla y
  // discrepaban justo en el caso de una cita ausente de la lista (el hook la
  // daba por activa, el panel la bloqueaba).
  const visitEditability = getVisitEditability({
    appointmentId: effectiveActiveAppointmentId,
    appointments,
    appointmentsLoading,
    verifiedStatus,
  });
  const activeAppointmentIsTerminal = isLockedVisit(visitEditability);

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

    // Se invalida antes de pedirlo: un status verificado de la cita ANTERIOR
    // mandaría sobre la lista y bloquearía la nueva. Mientras tanto la
    // editabilidad cae en `unknown`, que es fail-open y no flashea solo-lectura.
    setVerifiedStatus(undefined);

    let cancelled = false;

    appointmentsService
      .getAppointmentById(candidateAppointmentId)
      .then((appointment) => {
        if (cancelled) return;

        const appointmentPatientId =
          appointment.patientId ?? appointment.patient_id;
        const isSamePatient = appointmentPatientId === patientId;
        // D1: solo `in_progress` es una consulta en curso. Una cita `scheduled`
        // no tiene fila PatientVisitRecord (la crea el /start), así que dejarla
        // pasar como activa habilitaba a escribir contra un 404.
        const isActiveStatus = appointment.status === "in_progress";
        const shouldClearPersistedSession =
          persistedMatchesCurrentPatient &&
          persistedAppointmentId === candidateAppointmentId;

        if (isSamePatient) {
          setVerifiedStatus(appointment.status);
        }

        // Una cita agendada de este paciente NO arma la consulta, pero SÍ
        // conserva el contexto en la URL: es lo que permite a la ficha ofrecer
        // "Iniciar consulta de las HH:mm" en vez de dejar al usuario sin salida.
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
    setActiveTab(PATIENT_TABS.EVOLUTION);
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
    // módulo del odontograma. Al entrar por `?finalize=1` la pestaña inicial es
    // Evolución, así que sin este salto el modal se "abría" sobre una pestaña
    // que no lo monta.
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
    } catch (error) {
      notifyApiError("No se pudieron cargar las citas del paciente", error);
    } finally {
      setAppointmentsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Ambos arranques recargan la lista de citas. Sin esto, la cita recién creada
  // por `POST /appointments/start-now` (id NUEVO) no estaba en `appointments`, y
  // con la editabilidad unificada en fail-closed eso bloqueaba el odontograma de
  // la consulta que se acababa de abrir.
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

  /**
   * Inicia una cita AGENDADA desde la ficha (D1). Llama al `PATCH
   * /appointments/{id}/start` real, que pone `in_progress`, fija `actualStartAt`,
   * CREA la fila `PatientVisitRecord` y captura el snapshot "antes" del
   * odontograma. Sin este paso el compositor escribiría contra un 404.
   *
   * D2: no pide confirmación aunque la cita sea de otro doctor. El gate de
   * permiso sí es obligatorio — es una mutación — y lo aplica el llamador.
   */
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

  // Con las cuatro pestañas fijas el destino ya no depende de si hay consulta
  // activa: el odontograma tiene siempre su propia pestaña. Antes había que
  // elegir entre "workspace" y "odontograma" según el estado, y equivocarse
  // dejaba el panel en blanco.
  const handleViewOdontogram = useCallback((appointmentId: string) => {
    setHistoricAppointmentId(appointmentId);
    setActiveTab(PATIENT_TABS.ODONTOGRAM);
  }, []);

  const handleBackToCurrentOdontogram = useCallback(() => {
    setHistoricAppointmentId(undefined);
  }, []);

  /**
   * Estado del CTA de consulta de la franja de continuidad.
   *
   * Es una unión EXHAUSTIVA a propósito: la vista hace `switch` con un
   * `default: { const _never: never = cta }`, así que añadir un caso obliga a
   * pintarlo. El estado `disabled` no es cosmético — ofrecer "Nueva consulta"
   * antes de saber si el paciente ya tiene una abierta es el único agujero de un
   * clic que produce la consulta express DUPLICADA.
   *
   * El gate de permiso va aquí y no en el componente: iniciar una cita es una
   * mutación (`PATCH /appointments/{id}/start`) y sin autoridad el backend
   * responde 403, que abre el diálogo global de "Acceso Denegado".
   */
  const consultationCta = ((): ConsultationCta => {
    if (!(isAdmin || can("appointments", PermissionAction.EDIT))) {
      return { kind: "hidden" };
    }
    // Ya hay consulta en curso: manda "Finalizar" desde la cinta.
    if (visitEditability.kind === "editable") return { kind: "hidden" };
    if (appointmentsLoading) return { kind: "disabled" };

    const inProgress = appointments.find((a) => a.status === "in_progress");
    if (inProgress) {
      return { kind: "continue", appointmentId: inProgress.id };
    }

    // "Hoy" en hora LOCAL de la clínica. Con `toISOString()` esto degradaba
    // cada tarde en America/La_Paz y empujaba a crear una consulta duplicada.
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

  /**
   * Estado de la cinta de visita. PRECEDENCIA: el modo histórico GANA sobre la
   * consulta activa — si estás mirando el pasado, la cinta tiene que decir eso y
   * apagar cronómetro, autoguardado y "Finalizar", o la pantalla afirma dos
   * cosas incompatibles a la vez.
   */
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
      // El store guarda `Date.now()`; la cinta espera algo parseable.
      startedAt: consultationStartTime
        ? new Date(consultationStartTime).toISOString()
        : undefined,
      dateLabel: current ? formatVisitDate(parseLocalValue(current.date)) : "hoy",
      doctorName: current?.doctorName,
    };
  })();

  /** Próxima cita agendada, la más cercana en el futuro. */
  const nextAppointment = (() => {
    const today = localTodayInput();
    const upcoming = appointments
      .filter((a) => a.status === "scheduled" && a.date >= today)
      .sort((a, b) =>
        `${a.date} ${a.time ?? ""}`.localeCompare(`${b.date} ${b.time ?? ""}`),
      )[0];
    return upcoming
      ? {
          date: upcoming.date,
          time: upcoming.time,
          doctorName: upcoming.doctorName,
        }
      : null;
  })();

  const openStartNow = useCallback(() => {
    setShowStartNow(true);
  }, []);

  const closeStartNow = useCallback(() => {
    setShowStartNow(false);
  }, []);

  const openFinalizeModal = useCallback(() => {
    // El salto de pestaña NO es cosmético y no se puede quitar: el modal de
    // cierre se renderiza dentro de `lib/odontogram/OdontogramModule`, dos
    // niveles por debajo del panel del odontograma, y Radix DESMONTA las
    // pestañas inactivas. Pulsar "Finalizar consulta" desde cualquier otra
    // pestaña encendía el estado sin pintar nada: el botón parecía roto.
    //
    // El destino es ODONTOGRAMA (antes era el Workspace, que ya no existe).
    // Que las cuatro pestañas estén siempre montadas NO basta: lo que da la
    // garantía es el salto, porque Radix monta solo el TabsContent activo.
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
    snapshotForbidden,
    snapshotError,
    loadSnapshot,
    appointments,
    appointmentsLoading,
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
    isAdmin,
    can,
    handleStartConsultation,
    handleStartNow,
    handleStartScheduledConsultation,
    consultationCta,
    nextAppointment,
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
