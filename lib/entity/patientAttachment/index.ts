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

/**
 * Clases Tailwind/Bento para el Badge de categoría.
 * Usar con `variant="outline"` en el componente Badge.
 */
export const ATTACHMENT_CATEGORY_COLORS: Record<AttachmentCategory, string> = {
  radiografia: 'bg-brand/10 text-brand border-brand/25',
  consentimiento: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
  imagen_clinica: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/25',
  otro: 'bg-surface text-subtle border-hairline',
};
