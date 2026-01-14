/**
 * Roles Entity Types
 *
 * Type definitions for role-related entities
 */

/**
 * Permission entity
 */
export interface Permission {
  id: string;
  name: string;
  description?: string;
  category?: "appointments" | "patients" | "doctors" | "settings" | "reports";
}

/**
 * Role entity - Full representation
 */
export interface Role {
  id: string;
  name: string;
  createAt: string;
  permissions: string[]; // Encoded permissions (e.g. "role-3")
}

/**
 * Role with full permission details
 */
export interface RoleWithPermissions extends Omit<Role, "permissions"> {
  permissions: Permission[];
}

/**
 * Role list item - Simplified for table display
 */
export interface RoleListItem {
  id: string;
  name: string;
  createAt: string;
}

/**
 * Create role request payload
 */
export interface CreateRoleRequest {
  roleName: string;
  permissions?: string[]; // Encoded permissions (e.g. "role-3")
}

/**
 * Query parameters for roles list
 */
export interface RolesQueryParams {
  page?: number;
  pageSize?: number;
  filters?: string[];
  orders?: string[];
}

/**
 * Paginated roles response
 */
export interface PaginatedRolesResponse {
  entities: RoleListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

/**
 * Filter operator types
 */
export type FilterOperator =
  | "eq"
  | "ne"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "gte"
  | "lte";

/**
 * Filter builder helper
 */
export interface RoleFilter {
  field: string;
  operator: FilterOperator;
  value: string | boolean | Date;
}

/**
 * Order direction types
 */
export type OrderDirection = "asc" | "desc";

/**
 * Order builder helper
 */
export interface RoleOrder {
  field: string;
  direction: OrderDirection;
}

/**
 * System predefined roles
 */
export const SYSTEM_ROLES = {
  SUPER_ADMIN: "11111111-1111-1111-1111-111111111111",
  ADMIN: "22222222-2222-2222-2222-222222222222",
  DOCTOR: "33333333-3333-3333-3333-333333333333",
} as const;

/**
 * Permission types
 */
export const PERMISSION_TYPES = {
  APPOINTMENTS: "appointments",
  PATIENTS: "patients",
  PATIENT_MANAGEMENT: "patient_management",
  DOCTOR: "doctor",
  ROLE: "role",
  CAMPAIGN: "campaign",
  TEMPLATE: "template",
  GENERAL_OPTION: "general_option",
  NOTIFICATION: "notification",
  INTEGRATION: "integration",
} as const;

export type PermissionType =
  (typeof PERMISSION_TYPES)[keyof typeof PERMISSION_TYPES];
