import { QueryPaginationModel } from "@/lib/models/queryPaginationModel";

// ============================================
// BASE TYPES
// ============================================

/**
 * Identification type for users (e.g., Cédula, Passport)
 */
export interface IdentificationType {
  id: string;
  name: string;
  createAt: string;
}

/**
 * Role assigned to manager users
 */
export interface ManagerRole {
  id: string;
  name: string;
  createAt: string;
  permissions: string[];
}

/**
 * Simplified role for list responses
 */
export interface ManagerRoleSimple {
  id: string;
  name: string;
  createAt: string;
  permissions: string[];
}

// ============================================
// MANAGER USER ENTITY
// ============================================

/**
 * Full manager user entity with all details
 */
export interface ManagerUser {
  id: string;
  identificationType: IdentificationType;
  identificationNumber: string;
  names: string;
  surnames: string;
  email: string;
  cellphone: string;
  role: ManagerRole;
  financialInstitutions: string[];
  active: boolean;
  createAt: string;
  updateAt?: string;
  createBy?: string;
  updateBy?: string;
}

/**
 * Manager user as returned in list responses
 */
export interface ManagerUserListItem {
  id: string;
  identificationNumber: string;
  names: string;
  surnames: string;
  email: string;
  cellphone: string;
  role: ManagerRoleSimple;
  active: boolean;
  createAt: string;
}

/**
 * Paginated response for manager users list
 */
export interface ManagerUserListResponse {
  entities: ManagerUserListItem[];
  pagination: QueryPaginationModel;
}

// ============================================
// REQUEST TYPES - CREATE/UPDATE
// ============================================

/**
 * Request payload to create a new manager user
 */
export interface CreateManagerUserRequest {
  identificationTypeId: string;
  identificationNumber: string;
  names: string;
  surnames?: string;
  email: string;
  cellphone?: string;
  password: string;
  roleId: string;
  financialInstitutions: string[];
  active: boolean;
}

/**
 * Request payload to update an existing manager user
 */
export interface UpdateManagerUserRequest {
  id: string;
  identificationTypeId: string;
  identificationNumber: string;
  names: string;
  surnames?: string;
  email: string;
  cellphone?: string;
  password?: string; // Optional - only if changing password
  roleId: string;
  financialInstitutions: string[];
  active: boolean;
}

/**
 * Request payload to change password
 */
export interface ChangePasswordRequest {
  managerUserId: string;
  oldPassword: string;
  newPassword: string;
}

// ============================================
// FORM DATA TYPES (for UI forms)
// ============================================

/**
 * Form data structure for creating/editing manager users in UI
 */
export interface ManagerUserFormData {
  identificationTypeId: string;
  identificationNumber: string;
  names: string;
  surnames: string;
  email: string;
  cellphone: string;
  password: string;
  confirmPassword?: string;
  roleId: string;
  financialInstitutions: string[];
  active: boolean;
}

/**
 * Form data for password change
 */
export interface ChangePasswordFormData {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}
