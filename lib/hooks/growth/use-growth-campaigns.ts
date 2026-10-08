"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  GrowthCampaign,
  GrowthCampaignListResponse,
  GrowthCampaignQueryParams,
} from "@/lib/entity/growth";
import {
  getGrowthCampaigns,
  getGrowthCampaignById,
  sendGrowthCampaignNow,
  scheduleGrowthCampaign,
  pauseGrowthCampaign,
  resumeGrowthCampaign,
  cancelGrowthCampaign,
  getGrowthCampaignMessages,
} from "@/lib/services/growth/growth-campaigns.service";
import { notify } from "@/lib/utils/notify";
import { useQuery } from "@tanstack/react-query";
import { growthErrorMessage } from "@/lib/services/growth/growth-errors";
import { notifyGrowthError } from "./growth-notify";

interface UseGrowthCampaignsResult {
  campaigns: GrowthCampaign[];
  pagination: GrowthCampaignListResponse["pagination"] | null;
  loading: boolean;
  error: string | null;
  query: GrowthCampaignQueryParams;
  setQuery: (q: GrowthCampaignQueryParams) => void;
  refresh: () => void;
}

export function useGrowthCampaigns(
  initialQuery?: GrowthCampaignQueryParams,
): UseGrowthCampaignsResult {
  const [campaigns, setCampaigns] = useState<GrowthCampaign[]>([]);
  const [pagination, setPagination] =
    useState<GrowthCampaignListResponse["pagination"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<GrowthCampaignQueryParams>(
    initialQuery ?? { page: 0, pageSize: 20 },
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getGrowthCampaigns(query);
      setCampaigns(result.entities ?? []);
      setPagination(result.pagination ?? null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al cargar campañas",
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    campaigns,
    pagination,
    loading,
    error,
    query,
    setQuery,
    refresh: fetchData,
  };
}

// ── Campaign detail ─────────────────────────────────────────────────────────

interface UseGrowthCampaignDetailResult {
  campaign: GrowthCampaign | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useGrowthCampaignDetail(
  id: string | undefined,
): UseGrowthCampaignDetailResult {
  const [campaign, setCampaign] = useState<GrowthCampaign | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getGrowthCampaignById(id);
      setCampaign(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al cargar la campaña",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { campaign, loading, error, refresh: fetchData };
}

// ── Campaign lifecycle actions ──────────────────────────────────────────────
// Backend: schedule takes NO body (scheduledAt is set at create/update time).

export function useGrowthCampaignActions(onSuccess?: () => void) {
  const [acting, setActing] = useState(false);

  const exec = useCallback(
    async (action: () => Promise<void>, successMsg: string) => {
      setActing(true);
      try {
        await action();
        notify.success(successMsg);
        onSuccess?.();
      } catch (err: unknown) {
        notifyGrowthError(err, "Error al ejecutar la acción");
      } finally {
        setActing(false);
      }
    },
    [onSuccess],
  );

  return {
    acting,
    sendNow: (id: string) =>
      exec(() => sendGrowthCampaignNow(id), "Campaña enviada"),
    schedule: (id: string) =>
      exec(() => scheduleGrowthCampaign(id), "Campaña programada"),
    pause: (id: string) =>
      exec(() => pauseGrowthCampaign(id), "Campaña pausada"),
    resume: (id: string) =>
      exec(() => resumeGrowthCampaign(id), "Campaña reanudada"),
    cancel: (id: string) =>
      exec(() => cancelGrowthCampaign(id), "Campaña cancelada"),
  };
}

// ── Campaign recipients ─────────────────────────────────────────────────────

export const CAMPAIGN_RECIPIENTS_PAGE_SIZE = 20;

/**
 * Recipients of a campaign, one page at a time. Without permission over the audience the
 * backend answers with an empty page and the real total: the screen shows only the number.
 */
export function useGrowthCampaignMessages(campaignId: string | undefined, page: number, enabled = true) {
  const query = useQuery({
    queryKey: ["growth", "campaign-messages", campaignId, page] as const,
    queryFn: () =>
      getGrowthCampaignMessages(campaignId as string, { page, pageSize: CAMPAIGN_RECIPIENTS_PAGE_SIZE }),
    enabled: enabled && !!campaignId,
    retry: false,
    placeholderData: (previous) => previous,
  });

  return {
    data: query.data ?? null,
    loading: query.isPending && query.fetchStatus !== "idle",
    error: query.isError ? growthErrorMessage(query.error, "Error al cargar los destinatarios") : null,
  };
}
