import { useState, useCallback } from "react";
import { billingService } from "@/lib/services/billing";
import type {
  BillingQueryParams,
  PaginatedReceivablesResponse,
  ReceivableListItem,
} from "@/lib/entity/billing";
import { notify } from "@/lib/utils/notify";

function errMsg(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useReceivables() {
  const [loading, setLoading] = useState(false);
  const [receivables, setReceivables] = useState<ReceivableListItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
  });

  const fetchReceivables = useCallback(async (params?: BillingQueryParams) => {
    setLoading(true);
    try {
      const response: PaginatedReceivablesResponse =
        await billingService.getReceivables(params);
      setReceivables(response.entities);
      setPagination((prev) => ({
        page: response.pagination.page,
        pageSize: params?.pageSize ?? prev.pageSize,
        total: response.pagination.total,
      }));
      return response;
    } catch (error: unknown) {
      notify.error(errMsg(error, "Error al cargar cuentas por cobrar"), {
        description:
          "No pudimos obtener los saldos pendientes. Revisa tu conexión e inténtalo de nuevo.",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    receivables,
    pagination,
    fetchReceivables,
  };
}
