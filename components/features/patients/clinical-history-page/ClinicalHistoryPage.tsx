"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clinicalHistoryService } from "@/lib/services/clinical-history";
import type { ClinicalHistoryAlert } from "@/lib/entity/clinical-history";

import {
  Stethoscope,
  ClipboardList,
  ListChecks,
  Images,
  Loader2,
  Play,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/primitives/shadcn/tabs";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { cn } from "@/lib/utils/utils";
import { MedicalAntecedentsColumn } from "./MedicalAntecedentsColumn";
import { ActiveConsultationNotes } from "./ActiveConsultationNotes";
import { VisitHistoryDrawer } from "./VisitHistoryDrawer";
import { MedicalHistoryDrawer } from "@/components/features/clinical-history/sections/MedicalHistoryDrawer";
import { EditPatientDrawer } from "./EditPatientDrawer";
import { StartConsultationNowModal } from "@/components/features/appointments/StartConsultationNowModal";
import { PatientOdontogramPanel } from "@/components/features/patients/detail/PatientOdontogramPanel";
import { PatientTreatmentPlanPanel } from "@/components/features/patients/treatment-plan/PatientTreatmentPlanPanel";
import {
  useClinicalHistoryPage,
  type UseClinicalHistoryPageParams,
} from "@/lib/hooks/patients/clinical-history-page/use-clinical-history-page";
import { PATIENT_TABS } from "@/lib/hooks/patients/clinical-history-page/patient-tabs";
import { PatientRecordHeader, VisitRibbon } from "./header";
import {
  PATIENT_TABS_LIST_CLASS,
  PATIENT_TAB_TRIGGER_CLASS,
} from "./patient-tabs-style";
import { PatientImagesCard } from "./PatientImagesCard";
import { PatientAttachmentsSection } from "@/components/features/patients/attachments/PatientAttachmentsSection";
import { EvolutionComposer } from "./evolution/EvolutionComposer";
import { useEvolutionComposer, draftToHtml } from "./evolution/use-evolution-composer";
import { notifyApiError } from "@/lib/utils/notify-error";
import { notify } from "@/lib/utils/notify";
import { useAutosaveStatus } from "@/lib/store/useAutosaveStatus";
import { VisitAutosaveIndicator } from "./header/VisitAutosaveIndicator";
import { EvolutionColumn } from "./evolution";
import { EvolutionPrintDocument } from "./evolution/EvolutionPrintDocument";
import { useEvolutionPrint } from "./evolution/use-evolution-print";
import { useIsWideDesktop } from "@/lib/hooks/use-wide-desktop";

type ClinicalHistoryPageProps = UseClinicalHistoryPageParams;

export function ClinicalHistoryPage({
  patientId,
  initialTab,
  activeAppointmentId,
  openFinalizeOnLoad,
}: ClinicalHistoryPageProps) {
  const {
    patient,
    patientLoading,
    snapshot,
    snapshotLoading,
    appointments,
    appointmentsLoading,
    appointmentsError,
    visitEditability,
    snapshotForbidden,
    snapshotError,
    loadSnapshot,
    loadAppointments,
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
    canViewTreatmentPlan,
    canViewClinicalHistory,
    handleStartNow,
    handleStartConsultation,
    handleStartScheduledConsultation,
    consultationCta,
    handleSaveMedicalHistory,
    handleBackToCurrentOdontogram,
    handleFinalizeSuccess,
    handleEditPatientSuccess,
    handleViewVisitHistory,
    handleViewVisitOdontogram,
    handleSelectHistoricVisit,
    visitRibbonState,
  } = useClinicalHistoryPage({
    patientId,
    initialTab,
    activeAppointmentId,
    openFinalizeOnLoad,
  });

  const isWideDesktop = useIsWideDesktop();
  const showConsultationPanel = isCurrentlyActiveConsultation;
  const showSideEvolution = isWideDesktop && isCurrentlyActiveConsultation;

  const [lastSaved, setLastSaved] = useState<{
    appointmentId?: string;
    token: number;
  }>({ token: 0 });

  const evolutionPrint = useEvolutionPrint({
    patientId,
    appointments,
    invalidateAppointmentId: lastSaved.appointmentId,
    invalidateToken: lastSaved.token,
    onAfterPrint: () => setPrintScope("all"),
  });

  const appointmentsUnknown = !!appointmentsError && appointments.length === 0;

  const composer = useEvolutionComposer({
    appointments,
    loading: appointmentsLoading || appointmentsUnknown,
    activeAppointmentId: effectiveActiveAppointmentId,
    canWriteClinicalHistory: canEditMedicalHistory,
  });

  const pendingComposerSaveRef = useRef<{ appointmentId: string | null } | null>(
    null,
  );
  const handleSaveEvolutionDraft = useCallback(
    async (html: string) => {
      if (composer.mode.kind !== "ready") return;
      const appointmentId = composer.mode.appointmentId;
      useAutosaveStatus.getState().markSaving();
      try {
        const current = await clinicalHistoryService.getVisitRecord(
          patientId,
          appointmentId,
        );
        const previous = current?.clinicalNotes ?? "";
        await clinicalHistoryService.saveVisitNotes(
          patientId,
          appointmentId,
          `${previous}${html}`,
        );
        composer.clearDraft();
        setLastSaved((previousSaved) => ({
          appointmentId,
          token: previousSaved.token + 1,
        }));
        useAutosaveStatus.getState().markSaved();
      } catch (error) {
        useAutosaveStatus.getState().markError();
        const status = (error as { status?: number } | undefined)?.status;
        if (status === 404 || status === 409) {
          notify.error("No se pudo guardar la evolución", {
            description:
              status === 404
                ? "Esa consulta ya no está abierta, así que no hay registro de visita donde escribir. Tu texto sigue en la caja: cópialo antes de salir."
                : "Esta consulta ya está cerrada y no admite más evolución. Tu texto sigue en la caja: cópialo antes de salir.",
          });
          return;
        }
        notifyApiError(
          "No se pudo guardar la evolución",
          error,
          "La evolución no quedó registrada. Tu texto sigue en la caja: revisa tu conexión e inténtalo de nuevo; si persiste, contacta a soporte.",
        );
      }
    },
    [composer, patientId],
  );
  useEffect(() => {
    const pending = pendingComposerSaveRef.current;
    if (!pending?.appointmentId) return;
    if (composer.mode.kind !== "ready") return;
    if (composer.mode.appointmentId !== pending.appointmentId) return;
    if (!composer.value.trim()) {
      pendingComposerSaveRef.current = null;
      return;
    }
    pendingComposerSaveRef.current = null;

    void handleSaveEvolutionDraft(draftToHtml(composer.value));
  }, [composer.mode, composer.value, handleSaveEvolutionDraft]);
  const evolutionScrollRef = useRef<HTMLDivElement | null>(null);
  const [printSelectionIds, setPrintSelectionIds] = useState<string[] | null>(
    null,
  );
  const [printScope, setPrintScope] = useState<"all" | "selection">("all");

  const [frozenSelectionIds, setFrozenSelectionIds] = useState<string[] | null>(
    null,
  );

  const [startingScheduled, setStartingScheduled] = useState(false);
  const printedAppointments = useMemo(() => {
    if (printScope !== "selection" || !frozenSelectionIds) return appointments;
    const wanted = new Set(frozenSelectionIds);
    return appointments.filter((appointment) => wanted.has(appointment.id));
  }, [appointments, printScope, frozenSelectionIds]);
  const headerAlerts = useMemo<ClinicalHistoryAlert[]>(() => {
    if (snapshotForbidden || snapshotError) return [];
    const fromBackend = snapshot?.patientHeader?.alerts ?? [];
    if (fromBackend.length > 0) return fromBackend;
    const mh = snapshot?.medicalHistory;
    if (!mh) return [];
    return [

      ...(mh.allergies ?? []).map((value, i) => ({
        id: `derived-allergy-${i}`,
        message: `Alergia: ${value}`,
        severity: "critical" as const,
      })),
      ...(mh.systemicDiseases ?? []).map((value, i) => ({
        id: `derived-disease-${i}`,
        message: value,
        severity: "warning" as const,
      })),
    ];
  }, [snapshot, snapshotForbidden, snapshotError]);
  const alertsUnknownReason: "forbidden" | "error" | undefined = snapshotForbidden
    ? "forbidden"
    : snapshotError
      ? "error"
      : undefined;
  if (patientLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" message="Cargando historia clínica..." />
      </div>
    );
  }
  if (!patient) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Paciente no encontrado
      </div>
    );
  }
  const primaryConsultationAction = (() => {
    switch (consultationCta.kind) {
      case "hidden":
        return undefined;
      case "disabled":
        return (
          <Button
            type="button"
            disabled
            aria-busy="true"
            className="rounded-xl bg-brand font-semibold text-white hover:bg-brand-strong"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Comprobando consultas…
          </Button>
        );
      case "continue": {
        const appointmentId = consultationCta.appointmentId;
        return (
          <Button
            type="button"
            onClick={() => handleStartConsultation(appointmentId)}
            className="rounded-xl bg-brand font-semibold text-white hover:bg-brand-strong"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Continuar consulta
          </Button>
        );
      }
      case "start-scheduled": {
        const { appointmentId, time } = consultationCta;
        return (
          <Button
            type="button"
            disabled={startingScheduled}
            onClick={async () => {
              if (startingScheduled) return;
              setStartingScheduled(true);
              try {
                await handleStartScheduledConsultation(appointmentId);
              } finally {
                setStartingScheduled(false);
              }
            }}
            className="rounded-xl bg-brand font-semibold text-white hover:bg-brand-strong"
          >
            {startingScheduled ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
            {time ? `Iniciar consulta de las ${time}` : "Iniciar consulta"}
          </Button>
        );
      }
      case "start":
        return (
          <Button
            type="button"
            onClick={openStartNow}
            className="rounded-xl bg-brand font-semibold text-white hover:bg-brand-strong"
          >
            <Plus className="h-4 w-4" />
            Nueva Consulta
          </Button>
        );
      default: {
        const never: never = consultationCta;
        return never;
      }
    }
  })();

  return (
    <div className="flex flex-col h-full p-4 lg:p-6">
      <PatientRecordHeader
        name={patient.name}
        photoUrl={patient.photoUrl}
        age={snapshot?.patientHeader?.age}
        gender={snapshot?.patientHeader?.gender}
        birthDate={patient.dateOfBirth}
        phone={snapshot?.patientHeader?.phone ?? patient.phone}
        email={snapshot?.patientHeader?.email ?? patient.email}
        alerts={headerAlerts}
        alertsUnknown={!!alertsUnknownReason}
        alertsUnknownReason={alertsUnknownReason}
        canEdit={canEditPatient}
        onEdit={openEditPatient}
        primaryAction={primaryConsultationAction}
      />
      <VisitRibbon
        state={visitRibbonState}
        autosaveSlot={
          visitRibbonState?.kind === "active" ? <VisitAutosaveIndicator /> : null
        }
        onFinalize={
          visitRibbonState?.kind === "active" ? openFinalizeModal : undefined
        }
        onReturnToCurrent={
          visitRibbonState?.kind === "historic"
            ? handleBackToCurrentOdontogram
            : undefined
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="mt-5 flex flex-col flex-1 min-h-0"
      >
        <div className="shrink-0 overflow-x-auto">
          <TabsList className={PATIENT_TABS_LIST_CLASS}>
            <TabsTrigger value={PATIENT_TABS.EVOLUTION} className={PATIENT_TAB_TRIGGER_CLASS}>
              <ClipboardList className="h-4 w-4" />
              Evolución Clínica
            </TabsTrigger>
            <TabsTrigger value={PATIENT_TABS.ODONTOGRAM} className={PATIENT_TAB_TRIGGER_CLASS}>
              <Stethoscope className="h-4 w-4" />
              Odontograma
            </TabsTrigger>
            {canViewTreatmentPlan && (
              <TabsTrigger value={PATIENT_TABS.TREATMENT_PLAN} className={PATIENT_TAB_TRIGGER_CLASS}>
                <ListChecks className="h-4 w-4" />
                Plan de Tratamiento
              </TabsTrigger>
            )}
            <TabsTrigger value={PATIENT_TABS.FILES} className={PATIENT_TAB_TRIGGER_CLASS}>
              <Images className="h-4 w-4" />
              Imágenes y Archivos
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent
          ref={evolutionScrollRef}
          value={PATIENT_TABS.EVOLUTION}
          className="flex-1 min-h-0 mt-5 overflow-auto"
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,65fr)_minmax(0,35fr)] xl:items-start">
            <div className="flex flex-col gap-5">
              <EvolutionComposer
                mode={composer.mode}
                value={composer.value}
                onChange={composer.setValue}
                onSave={handleSaveEvolutionDraft}
                onRequestConsultation={() => {
                  pendingComposerSaveRef.current = { appointmentId: null };
                  openStartNow();
                }}
                soapEnabled={composer.soapEnabled}
                onSoapToggle={composer.setSoapEnabled}
              />
              <EvolutionColumn
                patientId={patientId}
                appointments={appointments}
                loading={appointmentsLoading}
                appointmentsError={appointmentsError}
                canViewClinicalHistory={canViewClinicalHistory}
                scrollRootRef={evolutionScrollRef}
                invalidateAppointmentId={lastSaved.appointmentId}
                invalidateToken={lastSaved.token}
                onSelectionChange={setPrintSelectionIds}
                onPrintSelection={
                  appointmentsUnknown
                    ? undefined
                    : () => {

                        const frozen = printSelectionIds;
                        setFrozenSelectionIds(frozen);
                        setPrintScope("selection");
                        evolutionPrint.print(frozen);
                      }
                }
                onAppointmentsChanged={loadAppointments}
                onPrint={
                  appointmentsUnknown
                    ? undefined
                    : () => {
                        setPrintScope("all");
                        evolutionPrint.print();
                      }
                }
                printPreparing={evolutionPrint.preparing}
                printProgress={evolutionPrint.progress}
                onViewVisitAttachments={handleViewVisitHistory}
                onViewVisitOdontogram={(appointment) =>
                  handleSelectHistoricVisit(appointment.id)
                }
              />
            </div>
            <div className="flex flex-col gap-5">
              {snapshotLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <LoadingSpinner size="md" message="Cargando antecedentes..." />
                </div>
              ) : (
                <MedicalAntecedentsColumn
                  medicalHistory={snapshot?.medicalHistory ?? null}
                  patientHeader={snapshot?.patientHeader ?? null}
                  patientId={patientId}
                  activeAppointmentId={effectiveActiveAppointmentId}
                  onEditClick={openMedicalHistoryDrawer}
                  canEdit={canEditMedicalHistory}
                  forbidden={snapshotForbidden}
                  loadError={snapshotError}
                  onRetry={() => loadSnapshot(patientId)}
                />
              )}
              <PatientImagesCard
                patientId={patientId}
                canManage={canManageAttachments}
                activeAppointmentId={effectiveActiveAppointmentId}
                onViewAll={() => setActiveTab(PATIENT_TABS.FILES)}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent
          value={PATIENT_TABS.ODONTOGRAM}
          className="flex-1 min-h-0 mt-5 overflow-hidden flex flex-col"
        >
          <div
            className={cn(
              "flex-1 min-h-0 flex flex-col",
              showSideEvolution && "2xl:grid 2xl:grid-cols-[1fr_420px] 2xl:gap-4",
            )}
          >
            <PatientOdontogramPanel
              patient={patient}
              activeAppointmentId={effectiveActiveAppointmentId}
              historicAppointmentId={historicAppointmentId}
              onClearHistoric={handleBackToCurrentOdontogram}
              appointments={appointments}
              visitEditability={visitEditability}
              onSelectHistoricVisit={handleSelectHistoricVisit}
              finalizeOpen={isFinalizeModalOpen}
              onFinalizeClose={closeFinalizeModal}
              onFinalizeSuccess={handleFinalizeSuccess}
            />
            {showConsultationPanel && effectiveActiveAppointmentId && (
              <aside
                className={cn(
                  "min-h-0",
                  showSideEvolution && "overflow-auto",
                )}
                aria-label="Registro de la consulta en curso"
              >
                <ActiveConsultationNotes
                  patientId={patientId}
                  activeAppointmentId={effectiveActiveAppointmentId}
                  canEdit={canEditMedicalHistory}
                  onNotesSaved={() =>
                    setLastSaved((previousSaved) => ({
                      appointmentId: effectiveActiveAppointmentId,
                      token: previousSaved.token + 1,
                    }))
                  }
                />
              </aside>
            )}
          </div>
        </TabsContent>
        {canViewTreatmentPlan && (
          <TabsContent
            value={PATIENT_TABS.TREATMENT_PLAN}
            className="flex-1 min-h-0 mt-5 overflow-hidden flex flex-col"
          >
            <PatientTreatmentPlanPanel
              patientId={patientId}
              patientName={patient.name}
            />
          </TabsContent>
        )}
        <TabsContent
          value={PATIENT_TABS.FILES}
          className="flex-1 min-h-0 mt-5 overflow-auto"
        >
          <div className="w-full pb-8">
            <PatientAttachmentsSection
              patientId={patientId}
              canUpload={canManageAttachments}
              canDelete={canManageAttachments}
              activeAppointmentId={effectiveActiveAppointmentId}
            />
          </div>
        </TabsContent>
      </Tabs>
      <StartConsultationNowModal
        open={showStartNow}
        patientId={patientId}
        onClose={() => {
          pendingComposerSaveRef.current = null;
          closeStartNow();
        }}
        onStarted={(startedAppointmentId) => {
          if (pendingComposerSaveRef.current) {
            pendingComposerSaveRef.current = {
              appointmentId: startedAppointmentId,
            };
          }
          handleStartNow(startedAppointmentId);
        }}
      />
      <MedicalHistoryDrawer
        open={medicalHistoryDrawerOpen}
        onClose={closeMedicalHistoryDrawer}
        onSave={handleSaveMedicalHistory}
        medicalHistory={snapshot?.medicalHistory ?? null}
        loading={savingMedicalHistory}
      />
      <VisitHistoryDrawer
        open={!!visitHistoryAppointment}
        patientId={patientId}
        appointment={visitHistoryAppointment}
        clinicId={patient.clinicId}
        onClose={closeVisitHistory}
        onViewOdontogram={handleViewVisitOdontogram}
      />
      {!appointmentsUnknown && (
        <EvolutionPrintDocument
          patientName={patient.name}
          appointments={printedAppointments}
          totalAppointmentsCount={appointments.length}
          records={evolutionPrint.records}
          partialNote={
            printScope === "selection" && frozenSelectionIds
              ? `Documento PARCIAL: contiene ${printedAppointments.length} de ${appointments.length} consultas registradas, seleccionadas con un filtro en pantalla. No es la copia completa de la historia clínica.`
              : undefined
          }
        />
      )}
      <EditPatientDrawer
        open={editPatientOpen}
        patient={patient}
        onClose={closeEditPatient}
        onSuccess={handleEditPatientSuccess}
      />
    </div>
  );
}
