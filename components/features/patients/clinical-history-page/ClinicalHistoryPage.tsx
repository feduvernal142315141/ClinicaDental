"use client";

import { Stethoscope, ClipboardList, ListChecks, Images } from "lucide-react";
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
import { PatientTreatmentPlanPanel } from "@/components/features/patients/treatment-plan/PatientTreatmentPlanPanel";
import {
  useClinicalHistoryPage,
  type UseClinicalHistoryPageParams,
} from "@/lib/hooks/patients/clinical-history-page/use-clinical-history-page";
import { PATIENT_TABS } from "@/lib/hooks/patients/clinical-history-page/patient-tabs";
import { PatientRecordHeader, VisitRibbon } from "./header";
import { VisitAutosaveIndicator } from "./header/VisitAutosaveIndicator";
import { EvolutionColumn } from "./evolution";
import { ContinuityStrip } from "./continuity";

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
    handleStartScheduledConsultation,
    consultationCta,
    nextAppointment,
    visitRibbonState,
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
    // El padding lo pone la vista, no el `<main>`: esta ruta se pinta a sangre
    // (`AppShell bleed`) para que la cabecera del paciente ocupe el ancho
    // completo. `h-full` y la cadena `flex flex-col` se conservan intactas —
    // son el eslabón de ADR-36 que mantiene UNA sola superficie con scroll.
    <div className="flex flex-col h-full p-4 lg:p-6">
      {/* ── Cabecera contextual ──────────────────────────────────────────
          Sustituye al <h1> genérico, que además solo existía en la rama sin
          consulta activa: durante una consulta la pantalla no decía de quién
          era la historia que se estaba escribiendo. */}
      <PatientRecordHeader
        name={patient.name}
        photoUrl={patient.photoUrl}
        age={snapshot?.patientHeader?.age}
        gender={snapshot?.patientHeader?.gender}
        birthDate={patient.dateOfBirth}
        phone={snapshot?.patientHeader?.phone ?? patient.phone}
        email={snapshot?.patientHeader?.email ?? patient.email}
        alerts={snapshotForbidden ? [] : snapshot?.patientHeader?.alerts}
        canEdit={canEditPatient}
        onEdit={openEditPatient}
      />

      {/* ── Cinta de visita ──────────────────────────────────────────────
          Hermana del <Tabs>, nunca dentro de una pestaña: el estado de la
          consulta tiene que verse desde las cuatro. Devuelve null cuando no hay
          ni consulta activa ni modo histórico, así que se monta sin condicional.
          El indicador de autoguardado va en su slot porque ese componente es
          quien resetea el store al desmontar. */}
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
        className="flex flex-col flex-1 min-h-0"
      >
        {/* ── Franja de pestañas con scroll horizontal propio ──────────────
            El `TabsList` es `inline-flex` y no encoge: con cuatro pestañas con
            icono la última se salía del viewport en pantallas estrechas y no
            había forma de alcanzarla, porque el desbordamiento se recortaba
            contra el layout. El contenedor NO necesita `tabindex`: sus hijos son
            focusables, y tanto el tabulador como las flechas de Radix desplazan
            el scroll hasta la pestaña enfocada (WCAG 2.2 — 2.1.1). `overflow-x`
            solo: el ring de foco cabe dentro del `p-1` del propio `TabsList`, y
            por eso ese `p-1` no se puede quitar al pasar a subrayadas.

            LAS CUATRO SON FIJAS. Antes Workspace y Odontograma eran mutuamente
            excluyentes según `isCurrentlyActiveConsultation`, así que ese
            booleano decidía qué se MONTA: cualquier transición desmontaba y
            remontaba el odontograma, con refetch completo y pérdida del
            autoguardado con debounce de 300 ms. Ahora es cosmético. */}
        <div className="shrink-0 overflow-x-auto">
          <TabsList className="w-max">
            <TabsTrigger value={PATIENT_TABS.EVOLUTION}>
              <ClipboardList className="h-4 w-4" />
              Evolución Clínica
            </TabsTrigger>
            <TabsTrigger value={PATIENT_TABS.ODONTOGRAM}>
              <Stethoscope className="h-4 w-4" />
              Odontograma
            </TabsTrigger>
            {canViewTreatmentPlan && (
              <TabsTrigger value={PATIENT_TABS.TREATMENT_PLAN}>
                <ListChecks className="h-4 w-4" />
                Plan de Tratamiento
              </TabsTrigger>
            )}
            <TabsTrigger value={PATIENT_TABS.FILES}>
              <Images className="h-4 w-4" />
              Imágenes y Archivos
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Evolución Clínica ────────────────────────────────────────────
            Cuerpo a dos columnas 65/35 declarado en `xl` (1280px) y NO antes:
            a 1024 en apaisado el ancho real del área de contenido es ~720px, y
            un 35% daría 240px, insuficiente para la rejilla de antecedentes.
            Por debajo de `xl` es UNA columna, y el orden del DOM ya es el bueno
            (evolución antes que antecedentes completos), así que no hace falta
            reordenar con `order-*`.
            `items-start` evita que las columnas se estiren a la altura de la más
            larga, y ninguna lleva `overflow-y-auto`: la única superficie con
            scroll es este TabsContent (ADR-36). Tres barras de scroll a la vez
            ya se pagaron una vez. */}
        <TabsContent
          value={PATIENT_TABS.EVOLUTION}
          className="flex-1 min-h-0 mt-2 overflow-auto"
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,65fr)_minmax(0,35fr)] xl:items-start">
            {/* Columna izquierda (65%) — la evolución */}
            <div className="flex flex-col gap-4">
              {/* El editor de la visita SOLO existe con una consulta en curso.
                  No hay compositor siempre presente: sin cita en contexto el
                  `PATCH` de notas responde 404 y la única alternativa que
                  funciona sin cita es la nota permanente del paciente, que es
                  OTRO registro y se reemplaza al guardar. */}
              {isCurrentlyActiveConsultation && effectiveActiveAppointmentId && (
                <ActiveConsultationNotes
                  patientId={patientId}
                  activeAppointmentId={effectiveActiveAppointmentId}
                  canEdit={canEditMedicalHistory}
                />
              )}

              <ContinuityStrip
                nextAppointment={nextAppointment}
                cta={consultationCta}
                onContinue={handleStartConsultation}
                onStartScheduled={handleStartScheduledConsultation}
                onStartNow={openStartNow}
              />

              <EvolutionColumn
                patientId={patientId}
                appointments={appointments}
                loading={appointmentsLoading}
              />
            </div>

            {/* Columna derecha (35%) — antecedentes, planes y perfil */}
            <div className="flex flex-col gap-4">
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
                  onViewOdontogram={() =>
                    setActiveTab(PATIENT_TABS.ODONTOGRAM)
                  }
                />
              )}

              <div>
                <p className={cn(SECTION_LABEL_CLASS, "select-none mb-2")}>
                  Cronología de visitas
                </p>
                <VisitTimeline
                  appointments={appointments}
                  loading={appointmentsLoading}
                  activeAppointmentId={effectiveActiveAppointmentId}
                  onStartConsultation={handleStartConsultation}
                  onNewConsultation={openStartNow}
                  onViewVisitHistory={handleViewVisitHistory}
                  onAppointmentsChanged={loadAppointments}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Odontograma ──────────────────────────────────────────────────
            Ya no está condicionado por `isCurrentlyActiveConsultation`: es una
            pestaña fija. El modal de finalizar consulta se renderiza DENTRO de
            este árbol (lib/odontogram/OdontogramModule), y Radix desmonta las
            pestañas inactivas — por eso `openFinalizeModal` salta a esta pestaña
            antes de abrirlo. No quitar ese salto. */}
        <TabsContent
          value={PATIENT_TABS.ODONTOGRAM}
          className="flex-1 min-h-0 mt-2 overflow-hidden flex flex-col"
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
        </TabsContent>

        {canViewTreatmentPlan && (
          // `overflow-hidden` aquí: el scroll lo posee el cuerpo de la tabla,
          // dentro del panel. Si esta pestaña también desbordara habría dos
          // superficies scrolleables encajadas (ADR-36).
          <TabsContent
            value={PATIENT_TABS.TREATMENT_PLAN}
            className="flex-1 min-h-0 mt-2 overflow-hidden flex flex-col"
          >
            <PatientTreatmentPlanPanel
              patientId={patientId}
              patientName={patient.name}
            />
          </TabsContent>
        )}

        {/* ── Imágenes y Archivos ──────────────────────────────────────────
            Los adjuntos vivían dentro de la columna de perfil, donde no cabían.
            `PatientInfoColumn` ya resuelve subida, descarga autenticada por Blob
            y permisos, así que la pestaña la reutiliza en vez de duplicar esa
            lógica: no hay URL pública ni miniatura, y esa parte es delicada. */}
        <TabsContent
          value={PATIENT_TABS.FILES}
          className="flex-1 min-h-0 mt-2 overflow-auto"
        >
          <div className="max-w-3xl">
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
          </div>
        </TabsContent>
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
