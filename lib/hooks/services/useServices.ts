import { useState, useCallback } from "react";

import { servicesService } from "@/lib/services/services";
import { useI18n } from "@/lib/contexts/i18n-context";
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
  const { t } = useI18n();
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
        notify.error(errMsg(error, t("services.notify.loadListError")), {
          description: t("services.notify.loadListDescription"),
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [t],
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
        notify.error(errMsg(error, t("services.notify.loadOneError")), {
          description: t("services.notify.loadOneDescription"),
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [t],
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
          notify.success(t("services.notify.createSuccess"), {
            description: t("services.notify.createSuccessDescription"),
          });
          // No refrescamos aquí: el form navega de vuelta a la lista, que
          // re-monta y refetch-ea (evita un request desperdiciado).
        }
        return success;
      } catch (error: unknown) {
        notify.error(errMsg(error, t("services.notify.createError")), {
          description: t("services.notify.createErrorDescription"),
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [t],
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
          notify.success(t("services.notify.updateSuccess"), {
            description: t("services.notify.updateSuccessDescription"),
          });
          // El form navega de vuelta a la lista (que refetch-ea al montar).
        }
        return success;
      } catch (error: unknown) {
        notify.error(errMsg(error, t("services.notify.updateError")), {
          description: t("services.notify.updateErrorDescription"),
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [t],
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
              ? t("services.notify.deactivateSuccess")
              : t("services.notify.activateSuccess"),
            {
              description: currentlyActive
                ? t("services.notify.deactivateSuccessDescription")
                : t("services.notify.activateSuccessDescription"),
            },
          );
          // El refetch lo dispara la lista CON sus filtros/orden/página activos
          // (refetch sin args perdería el filtro "ocultar inactivos").
        }
        return success;
      } catch (error: unknown) {
        notify.error(errMsg(error, t("services.notify.statusError")), {
          description: t("services.notify.statusErrorDescription"),
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [t],
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
          next
            ? t("services.notify.odontogramVisibleSuccess")
            : t("services.notify.generalSuccess"),
          {
            description: next
              ? t("services.notify.odontogramVisibleDescription")
              : t("services.notify.generalDescription"),
          },
        );
        return true;
      } catch (error: unknown) {
        // El switch se conmutó desde el valor contrario, así que revertir es
        // volver a `!next` (no hace falta capturar el valor previo).
        applyLocally(!next);
        notify.error(
          errMsg(error, t("services.notify.odontogramVisibilityError")),
          {
            description: t("services.notify.odontogramVisibilityErrorDescription"),
          },
        );
        return false;
      }
    },
    [t],
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
