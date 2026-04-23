import { serviceGet, servicePut, servicePatch } from "../baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import type {
  ClinicalHistorySnapshot,
  UpdateMedicalHistoryRequest,
  PatientVisitRecord,
  UpsertVisitRecordRequest,
} from "@/lib/entity/clinical-history";
import type { PatientAttachment } from "@/lib/entity/patientAttachment";

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

/**
 * Get visit record for a specific appointment
 * GET /clinical-history/patients/{patientId}/visits/{appointmentId}
 */
async function getVisitRecord(
  patientId: string,
  appointmentId: string,
): Promise<PatientVisitRecord> {
  const response = await serviceGet<PatientVisitRecord>(
    `${endpoint}/${patientId}/visits/${appointmentId}`,
  );
  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data;
  }
  if (response?.status === 404) {
    throw Object.assign(new Error("Sin registro de visita"), { status: 404 });
  }
  handleServiceError(response, "Error al cargar registro de visita");
}

/**
 * Upsert visit record (chief complaint + current pain)
 * PUT /clinical-history/patients/{patientId}/visits/{appointmentId}
 */
async function upsertVisitRecord(
  patientId: string,
  appointmentId: string,
  data: UpsertVisitRecordRequest,
): Promise<boolean> {
  const response = await servicePut<UpsertVisitRecordRequest, boolean>(
    `${endpoint}/${patientId}/visits/${appointmentId}`,
    data,
  );
  if (response?.status >= 200 && response?.status < 300) {
    return true;
  }
  handleServiceError(response, "Error al guardar registro de visita");
}

/**
 * Save visit clinical notes (HTML)
 * PATCH /clinical-history/patients/{patientId}/visits/{appointmentId}/notes
 */
async function saveVisitNotes(
  patientId: string,
  appointmentId: string,
  notes: string,
): Promise<{ updatedAt: string; updatedBy: string }> {
  const response = await servicePatch<
    { notes: string },
    { updatedAt: string; updatedBy: string }
  >(`${endpoint}/${patientId}/visits/${appointmentId}/notes`, { notes });
  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data;
  }
  handleServiceError(response, "Error al guardar notas de visita");
}

/**
 * Get attachments for a specific visit, filtered by appointmentId.
 * GET /patients/{patientId}/attachments?appointmentId={appointmentId}
 */
async function getVisitAttachments(
  patientId: string,
  appointmentId: string,
): Promise<PatientAttachment[]> {
  const response = await serviceGet<PatientAttachment[]>(
    `/patients/${patientId}/attachments?appointmentId=${appointmentId}`,
  );
  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data;
  }
  return [];
}

export const clinicalHistoryService = {
  getSnapshot,
  updateMedicalHistory,
  validateMedicalHistory,
  saveClinicalNotes,
  getVisitRecord,
  upsertVisitRecord,
  saveVisitNotes,
  getVisitAttachments,
};
