/**
 * Doctors Entity Types
 *
 * Type definitions for doctor-related entities
 */
import type { UserTypeRef } from "@/lib/entity/userType";

export type { UserTypeRef } from "@/lib/entity/userType";

/**
 * Role entity
 */
export interface Role {
  id: string;
  name: string;
  description?: string;
}

/**
 * Tipo de usuario (profesión/cargo). ORTOGONAL al Rol (permisos): el Rol
 * define qué puede hacer en el sistema (Administrador/DOCTOR); el tipo de
 * usuario describe su cargo clínico o administrativo. No mezclar.
 *
 * El tipo de usuario es un CATÁLOGO GESTIONABLE per-clínica (`GET /user-types`,
 * ver `lib/entity/userType`): el front NUNCA hardcodea la lista ni sus labels.
 * Un `Doctor` referencia el catálogo por `userTypeId` (FK) y el backend resuelve
 * el objeto embebido `userType` (`{ id, name, attendsAppointments }`). La
 * clinicalidad ("atiende citas") se lee de `attendsAppointments` del dato
 * (`isProviderUserType` / `deriveProviderUserTypeIds` en `lib/entity/userType`),
 * no de una lista fija de códigos.
 */

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
  /**
   * FK al catálogo de tipos de usuario (`GET /user-types`). `null`/`undefined`
   * ⇒ el backend resuelve el default proveedor de la clínica al crear.
   */
  userTypeId?: string | null;
  /**
   * Tipo de usuario resuelto por el backend a partir del catálogo:
   * `{ id, name, attendsAppointments }`. `null` si `userTypeId` no matchea
   * ningún tipo del catálogo de la clínica. Distinto del Rol (permisos).
   */
  userType?: UserTypeRef | null;
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
  /** FK al catálogo de tipos de usuario; ver `Doctor.userTypeId`. */
  userTypeId?: string | null;
  /** Tipo de usuario resuelto del catálogo; ver `Doctor.userType`. */
  userType?: UserTypeRef | null;
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
  /**
   * FK al catálogo de tipos de usuario (`UUID`). Opcional; si se omite el
   * backend aplica el tipo proveedor por defecto de la clínica.
   */
  userTypeId?: string;
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
  /** FK al catálogo de tipos de usuario. Merge null-aware: omitido conserva el actual. */
  userTypeId?: string;
  roleId?: string;
  active?: boolean;
}

/**
 * Query parameters for doctors list with filtering and pagination.
 *
 * Fase 2 (GET semántico): el front expresa INTENCIÓN plana (`q`, `active`, `sort`)
 * y el backend resuelve el significado server-side. Los campos estructurados
 * `filters`/`orders` se mantienen para coexistencia (aún soportados; endurecimiento
 * de la ruta cruda en Fase 4).
 */
export interface DoctorsQueryParams {
  page?: number;
  pageSize?: number;
  /** @deprecated ruta estructurada; usar `q`/`active` para la búsqueda de doctores (coexistencia) */
  filters?: string[];
  orders?: string[];
  /** Búsqueda semántica (barre name server-side) */
  q?: string;
  /** Filtro escalar de estado (activos/inactivos) */
  active?: boolean;
  /** Orden semántico: clave lógica + dirección, ej. "name:asc" */
  sort?: string;
  /**
   * Endpoint semántico: pide al BACKEND solo los doctores cuyo tipo de
   * usuario atiende citas (`attendsAppointments=true`). El front nunca
   * envía la lista de tipos, solo esta intención.
   */
  onlyProviders?: boolean;
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
