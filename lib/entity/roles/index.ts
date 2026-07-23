/**
 * Roles Entity Types
 *
 * Type definitions for role-related entities
 */

import type { RolesFilterOperator } from "@/lib/query/domains/roles";

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
 * Permission payload expected by the roles API
 */
export interface RolePermissionRequest {
  permissionId: string;
  actionsValue: number;
}

/**
 * Create role payload sent to the API
 */
export interface CreateRoleApiRequest {
  roleName: string;
  permissions: RolePermissionRequest[];
}

/**
 * Query parameters for roles list.
 *
 * Fase 2 (GET semántico): el front expresa INTENCIÓN plana (`q`, `active`, `sort`)
 * y el backend resuelve el significado server-side. Migrar a `q` permite DEJAR DE
 * emitir el straggler de separador coma de roles. Los campos estructurados
 * `filters`/`orders` se mantienen para coexistencia (aún soportados; endurecimiento
 * de la ruta cruda en Fase 4).
 */
export interface RolesQueryParams {
  page?: number;
  pageSize?: number;
  /** @deprecated ruta estructurada (separador coma); usar `q` para la búsqueda de roles (coexistencia) */
  filters?: string[];
  orders?: string[];
  /** Búsqueda semántica (barre name server-side) */
  q?: string;
  /** Filtro escalar de estado (activos/inactivos) */
  active?: boolean;
  /** Orden semántico: clave lógica + dirección, ej. "name:asc" */
  sort?: string;
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
 * @deprecated Vocabulario del straggler de roles (separador coma); usa
 * @/lib/query (rolesQuery() / rolesDialect). Miembros idénticos, solo
 * redirigido a la fuente única.
 */
export type FilterOperator = RolesFilterOperator;

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
  // Debe coincidir exactamente con Permissions.java (backend): "patient management" con espacio.
  PATIENT_MANAGEMENT: "patient management",
  DOCTOR: "doctor",
  ROLE: "role",
  CAMPAIGN: "campaign",
  TEMPLATE: "template",
  GENERAL_OPTION: "general_option",
  NOTIFICATION: "notification",
  INTEGRATION: "integration",
  SERVICE: "service",
} as const;

export type PermissionType =
  (typeof PERMISSION_TYPES)[keyof typeof PERMISSION_TYPES];
