"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/contexts/auth-context";
import { billingService } from "@/lib/services/billing";
import type { ClinicModuleCode } from "@/lib/modules/clinic-modules";

export const capabilitiesKey = ["clinic", "capabilities"] as const;

export function useClinicCapabilities() {
  const { user } = useAuth();
  return useQuery({
    queryKey: capabilitiesKey,
    queryFn: () => billingService.getCapabilities(),
    enabled: !!user,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useClinicModules() {
  const query = useClinicCapabilities();
  const modules = useMemo(() => query.data?.modules ?? [], [query.data?.modules]);
  const enabled = useMemo(() => new Set(modules), [modules]);
  const has = useCallback((module: ClinicModuleCode) => enabled.has(module), [enabled]);
  const hasAll = useCallback(
    (required: readonly ClinicModuleCode[]) => required.every((module) => enabled.has(module)),
    [enabled],
  );
  return {
    ...query,
    modules,
    loading: query.isPending && !query.isError,
    has,
    hasAll,
  };
}
