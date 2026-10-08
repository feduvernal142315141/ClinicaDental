"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  GrowthDashboardResponse,
  GrowthCampaignDetailAnalytics,
  GrowthCampaignConversionsResponse,
} from "@/lib/entity/growth";
import {
  getGrowthAnalyticsSummary,
  getGrowthCampaignConversions,
  getGrowthCampaignDetailAnalytics,
  type GrowthAnalyticsParams,
} from "@/lib/services/growth/growth-analytics.service";

interface UseGrowthAnalyticsResult {
  data: GrowthDashboardResponse | null;
  loading: boolean;
  error: string | null;
  params: GrowthAnalyticsParams | undefined;
  refresh: () => void;
  updatePeriod: (params: GrowthAnalyticsParams) => void;
}

export function useGrowthAnalytics(
  initialParams?: GrowthAnalyticsParams,
): UseGrowthAnalyticsResult {
  const [data, setData] = useState<GrowthDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<GrowthAnalyticsParams | undefined>(
    initialParams,
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getGrowthAnalyticsSummary(params);
      setData(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar el resumen de Growth",
      );
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updatePeriod = useCallback((newParams: GrowthAnalyticsParams) => {
    setParams(newParams);
  }, []);

  return { data, loading, error, params, refresh: fetchData, updatePeriod };
}

// ── Campaign detail analytics ───────────────────────────────────────────────

interface UseGrowthCampaignAnalyticsResult {
  data: GrowthCampaignDetailAnalytics | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useGrowthCampaignAnalytics(
  campaignId: string | undefined,
): UseGrowthCampaignAnalyticsResult {
  const [data, setData] = useState<GrowthCampaignDetailAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getGrowthCampaignDetailAnalytics(campaignId);
      setData(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar analíticas",
      );
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}

// ── Campaign conversions ────────────────────────────────────────────────────

interface UseGrowthConversionsResult {
  data: GrowthCampaignConversionsResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useGrowthConversions(
  campaignId: string | undefined,
): UseGrowthConversionsResult {
  const [data, setData] = useState<GrowthCampaignConversionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getGrowthCampaignConversions(campaignId);
      setData(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar conversiones",
      );
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
