"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useVisitRecord } from "@/lib/hooks/clinical-history";
import { useOdontogramByVisit } from "@/lib/hooks/odontogram/useOdontogramByVisit";
import { clinicalHistoryService } from "@/lib/services/clinical-history";
import type { Appointment } from "@/lib/entity/appointment/appointments";
import type { PatientAttachment } from "@/lib/entity/patientAttachment";

interface UseVisitHistoryDrawerParams {
  open: boolean;
  patientId: string;
  appointment: Appointment | null;
  onClose: () => void;
  onViewOdontogram?: (appointmentId: string) => void;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";

  try {
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function useVisitHistoryDrawer({
  open,
  patientId,
  appointment,
  onClose,
  onViewOdontogram,
}: UseVisitHistoryDrawerParams) {
  const appointmentId = appointment?.id;
  const { record, loading } = useVisitRecord(patientId, appointmentId);
  const { snapshot: odontogramSnapshot, load: loadOdontogram } =
    useOdontogramByVisit(appointmentId);
  const [attachments, setAttachments] = useState<PatientAttachment[]>([]);

  useEffect(() => {
    if (!open || !appointmentId) return;

    loadOdontogram(appointmentId);
    clinicalHistoryService
      .getVisitAttachments(patientId, appointmentId)
      .then(setAttachments)
      .catch(() => setAttachments([]));
  }, [open, appointmentId, patientId, loadOdontogram]);

  const pain = record?.currentPain;
  const hasPain =
    !!pain &&
    !!(
      pain.location ||
      pain.intensity !== undefined ||
      pain.type ||
      pain.duration
    );

  const formattedVisitDate = useMemo(
    () => formatDate(appointment?.date),
    [appointment?.date],
  );

  const handleViewOdontogram = useCallback(() => {
    onClose();
    if (onViewOdontogram && appointmentId) {
      onViewOdontogram(appointmentId);
    }
  }, [appointmentId, onClose, onViewOdontogram]);

  return {
    appointmentId,
    record,
    loading,
    attachments,
    pain,
    hasPain,
    formattedVisitDate,
    hasOdontogram: !!odontogramSnapshot,
    handleViewOdontogram,
  };
}
