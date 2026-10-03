"use client";

import { useCallback } from "react";
import { notify } from "@/lib/utils/notify";
import { useBillingPermissions } from "./use-billing-permissions";
import { useFinanceSettings } from "./use-billing-queries";
import { useFinanceModule } from "./use-finance-module";

/**
 * Aviso opcional de la agenda (§9): al completar una cita, el BACKEND crea los cargos
 * (según `chargePolicy`); el front no llama a Finanzas. Solo informa, si el módulo está
 * activo, el usuario ve Finanzas y la política no es OFF.
 */
export function useFinanceChargesNotice() {
  const { enabled } = useFinanceModule();
  const { canView } = useBillingPermissions();
  const settings = useFinanceSettings({ enabled: enabled && canView });
  const policy = settings.data?.chargePolicy;

  return useCallback(() => {
    if (!enabled || !canView || !policy || policy === "OFF") return;
    notify.info("Cargos enviados a Finanzas", {
      description:
        policy === "AUTO"
          ? "Se emitió el recibo con los servicios de la cita."
          : "Los servicios de la cita quedaron como cargos pendientes de cobro.",
    });
  }, [enabled, canView, policy]);
}
