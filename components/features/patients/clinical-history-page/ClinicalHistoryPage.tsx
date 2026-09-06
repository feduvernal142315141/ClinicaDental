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

  // La columna lateral de evolución solo tiene sentido con una consulta en curso
  // y sitio real donde ponerla. Se decide en JS y no con clases `2xl:` porque una
  // columna oculta por CSS seguiría MONTANDO el editor.
  const isWideDesktop = useIsWideDesktop();
  // El panel de la consulta (motivo, dolor, CIE-10, hallazgos y su editor) vive
  // en la pestaña del Odontograma. En ≥1536px va como columna lateral; por
  // debajo, apilado. Montarlo solo en ≥1536px dejaría esos campos clínicos
  // INALCANZABLES en tablet, que es el dispositivo del sillón.
  const showConsultationPanel = isCurrentlyActiveConsultation;
  const showSideEvolution = isWideDesktop && isCurrentlyActiveConsultation;

  // Señal de "la nota de esta visita se acaba de guardar desde el editor". El
  // feed la usa para refrescar esa tarjeta: si no, mostraría el texto anterior
  // con su sello de última edición, justo debajo del editor que ya muestra el
  // nuevo — dos versiones de la misma nota clínica en la misma pantalla.
  //
  // Lleva el id de la visita ESCRITA, no el de la consulta activa: los dos
  // escritores (este compositor y `ActiveConsultationNotes`) comparten el token,
  // y cualquiera de los dos puede haber escrito en una consulta que el host no
  // tiene resuelta como activa. El token arranca en 0 —falsy— para que el
  // montaje inicial no dispare ninguna invalidación.
  //
  // Se declara AQUÍ, por encima del hook de impresión, porque ese hook lo lee en
  // render: dejarlo más abajo lo dejaría en zona muerta temporal (TDZ).
  const [lastSaved, setLastSaved] = useState<{
    appointmentId?: string;
    token: number;
  }>({ token: 0 });

  // Impresión conforme. Va ANTES de los returns condicionales de carga: es un
  // hook y no puede quedar detrás de un early-return.
  //
  // Recibe la MISMA pareja de invalidación que el feed: la caché del hook
  // sobrevive a la impresión, así que una copia sacada antes de iniciar la
  // consulta (404 → `empty`) seguiría rotulando "Sin registro de visita" en la
  // reimpresión de una consulta que ya tiene nota (ADR-61, y sobre papel que sale
  // de la clínica). `onAfterPrint` devuelve el alcance a "todo": si no, tras un
  // "Imprimir selección" la siguiente copia saldría recortada sin pedirlo.
  const evolutionPrint = useEvolutionPrint({
    patientId,
    appointments,
    invalidateAppointmentId: lastSaved.appointmentId,
    invalidateToken: lastSaved.token,
    onAfterPrint: () => setPrintScope("all"),
  });

  // "La lectura falló" NO es "no hay lista". El catch de `loadAppointments` no
  // toca `appointments`, así que un refetch caído deja INTACTA la lista anterior:
  // ahí el error no añade nada sobre lo que ya se leyó bien y la pantalla debe
  // seguir comportándose igual que antes del fallo. Solo sin lista se pierde de
  // verdad la capacidad de afirmar si hay una consulta en curso.
  const appointmentsUnknown = !!appointmentsError && appointments.length === 0;

  // Sin lista no se puede afirmar que no hay consulta en curso: el compositor
  // caería en `needs-consultation`, donde "Guardar" abre una consulta express, y
  // si el paciente ya tenía una abierta eso crea un SEGUNDO acto asistencial con
  // la evolución archivada en el encuentro equivocado.
  const composer = useEvolutionComposer({
    appointments,
    loading: appointmentsLoading || appointmentsUnknown,
    activeAppointmentId: effectiveActiveAppointmentId,
    canWriteClinicalHistory: canEditMedicalHistory,
  });

  /**
   * Guardado del compositor. ANEXA, no reemplaza: `PATCH .../visits/{id}/notes`
   * sobreescribe la columna entera y no hay historial de versiones, así que
   * mandar solo el borrador BORRARÍA lo que ya hubiera escrito el editor de la
   * consulta activa. Se lee el registro vigente y se concatena.
   */
  /**
   * Marca que el usuario pulsó "Guardar" SIN consulta abierta. El botón no
   * cambia de verbo: se abre la consulta express y, en cuanto existe, la nota se
   * guarda sola. Sin esta marca el texto se quedaba en el compositor esperando
   * un segundo clic que nadie sabía que hacía falta.
   *
   * Guarda el `appointmentId` DEVUELTO al crear esa consulta, no un booleano:
   * con una bandera suelta, cualquier `loadAppointments()` posterior que dejara
   * al compositor en `ready` persistía el texto sin un solo clic, y el destino
   * lo elegía el fallback del compositor — la primera consulta en curso del
   * array, que puede ser de OTRA persona.
   *
   * `{ appointmentId: null }` = armada, la consulta todavía se está creando.
   */
  const pendingComposerSaveRef = useRef<{ appointmentId: string | null } | null>(
    null,
  );

  const handleSaveEvolutionDraft = useCallback(
    async (html: string) => {
      if (composer.mode.kind !== "ready") return;
      const appointmentId = composer.mode.appointmentId;
      // La cinta de autoguardado es el único sitio donde el clínico ve si su
      // texto llegó. Sin marcarla, un fallo se quedaba con el "✓ Guardado"
      // verde del guardado anterior.
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
        // El id que REALMENTE se escribió viaja junto al token: invalidar por
        // `effectiveActiveAppointmentId` fallaba justo cuando la consulta la
        // abrió otro dispositivo (ese id es `undefined`) y la evolución recién
        // guardada no aparecía en el feed.
        setLastSaved((previousSaved) => ({
          appointmentId,
          token: previousSaved.token + 1,
        }));
        useAutosaveStatus.getState().markSaved();
      } catch (error) {
        useAutosaveStatus.getState().markError();
        const status = (error as { status?: number } | undefined)?.status;
        if (status === 404 || status === 409) {
          // Los dos rechazos con causa conocida. El mensaje del backend aquí es
          // técnico ("Sin registro de visita"): lo que el clínico necesita saber
          // es que su texto NO se ha perdido y que no está en la caja correcta.
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

  // Cierra el ciclo de "Guardar" sin consulta: cuando la consulta express ya
  // existe, se persiste el borrador que el usuario había escrito. Se dispara UNA
  // vez (la marca se limpia antes de guardar) para que un re-render no reenvíe
  // la nota, que con este endpoint significaría duplicarla.
  //
  // Solo escribe en la consulta que se acaba de abrir desde aquí: si el
  // compositor resolvió otra (su fallback), el texto se queda en la caja.
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
    // No lleva `.catch`: `handleSaveEvolutionDraft` ya notifica por su cuenta y
    // encadenar otro toast aquí mostraba el fallo dos veces.
    void handleSaveEvolutionDraft(draftToHtml(composer.value));
  }, [composer.mode, composer.value, handleSaveEvolutionDraft]);

  // El scroller real de la pestaña, para que el observer del feed mida contra él
  // y no contra el viewport (que queda detrás de dos ancestros que recortan).
  const evolutionScrollRef = useRef<HTMLDivElement | null>(null);

  // Selección del feed y ALCANCE del documento a imprimir. Se separan a
  // propósito: la selección cambia mientras el usuario teclea, y el alcance solo
  // en el momento de pulsar imprimir — si compartieran estado, seguir filtrando
  // con el diálogo de impresión abierto cambiaría el documento bajo los pies.
  const [printSelectionIds, setPrintSelectionIds] = useState<string[] | null>(
    null,
  );
  const [printScope, setPrintScope] = useState<"all" | "selection">("all");
  // La selección CONGELADA al pulsar imprimir. Antes el documento se componía
  // desde `printSelectionIds`, que el feed reemite en cada tecla: sólo `printScope`
  // estaba congelado, así que limpiar el filtro durante el "Preparando…" cambiaba
  // el documento bajo los pies. Desde que `print()` carga POR ALCANCE, además
  // divergirían lo cargado y lo impreso: se prepararían 3 asientos y se
  // imprimirían 40, los 37 restantes en estado "no disponible al generar".
  const [frozenSelectionIds, setFrozenSelectionIds] = useState<string[] | null>(
    null,
  );

  // Iniciar una cita agendada es una MUTACIÓN (`PATCH /appointments/{id}/start`)
  // y el botón sobrevive al `router.push`: sin este cerrojo, un doble clic
  // dispara dos arranques sobre la misma cita.
  const [startingScheduled, setStartingScheduled] = useState(false);

  const printedAppointments = useMemo(() => {
    if (printScope !== "selection" || !frozenSelectionIds) return appointments;
    const wanted = new Set(frozenSelectionIds);
    return appointments.filter((appointment) => wanted.has(appointment.id));
  }, [appointments, printScope, frozenSelectionIds]);

  /**
   * Alertas de la cabecera.
   *
   * `patientHeader.alerts` es lo que el backend YA calculó, y manda cuando trae
   * algo. Pero hoy llega vacío en pacientes que sí tienen alergias o
   * enfermedades sistémicas registradas, y una alergia que no se ve en la
   * cabecera es justo el dato que no puede faltar. Cuando eso pasa se derivan de
   * los antecedentes, que es de donde el backend las sacaría.
   *
   * NO se derivan si la historia clínica no se pudo leer (403/5xx): ahí no se
   * sabe si hay alergias, y una cabecera sin chips diría que no las hay.
   */
  const headerAlerts = useMemo<ClinicalHistoryAlert[]>(() => {
    if (snapshotForbidden || snapshotError) return [];
    const fromBackend = snapshot?.patientHeader?.alerts ?? [];
    if (fromBackend.length > 0) return fromBackend;

    const mh = snapshot?.medicalHistory;
    if (!mh) return [];
    return [
      // Con prefijo: el chip derivado decía solo "Penicilina", y sin él una
      // alergia y una enfermedad sistémica solo se distinguían por el color.
      // Las enfermedades se dejan sin prefijar: no hay evidencia de cómo las
      // frasea el backend y anteponer "Enfermedad:" sería inventar copy.
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

  /**
   * No se sabe si este paciente tiene alertas. ADITIVO: no reabre la derivación
   * de arriba —presentar como vigente un snapshot que se sabe caído sería peor—
   * sino que le da a la cabecera algo que decir en vez de callar.
   *
   * El caso frío es el que obliga a esto: si el PRIMER GET del snapshot falla,
   * la cabecera se pinta igual de poblada (nacimiento, teléfono y correo caen al
   * objeto `patient`), así que sin chips es indistinguible de un paciente sin
   * alergias.
   */
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

  /**
   * Acción principal de la cabecera. La decide el hook (`consultationCta`), no
   * esta vista: ahí viven los tres guards que este botón necesita y que se
   * habían quedado sin montar — el gate de permiso (`appointments:EDIT`), la
   * cita `in_progress` que hay que CONTINUAR en vez de duplicar, y la cita
   * agendada de hoy que hay que INICIAR en vez de crear otra express.
   *
   * Un "+ Nueva Consulta" incondicional desde recepción abría una segunda cita
   * `in_progress` y la evolución acababa archivada en el encuentro equivocado.
   */
  const primaryConsultationAction = (() => {
    switch (consultationCta.kind) {
      // Sin permiso, o con una consulta ya en curso (manda "Finalizar" desde la
      // cinta), o sin listado fiable: la acción está AUSENTE, no deshabilitada.
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
        // La unión es exhaustiva a propósito: añadir un caso obliga a pintarlo.
        const never: never = consultationCta;
        return never;
      }
    }
  })();

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
        alerts={headerAlerts}
        alertsUnknown={!!alertsUnknownReason}
        alertsUnknownReason={alertsUnknownReason}
        canEdit={canEditPatient}
        onEdit={openEditPatient}
        primaryAction={primaryConsultationAction}
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
        className="mt-5 flex flex-col flex-1 min-h-0"
      >
        {/* ── Franja de pestañas con scroll horizontal propio ──────────────
            El `TabsList` es `inline-flex` y no encoge: con cuatro pestañas con
            icono la última se salía del viewport en pantallas estrechas y no
            había forma de alcanzarla, porque el desbordamiento se recortaba
            contra el layout. El contenedor NO necesita `tabindex`: sus hijos son
            focusables, y tanto el tabulador como las flechas de Radix desplazan
            el scroll hasta la pestaña enfocada (WCAG 2.2 — 2.1.1).

            OJO con el ring de foco: al pasar a subrayadas el `TabsList` pierde
            su `p-1`, que era justo el hueco donde cabía el ring. La compensación
            vive en `PATIENT_TAB_TRIGGER_CLASS` (ring-offset contra `canvas`); si
            alguien "limpia" esas clases, el foco se recorta contra este
            contenedor `overflow-x-auto` y deja de verse.

            LAS CUATRO SON FIJAS. Antes Workspace y Odontograma eran mutuamente
            excluyentes según `isCurrentlyActiveConsultation`, así que ese
            booleano decidía qué se MONTA: cualquier transición desmontaba y
            remontaba el odontograma, con refetch completo y pérdida del
            autoguardado con debounce de 300 ms. Ahora es cosmético. */}
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
          ref={evolutionScrollRef}
          value={PATIENT_TABS.EVOLUTION}
          className="flex-1 min-h-0 mt-5 overflow-auto"
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,65fr)_minmax(0,35fr)] xl:items-start">
            {/* Columna izquierda (65%) — la evolución */}
            <div className="flex flex-col gap-5">
              {/* Compositor siempre visible, como el diseño.
                  El contrato de guardado NO es libre: `PATCH .../visits/{id}/notes`
                  responde 404 si la cita nunca se inició y 409 si está cerrada.
                  Por eso sin consulta en curso el botón cambia de verbo a
                  "Guardar e iniciar consulta" y abre una; lo que NUNCA hace es
                  caer en la nota permanente del paciente, que es OTRO registro,
                  sin fecha, que se reemplaza al guardar. */}
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
                /* Sin NINGUNA lista que imprimir (la lectura falló y no había
                   una previa) no se ofrece imprimir: el documento saldría
                   declarando "0 consultas" bajo el nombre del paciente, que es
                   una afirmación clínica falsa (ADR-61). Sin handler, la barra
                   de alcance no pinta el control. Con lista previa sí se ofrece:
                   el fallo del refetch no invalida lo ya leído.
                   El alcance viaja a `print()` porque rige también la CARGA: un
                   "Imprimir selección (2)" pedía si no el expediente entero. */
                onPrintSelection={
                  appointmentsUnknown
                    ? undefined
                    : () => {
                        // Un único snapshot alimenta las tres cosas —la carga,
                        // el cuerpo del documento y el denominador del aviso de
                        // parcialidad—, para que no puedan discrepar.
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
                /* La firma NO coincide con la del hook: la prop entrega el
                   `Appointment` entero y `handleSelectHistoricVisit` espera un
                   id. Pasarlo directo metía el objeto en el estado y salía un
                   `GET /odontograms/visit/[object Object]` → un odontograma en
                   blanco fechado en la visita. */
                onViewVisitOdontogram={(appointment) =>
                  handleSelectHistoricVisit(appointment.id)
                }
              />
            </div>

            {/* Columna derecha (35%) — antecedentes, planes y perfil */}
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

        {/* ── Odontograma ──────────────────────────────────────────────────
            Ya no está condicionado por `isCurrentlyActiveConsultation`: es una
            pestaña fija. El modal de finalizar consulta se renderiza DENTRO de
            este árbol (lib/odontogram/OdontogramModule), y Radix desmonta las
            pestañas inactivas — por eso `openFinalizeModal` salta a esta pestaña
            antes de abrirlo. No quitar ese salto. */}
        <TabsContent
          value={PATIENT_TABS.ODONTOGRAM}
          className="flex-1 min-h-0 mt-5 overflow-hidden flex flex-col"
        >
          {/* ── Odontograma, con evolución al lado en pantallas muy anchas ──
              A partir de 1536px cabe documentar y dibujar a la vez, que es el
              gesto que el odontólogo ya tiene aprendido en monitor grande. Por
              debajo son pestañas separadas: medido, a 1024 en apaisado al
              odontograma le quedaban ~346px y las caras salían a ~4px.

              GUARD DE INSTANCIA ÚNICA de TipTap: el editor vive aquí Y en la
              pestaña Evolución, pero Radix desmonta las pestañas inactivas, así
              que solo una está viva a la vez. Eso es lo que lo hace seguro — y
              por eso NO se puede añadir `forceMount` a estas dos pestañas sin
              romperlo: habría dos editores sobre la misma nota, que sobreescribe
              y no guarda versiones. */}
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
                  /* El segundo escritor del mismo token: escribe SIEMPRE en
                     `effectiveActiveAppointmentId`, así que lo declara. Si solo
                     se arreglara el compositor, el fallo de invalidación se
                     mudaría aquí. */
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
          // `overflow-hidden` aquí: el scroll lo posee el cuerpo de la tabla,
          // dentro del panel. Si esta pestaña también desbordara habría dos
          // superficies scrolleables encajadas (ADR-36).
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

        {/* ── Imágenes y Archivos ──────────────────────────────────────────
            Los adjuntos vivían dentro de la columna de perfil, donde no cabían.
            `PatientInfoColumn` ya resuelve subida, descarga autenticada por Blob
            y permisos, así que la pestaña la reutiliza en vez de duplicar esa
            lógica: no hay URL pública ni miniatura, y esa parte es delicada. */}
        <TabsContent
          value={PATIENT_TABS.FILES}
          className="flex-1 min-h-0 mt-5 overflow-auto"
        >
          {/* SOLO archivos. Antes esta pestaña reutilizaba `PatientInfoColumn`,
              que arrastraba la foto del paciente, el bloque de contacto y
              "Editar datos": nada de eso es un archivo, y el perfil ya vive en la
              cabecera y en su propia pantalla de edición. */}
          <div className="max-w-4xl">
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
        /* Cerrar sin abrir consulta DESARMA el guardado pendiente: si no, la
           evolución abandonada se persistía sola en la siguiente consulta que
           pasara por `ready`. Es seguro limpiar aquí porque el éxito NO pasa por
           `onClose` — el modal solo llama a `onStarted`. */
        onClose={() => {
          pendingComposerSaveRef.current = null;
          closeStartNow();
        }}
        onStarted={(startedAppointmentId) => {
          // La nota pendiente queda atada a ESTA consulta, no a "la primera en
          // curso que aparezca".
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

      {/* Documento imprimible. Vive fuera de las pestañas y se monta por portal:
          la cadena de scroll de ADR-36 lo recortaría a una sola página.

          NO se monta si no hay lista NINGUNA (lectura fallida y sin lista
          previa): el documento es lo único que el CSS de impresión deja visible,
          así que un Ctrl+P del navegador emitiría un papel que afirma "este
          paciente no tiene consultas registradas" cuando lo cierto es que no se
          pudieron leer. Va atado al MISMO criterio que los botones de imprimir:
          desmontarlo mientras el botón sigue ofreciéndose dejaría a
          `window.print()` sin nodo que imprimir, y saldría la pantalla. */}
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
