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
  avatarUrl?: string;
  schedule?: Record<string, unknown>; // JSON schedule data
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
  password?: string;
  phone?: string;
  licenceNumber: string;
  specialty?: string;
  description?: string;
  avatarUrl?: string;
  schedule?: object; // JSON object (Spring Boot handles conversion)
  gender?: "male" | "female" | "other";
  roleId?: string;
  active?: boolean;
}

/**
 * Update doctor request payload
 */
export interface UpdateDoctorRequest {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  licenceNumber?: string;
  specialty?: string;
  description?: string;
  avatarUrl?: string;
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
 * Backend pagination structure
 */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Paginated doctors response from backend
 */
export interface PaginatedDoctorsResponse {
  entities: Doctor[];
  pagination: Pagination;
}

/**
 * Auth / Password types
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  /** Solo visible en desarrollo según backend; en prod normalmente no viene */
  otpCode?: string;
  otpExpiresInSeconds: number;
  /** ISO string */
  otpExpiresAt: string;
}

export interface ValidateOtpRequest {
  email: string;
  otpCode: string;
}

export interface ValidateOtpResponse {
  accessToken: string;
  refreshToken: string;
  /** ISO string */
  accessTokenExpiresIn: string;
  /** ISO string */
  refreshTokenExpiresIn: string;
  /** ISO string */
  passwordExpirationDate: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  /** ISO string */
  accessExpiresIn: string;
  /** ISO string */
  refreshExpiresIn: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  code: string;
  password: string;
}

/**
 * Change password for authenticated user (/auth/change-password)
 */
export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

/**
 * Change doctor password via doctor endpoint (/doctor/change-password)
 */
export interface DoctorChangePasswordRequest {
  doctorId: string;
  oldPassword: string;
  newPassword: string;
}
