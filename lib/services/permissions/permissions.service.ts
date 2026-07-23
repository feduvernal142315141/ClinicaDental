import { serviceGet, servicePut } from "../baseService";
import { permissionsToObject } from "@/lib/permissions/permissions-encoding";
import { PERMISSIONS } from "@/lib/constants/roles.constants";
import type { RolePermissionRequest } from "@/lib/entity/roles";

import { handleServiceError } from "@/lib/utils/error.utils";
export interface PermissionsQueryParams {
  page?: number;
  pageSize?: number;
  filters?: string[];
  orders?: string[];
}

export interface UpdateRolePermissionsRequest {
  /** Nota: el backend lo expone como `rolId` (Swagger) */
  rolId: string;
  roleName: string;
  permissions: RolePermissionRequest[];
}

export interface PermissionCatalogItem {
  /** UUID */
  id?: string;
  permissionId?: string;
  /** Clave/código que debe mapear con moduleKey (ej: "user", "financial_institution") */
  code?: string;
  key?: string;
  name?: string;
  permissionName?: string;
}

const endpoint = "/permissions";

function buildQueryString(params?: PermissionsQueryParams): string {
  if (!params) return "";

  const queryParams = new URLSearchParams();

  if (params.page !== undefined)
    queryParams.append("page", params.page.toString());
  if (params.pageSize !== undefined)
    queryParams.append("pageSize", params.pageSize.toString());

  if (params.filters?.length) {
    params.filters.forEach((filter) => queryParams.append("filters", filter));
  }

  if (params.orders?.length) {
    params.orders.forEach((order) => queryParams.append("orders", order));
  }

  return queryParams.toString();
}

async function getPermissions(
  params?: PermissionsQueryParams
): Promise<PermissionCatalogItem[]> {
  const queryString = buildQueryString(params);
  const url = `${endpoint}${queryString ? `?${queryString}` : ""}`;

  const response = await serviceGet<unknown>(url);

  if (response?.status >= 200 && response?.status < 300) {
    return normalizeCatalogItems(response.data);
  }

  handleServiceError(response, "Error al cargar permisos");
}

function normalizeCatalogItems(raw: unknown): PermissionCatalogItem[] {
  if (!raw) return [];

  // Soportar distintas formas típicas: array directo, paginado, etc.
  const candidates = [raw, raw?.data, raw?.entities, raw?.content, raw?.items];

  for (const c of candidates) {
    if (Array.isArray(c)) return c as PermissionCatalogItem[];
  }

  return [];
}

function getPermissionDisplayNameByModuleKey(moduleKey: string): string | null {
  const entry = Object.values(PERMISSIONS).find((p) => p.id === moduleKey);
  return entry?.name ?? null;
}

function normalizeString(v: unknown): string {
  if (typeof v !== "string") return "";
  return v
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "_");
}

function resolvePermissionIdForModuleKey(
  moduleKey: string,
  catalog: PermissionCatalogItem[]
): string | null {
  const key = normalizeString(moduleKey);
  const displayName = normalizeString(
    getPermissionDisplayNameByModuleKey(moduleKey)
  );

  const byKey = catalog.find((p) => {
    const candidate =
      normalizeString(p.code) ||
      normalizeString(p.key) ||
      normalizeString(p.name) ||
      normalizeString(p.permissionName);
    return candidate === key;
  });

  const byName =
    !byKey && displayName
      ? catalog.find((p) => {
          const candidate =
            normalizeString(p.name) || normalizeString(p.permissionName);
          return candidate === displayName;
        })
      : undefined;

  const chosen = byKey ?? byName;
  if (!chosen) return null;

  return (chosen.permissionId ?? chosen.id ?? null) as string | null;
}

function resolveRolePermissions(
  encoded: string[],
  catalog: PermissionCatalogItem[]
): RolePermissionRequest[] {
  const obj = permissionsToObject(encoded);

  const missing: string[] = [];
  const result: RolePermissionRequest[] = [];

  for (const [moduleKey, actionsValue] of Object.entries(obj)) {
    const permissionId = resolvePermissionIdForModuleKey(moduleKey, catalog);
    if (!permissionId) {
      missing.push(moduleKey);
      continue;
    }

    result.push({ permissionId, actionsValue });
  }

  if (missing.length) {
    throw new Error(
      `No se pudo mapear permissionId para: ${missing.join(", ")}. ` +
        `Revisa que GET /permissions devuelva un campo (code/key/name) que coincida con los moduleKey usados (ej: "user", "role").`
    );
  }

  return result;
}

async function updateRolePermissions(
  payload: UpdateRolePermissionsRequest
): Promise<boolean> {
  const response = await servicePut<UpdateRolePermissionsRequest, unknown>(
    endpoint,
    payload
  );

  if (response?.status >= 200 && response?.status < 300) {
    return true;
  }

  handleServiceError(response, "Error al actualizar permisos");
}

export const permissionsService = {
  getPermissions,
  resolveRolePermissions,
  updateRolePermissions,
};
