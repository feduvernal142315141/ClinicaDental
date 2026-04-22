/**
 * Patients Entity Types
 *
 * Type definitions for patient-related entities based on backend API
 */

// Re-export existing types and utilities
export {
  genderOptions,
  agreementOptions,
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
 * Create patient request payload
 */
export interface CreatePatientRequest {
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string; // ISO 8601
  address?: string;
  agreement?: boolean;
  gender?: "M" | "F";
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
 * Query parameters for patients list with filtering and pagination
 */
export interface PatientsQueryParams {
  page?: number;
  pageSize?: number;
  filters?: string[];
  orders?: string[];
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
 * Filter operators available for patient queries
 * Matches backend API_CONTRACT.md uppercase operators
 */
export type FilterOperator =
  | "EQ"
  | "NEQ"
  | "CONTAINS"
  | "NOT_CONTAINS"
  | "GTE"
  | "LTE"
  | "GT"
  | "LT"
  | "IN"
  | "NOT_IN"
  | "IS_NULL"
  | "IS_NOT_NULL";

/**
 * Helper to build filter string
 * @example buildFilter("name", "CONTAINS", "juan") => "name__CONTAINS__juan"
 */
export function buildFilter(
  field: string,
  operator: FilterOperator,
  value: string | boolean | number,
): string {
  return `${field}__${operator}__${value}`;
}

/**
 * Helper to build order string
 * @example buildOrder("name", "asc") => "name:asc"
 */
export function buildOrder(field: string, direction: "asc" | "desc"): string {
  return `${field}:${direction}`;
}

/**
 * Gender display options for forms
 */
export const genderDisplayOptions = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
] as const;
