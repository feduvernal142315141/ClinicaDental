import { useState, useCallback } from "react";
import { App } from "antd";
import { rolesService } from "@/lib/services/roles";
import type {
  Role,
  RoleListItem,
  CreateRoleRequest,
  RolesQueryParams,
  PaginatedRolesResponse,
} from "@/lib/entity/roles";

/**
 * useRoles Hook
 *
 * Hook for managing roles CRUD operations
 */
export function useRoles() {
  const { message } = App.useApp();
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
        const response: PaginatedRolesResponse = await rolesService.getRoles(
          params
        );

        setRoles(response.entities);
        setPagination({
          page: response.pagination.page,
          pageSize: response.pagination.pageSize,
          total: response.pagination.total,
        });

        return response;
      } catch (error: any) {
        message.error(error.message || "Error al cargar roles");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message]
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
      } catch (error: any) {
        message.error(error.message || "Error al cargar rol");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  /**
   * Create new role
   */
  const createRole = useCallback(
    async (data: CreateRoleRequest) => {
      setLoading(true);
      try {
        const success = await rolesService.createRole(data);
        if (success) {
          message.success("Rol creado exitosamente");
          // Refresh list
          await fetchRoles();
        }
        return success;
      } catch (error: any) {
        message.error(error.message || "Error al crear rol");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message, fetchRoles]
  );

  /**
   * Update role
   */
  const updateRole = useCallback(
    async (id: string, data: CreateRoleRequest) => {
      setLoading(true);
      try {
        const success = await rolesService.updateRole(id, data);
        if (success) {
          message.success("Rol actualizado exitosamente");
          await fetchRoles();
        }
        return success;
      } catch (error: any) {
        message.error(error.message || "Error al actualizar rol");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message, fetchRoles]
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
