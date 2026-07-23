import { serviceGet, servicePost } from "../baseService";
import { permissionsService } from "../permissions";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { PERMISSIONS } from "@/lib/constants/roles.constants";
import { handleServiceError } from "@/lib/utils/error.utils";
import type {
  Role,
  CreateRoleApiRequest,
  RolesQueryParams,
  PaginatedRolesResponse,
} from "@/lib/entity/roles";

type PermissionCatalogItem = {
  id?: string;
  permissionId?: string;
  code?: string;
  key?: string;
  name?: string;
  permissionName?: string;
};

/**
 * Permission item as returned by the API when fetching a role by ID
 */
type RolePermissionItem = {
  permissionId: string;
  permissionName: string;
  actionsValue: number;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(v: string): boolean {
  return UUID_RE.test(v);
}

function isEncodedPermission(v: string): boolean {
  // Expected: "moduleKey-actionsValue" (e.g. "role-15")
  const idx = v.lastIndexOf("-");
  if (idx <= 0) return false;
  const moduleKey = v.slice(0, idx).trim();
  const rawValue = v.slice(idx + 1).trim();
  // Avoid treating UUIDs like encoded permissions (UUIDs contain '-' and may end with digits).
  if (isUuid(v) || isUuid(moduleKey)) return false;
  // Value must be decimal digits only (parseInt("7d...", 10) would wrongly return 7).
  if (!/^\d+$/.test(rawValue)) return false;
  if (!rawValue) return false;
  const num = Number.parseInt(rawValue, 10);
  return Number.isFinite(num) && !Number.isNaN(num);
}

function normalizeString(v: unknown): string {
  if (typeof v !== "string") return "";
  return v
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "_");
}

function normalizeCatalogItems(raw: unknown): PermissionCatalogItem[] {
  if (!raw) return [];
  const candidates = [raw, raw?.data, raw?.entities, raw?.content, raw?.items];
  for (const c of candidates) {
    if (Array.isArray(c)) return c as PermissionCatalogItem[];
  }
  return [];
}

function resolveModuleKeyFromCatalogItem(item: PermissionCatalogItem): string {
  return item.code || item.key || item.name || item.permissionName || "";
}

function mapCandidateToFrontendModuleKey(candidate: string): string | null {
  const c = normalizeString(candidate);
  if (!c) return null;

  // First, match by module id
  const byId = Object.values(PERMISSIONS).find(
    (p) => normalizeString(p.id) === c,
  );
  if (byId) return byId.id;

  // Then, match by display name
  const byName = Object.values(PERMISSIONS).find(
    (p) => normalizeString(p.name) === c,
  );
  if (byName) return byName.id;

  return null;
}

async function normalizeRolePermissions(raw: unknown): Promise<string[]> {
  const arr = Array.isArray(raw) ? raw : [];
  if (!arr.length) return [];

  const hasNewFormat = arr.some(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "permissionName" in item &&
      "actionsValue" in item,
  );

  if (hasNewFormat) {
    const mapped: string[] = [];
    for (const item of arr as RolePermissionItem[]) {
      if (
        typeof item !== "object" ||
        item === null ||
        !item.permissionName ||
        typeof item.actionsValue !== "number"
      ) {
        continue;
      }
      const moduleKey = mapCandidateToFrontendModuleKey(item.permissionName);
      if (moduleKey) {
        mapped.push(`${moduleKey}-${item.actionsValue}`);
      }
    }
    return mapped;
  }

  // Legacy format handling: array of strings
  const strings = arr.filter((p): p is string => typeof p === "string");
  if (!strings.length) return [];

  if (strings.every(isEncodedPermission)) return strings;

  const uuids = strings.filter(isUuid);
  const encoded = strings.filter(isEncodedPermission);

  if (!uuids.length) {
    return encoded;
  }

  let catalog: PermissionCatalogItem[] = [];
  try {
    const permissionsResponse = await permissionsService.getPermissions();
    catalog = normalizeCatalogItems(permissionsResponse);
  } catch {
    // Sin el catálogo no se pueden mapear los permisos por UUID: devolver solo
    // los codificados mostraría el rol recortado y, al guardarlo, degradaría
    // permisos reales. Propagamos con mensaje saneado para que el caller
    // (useRoles.getRoleById) muestre el aviso al usuario.
    throw new Error("No se pudieron cargar los permisos del rol");
  }

  const byId = new Map<string, PermissionCatalogItem>();
  for (const item of catalog) {
    const id = (item.permissionId ?? item.id ?? "") as string;
    if (id) byId.set(id, item);
  }

  const mapped: string[] = [];
  for (const permissionId of uuids) {
    const item = byId.get(permissionId);
    if (!item) continue;
    const candidate = resolveModuleKeyFromCatalogItem(item);
    const moduleKey = mapCandidateToFrontendModuleKey(candidate);
    if (!moduleKey) continue;
    mapped.push(`${moduleKey}-${PermissionAction.ALL}`);
  }

  return [...encoded, ...mapped];
}

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

  // Fase 2 (GET semántico) — intención plana; el backend resuelve el significado.
  // Aditivo respecto a filters/orders (coexistencia total). Migrar a `q` elimina
  // el straggler de separador coma que emitía la búsqueda de roles.
  if (params.q !== undefined && params.q !== "") {
    queryParams.append("q", params.q);
  }
  if (params.active !== undefined) {
    queryParams.append("active", String(params.active));
  }
  if (params.sort !== undefined && params.sort !== "") {
    queryParams.append("sort", params.sort);
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
    const role = response.data as Role;
    return {
      ...role,
      permissions: await normalizeRolePermissions((role as unknown)?.permissions),
    };
  }
  handleServiceError(typeof response !== "undefined" ? response : null, "Error al cargar rol");
}

/**
 * Get paginated list of roles
 * GET /roles?page=0&pageSize=10&filters=...&orders=...
 */
async function getRoles(
  params?: RolesQueryParams,
): Promise<PaginatedRolesResponse> {
  const queryString = buildQueryString(params);
  const url = `${endpoint}${queryString ? `?${queryString}` : ""}`;

  const response = await serviceGet<PaginatedRolesResponse>(url);
  if (response?.data) {
    return response.data;
  }
  handleServiceError(typeof response !== "undefined" ? response : null, "Error al cargar roles");
}

/**
 * Create new role
 * POST /roles
 */
async function createRole(data: CreateRoleApiRequest): Promise<boolean> {
  const response = await servicePost<CreateRoleApiRequest, boolean>(
    endpoint,
    data,
  );

  if (response?.status >= 200 && response?.status < 300) {
    return true;
  }

  handleServiceError(response, "Error al crear rol");
}

/**
 * Update role
 * PUT /roles/:id
 */
async function updateRole(
  id: string,
  data: CreateRoleApiRequest,
): Promise<boolean> {
  return permissionsService.updateRolePermissions({
    rolId: id,
    roleName: data.roleName,
    permissions: data.permissions,
  });
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
