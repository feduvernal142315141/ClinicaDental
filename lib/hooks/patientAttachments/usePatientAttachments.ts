import { useState, useCallback, useEffect } from "react";
import { patientAttachmentsService } from "@/lib/services/patientAttachments/patientAttachments.service";
import { notifyApiError, extractApiErrorMessage } from "@/lib/utils/notify-error";
import type { AttachmentCategory, PatientAttachment } from "@/lib/entity/patientAttachment";

export function usePatientAttachments(patientId: string) {
  const [attachments, setAttachments] = useState<PatientAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const data = await patientAttachmentsService.getAttachments(patientId);
      setAttachments(data);
    } catch (err) {
      notifyApiError("No se pudieron cargar los archivos del paciente", err);
      setError(extractApiErrorMessage(err) ?? "Error al cargar archivos");
      setForbidden((err as { status?: number } | null)?.status === 403);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  const upload = useCallback(
    async (file: File, category: AttachmentCategory, notes?: string, appointmentId?: string) => {
      setUploading(true);
      try {
        await patientAttachmentsService.uploadAttachment(patientId, file, category, notes, appointmentId);
        await load();
      } finally {
        setUploading(false);
      }
    },
    [patientId, load],
  );

  const remove = useCallback(
    async (attachmentId: string) => {
      await patientAttachmentsService.deleteAttachment(patientId, attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    },
    [patientId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return { attachments, loading, uploading, error, forbidden, load, upload, remove };
}
