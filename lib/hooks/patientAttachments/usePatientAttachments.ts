import { useState, useCallback, useEffect } from "react";
import { patientAttachmentsService } from "@/lib/services/patientAttachments/patientAttachments.service";
import { notifyApiError, extractApiErrorMessage } from "@/lib/utils/notify-error";
import type { AttachmentCategory, PatientAttachment } from "@/lib/entity/patientAttachment";

export function usePatientAttachments(patientId: string) {
  const [attachments, setAttachments] = useState<PatientAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await patientAttachmentsService.getAttachments(patientId);
      setAttachments(data);
    } catch (err) {
      // Sin rethrow: upload() hace `await load()` tras subir con éxito y no debe
      // convertir un fallo de recarga en un falso "no se pudo subir".
      notifyApiError("No se pudieron cargar los archivos del paciente", err);
      setError(extractApiErrorMessage(err) ?? "Error al cargar archivos");
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

  return { attachments, loading, uploading, error, load, upload, remove };
}
