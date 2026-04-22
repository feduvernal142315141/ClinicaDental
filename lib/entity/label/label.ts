/**
 * Label Entity Types
 */

export interface Label {
  id: string;
  name: string;
  color: string; // hex e.g. "#FF5733"
  description?: string;
  icon?: string;
  clinicId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
}

export interface LabelSummary {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface CreateLabelDto {
  name: string;
  color: string;
  description?: string;
  icon?: string;
}

export interface UpdateLabelDto {
  name?: string;
  color?: string;
  description?: string;
  icon?: string;
}

export interface AssignLabelsDto {
  labelIds: string[];
}
