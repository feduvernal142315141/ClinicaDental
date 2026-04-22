export type AttachmentCategory = 'radiografia' | 'consentimiento' | 'imagen_clinica' | 'otro';

export interface PatientAttachment {
  id: string;
  patientId: string;
  fileName: string;
  category: AttachmentCategory;
  mimeType: string;
  sizeBytes: number;
  notes?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export const ATTACHMENT_CATEGORIES: { value: AttachmentCategory; label: string }[] = [
  { value: 'radiografia', label: 'Radiografía' },
  { value: 'consentimiento', label: 'Consentimiento' },
  { value: 'imagen_clinica', label: 'Imagen clínica' },
  { value: 'otro', label: 'Otro' },
];

export const ATTACHMENT_CATEGORY_COLORS: Record<AttachmentCategory, string> = {
  radiografia: 'blue',
  consentimiento: 'green',
  imagen_clinica: 'purple',
  otro: 'default',
};
