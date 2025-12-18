/**
 * Doctors Entity Types
 *
 * Type definitions for doctor-related entities
 */

/**
 * Role entity
 */
export interface Role {
  id: string;
  name: string;
  description?: string;
}

/**
 * Doctor entity - Full representation
 */
export interface Doctor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  licenceNumber: string;
  specialty?: string;
  description?: string;
  schedule?: Record<string, any>; // JSON schedule data
  gender?: "male" | "female" | "other";
  role?: Role;
  roleId?: string;
  active: boolean;
  createAt: string;
  updateAt?: string;
}

/**
 * Doctor list item - Simplified for table display
 */
export interface DoctorListItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  licenceNumber: string;
  specialty?: string;
  role?: Role;
  active: boolean;
  createAt: string;
}

/**
 * Create doctor request payload
 */
export interface CreateDoctorRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  licenceNumber: string;
  specialty?: string;
  description?: string;
  schedule?: object; // JSON object (Spring Boot handles conversion)
  gender?: "male" | "female" | "other";
  roleId?: string;
  active?: boolean;
}

/**
 * Update doctor request payload
 */
export interface UpdateDoctorRequest {
  name?: string;
  email?: string;
  phone?: string;
  licenceNumber?: string;
  specialty?: string;
  description?: string;
  schedule?: object; // JSON object (Spring Boot handles conversion)
  gender?: "male" | "female" | "other";
  roleId?: string;
  active?: boolean;
}

/**
 * Query parameters for doctors list
 */
export interface DoctorsQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
  active?: boolean;
  specialty?: string;
}

/**
 * Paginated doctors response
 */
export interface PaginatedDoctorsResponse {
  data: Doctor[];
  page: number;
  pageSize: number;
  total: number;
}
