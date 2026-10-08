"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ClinicCapabilities } from "@/lib/entity/billing";
import { LEAD_CRM_MODULE } from "@/lib/entity/leads";
import { capabilitiesKey } from "@/lib/hooks/billing/billing-query-keys";
import { useClinicCapabilities } from "@/lib/hooks/billing/use-finance-module";
import { LEAD_MODULE_DISABLED_MESSAGE, onLeadModuleDisabled } from "@/lib/services/leads";
import { notify } from "@/lib/utils/notify";
import { leadKeys } from "./lead-query-keys";
import { useLeadPermissions } from "./use-lead-permissions";

export const LEADS_HOME_ROUTE = "/leads";

export interface LeadModuleState {
  /** true solo si `modules` incluye "LEAD_CRM". */
  enabled: boolean;
  /** true mientras aún no se sabe (primera carga). */
  loading: boolean;
}

/**
 * Interruptor del módulo. Lee las mismas capacidades de la clínica que Finanzas
 * (`GET /clinic/capabilities`, caché compartida) pero no depende de que Finanzas esté activo:
 * cada módulo se enciende y se apaga por separado desde el Control Center.
 */
export function useLeadModule(): LeadModuleState {
  const { data, isPending, isError } = useClinicCapabilities();
  return {
    enabled: !!data?.modules?.includes(LEAD_CRM_MODULE),
    // Si la consulta falla, se trata como apagado: nunca se muestra el módulo a ciegas.
    loading: isPending && !isError,
  };
}

/** El módulo se usa solo si la clínica lo tiene Y el usuario tiene alguna acción sobre `leads`. */
export function useLeadAccess() {
  const state = useLeadModule();
  const permissions = useLeadPermissions();
  return {
    ...state,
    permissions,
    visible: state.enabled && permissions.canView,
  };
}

/**
 * Reacciona al 403 `MODULE_NOT_ENABLED` (el plan cambió con la sesión abierta): marca el módulo
 * como apagado en caché, descarta sus datos, refresca capacidades y avisa. Nunca cierra la sesión.
 * Las pantallas de `/leads` pasan solas a "Módulo no disponible" porque su puerta lee la caché.
 */
export function useLeadModuleDisabledHandler() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return onLeadModuleDisabled(() => {
      const current = queryClient.getQueryData<ClinicCapabilities>(capabilitiesKey);
      const wasEnabled = !!current?.modules?.includes(LEAD_CRM_MODULE);
      queryClient.setQueryData<ClinicCapabilities>(capabilitiesKey, (value) =>
        value ? { ...value, modules: value.modules.filter((module) => module !== LEAD_CRM_MODULE) } : value,
      );
      queryClient.removeQueries({ queryKey: leadKeys.all });
      void queryClient.invalidateQueries({ queryKey: capabilitiesKey });
      // Varias llamadas en vuelo pueden fallar a la vez: se avisa una sola vez.
      if (wasEnabled) notify.warning(LEAD_MODULE_DISABLED_MESSAGE);
    });
  }, [queryClient]);
}
