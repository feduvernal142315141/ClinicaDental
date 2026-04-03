import { useState, useCallback } from "react";
import { App } from "antd";
import { servicesService } from "@/lib/services/services";
import type {
  ServiceListItem,
  CreateServiceRequest,
  UpdateServiceRequest,
  ServicesQueryParams,
  PaginatedServicesResponse,
} from "@/lib/entity/services";

/**
 * useServices Hook
 *
 * Hook for managing clinic services CRUD operations
 */
export function useServices() {
  const { message } = App.useApp();
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

        setServices(response.entities);
        setPagination({
          page: response.pagination.page,
          pageSize: response.pagination.pageSize,
          total: response.pagination.total,
        });

        return response;
      } catch (error: any) {
        message.error(error.message || "Error al cargar servicios");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message],
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
      } catch (error: any) {
        message.error(error.message || "Error al cargar servicio");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message],
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
          message.success("Servicio creado exitosamente");
          await fetchServices();
        }
        return success;
      } catch (error: any) {
        message.error(error.message || "Error al crear servicio");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message, fetchServices],
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
          message.success("Servicio actualizado exitosamente");
          await fetchServices();
        }
        return success;
      } catch (error: any) {
        message.error(error.message || "Error al actualizar servicio");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message, fetchServices],
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
          message.success(
            currentlyActive
              ? "Servicio inactivado exitosamente"
              : "Servicio activado exitosamente",
          );
          await fetchServices();
        }
        return success;
      } catch (error: any) {
        message.error(error.message || "Error al cambiar estado del servicio");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message, fetchServices],
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
