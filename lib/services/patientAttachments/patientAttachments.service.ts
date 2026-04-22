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
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("category", category);
  if (notes) form.append("notes", notes);

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

export const patientAttachmentsService = {
  getAttachments,
  uploadAttachment,
  deleteAttachment,
  getDownloadUrl,
};
