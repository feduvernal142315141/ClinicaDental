import { useState, useCallback, useEffect } from "react";
import { patientAttachmentsService } from "@/lib/services/patientAttachments/patientAttachments.service";
import { notifyApiError, extractApiErrorMessage } from "@/lib/utils/notify-error";
import type { AttachmentCategory, PatientAttachment } from "@/lib/entity/patientAttachment";

export interface UploadItem {
  file: File;
  category: AttachmentCategory;
  notes?: string;
  appointmentId?: string;
}

export type UploadOutcome =
  | { file: File; category: AttachmentCategory; ok: true }
  | { file: File; category: AttachmentCategory; ok: false; error: unknown };

const attachmentsCache = new Map<string, PatientAttachment[]>();
const inflightLoads = new Map<string, Promise<PatientAttachment[]>>();

export function clearPatientAttachmentsCache() {
  attachmentsCache.clear();
  inflightLoads.clear();
}

function fetchAttachments(patientId: string): Promise<PatientAttachment[]> {
  const existing = inflightLoads.get(patientId);
  if (existing) return existing;
  const promise = patientAttachmentsService
    .getAttachments(patientId)
    .then((data) => {
      attachmentsCache.set(patientId, data);
      return data;
    })
    .finally(() => {
      inflightLoads.delete(patientId);
    });
  inflightLoads.set(patientId, promise);
  return promise;
}

export function usePatientAttachments(patientId: string) {
  const [attachments, setAttachments] = useState<PatientAttachment[]>(
    () => attachmentsCache.get(patientId) ?? [],
  );
  const [loading, setLoading] = useState(() => !attachmentsCache.has(patientId));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const data = await fetchAttachments(patientId);
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

  const uploadMany = useCallback(
    async (items: UploadItem[]): Promise<UploadOutcome[]> => {
      setUploading(true);
      const outcomes: UploadOutcome[] = [];
      try {
        for (const item of items) {
          try {
            await patientAttachmentsService.uploadAttachment(
              patientId,
              item.file,
              item.category,
              item.notes,
              item.appointmentId,
            );
            outcomes.push({ file: item.file, category: item.category, ok: true });
          } catch (error) {
            outcomes.push({ file: item.file, category: item.category, ok: false, error });
          }
        }
        if (outcomes.some((outcome) => outcome.ok)) await load();
      } finally {
        setUploading(false);
      }
      return outcomes;
    },
    [patientId, load],
  );

  const remove = useCallback(
    async (attachmentId: string) => {
      await patientAttachmentsService.deleteAttachment(patientId, attachmentId);
      setAttachments((prev) => {
        const next = prev.filter((a) => a.id !== attachmentId);
        attachmentsCache.set(patientId, next);
        return next;
      });
    },
    [patientId],
  );

  useEffect(() => {
    const cached = attachmentsCache.get(patientId);
    if (cached) {
      setAttachments(cached);
      setLoading(false);
      setError(null);
      setForbidden(false);
      return;
    }
    void load();
  }, [patientId, load]);

  return { attachments, loading, uploading, error, forbidden, load, upload, uploadMany, remove };
}
