import { serviceGet, servicePut, servicePatch } from "../baseService";
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
  (error as any).status = status;
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

  const errorMessage =
    (response?.data as any)?.message ||
    (response?.data as any)?.details ||
    "Error al actualizar historia médica";
  throw new Error(errorMessage);
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

  const errorMessage =
    (response?.data as any)?.message ||
    (response?.data as any)?.details ||
    "Error al validar historia médica";
  throw new Error(errorMessage);
}

export const clinicalHistoryService = {
  getSnapshot,
  updateMedicalHistory,
  validateMedicalHistory,
};
