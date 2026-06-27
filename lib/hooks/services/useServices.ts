import { useState, useCallback } from "react";

import { servicesService } from "@/lib/services/services";
import type {
  ServiceListItem,
  CreateServiceRequest,
  UpdateServiceRequest,
  ServicesQueryParams,
  PaginatedServicesResponse,
} from "@/lib/entity/services";
import { notify } from "@/lib/utils/notify";

/** Extrae un mensaje seguro de un error de tipo unknown. */
function errMsg(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * useServices Hook
 *
 * Hook for managing clinic services CRUD operations
 */
export function useServices() {
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
  });

  /**
   * Fetch paginated services list
   */
  const fetchServices = useCallback(
    async (params?: ServicesQueryParams) => {
      setLoading(true);
      try {
        const response: PaginatedServicesResponse =
          await servicesService.getServices(params);

        // pageSize is sourced from the request params, not the backend echo,
        // because some backends return the actual result count as pageSize.
        setServices(response.entities);
        setPagination((prev) => ({
          page: response.pagination.page,
          pageSize: params?.pageSize ?? prev.pageSize,
          total: response.pagination.total,
        }));

        return response;
      } catch (error: unknown) {
        notify.error(errMsg(error, "Error al cargar servicios"));
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Get service by ID
   */
  const getServiceById = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const service = await servicesService.getServiceById(id);
        return service;
      } catch (error: unknown) {
        notify.error(errMsg(error, "Error al cargar servicio"));
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Create new service
   */
  const createService = useCallback(
    async (data: CreateServiceRequest) => {
      setLoading(true);
      try {
        const success = await servicesService.createService(data);
        if (success) {
          notify.success("Servicio creado exitosamente");
          // No refrescamos aquí: el form navega de vuelta a la lista, que
          // re-monta y refetch-ea (evita un request desperdiciado).
        }
        return success;
      } catch (error: unknown) {
        notify.error(errMsg(error, "Error al crear servicio"));
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Update service
   */
  const updateService = useCallback(
    async (id: string, data: Omit<UpdateServiceRequest, "id">) => {
      setLoading(true);
      try {
        const success = await servicesService.updateService(id, data);
        if (success) {
          notify.success("Servicio actualizado exitosamente");
          // El form navega de vuelta a la lista (que refetch-ea al montar).
        }
        return success;
      } catch (error: unknown) {
        notify.error(errMsg(error, "Error al actualizar servicio"));
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Toggle service status (activate/inactivate)
   */
  const toggleServiceStatus = useCallback(
    async (id: string, currentlyActive: boolean) => {
      setLoading(true);
      try {
        const success = await servicesService.toggleServiceStatus(id);
        if (success) {
          notify.success(
            currentlyActive
              ? "Servicio inactivado exitosamente"
              : "Servicio activado exitosamente",
          );
          // El refetch lo dispara la lista CON sus filtros/orden/página activos
          // (refetch sin args perdería el filtro "ocultar inactivos").
        }
        return success;
      } catch (error: unknown) {
        notify.error(errMsg(error, "Error al cambiar estado del servicio"));
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    loading,
    services,
    pagination,
    fetchServices,
    getServiceById,
    createService,
    updateService,
    toggleServiceStatus,
  };
}
