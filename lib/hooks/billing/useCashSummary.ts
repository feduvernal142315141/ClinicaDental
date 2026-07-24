import { useCallback, useEffect, useState } from "react";
import { billingService } from "@/lib/services/billing";
import type { CashSummaryResponse } from "@/lib/entity/billing";
import { notify } from "@/lib/utils/notify";
import { localTodayInput } from "@/lib/datetime";

function errMsg(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** YYYY-MM-DD desde datetime-local o solo fecha. */
function todayYmd(): string {
  return localTodayInput().slice(0, 10);
}

export function useCashSummary(initialDate?: string) {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(initialDate ?? todayYmd());
  const [summary, setSummary] = useState<CashSummaryResponse | null>(null);

  const fetchSummary = useCallback(async (forDate = date) => {
    setLoading(true);
    try {
      const data = await billingService.getCashSummary(forDate);
      setSummary(data);
      return data;
    } catch (error: unknown) {
      notify.error(errMsg(error, "Error al cargar la caja"), {
        description:
          "No pudimos obtener el resumen de cobros. Revisa tu conexión e inténtalo de nuevo.",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void fetchSummary(date);
  }, [date, fetchSummary]);

  return { loading, summary, date, setDate, fetchSummary };
}
