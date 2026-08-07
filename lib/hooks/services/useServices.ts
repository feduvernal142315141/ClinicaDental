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
        notify.error(errMsg(error, "Error al cargar servicios"), {
          description:
            "No pudimos obtener el listado de servicios. Revisa tu conexión e inténtalo de nuevo; si continúa, contacta a soporte.",
        });
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
        notify.error(errMsg(error, "Error al cargar servicio"), {
          description:
            "No pudimos cargar los datos de este servicio. Vuelve a intentarlo en unos segundos; si persiste, contacta a soporte.",
        });
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
          notify.success("Servicio creado", {
            description:
              "El servicio ya está disponible en el listado y puedes asignarlo a las citas.",
          });
          // No refrescamos aquí: el form navega de vuelta a la lista, que
          // re-monta y refetch-ea (evita un request desperdiciado).
        }
        return success;
      } catch (error: unknown) {
        notify.error(errMsg(error, "Error al crear servicio"), {
          description:
            "No se pudo registrar el servicio. Verifica los datos y tu conexión e inténtalo de nuevo; si persiste, contacta a soporte.",
        });
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
          notify.success("Servicio actualizado", {
            description:
              "Los cambios se guardaron y ya se reflejan en el listado de servicios.",
          });
          // El form navega de vuelta a la lista (que refetch-ea al montar).
        }
        return success;
      } catch (error: unknown) {
        notify.error(errMsg(error, "Error al actualizar servicio"), {
          description:
            "No se pudieron guardar los cambios. Revisa los datos y tu conexión e inténtalo de nuevo; si persiste, contacta a soporte.",
        });
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
            currentlyActive ? "Servicio inactivado" : "Servicio activado",
            {
              description: currentlyActive
                ? "El servicio queda oculto para nuevas citas; puedes reactivarlo cuando lo necesites."
                : "El servicio vuelve a estar disponible para asignarlo a las citas.",
            },
          );
          // El refetch lo dispara la lista CON sus filtros/orden/página activos
          // (refetch sin args perdería el filtro "ocultar inactivos").
        }
        return success;
      } catch (error: unknown) {
        notify.error(errMsg(error, "Error al cambiar estado del servicio"), {
          description:
            "No se pudo actualizar el estado del servicio. Inténtalo de nuevo en unos segundos; si persiste, contacta a soporte.",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Marca/desmarca un servicio como "visible en odontograma".
   *
   * Optimista: pinta el nuevo valor en la fila ANTES de la respuesta y revierte
   * si el PATCH falla. No toca `loading` a propósito — ese flag pone la tabla
   * entera en estado de carga y un switch inline no debe vaciar el listado.
   *
   * A DIFERENCIA de `createService`/`updateService`/`toggleServiceStatus`, este
   * método NO relanza: notifica el error, revierte la fila y devuelve `false`.
   * El contrato es el booleano, no la excepción — el llamador decide por el
   * valor de retorno (p. ej. recargar solo si fue `true`).
   */
  const setOdontogramVisibility = useCallback(
    async (id: string, next: boolean) => {
      const applyLocally = (value: boolean) =>
        setServices((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, odontogramEnabled: value } : s,
          ),
        );

      applyLocally(next);

      try {
        await servicesService.setOdontogramVisibility(id, next);
        notify.success(
          next ? "Servicio visible en odontograma" : "Servicio general",
          {
            description: next
              ? "Se planificará diente a diente desde el odontograma del paciente."
              : "Se planificará a nivel de paciente, sin asignarlo a una pieza dental.",
          },
        );
        return true;
      } catch (error: unknown) {
        // El switch se conmutó desde el valor contrario, así que revertir es
        // volver a `!next` (no hace falta capturar el valor previo).
        applyLocally(!next);
        notify.error(
          errMsg(error, "No se pudo cambiar la visibilidad en el odontograma"),
          {
            description:
              "El servicio se quedó como estaba. Inténtalo de nuevo en unos segundos; si persiste, contacta a soporte.",
          },
        );
        return false;
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
    setOdontogramVisibility,
  };
}
