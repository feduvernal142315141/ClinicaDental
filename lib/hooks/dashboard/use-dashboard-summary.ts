"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardSummary } from "@/lib/entity/dashboard";
import {
  getDashboardSummary,
  DashboardSummaryParams,
} from "@/lib/services/dashboard/dashboard.service";

interface UseDashboardSummaryResult {
  data: DashboardSummary | null;
  loading: boolean;
  error: string | null;
  params: DashboardSummaryParams | undefined;
  refresh: () => void;
  updatePeriod: (params: DashboardSummaryParams) => void;
}

export function useDashboardSummary(
  initialParams?: DashboardSummaryParams,
): UseDashboardSummaryResult {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<DashboardSummaryParams | undefined>(
    initialParams,
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDashboardSummary(params);
      setData(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar el resumen del dashboard",
      );
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updatePeriod = useCallback((newParams: DashboardSummaryParams) => {
    setParams(newParams);
  }, []);

  return { data, loading, error, params, refresh: fetchData, updatePeriod };
}
