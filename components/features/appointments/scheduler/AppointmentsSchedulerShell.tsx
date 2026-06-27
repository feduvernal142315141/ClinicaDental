"use client";

import { useCallback, useEffect, useState } from "react";
import { Filter } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/primitives/shadcn/sheet";
import { useAppointmentsScheduler } from "@/lib/hooks/appointments/use-appointments-scheduler";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Appointment, SchedulerEvent } from "@/lib/entity/appointment";
import { AppointmentsSchedulerToolbar } from "./AppointmentsSchedulerToolbar";
import { AppointmentsSpecialistSidebar } from "./AppointmentsSpecialistSidebar";
import { AppointmentsDayGrid } from "./AppointmentsDayGrid";
import { AppointmentsWeekGrid } from "./AppointmentsWeekGrid";
import { AppointmentsMonthGrid } from "./AppointmentsMonthGrid";
import { CancelModal } from "./CancelModal";
import { RescheduleModal } from "./RescheduleModal";
import {
  getTemporalCategory,
  type AppointmentTemporalCategory,
} from "@/lib/utils/appointment-utils";

interface AppointmentsSchedulerShellProps {
  canCreate: boolean;
  onNewAppointment: () => void;
  onNewAppointmentPrefilled: (params: {
    doctorId: string;
    date: string;
    time: string;
    patientId?: string;
  }) => void;
  onViewDetail: (appointmentId: string) => void;
  onEditAppointment: (appointmentId: string) => void;
  onStartConsultation: (appointment: Appointment) => void;
  startConsultationLoading?: boolean;
}

const MOBILE_BREAKPOINT = 768;

export function AppointmentsSchedulerShell({
  canCreate,
  onNewAppointment,
  onNewAppointmentPrefilled,
  onViewDetail,
  onEditAppointment,
  onStartConsultation,
  startConsultationLoading,
}: AppointmentsSchedulerShellProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);

  // Detect mobile
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    setIsMobile(mql.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const scheduler = useAppointmentsScheduler({
    defaultViewMode: isMobile ? "day" : "week",
  });

  // ---- Action handlers for quick actions ------------------------------------
  const handleViewDetail = useCallback(
    (appointment: Appointment) => {
      onViewDetail(appointment.id);
    },
    [onViewDetail],
  );

  const handleReschedule = useCallback(
    (appointment: Appointment) => {
      setRescheduleTarget(appointment);
    },
    [],
  );


  const handleStartConsultation = useCallback(
    (appointment: Appointment) => {
      onStartConsultation(appointment);
    },
    [onStartConsultation],
  );

  const handleCancel = useCallback(
    (appointment: Appointment) => {
      setCancelTarget(appointment);
    },
    [],
  );

  const handleComplete = useCallback(
    (appointment: Appointment) => {
      scheduler.completeAppointment(appointment);
    },
    [scheduler],
  );

  const handleMonthDayClick = useCallback(
    (date: string) => {
      scheduler.goToDate(date);
      scheduler.setViewMode("day");
    },
    [scheduler],
  );

  // Clic en hueco vacío → crear cita prefilled. Si hay exactamente un
  // especialista visible, se prefija ese doctor; si no, sólo fecha/hora.
  const handleCreateSlot = useCallback(
    (date: string, time: string) => {
      const visible = Array.from(scheduler.visibleDoctorIds);
      const doctorId = visible.length === 1 ? visible[0] : "";
      onNewAppointmentPrefilled({ doctorId, date, time });
    },
    [scheduler.visibleDoctorIds, onNewAppointmentPrefilled],
  );

  // Arrastrar-para-reagendar (optimista + rollback + guarda 409, en el hook).
  const handleMoveEvent = useCallback(
    (appointment: Appointment, newDate: string, newTime: string) => {
      scheduler.rescheduleByDrag(appointment, newDate, newTime);
    },
    [scheduler],
  );

  // Invalidate cache after modal success
  const handleModalSuccess = useCallback(() => {
    scheduler.invalidateCache();
  }, [scheduler]);

  // ---- Sidebar content (shared between inline and mobile Sheet) -----------
  const sidebarContent = (
    <AppointmentsSpecialistSidebar
      doctors={scheduler.doctors}
      visibleDoctorIds={scheduler.visibleDoctorIds}
      onToggleDoctor={scheduler.toggleDoctor}
      onSelectAll={scheduler.selectAllDoctors}
      onClearAll={scheduler.clearAllDoctors}
      onNewAppointment={onNewAppointment}
      canCreate={canCreate}
      loading={scheduler.doctorsLoading}
      selectedLabelIds={scheduler.selectedLabelIds}
      onToggleLabel={scheduler.toggleLabel}
      onClearLabels={scheduler.clearLabels}
    />
  );

  // ---- Active view ----------------------------------------------------------
  const renderView = () => {
    switch (scheduler.viewMode) {
      case "day": {
        const dayEvents =
          scheduler.eventsByDay.get(scheduler.currentDate) ?? [];
        return (
          <AppointmentsDayGrid
            date={scheduler.currentDate}
            events={dayEvents}
            startHour={scheduler.startHour}
            endHour={scheduler.endHour}
            slotHeight={scheduler.slotHeight}
            loading={scheduler.loading}
            onViewDetail={handleViewDetail}
            onStartConsultation={handleStartConsultation}
            onReschedule={canCreate ? handleReschedule : undefined}
            onCancel={canCreate ? handleCancel : undefined}
            onComplete={canCreate ? handleComplete : undefined}
            onCreateSlot={canCreate ? handleCreateSlot : undefined}
            onMoveEvent={canCreate ? handleMoveEvent : undefined}
            startConsultationLoading={startConsultationLoading}
          />
        );
      }
      case "week":
        return (
          <AppointmentsWeekGrid
            weekDays={scheduler.weekDays}
            eventsByDay={scheduler.eventsByDay}
            startHour={scheduler.startHour}
            endHour={scheduler.endHour}
            slotHeight={scheduler.slotHeight}
            loading={scheduler.loading}
            onViewDetail={handleViewDetail}
            onStartConsultation={handleStartConsultation}
            onReschedule={canCreate ? handleReschedule : undefined}
            onCancel={canCreate ? handleCancel : undefined}
            onComplete={canCreate ? handleComplete : undefined}
            onCreateSlot={canCreate ? handleCreateSlot : undefined}
            onMoveEvent={canCreate ? handleMoveEvent : undefined}
            startConsultationLoading={startConsultationLoading}
          />
        );
      case "month":
        return (
          <AppointmentsMonthGrid
            eventsByDay={scheduler.eventsByDay}
            currentDate={scheduler.currentDate}
            loading={scheduler.loading}
            onDayClick={handleMonthDayClick}
            onViewDetail={handleViewDetail}
            onStartConsultation={handleStartConsultation}
            onReschedule={canCreate ? handleReschedule : undefined}
            onCancel={canCreate ? handleCancel : undefined}
            onComplete={canCreate ? handleComplete : undefined}
            startConsultationLoading={startConsultationLoading}
          />
        );
    }
  };

  return (
    <div>
      {/* Modales de cancelar y reagendar */}
      {cancelTarget && (
        <CancelModal
          appointment={{
            id: cancelTarget.id,
            patientName: cancelTarget.patientName,
            scheduledStartAt: cancelTarget.scheduledStartAt,
            scheduledEndAt: cancelTarget.scheduledEndAt,
            date: cancelTarget.date,
            time: cancelTarget.time,
            status: cancelTarget.status,
          }}
          isOpen={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          onSuccess={handleModalSuccess}
        />
      )}
      {rescheduleTarget && (
        <RescheduleModal
          appointment={{
            id: rescheduleTarget.id,
            doctorId: rescheduleTarget.doctorId,
            doctor_id: rescheduleTarget.doctor_id,
            patientName: rescheduleTarget.patientName,
            doctorName: rescheduleTarget.doctorName,
            serviceName: rescheduleTarget.serviceName,
            scheduledStartAt: rescheduleTarget.scheduledStartAt,
            scheduledEndAt: rescheduleTarget.scheduledEndAt,
            date: rescheduleTarget.date,
            time: rescheduleTarget.time,
            duration: rescheduleTarget.duration,
          }}
          isOpen={!!rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onSuccess={handleModalSuccess}
        />
      )}
      {/* Toolbar */}
      <AppointmentsSchedulerToolbar
        viewMode={scheduler.viewMode}
        onViewModeChange={scheduler.setViewMode}
        currentDate={scheduler.currentDate}
        dateRange={scheduler.dateRange}
        onPrev={scheduler.goPrev}
        onNext={scheduler.goNext}
        onToday={scheduler.goToday}
        onDateChange={scheduler.goToDate}
      />

      {/* Main layout */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: isMobile ? "1fr" : "260px 1fr" }}
      >
        {/* Sidebar — desktop only */}
        {!isMobile && (
          <div className="max-h-[calc(100vh-240px)] overflow-y-auto border-r border-hairline pr-4">
            {sidebarContent}
          </div>
        )}

        {/* Agenda view */}
        <div className="min-w-0">{renderView()}</div>
      </div>

      {/* Mobile: floating filter button + Sheet */}
      {isMobile && (
        <>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Filtrar especialistas"
            className="fixed bottom-6 right-6 z-[100] grid h-14 w-14 place-items-center rounded-full bg-brand text-white shadow-lg transition-colors hover:bg-brand-strong"
          >
            <Filter className="h-5 w-5" />
          </button>
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetContent
              side="left"
              className="w-[280px] bg-surface p-0 sm:max-w-[280px]"
            >
              <SheetHeader className="border-b border-hairline">
                <SheetTitle className="text-ink">Especialistas</SheetTitle>
                <SheetDescription className="sr-only">
                  Filtra la agenda por especialista y etiquetas
                </SheetDescription>
              </SheetHeader>
              <div className="overflow-y-auto p-4">{sidebarContent}</div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}
