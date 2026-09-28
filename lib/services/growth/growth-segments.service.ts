import {
  serviceGet,
  servicePost,
  servicePut,
  serviceDelete,
} from "@/lib/services/baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import type {
  PatientSegment,
  PatientSegmentListResponse,
  CreatePatientSegmentRequest,
  UpdatePatientSegmentRequest,
  SegmentEvaluationResult,
} from "@/lib/entity/growth";

const ENDPOINT = "/patient-segments";

export async function getPatientSegments(): Promise<PatientSegmentListResponse> {
  const response = await serviceGet<PatientSegmentListResponse>(ENDPOINT);

  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data as unknown as PatientSegmentListResponse;
  }

  handleServiceError(response, "Error al cargar los segmentos");
}

export async function getPatientSegmentById(
  id: string,
): Promise<PatientSegment> {
  const response = await serviceGet<PatientSegment>(`${ENDPOINT}/${id}`);

  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data as unknown as PatientSegment;
  }

  handleServiceError(response, "Error al cargar el segmento");
}

export async function createPatientSegment(
  data: CreatePatientSegmentRequest,
): Promise<string> {
  const response = await servicePost<CreatePatientSegmentRequest, string>(
    ENDPOINT,
    data,
  );

  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data as unknown as string;
  }

  handleServiceError(response, "Error al crear el segmento");
}

export async function updatePatientSegment(
  id: string,
  data: UpdatePatientSegmentRequest,
): Promise<void> {
  const response = await servicePut<UpdatePatientSegmentRequest, boolean>(
    `${ENDPOINT}/${id}`,
    data,
  );

  if (response?.status >= 200 && response?.status < 300) return;
  handleServiceError(response, "Error al actualizar el segmento");
}

export async function deletePatientSegment(id: string): Promise<void> {
  const response = await serviceDelete(`${ENDPOINT}/${id}`);

  if (response?.status >= 200 && response?.status < 300) return;
  handleServiceError(response, "Error al eliminar el segmento");
}

export async function evaluatePatientSegment(
  id: string,
): Promise<SegmentEvaluationResult> {
  const response = await servicePost<Record<string, never>, SegmentEvaluationResult>(
    `${ENDPOINT}/${id}/evaluate`,
    {},
  );

  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data as unknown as SegmentEvaluationResult;
  }

  handleServiceError(response, "Error al evaluar el segmento");
}
