import type {
  PatientSegment,
  PatientSegmentListResponse,
  CreatePatientSegmentRequest,
  UpdatePatientSegmentRequest,
  SegmentAudience,
  SegmentEvaluationResult,
  SegmentFieldCatalog,
} from "@/lib/entity/growth";
import { growthRequest } from "./growth-http";

const ENDPOINT = "/patient-segments";

export function getPatientSegments(): Promise<PatientSegmentListResponse> {
  return growthRequest("GET", ENDPOINT, "Error al cargar los segmentos");
}

export function getPatientSegmentById(id: string): Promise<PatientSegment> {
  return growthRequest("GET", `${ENDPOINT}/${id}`, "Error al cargar el segmento");
}

/** Fields, operators and values a segment of that audience can filter by. */
export function getSegmentFields(audience: SegmentAudience): Promise<SegmentFieldCatalog> {
  return growthRequest("GET", `${ENDPOINT}/fields?audience=${audience}`, "Error al cargar los campos del segmento");
}

export function createPatientSegment(data: CreatePatientSegmentRequest): Promise<string> {
  return growthRequest("POST", ENDPOINT, "Error al crear el segmento", data);
}

export async function updatePatientSegment(id: string, data: UpdatePatientSegmentRequest): Promise<void> {
  await growthRequest("PUT", `${ENDPOINT}/${id}`, "Error al actualizar el segmento", data);
}

export async function deletePatientSegment(id: string): Promise<void> {
  await growthRequest("DELETE", `${ENDPOINT}/${id}`, "Error al eliminar el segmento");
}

export function evaluatePatientSegment(id: string): Promise<SegmentEvaluationResult> {
  return growthRequest("POST", `${ENDPOINT}/${id}/evaluate`, "Error al evaluar el segmento", {});
}
