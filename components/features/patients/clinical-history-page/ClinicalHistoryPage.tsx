"use client";

import { Stethoscope, ClipboardList } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/primitives/shadcn/tabs";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { PatientInfoColumn } from "./PatientInfoColumn";
import { MedicalAntecedentsColumn } from "./MedicalAntecedentsColumn";
import { VisitTimeline } from "./VisitTimeline";
import { ActiveConsultationNotes } from "./ActiveConsultationNotes";
import { VisitHistoryDrawer } from "./VisitHistoryDrawer";
import { MedicalHistoryDrawer } from "@/components/features/clinical-history/sections/MedicalHistoryDrawer";
import { EditPatientDrawer } from "./EditPatientDrawer";
import { StartConsultationNowModal } from "@/components/features/appointments/StartConsultationNowModal";
import { PatientOdontogramPanel } from "@/components/features/patients/detail/PatientOdontogramPanel";
import { ActiveConsultationBanner } from "@/components/features/clinical-history/ActiveConsultationBanner";
import {
  useClinicalHistoryPage,
  type UseClinicalHistoryPageParams,
} from "@/lib/hooks/patients/clinical-history-page/use-clinical-history-page";

type ClinicalHistoryPageProps = UseClinicalHistoryPageParams;

export function ClinicalHistoryPage({
  patientId,
  initialTab = "historia-clinica",
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
    handleStartConsultation,
    handleStartNow,
    handleViewVisitHistory,
    handleSaveMedicalHistory,
    handleBackToCurrentOdontogram,
    handleFinalizeSuccess,
    handleEditPatientSuccess,
    handleViewVisitOdontogram,
    handleSelectHistoricVisit,
  } = useClinicalHistoryPage({
    patientId,
    initialTab,
    activeAppointmentId,
    openFinalizeOnLoad,
  });

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

  return (
    <div className="flex flex-col h-full">
      {isCurrentlyActiveConsultation && (
        <ActiveConsultationBanner onFinalizeClick={openFinalizeModal} />
      )}

      {!isCurrentlyActiveConsultation && (
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{patient.name}</h1>
            <p className="text-sm text-muted-foreground">
              Historia clínica del paciente
            </p>
          </div>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col flex-1 min-h-0"
      >
        <TabsList className="shrink-0 self-start">
          {isCurrentlyActiveConsultation && (
            <TabsTrigger value="workspace">
              <Stethoscope className="h-4 w-4" />
              Workspace
            </TabsTrigger>
          )}
          <TabsTrigger value="historia-clinica">
            <ClipboardList className="h-4 w-4" />
            {isCurrentlyActiveConsultation
              ? "Historia Clínica (Lectura)"
              : "Historia Clínica"}
          </TabsTrigger>
          {!isCurrentlyActiveConsultation && (
            <TabsTrigger value="odontograma">
              <Stethoscope className="h-4 w-4" />
              Odontograma
            </TabsTrigger>
          )}
        </TabsList>

        {isCurrentlyActiveConsultation && (
          <TabsContent
            value="workspace"
            className="flex-1 min-h-0 mt-2 overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] lg:grid-rows-1 gap-6 h-full min-h-0">
              <ActiveConsultationNotes
                patientId={patientId}
                activeAppointmentId={effectiveActiveAppointmentId!}
                canEdit={canEditMedicalHistory}
              />
              <PatientOdontogramPanel
                patient={patient}
                activeAppointmentId={effectiveActiveAppointmentId}
                historicAppointmentId={historicAppointmentId}
                onClearHistoric={handleBackToCurrentOdontogram}
                appointments={appointments}
                appointmentsLoading={appointmentsLoading}
                onSelectHistoricVisit={handleSelectHistoricVisit}
                finalizeOpen={isFinalizeModalOpen}
                onFinalizeClose={closeFinalizeModal}
                onFinalizeSuccess={handleFinalizeSuccess}
              />
            </div>
          </TabsContent>
        )}

        <TabsContent
          value="historia-clinica"
          className="flex-1 min-h-0 mt-2 overflow-auto"
        >
          {/* ── Etiquetas de sección — ayudan a escanear el layout ────── */}
          <div className="grid grid-cols-[280px_1fr_300px] gap-6 pb-2 shrink-0 px-0.5">
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest select-none">
              Perfil · Adjuntos
            </p>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest select-none pl-4">
              Anamnesis · Plan de Tratamiento · Evolución / Notas
            </p>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest select-none pl-3">
              Cronología de visitas
            </p>
          </div>

          {/* ── Layout de 3 columnas ─────────────────────────────────── */}
          <div className="overflow-x-auto grid gap-6 h-full min-h-0 grid-cols-[280px_1fr_300px]">
            {/* Columna 1: Perfil + Adjuntos */}
            {snapshotLoading ? (
              <div className="flex h-40 items-center justify-center">
                <LoadingSpinner size="md" message="Cargando datos..." />
              </div>
            ) : (
              <PatientInfoColumn
                patient={patient}
                medicalHistory={snapshot?.medicalHistory ?? null}
                patientHeader={snapshot?.patientHeader ?? null}
                canUpload={canManageAttachments}
                canDelete={canManageAttachments}
                canEdit={canEditPatient}
                activeAppointmentId={effectiveActiveAppointmentId}
                onEditPatient={openEditPatient}
                onEditMedicalHistory={
                  canEditMedicalHistory ? openMedicalHistoryDrawer : undefined
                }
              />
            )}

            {/* Columna 2: Anamnesis · Plan de Tratamiento · Notas */}
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
                onViewOdontogram={() =>
                  setActiveTab(
                    isCurrentlyActiveConsultation ? "workspace" : "odontograma",
                  )
                }
              />
            )}

            {/* Columna 3: Cronología de visitas */}
            <VisitTimeline
              appointments={appointments}
              loading={appointmentsLoading}
              activeAppointmentId={effectiveActiveAppointmentId}
              onStartConsultation={handleStartConsultation}
              onNewConsultation={openStartNow}
              onViewVisitHistory={handleViewVisitHistory}
            />
          </div>
        </TabsContent>

        {!isCurrentlyActiveConsultation && (
          <TabsContent
            value="odontograma"
            className="flex-1 min-h-0 mt-2 overflow-hidden"
          >
            <PatientOdontogramPanel
              patient={patient}
              activeAppointmentId={effectiveActiveAppointmentId}
              historicAppointmentId={historicAppointmentId}
              onClearHistoric={handleBackToCurrentOdontogram}
              appointments={appointments}
              appointmentsLoading={appointmentsLoading}
              onSelectHistoricVisit={handleSelectHistoricVisit}
              onStartConsultation={openStartNow}
            />
          </TabsContent>
        )}
      </Tabs>

      <StartConsultationNowModal
        open={showStartNow}
        patientId={patientId}
        onClose={closeStartNow}
        onStarted={handleStartNow}
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

      <EditPatientDrawer
        open={editPatientOpen}
        patient={patient}
        onClose={closeEditPatient}
        onSuccess={handleEditPatientSuccess}
      />
    </div>
  );
}
