"use client";

import { useState, useMemo, useCallback } from "react";
import type { Appointment } from "@/lib/entity/appointment/appointments";

interface UseAppointmentsColumnParams {
  appointments: Appointment[];
  onStartConsultation?: (appointmentId: string) => void;
  onNewConsultation?: () => void;
}

function parseDateParts(dateStr: string) {
  const months = [
    "ENE",
    "FEB",
    "MAR",
    "ABR",
    "MAY",
    "JUN",
    "JUL",
    "AGO",
    "SEP",
    "OCT",
    "NOV",
    "DIC",
  ];

  try {
    const date = new Date(`${dateStr}T00:00:00`);
    return {
      day: String(date.getDate()).padStart(2, "0"),
      monthShort: months[date.getMonth()],
    };
  } catch {
    return { day: "--", monthShort: "---" };
  }
}

export function useAppointmentsColumn({
  appointments,
  onStartConsultation,
  onNewConsultation,
}: UseAppointmentsColumnParams) {
  const [cancelAppointment, setCancelAppointment] =
    useState<Appointment | null>(null);
  const [rescheduleAppointment, setRescheduleAppointment] =
    useState<Appointment | null>(null);
  const [showAll, setShowAll] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const inProgress = useMemo(
    () =>
      appointments.filter(
        (appointment) => appointment.status === "in_progress",
      ),
    [appointments],
  );
  const scheduled = useMemo(
    () =>
      appointments.filter((appointment) => appointment.status === "scheduled"),
    [appointments],
  );
  const completed = useMemo(
    () =>
      appointments.filter((appointment) => appointment.status === "completed"),
    [appointments],
  );

  const todayScheduled = useMemo(
    () => scheduled.filter((appointment) => appointment.date === today),
    [scheduled, today],
  );

  const startableAppointment = inProgress[0] ?? todayScheduled[0] ?? null;

  const scheduledItems = useMemo(
    () =>
      scheduled.map((appointment) => ({
        appointment,
        ...parseDateParts(appointment.date),
      })),
    [scheduled],
  );

  const completedItems = useMemo(
    () =>
      completed.map((appointment) => ({
        appointment,
        ...parseDateParts(appointment.date),
      })),
    [completed],
  );

  const visibleCompletedItems = useMemo(
    () => completedItems.slice(0, showAll ? undefined : 5),
    [completedItems, showAll],
  );

  const handlePrimaryAction = useCallback(() => {
    if (startableAppointment && onStartConsultation) {
      onStartConsultation(startableAppointment.id);
      return;
    }

    onNewConsultation?.();
  }, [onNewConsultation, onStartConsultation, startableAppointment]);

  return {
    cancelAppointment,
    rescheduleAppointment,
    inProgress,
    scheduledItems,
    completedItems,
    visibleCompletedItems,
    showAll,
    startableAppointment,
    canTriggerPrimaryAction:
      !!startableAppointment || !!onNewConsultation || !!onStartConsultation,
    openCancelAppointment: setCancelAppointment,
    closeCancelAppointment: () => setCancelAppointment(null),
    openRescheduleAppointment: setRescheduleAppointment,
    closeRescheduleAppointment: () => setRescheduleAppointment(null),
    showAllCompleted: () => setShowAll(true),
    handlePrimaryAction,
  };
}
