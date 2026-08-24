"use client";

import { Stethoscope, ClipboardList, ListChecks } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/primitives/shadcn/tabs";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { cn } from "@/lib/utils/utils";
import { SECTION_LABEL_CLASS } from "./section-label";
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
import { PatientTreatmentPlanPanel } from "@/components/features/patients/treatment-plan/PatientTreatmentPlanPanel";
import {
  useClinicalHistoryPage,
  TREATMENT_PLAN_TAB,
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
    canViewTreatmentPlan,
    handleStartConsultation,
    handleStartNow,
    handleViewVisitHistory,
    handleSaveMedicalHistory,
    handleBackToCurrentOdontogram,
    handleFinalizeSuccess,
    handleEditPatientSuccess,
    handlePatientPhotoChange,
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
        {/* ── Franja de pestañas con scroll horizontal propio ──────────────
            El `TabsList` es `inline-flex` y no encoge: con tres pestañas con
            icono (y rótulos largos como "Historia Clínica (Lectura)") la última
            se salía del viewport en pantallas estrechas y no había forma de
            alcanzarla, porque el desbordamiento se recortaba contra el layout.
            El contenedor NO necesita `tabindex`: sus hijos son focusables, y
            tanto el tabulador como las flechas de Radix desplazan el scroll
            hasta la pestaña enfocada (WCAG 2.2 — 2.1.1). `overflow-x` solo:
            el ring de foco cabe dentro del `p-1` del propio `TabsList`. */}
        <div className="shrink-0 overflow-x-auto">
          <TabsList className="w-max">
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
            {canViewTreatmentPlan && (
              <TabsTrigger value={TREATMENT_PLAN_TAB}>
                <ListChecks className="h-4 w-4" />
                Plan de Tratamiento
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {isCurrentlyActiveConsultation && (
          <TabsContent
            value="workspace"
            className="flex-1 min-h-0 mt-2 overflow-hidden flex flex-col"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] lg:grid-rows-1 gap-6 flex-1 min-h-0 h-full">
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
          {/* ── Etiquetas de sección — ayudan a escanear el layout ──────
              Solo desde `lg`: son cabeceras DE COLUMNA, y en una sola columna
              quedarían separadas del bloque que rotulan. Cada columna trae sus
              propios títulos. */}
          <div className="hidden lg:grid grid-cols-[280px_1fr_300px] gap-6 pb-2 shrink-0 px-0.5">
            <p className={cn(SECTION_LABEL_CLASS, "select-none")}>
              Perfil · Adjuntos
            </p>
            {/* "Planes del odontograma" — el rótulo tiene que decir lo que hay
                en la columna, y lo que hay son los documentos de plan con su
                avance, no las líneas presupuestadas de la pestaña
                "Plan de Tratamiento". */}
            <p className={cn(SECTION_LABEL_CLASS, "select-none pl-4")}>
              Anamnesis · Planes del odontograma · Evolución / Notas
            </p>
            <p className={cn(SECTION_LABEL_CLASS, "select-none pl-3")}>
              Cronología de visitas
            </p>
          </div>

          {/* ── Layout de 3 columnas ─────────────────────────────────────
              Las tres columnas son FIJAS (280 / 1fr / 300) solo desde `lg`.
              Sin ese corte, en pantallas estrechas la del medio se estrujaba a
              unos pocos píxeles y el navegador partía el texto letra por letra
              en vertical. Mismo patrón que ya usa la pestaña Workspace de este
              archivo (`grid-cols-1 lg:grid-cols-[350px_1fr]`).
              El grid NO impone alto: antes cada columna era `h-full` con su
              propio `overflow-y-auto` y la vista mostraba TRES barras de scroll
              a la vez. Ahora las columnas crecen con su contenido, `items-start`
              evita que se estiren a la altura de la más larga, y la ÚNICA
              superficie que scrollea es este TabsContent. */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr_300px] lg:items-start">
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
                onPhotoChange={
                  canEditPatient ? handlePatientPhotoChange : undefined
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
            className="flex-1 min-h-0 mt-2 overflow-hidden flex flex-col"
          >
            <PatientOdontogramPanel
              patient={patient}
              activeAppointmentId={effectiveActiveAppointmentId}
              historicAppointmentId={historicAppointmentId}
              onClearHistoric={handleBackToCurrentOdontogram}
              appointments={appointments}
              appointmentsLoading={appointmentsLoading}
              onSelectHistoricVisit={handleSelectHistoricVisit}
            />
          </TabsContent>
        )}

        {canViewTreatmentPlan && (
          // `overflow-hidden` aquí: el scroll lo posee el cuerpo de la tabla,
          // dentro del panel. Si esta pestaña también desbordara habría dos
          // superficies scrolleables encajadas (ADR-36).
          <TabsContent
            value={TREATMENT_PLAN_TAB}
            className="flex-1 min-h-0 mt-2 overflow-hidden flex flex-col"
          >
            <PatientTreatmentPlanPanel
              patientId={patientId}
              patientName={patient.name}
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
