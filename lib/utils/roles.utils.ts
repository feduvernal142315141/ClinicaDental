import type {
  Role,
  RoleListItem,
  RoleFilter,
  RoleOrder,
  FilterOperator,
  OrderDirection,
} from "@/lib/entity/roles";
import { buildFilter, buildOrder } from "@/lib/services/roles";

/**
 * Roles Utility Functions
 */

/**
 * Format role for display
 */
export function formatRoleName(role: Role | RoleListItem): string {
  return role.name;
}

/**
 * Get permission count from role
 */
export function getPermissionCount(role: Role): number {
  return role.permissions?.length || 0;
}

/**
 * Check if role is system role (predefined)
 */
export function isSystemRole(roleId: string): boolean {
  const systemRoleIds = [
    "11111111-1111-1111-1111-111111111111", // Super Admin
    "22222222-2222-2222-2222-222222222222", // Admin
    "33333333-3333-3333-3333-333333333333", // Doctor
  ];
  return systemRoleIds.includes(roleId);
}

/**
 * Get role display color (for badges/tags)
 */
export function getRoleColor(roleName: string): string {
  const lowerName = roleName.toLowerCase();

  if (lowerName.includes("super") || lowerName.includes("administrador")) {
    return "red";
  }
  if (lowerName.includes("admin")) {
    return "blue";
  }
  if (lowerName.includes("doctor")) {
    return "green";
  }
  return "default";
}

/**
 * Build filters array from filter objects
 */
export function buildFiltersArray(filters: RoleFilter[]): string[] {
  return filters.map((filter) =>
    buildFilter(filter.field, filter.operator, filter.value)
  );
}

/**
 * Build orders array from order objects
 */
export function buildOrdersArray(orders: RoleOrder[]): string[] {
  return orders.map((order) => buildOrder(order.field, order.direction));
}

/**
 * Validate role name
 */
export function validateRoleName(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "El nombre del rol no puede estar vacío" };
  }

  if (name.length < 3) {
    return {
      valid: false,
      error: "El nombre debe tener al menos 3 caracteres",
    };
  }

  if (name.length > 50) {
    return {
      valid: false,
      error: "El nombre no puede exceder 50 caracteres",
    };
  }

  return { valid: true };
}

/**
 * Format date for display
 */
export function formatRoleDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * Sort roles by name
 */
export function sortRolesByName(
  roles: RoleListItem[],
  direction: "asc" | "desc" = "asc"
): RoleListItem[] {
  return [...roles].sort((a, b) => {
    const comparison = a.name.localeCompare(b.name, "es");
    return direction === "asc" ? comparison : -comparison;
  });
}

/**
 * Filter roles by search term
 */
export function filterRolesBySearch(
  roles: RoleListItem[],
  searchTerm: string
): RoleListItem[] {
  if (!searchTerm) return roles;

  const lowerSearch = searchTerm.toLowerCase();
  return roles.filter((role) => role.name.toLowerCase().includes(lowerSearch));
}

/**
 * Get role statistics
 */
export function getRoleStats(roles: RoleListItem[]) {
  return {
    total: roles.length,
    systemRoles: roles.filter((r) => isSystemRole(r.id)).length,
    customRoles: roles.filter((r) => !isSystemRole(r.id)).length,
  };
}
