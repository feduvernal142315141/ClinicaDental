/**
 * Patients Entity Types
 *
 * Type definitions for patient-related entities based on backend API
 */

// Schema canónico de formulario (fuente de verdad)
export { patientFormSchema, type PatientFormValues } from "./patient.schema";

// Re-export existing types and utilities
export {
  genderOptions,
  agreementOptions,
  /** @deprecated Usar PatientFormValues */
  type PatientFormData,
} from "./patients";
export { calculateAge, formatDate } from "./patients-utils";

/**
 * Patient entity - Full representation from API
 */
export interface Patient {
  id: string;
  clinicId: string;
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string; // ISO 8601
  address?: string;
  agreement?: boolean;
  gender?: "M" | "F";
  active: boolean;
  createAt: string; // ISO 8601
  updateAt?: string; // ISO 8601
}

/**
 * Patient list item - Simplified for table display
 */
export interface PatientListItem {
  id: string;
  clinicId: string;
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: "M" | "F";
  active: boolean;
  createAt: string;
}

/**
 * Create patient request payload.
 * Los campos name, phone, dateOfBirth y gender son requeridos
 * por validación de formulario; email, address y agreement son opcionales.
 */
export interface CreatePatientRequest {
  name: string;
  email?: string;
  phone: string;
  dateOfBirth: string; // ISO 8601 YYYY-MM-DD
  gender: "M" | "F";
  address?: string;
  agreement?: boolean;
}

/**
 * Update patient request payload
 */
export interface UpdatePatientRequest {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string; // ISO 8601
  address?: string;
  agreement?: boolean;
  gender?: "M" | "F";
  active?: boolean;
}

/**
 * Query parameters for patients list with filtering and pagination.
 *
 * Fase 2 (GET semántico): el front expresa INTENCIÓN plana (`q`, `active`, `sort`)
 * y el backend resuelve el significado server-side. Los campos estructurados
 * `filters`/`orders` se mantienen para coexistencia (aún soportados; endurecimiento
 * de la ruta cruda en Fase 4).
 */
export interface PatientsQueryParams {
  page?: number;
  pageSize?: number;
  /** @deprecated ruta estructurada; usar `q`/`active` para la búsqueda de pacientes (coexistencia) */
  filters?: string[];
  orders?: string[];
  /** Búsqueda semántica multi-campo (barre name + email server-side) */
  q?: string;
  /** Filtro escalar de estado (activos/inactivos) */
  active?: boolean;
  /** Orden semántico: clave lógica + dirección, ej. "name:asc" */
  sort?: string;
}

/**
 * Backend pagination structure
 */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Paginated patients response from backend
 * Backend returns: { entities: Patient[], pagination: { page, pageSize, total } }
 */
export interface PaginatedPatientsResponse {
  entities: Patient[];
  pagination: Pagination;
}

/**
 * Filter operators available for patient queries.
 * Redirige al vocabulario canónico único: @/lib/query/operators (fuente de
 * verdad, alineada EXACTO al enum backend FilterOperator). Respecto al union
 * anterior se agregan *_IGNORE_CASE y RELATED_* y se retiran IS_NULL/IS_NOT_NULL
 * (sin call-sites que los usen hoy → sin regresión de tipos ni de wire).
 */
export type { FilterOperatorName as FilterOperator } from "@/lib/query/operators";

/**
 * Gender display options for forms
 */
export const genderDisplayOptions = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
] as const;
