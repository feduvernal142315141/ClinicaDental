import { serviceGet, servicePost, servicePut } from "../baseService";
import type {
  Role,
  RoleListItem,
  CreateRoleRequest,
  RolesQueryParams,
  PaginatedRolesResponse,
} from "@/lib/entity/roles";

/**
 * RolesService
 *
 * Service for managing roles operations (CRUD)
 * Base endpoint: /roles
 */
const endpoint = "/api/v1/roles";

/**
 * Build query string from params
 */
function buildQueryString(params?: RolesQueryParams): string {
  if (!params) return "";

  const queryParams = new URLSearchParams();

  if (params.page !== undefined)
    queryParams.append("page", params.page.toString());
  if (params.pageSize !== undefined)
    queryParams.append("pageSize", params.pageSize.toString());

  // Add filters
  if (params.filters && params.filters.length > 0) {
    params.filters.forEach((filter) => {
      queryParams.append("filters", filter);
    });
  }

  // Add orders
  if (params.orders && params.orders.length > 0) {
    params.orders.forEach((order) => {
      queryParams.append("orders", order);
    });
  }

  return queryParams.toString();
}

/**
 * Get role by ID (includes full permission details)
 * GET /roles/:id
 */
async function getRoleById(id: string): Promise<Role> {
  const response = await serviceGet<Role>(`${endpoint}/${id}`);
  if (response?.data) {
    return response.data;
  }
  throw new Error("Error al cargar rol");
}

/**
 * Get paginated list of roles
 * GET /roles?page=0&pageSize=10&filters=...&orders=...
 */
async function getRoles(
  params?: RolesQueryParams
): Promise<PaginatedRolesResponse> {
  const queryString = buildQueryString(params);
  const url = `${endpoint}${queryString ? `?${queryString}` : ""}`;

  const response = await serviceGet<PaginatedRolesResponse>(url);
  if (response?.data) {
    return response.data;
  }
  throw new Error("Error al cargar roles");
}

/**
 * Create new role
 * POST /roles
 */
async function createRole(data: CreateRoleRequest): Promise<boolean> {
  const response = await servicePost<CreateRoleRequest, boolean>(
    endpoint,
    data
  );
  if (response?.data) {
    return response.data;
  }
  throw new Error("Error al crear rol");
}

/**
 * Update role
 * PUT /roles/:id
 */
async function updateRole(id: string, data: CreateRoleRequest): Promise<boolean> {
  const response = await servicePut<CreateRoleRequest, boolean>(
    `${endpoint}/${id}`,
    data
  );
  if (response?.data) {
    return response.data;
  }
  throw new Error("Error al actualizar rol");
}

/**
 * Helper: Build filter string
 * Example: buildFilter('name', 'contains', 'Admin') => 'name,contains,Admin'
 */
export function buildFilter(
  field: string,
  operator: string,
  value: string | boolean | Date
): string {
  let formattedValue = String(value);

  // Add prefixes for special types
  if (typeof value === "boolean") {
    formattedValue = `boolean:${value}`;
  } else if (value instanceof Date) {
    formattedValue = `date:${value.toISOString().split("T")[0]}`;
  }

  return `${field},${operator},${formattedValue}`;
}

/**
 * Helper: Build order string
 * Example: buildOrder('name', 'asc') => 'name,asc'
 */
export function buildOrder(field: string, direction: "asc" | "desc"): string {
  return `${field},${direction}`;
}

/**
 * Exported service object
 */
export const rolesService = {
  getRoleById,
  getRoles,
  createRole,
  updateRole,
};
