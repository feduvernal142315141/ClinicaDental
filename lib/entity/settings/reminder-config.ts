export interface ClinicTemplate {
  id: string;
  clinicId?: string;
  name: string;
  body?: string;
  type?: string;
  /** Meta template category: "MARKETING" | "UTILITY" | "AUTHENTICATION" */
  category?: string;
  provider?: "META" | "TWILIO";
  metaTemplateName?: string;
  metaTemplateStatus?: "PENDING" | "APPROVED" | "REJECTED";
  metaTemplateId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReminderConfigResponse {
  id: string;
  clinicId: string;
  reminderMinutesBefore: number;
  templateId: string;
  enabled: boolean;
  template?: ClinicTemplate;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateReminderConfigRequest {
  reminderMinutesBefore: number;
  templateId: string;
}

export interface UpdateReminderConfigRequest {
  reminderMinutesBefore?: number;
  templateId?: string;
  enabled?: boolean;
}

export interface MetaTemplateSyncResult {
  imported: number;
  updated: number;
  total: number;
  message: string;
}
