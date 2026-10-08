"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/contexts/auth-context";
import { FINANCE_MODULE, type ClinicCapabilities } from "@/lib/entity/billing";
import { billingService, onFinanceModuleDisabled } from "@/lib/services/billing";
import { billingKeys, capabilitiesKey } from "./billing-query-keys";

/** Ruta que muestra "Módulo no disponible" cuando Finanzas está apagado. */
export const FINANCE_HOME_ROUTE = "/billing";

/**
 * Capacidades de la clínica (`GET /clinic/capabilities`).
 * Cacheadas ~60 s y refrescadas al volver el foco: si KodeWave enciende o apaga un módulo,
 * la UI lo refleja sin volver a iniciar sesión.
 */
export function useClinicCapabilities() {
  const { user } = useAuth();
  return useQuery({
    queryKey: capabilitiesKey,
    queryFn: () => billingService.getCapabilities(),
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

export interface FinanceModuleState {
  /** true solo si `modules` incluye "FINANCE". */
  enabled: boolean;
  /** true mientras aún no se sabe (primera carga). */
  loading: boolean;
}

export function useFinanceModule(): FinanceModuleState {
  const { data, isPending, isError } = useClinicCapabilities();
  return {
    enabled: !!data?.modules?.includes(FINANCE_MODULE),
    // Si la consulta falla, se trata como apagado (no se muestra Finanzas a ciegas).
    loading: isPending && !isError,
  };
}

/**
 * Reacciona al 403 "El módulo de Finanzas no está habilitado para esta clínica.":
 * marca el módulo como apagado en caché, descarta los datos de Finanzas, refresca capabilities
 * y lleva a la pantalla "Módulo no disponible". Nunca cierra la sesión.
 */
export function useFinanceModuleDisabledHandler() {
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    return onFinanceModuleDisabled(() => {
      queryClient.setQueryData<ClinicCapabilities>(capabilitiesKey, (current) =>
        current
          ? { ...current, modules: current.modules.filter((module) => module !== FINANCE_MODULE) }
          : current,
      );
      queryClient.removeQueries({ queryKey: billingKeys.all });
      void queryClient.invalidateQueries({ queryKey: capabilitiesKey });
      router.push(FINANCE_HOME_ROUTE);
    });
  }, [queryClient, router]);
}
