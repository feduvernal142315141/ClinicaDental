"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useVisitRecord } from "@/lib/hooks/clinical-history";
import { useOdontogramVisitSnapshots } from "@/lib/hooks/odontogram/useOdontogramVisitSnapshots";
import { clinicalHistoryService } from "@/lib/services/clinical-history";
import { notifyApiError } from "@/lib/utils/notify-error";
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
  const {
    snapshots: odontogramSnapshots,
    load: loadOdontogramSnapshots,
    reset: resetOdontogramSnapshots,
  } = useOdontogramVisitSnapshots();
  const [attachments, setAttachments] = useState<PatientAttachment[]>([]);

  useEffect(() => {
    if (!open || !appointmentId) {
      resetOdontogramSnapshots();
      return;
    }

    loadOdontogramSnapshots(appointmentId);
    clinicalHistoryService
      .getVisitAttachments(patientId, appointmentId)
      .then(setAttachments)
      .catch((error) => {
        notifyApiError("No se pudieron cargar los archivos adjuntos", error);
        setAttachments([]);
      });
  }, [
    open,
    appointmentId,
    patientId,
    loadOdontogramSnapshots,
    resetOdontogramSnapshots,
  ]);

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

  const hasOdontogram =
    !!odontogramSnapshots.start || !!odontogramSnapshots.finalSnapshot;

  return {
    appointmentId,
    record,
    loading,
    attachments,
    pain,
    hasPain,
    formattedVisitDate,
    odontogramSnapshots,
    hasOdontogram,
    handleViewOdontogram,
  };
}
