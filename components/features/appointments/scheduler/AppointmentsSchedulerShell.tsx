"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Drawer } from "antd";
import { FilterOutlined } from "@ant-design/icons";
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
}

const MOBILE_BREAKPOINT = 768;

export function AppointmentsSchedulerShell({
  canCreate,
  onNewAppointment,
  onNewAppointmentPrefilled,
  onViewDetail,
  onEditAppointment,
  onStartConsultation,
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

  // Invalidate cache after modal success
  const handleModalSuccess = useCallback(() => {
    scheduler.invalidateCache();
  }, [scheduler]);

  // ---- Sidebar content (shared between inline and Drawer) ------------------
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
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "260px 1fr",
          gap: 16,
        }}
      >
        {/* Sidebar — desktop only */}
        {!isMobile && (
          <div
            style={{
              borderRight: "1px solid #f0f0f0",
              paddingRight: 16,
              maxHeight: "calc(100vh - 240px)",
              overflowY: "auto",
            }}
          >
            {sidebarContent}
          </div>
        )}

        {/* Agenda view */}
        <div style={{ minWidth: 0 }}>{renderView()}</div>
      </div>

      {/* Mobile: floating filter button + Drawer */}
      {isMobile && (
        <>
          <Button
            type="primary"
            shape="circle"
            icon={<FilterOutlined />}
            size="large"
            onClick={() => setDrawerOpen(true)}
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              zIndex: 100,
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
          />
          <Drawer
            title="Especialistas"
            placement="left"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            width={280}
            styles={{ body: { padding: 16 } }}
          >
            {sidebarContent}
          </Drawer>
        </>
      )}
    </div>
  );
}
