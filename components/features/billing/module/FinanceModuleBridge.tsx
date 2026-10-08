"use client";

import { useFinanceModuleDisabledHandler } from "@/lib/hooks/billing";

/**
 * Escucha los 403 "módulo apagado" de cualquier pantalla y lleva a "Módulo no disponible"
 * sin cerrar la sesión. Se monta una sola vez en la raíz de la app.
 */
export function FinanceModuleBridge() {
  useFinanceModuleDisabledHandler();
  return null;
}
