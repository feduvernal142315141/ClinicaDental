import { serviceGet, servicePut, servicePatch } from "../baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import type {
  ClinicalHistorySnapshot,
  UpdateMedicalHistoryRequest,
} from "@/lib/entity/clinical-history";

const endpoint = "/clinical-history/patients";

/**
 * Get full clinical history snapshot for a patient
 * GET /clinical-history/patients/{patientId}/snapshot
 */
async function getSnapshot(
  patientId: string,
): Promise<ClinicalHistorySnapshot> {
  const response = await serviceGet<ClinicalHistorySnapshot>(
    `${endpoint}/${patientId}/snapshot`,
  );
  if (response?.data) {
    return response.data;
  }
  const status = response?.status;
  const msg =
    status === 403
      ? "No tiene permisos para acceder a la historia clínica"
      : "Error al cargar historia clínica";
  const error = new Error(msg);
  (error as Error & { status?: number }).status = status;
  throw error;
}

/**
 * Update medical history for a patient
 * PUT /clinical-history/patients/{patientId}/medical-history
 */
async function updateMedicalHistory(
  patientId: string,
  data: UpdateMedicalHistoryRequest,
): Promise<boolean> {
  const response = await servicePut<UpdateMedicalHistoryRequest, boolean>(
    `${endpoint}/${patientId}/medical-history`,
    data,
  );

  if (response?.status >= 200 && response?.status < 300) {
    return true;
  }


  handleServiceError(response, "Error al actualizar historia médica");
}

/**
 * Validate medical history for a patient
 * PATCH /clinical-history/patients/{patientId}/medical-history/validate
 */
async function validateMedicalHistory(patientId: string): Promise<boolean> {
  const response = await servicePatch<undefined, boolean>(
    `${endpoint}/${patientId}/medical-history/validate`,
  );

  if (response?.status >= 200 && response?.status < 300) {
    return true;
  }


  handleServiceError(response, "Error al validar historia médica");
}

/**
 * Save clinical notes for a patient
 * PATCH /clinical-history/patients/{patientId}/notes
 */
async function saveClinicalNotes(
  patientId: string,
  notes: string,
): Promise<{ updatedAt: string; updatedBy: string }> {
  const response = await servicePatch<{ notes: string }, { updatedAt: string; updatedBy: string }>(
    `${endpoint}/${patientId}/notes`,
    { notes },
  );

  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data;
  }

  handleServiceError(response, "Error al guardar notas clínicas");
}

export const clinicalHistoryService = {
  getSnapshot,
  updateMedicalHistory,
  validateMedicalHistory,
  saveClinicalNotes,
};
