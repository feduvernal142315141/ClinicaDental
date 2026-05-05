"use client";

import { Tabs, Spin } from "antd";
import { Stethoscope, ClipboardList } from "lucide-react";
import { PatientInfoColumn } from "./PatientInfoColumn";
import { MedicalAntecedentsColumn } from "./MedicalAntecedentsColumn";
import { AppointmentsColumn } from "./AppointmentsColumn";
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

interface ClinicalHistoryPageProps extends UseClinicalHistoryPageParams {
  basePath?: string;
}

export function ClinicalHistoryPage({
  patientId,
  initialTab = "historia-clinica",
  activeAppointmentId,
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
    historicVisitId,
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
  });

  if (patientLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" />
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

  const tabItems = [];

  if (isCurrentlyActiveConsultation) {
    tabItems.push({
      key: "workspace",
      label: (
        <span className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4" />
          Workspace
        </span>
      ),
      children: (
        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6 h-full min-h-0">
          <ActiveConsultationNotes
            patientId={patientId}
            activeAppointmentId={effectiveActiveAppointmentId!}
            canEdit={canEditMedicalHistory}
          />
          <PatientOdontogramPanel
            patient={patient}
            activeAppointmentId={effectiveActiveAppointmentId}
            historicVisitId={historicVisitId}
            onClearHistoric={handleBackToCurrentOdontogram}
            appointments={appointments}
            onStartConsultation={openStartNow}
            onSelectHistoricVisit={handleSelectHistoricVisit}
            finalizeOpen={isFinalizeModalOpen}
            onFinalizeClose={closeFinalizeModal}
            onFinalizeSuccess={handleFinalizeSuccess}
          />
        </div>
      ),
    });
  }

  tabItems.push({
    key: "historia-clinica",
    label: (
      <span className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4" />
        {isCurrentlyActiveConsultation
          ? "Historia Clínica (Lectura)"
          : "Historia Clínica"}
      </span>
    ),
    children: (
      <div className="overflow-x-auto grid gap-6 h-full min-h-0 grid-cols-[280px_1fr_300px]">
        {snapshotLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Spin />
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
          />
        )}

        {snapshotLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Spin />
          </div>
        ) : (
          <MedicalAntecedentsColumn
            medicalHistory={snapshot?.medicalHistory ?? null}
            patientHeader={snapshot?.patientHeader ?? null}
            patientId={patientId}
            activeAppointmentId={effectiveActiveAppointmentId}
            onEditClick={openMedicalHistoryDrawer}
            canEdit={canEditMedicalHistory}
          />
        )}

        <AppointmentsColumn
          appointments={appointments}
          loading={appointmentsLoading}
          patientId={patientId}
          activeAppointmentId={effectiveActiveAppointmentId}
          onStartConsultation={handleStartConsultation}
          onNewConsultation={openStartNow}
          onViewVisitHistory={handleViewVisitHistory}
        />
      </div>
    ),
  });

  if (!isCurrentlyActiveConsultation) {
    tabItems.push({
      key: "odontograma",
      label: (
        <span className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4" />
          Odontograma
        </span>
      ),
      children: (
        <PatientOdontogramPanel
          patient={patient}
          activeAppointmentId={effectiveActiveAppointmentId}
          historicVisitId={historicVisitId}
          onClearHistoric={handleBackToCurrentOdontogram}
          appointments={appointments}
          onStartConsultation={openStartNow}
          onSelectHistoricVisit={handleSelectHistoricVisit}
        />
      ),
    });
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
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        className="flex-1 flex flex-col [&_.ant-tabs-content-holder]:flex-1 [&_.ant-tabs-content]:h-full [&_.ant-tabs-tabpane]:h-full"
      />

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
