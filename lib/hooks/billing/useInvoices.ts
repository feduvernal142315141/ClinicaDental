import { useState, useCallback } from "react";
import { billingService } from "@/lib/services/billing";
import type {
  BillingQueryParams,
  CreateInvoiceRequest,
  InvoiceResponse,
  PaginatedInvoicesResponse,
  UpdateInvoiceRequest,
} from "@/lib/entity/billing";
import { notify } from "@/lib/utils/notify";

function errMsg(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useInvoices() {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
  });

  const fetchInvoices = useCallback(async (params?: BillingQueryParams) => {
    setLoading(true);
    try {
      const response: PaginatedInvoicesResponse =
        await billingService.getInvoices(params);
      setInvoices(response.entities);
      setPagination((prev) => ({
        page: response.pagination.page,
        pageSize: params?.pageSize ?? prev.pageSize,
        total: response.pagination.total,
      }));
      return response;
    } catch (error: unknown) {
      notify.error(errMsg(error, "Error al cargar facturas"), {
        description:
          "No pudimos obtener el listado de facturas. Revisa tu conexión e inténtalo de nuevo.",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getInvoiceById = useCallback(async (id: string) => {
    setLoading(true);
    try {
      return await billingService.getInvoiceById(id);
    } catch (error: unknown) {
      notify.error(errMsg(error, "Error al cargar la factura"), {
        description: "No pudimos abrir el detalle de la factura.",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const createInvoice = useCallback(async (data: CreateInvoiceRequest) => {
    setLoading(true);
    try {
      const created = await billingService.createInvoice(data);
      notify.success("Factura emitida", {
        description:
          "La factura quedó registrada en la cuenta del paciente. Ya puedes anotar pagos.",
      });
      return created;
    } catch (error: unknown) {
      notify.error(errMsg(error, "Error al crear la factura"), {
        description: "Verifica los ítems y el monto e inténtalo de nuevo.",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateInvoice = useCallback(async (data: UpdateInvoiceRequest) => {
    setLoading(true);
    try {
      const updated = await billingService.updateInvoice(data);
      notify.success("Factura actualizada", {
        description: "Los cambios se guardaron correctamente.",
      });
      return updated;
    } catch (error: unknown) {
      notify.error(errMsg(error, "Error al actualizar la factura"), {
        description: "No se pudieron guardar los cambios.",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const voidInvoice = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const voided = await billingService.voidInvoice(id);
      notify.success("Factura anulada", {
        description: "La factura quedó marcada como anulada.",
      });
      return voided;
    } catch (error: unknown) {
      notify.error(errMsg(error, "Error al anular la factura"), {
        description:
          "No se pudo anular. Si tiene pagos, anúlalos primero y vuelve a intentarlo.",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    invoices,
    pagination,
    fetchInvoices,
    getInvoiceById,
    createInvoice,
    updateInvoice,
    voidInvoice,
  };
}
