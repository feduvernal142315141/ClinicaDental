import apiInstance from "@/lib/services/apiConfig";
import type { AttachmentCategory, PatientAttachment } from "@/lib/entity/patientAttachment";

async function getAttachments(patientId: string): Promise<PatientAttachment[]> {
  const response = await apiInstance.get<PatientAttachment[]>(
    `/patients/${patientId}/attachments`,
  );
  return Array.isArray(response.data) ? response.data : [];
}

async function uploadAttachment(
  patientId: string,
  file: File,
  category: AttachmentCategory,
  notes?: string,
  appointmentId?: string,
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("category", category);
  if (notes) form.append("notes", notes);
  if (appointmentId) form.append("appointmentId", appointmentId);

  const response = await apiInstance.post<string>(
    `/patients/${patientId}/attachments`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
}

async function deleteAttachment(
  patientId: string,
  attachmentId: string,
): Promise<boolean> {
  await apiInstance.delete(`/patients/${patientId}/attachments/${attachmentId}`);
  return true;
}

function getDownloadUrl(patientId: string, attachmentId: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  return `${base}/patients/${patientId}/attachments/${attachmentId}/download`;
}

/**
 * Descarga el adjunto como Blob.
 *
 * Los adjuntos NO tienen URL pública: la descarga es un GET autenticado, y el
 * Bearer lo pone el interceptor de axios, no la URL. Por eso un `<a href>` o un
 * `<img src>` apuntando al backend darían 401.
 *
 * Va con ruta RELATIVA y no con `getDownloadUrl()`: esa función antepone
 * `NEXT_PUBLIC_API_URL`, y la instancia de axios ya tiene esa misma baseURL, así
 * que pasarle la absoluta la duplicaría en entornos donde la base no es el
 * origen actual.
 *
 * Vivía incrustada dentro de `AttachmentCard`, o sea HTTP dentro de un
 * componente. Al necesitarla un segundo consumidor se extrae aquí, que es donde
 * la regla de capas del repo dice que va.
 */
async function downloadAttachment(
  patientId: string,
  attachmentId: string,
): Promise<Blob> {
  const response = await apiInstance.get<Blob>(
    `/patients/${patientId}/attachments/${attachmentId}/download`,
    { responseType: "blob" },
  );
  return response.data;
}

export const patientAttachmentsService = {
  getAttachments,
  uploadAttachment,
  deleteAttachment,
  getDownloadUrl,
  downloadAttachment,
};
