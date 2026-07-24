import { useState, useCallback } from "react";
import { billingService } from "@/lib/services/billing";
import type {
  BillingQueryParams,
  ConvertEstimateResult,
  CreateEstimateRequest,
  EstimateResponse,
  PaginatedEstimatesResponse,
  UpdateEstimateRequest,
  UpdateEstimateStatusRequest,
} from "@/lib/entity/billing";
import { notify } from "@/lib/utils/notify";

function errMsg(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useEstimates() {
  const [loading, setLoading] = useState(false);
  const [estimates, setEstimates] = useState<EstimateResponse[]>([]);
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
  });

  const fetchEstimates = useCallback(async (params?: BillingQueryParams) => {
    setLoading(true);
    try {
      const response: PaginatedEstimatesResponse =
        await billingService.getEstimates(params);
      setEstimates(response.entities);
      setPagination((prev) => ({
        page: response.pagination.page,
        pageSize: params?.pageSize ?? prev.pageSize,
        total: response.pagination.total,
      }));
      return response;
    } catch (error: unknown) {
      notify.error(errMsg(error, "Error al cargar presupuestos"), {
        description:
          "No pudimos obtener el listado de presupuestos. Revisa tu conexión e inténtalo de nuevo.",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getEstimateById = useCallback(async (id: string) => {
    setLoading(true);
    try {
      return await billingService.getEstimateById(id);
    } catch (error: unknown) {
      notify.error(errMsg(error, "Error al cargar el presupuesto"), {
        description:
          "No pudimos abrir el detalle del presupuesto. Vuelve a intentarlo.",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const createEstimate = useCallback(async (data: CreateEstimateRequest) => {
    setLoading(true);
    try {
      const created = await billingService.createEstimate(data);
      notify.success("Presupuesto creado", {
        description:
          "El presupuesto quedó guardado. Puedes enviarlo o convertirlo en factura cuando el paciente lo acepte.",
      });
      return created;
    } catch (error: unknown) {
      notify.error(errMsg(error, "Error al crear el presupuesto"), {
        description: "Verifica los ítems y el monto e inténtalo de nuevo.",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateEstimate = useCallback(async (data: UpdateEstimateRequest) => {
    setLoading(true);
    try {
      const updated = await billingService.updateEstimate(data);
      notify.success("Presupuesto actualizado", {
        description: "Los cambios se guardaron correctamente.",
      });
      return updated;
    } catch (error: unknown) {
      notify.error(errMsg(error, "Error al actualizar el presupuesto"), {
        description: "No se pudieron guardar los cambios. Inténtalo de nuevo.",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateEstimateStatus = useCallback(
    async (id: string, data: UpdateEstimateStatusRequest) => {
      setLoading(true);
      try {
        const updated = await billingService.updateEstimateStatus(id, data);
        notify.success("Estado actualizado", {
          description: "El presupuesto cambió de estado correctamente.",
        });
        return updated;
      } catch (error: unknown) {
        notify.error(errMsg(error, "Error al cambiar el estado"), {
          description: "No se pudo actualizar el estado del presupuesto.",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const convertEstimate = useCallback(
    async (id: string): Promise<ConvertEstimateResult> => {
      setLoading(true);
      try {
        const result = await billingService.convertEstimate(id);
        notify.success("Factura generada", {
          description: `Se creó la factura ${result.invoice.code} a partir del presupuesto.`,
        });
        return result;
      } catch (error: unknown) {
        notify.error(errMsg(error, "Error al convertir el presupuesto"), {
          description:
            "No se pudo generar la factura. Verifica que el presupuesto esté aceptado o enviado.",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    loading,
    estimates,
    pagination,
    fetchEstimates,
    getEstimateById,
    createEstimate,
    updateEstimate,
    updateEstimateStatus,
    convertEstimate,
  };
}
