"use client";

import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { capabilitiesKey, useClinicCapabilitiesSse } from "@/lib/hooks/modules";
import { useAuth } from "@/lib/contexts/auth-context";
import { onClinicModuleDisabled } from "@/lib/modules/module-disabled-events";

export function ClinicModuleBridge() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const refreshCapabilities = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: capabilitiesKey });
  }, [queryClient]);

  useClinicCapabilitiesSse(!!user, refreshCapabilities);

  useEffect(() => onClinicModuleDisabled(() => {
    refreshCapabilities();
  }), [refreshCapabilities]);
  return null;
}
