"use client";

import { useState, useCallback, useEffect } from "react";
import {
  serviceGetManagerUsers,
  serviceGetManagerUserById,
  serviceCreateManagerUser,
  serviceUpdateManagerUser,
  serviceChangePassword,
  serviceDeleteManagerUser,
  ManagerUserFilters,
  ManagerUserOrders,
} from "@/lib/services/manager-users";
import {
  ManagerUser,
  ManagerUserListItem,
  CreateManagerUserRequest,
  UpdateManagerUserRequest,
  ChangePasswordRequest,
} from "@/lib/entity/manager-users";
import { QueryModel } from "@/lib/models/queryModel";
import { QueryPaginationModel } from "@/lib/models/queryPaginationModel";

interface UseManagerUsersOptions {
  /** Initial page size */
  initialPageSize?: number;
  /** Whether to load data on mount */
  loadOnMount?: boolean;
  /** Initial filters */
  initialFilters?: string[];
  /** Initial order */
  initialOrder?: string[];
}

interface UseManagerUsersReturn {
  // State
  users: ManagerUserListItem[];
  selectedUser: ManagerUser | null;
  isLoading: boolean;
  error: string | null;
  pagination: QueryPaginationModel;

  // List actions
  loadUsers: (query?: QueryModel) => Promise<void>;
  loadUserById: (id: string) => Promise<ManagerUser | null>;
  refreshUsers: () => Promise<void>;

  // CRUD actions
  createUser: (data: CreateManagerUserRequest) => Promise<string | null>;
  updateUser: (data: UpdateManagerUserRequest) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  changePassword: (data: ChangePasswordRequest) => Promise<boolean>;

  // Pagination
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // Filters
  setFilters: (filters: string[]) => void;
  addFilter: (filter: string) => void;
  removeFilter: (filter: string) => void;
  clearFilters: () => void;

  // Sorting
  setOrders: (orders: string[]) => void;

  // Utilities
  clearError: () => void;
  clearSelectedUser: () => void;

  // Filter presets
  filterPresets: typeof ManagerUserFilters;
  orderPresets: typeof ManagerUserOrders;
}

/**
 * Hook for managing manager users CRUD operations
 *
 * @example
 * const {
 *   users,
 *   isLoading,
 *   loadUsers,
 *   createUser,
 *   pagination,
 *   setPage,
 *   filterPresets
 * } = useManagerUsers({ initialPageSize: 10 });
 *
 * // Load users on component mount
 * useEffect(() => {
 *   loadUsers();
 * }, [loadUsers]);
 *
 * // Filter by active users
 * setFilters([filterPresets.byActive(true)]);
 */
export function useManagerUsers(
  options: UseManagerUsersOptions = {}
): UseManagerUsersReturn {
  const {
    initialPageSize = 10,
    loadOnMount = false,
    initialFilters = [],
    initialOrder = [ManagerUserOrders.newestFirst()],
  } = options;

  // State
  const [users, setUsers] = useState<ManagerUserListItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<ManagerUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<QueryPaginationModel>({
    page: 0,
    pageSize: initialPageSize,
    total: 0,
  });

  // Query state
  const [filters, setFiltersState] = useState<string[]>(initialFilters);
  const [orders, setOrdersState] = useState<string[]>(initialOrder);

  /**
   * Build query model from current state
   */
  const buildQuery = useCallback(
    (overrides?: Partial<QueryModel>): QueryModel => ({
      page: pagination.page,
      pageSize: pagination.pageSize,
      filters: filters.length > 0 ? filters : undefined,
      orderBy: orders.length > 0 ? orders : undefined,
      ...overrides,
    }),
    [pagination.page, pagination.pageSize, filters, orders]
  );

  /**
   * Load users with current query
   */
  const loadUsers = useCallback(
    async (query?: QueryModel): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await serviceGetManagerUsers(query || buildQuery());

        if (response.status === 200) {
          setUsers(response.data.entities || []);
          setPagination(
            response.data.pagination || {
              page: 0,
              pageSize: initialPageSize,
              total: 0,
            }
          );
        } else {
          setError(response.data?.message || "Error al cargar usuarios");
        }
      } catch (err) {
        setError("Error de conexión");
      } finally {
        setIsLoading(false);
      }
    },
    [buildQuery, initialPageSize]
  );

  /**
   * Load single user by ID
   */
  const loadUserById = useCallback(
    async (id: string): Promise<ManagerUser | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await serviceGetManagerUserById(id);

        if (response.status === 200) {
          setSelectedUser(response.data);
          return response.data;
        }

        setError(response.data?.message || "Error al cargar usuario");
        return null;
      } catch (err) {
        setError("Error de conexión");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Refresh users list with current query
   */
  const refreshUsers = useCallback(async (): Promise<void> => {
    await loadUsers(buildQuery());
  }, [loadUsers, buildQuery]);

  /**
   * Create new user
   */
  const createUser = useCallback(
    async (data: CreateManagerUserRequest): Promise<string | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await serviceCreateManagerUser(data);

        if (response.status === 201 || response.status === 200) {
          await refreshUsers();
          return response.data as unknown as string;
        }

        setError(response.data?.message || "Error al crear usuario");
        return null;
      } catch (err) {
        setError("Error de conexión");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshUsers]
  );

  /**
   * Update existing user
   */
  const updateUser = useCallback(
    async (data: UpdateManagerUserRequest): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await serviceUpdateManagerUser(data);

        if (response.status === 200) {
          await refreshUsers();
          return true;
        }

        setError(response.data?.message || "Error al actualizar usuario");
        return false;
      } catch (err) {
        setError("Error de conexión");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshUsers]
  );

  /**
   * Change user password
   */
  const changePassword = useCallback(
    async (data: ChangePasswordRequest): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await serviceChangePassword(data);

        if (response.status === 200) {
          return true;
        }

        setError(response.data?.message || "Error al cambiar contraseña");
        return false;
      } catch (err) {
        setError("Error de conexión");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Delete user by ID
   */
  const deleteUser = useCallback(
    async (id: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await serviceDeleteManagerUser(id);

        if (response.status === 200 || response.status === 204) {
          await refreshUsers();
          return true;
        }

        setError(response.data?.message || "Error al eliminar usuario");
        return false;
      } catch (err) {
        setError("Error de conexión");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshUsers]
  );

  // Pagination handlers
  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize, page: 0 }));
  }, []);

  // Filter handlers
  const setFilters = useCallback((newFilters: string[]) => {
    setFiltersState(newFilters);
    setPagination((prev) => ({ ...prev, page: 0 }));
  }, []);

  const addFilter = useCallback((filter: string) => {
    setFiltersState((prev) => [...prev, filter]);
    setPagination((prev) => ({ ...prev, page: 0 }));
  }, []);

  const removeFilter = useCallback((filter: string) => {
    setFiltersState((prev) => prev.filter((f) => f !== filter));
    setPagination((prev) => ({ ...prev, page: 0 }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState([]);
    setPagination((prev) => ({ ...prev, page: 0 }));
  }, []);

  // Order handlers
  const setOrders = useCallback((newOrders: string[]) => {
    setOrdersState(newOrders);
  }, []);

  // Utility handlers
  const clearError = useCallback(() => setError(null), []);
  const clearSelectedUser = useCallback(() => setSelectedUser(null), []);

  // Load on mount if enabled
  useEffect(() => {
    if (loadOnMount) {
      loadUsers();
    }
  }, [loadOnMount, loadUsers]);

  // Reload when pagination or filters change
  useEffect(() => {
    if (loadOnMount) {
      loadUsers(buildQuery());
    }
  }, [pagination.page, pagination.pageSize, filters, orders]);

  return {
    // State
    users,
    selectedUser,
    isLoading,
    error,
    pagination,

    // List actions
    loadUsers,
    loadUserById,
    refreshUsers,

    // CRUD actions
    createUser,
    updateUser,
    deleteUser,
    changePassword,

    // Pagination
    setPage,
    setPageSize,

    // Filters
    setFilters,
    addFilter,
    removeFilter,
    clearFilters,

    // Sorting
    setOrders,

    // Utilities
    clearError,
    clearSelectedUser,

    // Filter presets
    filterPresets: ManagerUserFilters,
    orderPresets: ManagerUserOrders,
  };
}
