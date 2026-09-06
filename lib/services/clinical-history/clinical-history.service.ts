import { serviceGet, servicePut, servicePatch } from "../baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import type {
  ClinicalHistorySnapshot,
  UpdateMedicalHistoryRequest,
  PatientVisitRecord,
  UpsertVisitRecordRequest,
  VisitDiagnosis,
  ExamFindings,
  ToothRef,
} from "@/lib/entity/clinical-history";
import type { PatientAttachment } from "@/lib/entity/patientAttachment";

const endpoint = "/clinical-history/patients";

function parseDiagnoses(raw: unknown): VisitDiagnosis[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.filter(
    (d): d is VisitDiagnosis =>
      typeof d === "object" &&
      d !== null &&
      typeof (d as Record<string, unknown>).code === "string" &&
      typeof (d as Record<string, unknown>).label === "string",
  );
}
function parseExamFindings(raw: unknown): ExamFindings | undefined {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw))
    return undefined;
  return raw as ExamFindings;
}
function normalizeVisitRecord(raw: PatientVisitRecord): PatientVisitRecord {
  const rawRec = raw as unknown as Record<string, unknown>;
  const painAnatomy = rawRec.painAnatomy as ToothRef | null | undefined;
  const toothRef =
    (raw.currentPain?.toothRef?.fdi ? raw.currentPain.toothRef : undefined) ??
    (painAnatomy?.fdi ? painAnatomy : undefined);
  return {
    ...raw,
    diagnoses: parseDiagnoses(rawRec.diagnoses),
    examFindings: parseExamFindings(rawRec.examFindings),
    currentPain: raw.currentPain
      ? { ...raw.currentPain, toothRef }
      : toothRef
        ? { toothRef }
        : undefined,
  };
}
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
async function validateMedicalHistory(patientId: string): Promise<boolean> {
  const response = await servicePatch<undefined, boolean>(
    `${endpoint}/${patientId}/medical-history/validate`,
  );
  if (response?.status >= 200 && response?.status < 300) {
    return true;
  }

  handleServiceError(response, "Error al validar historia médica");
}

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

async function getVisitRecord(
  patientId: string,
  appointmentId: string,
): Promise<PatientVisitRecord> {
  const response = await serviceGet<PatientVisitRecord>(
    `${endpoint}/${patientId}/visits/${appointmentId}`,
    { expectedStatuses: [404] },
  );
  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return normalizeVisitRecord(response.data);
  }
  if (response?.status === 404) {
    throw Object.assign(new Error("Sin registro de visita"), { status: 404 });
  }
  handleServiceError(response, "Error al cargar registro de visita");
}
function toUpsertWirePayload(
  data: UpsertVisitRecordRequest,
): Record<string, unknown> {
  const { currentPain, ...rest } = data;
  const payload: Record<string, unknown> = { ...rest };
  if (currentPain) {
    const { toothRef, ...painRest } = currentPain;
    payload.currentPain = painRest;
    if (toothRef?.fdi) {
      payload.painAnatomy = toothRef;
    }
  }
  return payload;
}
async function upsertVisitRecord(
  patientId: string,
  appointmentId: string,
  data: UpsertVisitRecordRequest,
): Promise<boolean> {
  const response = await servicePut<Record<string, unknown>, boolean>(
    `${endpoint}/${patientId}/visits/${appointmentId}`,
    toUpsertWirePayload(data),
  );
  if (response?.status >= 200 && response?.status < 300) {
    return true;
  }
  handleServiceError(response, "Error al guardar registro de visita");
}
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
  handleServiceError(response, "Error al cargar adjuntos de la visita");
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
