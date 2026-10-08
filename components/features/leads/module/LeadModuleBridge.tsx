"use client";

import { useLeadModuleDisabledHandler } from "@/lib/hooks/leads";

/**
 * Escucha los 403 `MODULE_NOT_ENABLED` de cualquier pantalla (el plan cambió con la sesión
 * abierta) y refresca las capacidades sin cerrar la sesión. Se monta una vez en la raíz.
 */
export function LeadModuleBridge() {
  useLeadModuleDisabledHandler();
  return null;
}
