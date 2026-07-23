import { useState, useCallback } from "react";

import { rolesService } from "@/lib/services/roles";
import type {
  RoleListItem,
  CreateRoleApiRequest,
  RolesQueryParams,
  PaginatedRolesResponse,
} from "@/lib/entity/roles";
import { notify } from "@/lib/utils/notify";

/**
 * useRoles Hook
 *
 * Hook for managing roles CRUD operations
 */
export function useRoles() {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
  });

  /**
   * Fetch paginated roles list
   */
  const fetchRoles = useCallback(
    async (params?: RolesQueryParams) => {
      setLoading(true);
      try {
        const response: PaginatedRolesResponse =
          await rolesService.getRoles(params);

        setRoles(response.entities);
        setPagination({
          page: response.pagination.page,
          pageSize: response.pagination.pageSize,
          total: response.pagination.total,
        });

        return response;
      } catch (error: unknown) {
        notify.error(error.message || "No se pudieron cargar los roles", {
          description:
            "No pudimos obtener la lista de roles. Revisa tu conexión e inténtalo de nuevo; si persiste, contacta a soporte.",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Get role by ID (includes permissions)
   */
  const getRoleById = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const role = await rolesService.getRoleById(id);
        return role;
      } catch (error: unknown) {
        notify.error(error.message || "No se pudo cargar el rol", {
          description:
            "No pudimos obtener los datos y permisos de este rol. Inténtalo de nuevo; si el problema continúa, contacta a soporte.",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Create new role
   */
  const createRole = useCallback(
    async (data: CreateRoleApiRequest) => {
      setLoading(true);
      try {
        const success = await rolesService.createRole(data);
        if (success) {
          notify.success("Rol creado", {
            description:
              "El rol ya aparece en el listado y puedes asignarlo a los usuarios de la clínica.",
          });
          // Refresh list
          await fetchRoles();
        }
        return success;
      } catch (error: unknown) {
        notify.error(error.message || "No se pudo crear el rol", {
          description:
            "Revisa que el nombre y los permisos sean válidos e inténtalo de nuevo; si persiste, contacta a soporte.",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [fetchRoles],
  );

  /**
   * Update role
   */
  const updateRole = useCallback(
    async (id: string, data: CreateRoleApiRequest) => {
      setLoading(true);
      try {
        const success = await rolesService.updateRole(id, data);
        if (success) {
          notify.success("Rol actualizado", {
            description:
              "Los cambios se guardaron y los permisos se aplicarán a los usuarios que tengan este rol.",
          });
          await fetchRoles();
        }
        return success;
      } catch (error: unknown) {
        notify.error(error.message || "No se pudo actualizar el rol", {
          description:
            "No pudimos guardar los cambios. Revisa los datos y tu conexión e inténtalo de nuevo; si persiste, contacta a soporte.",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [fetchRoles],
  );

  return {
    loading,
    roles,
    pagination,
    fetchRoles,
    getRoleById,
    createRole,
    updateRole,
  };
}
