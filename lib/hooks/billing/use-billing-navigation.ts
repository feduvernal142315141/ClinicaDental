"use client";

import { useMemo } from "react";
import {
  BarChart3,
  Banknote,
  ClipboardList,
  FileText,
  LayoutGrid,
  Receipt,
  Settings2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useBillingPermissions, type BillingPermissions } from "./use-billing-permissions";
import { useFinanceModule } from "./use-finance-module";

export interface BillingSection {
  path: string;
  label: string;
  icon: LucideIcon;
}

const SECTIONS: Array<BillingSection & { visible: (p: BillingPermissions) => boolean }> = [
  { path: "/billing", label: "Resumen", icon: LayoutGrid, visible: (p) => p.canView },
  { path: "/billing/charges", label: "Cargos pendientes", icon: ClipboardList, visible: (p) => p.canView },
  { path: "/billing/estimates", label: "Presupuestos", icon: FileText, visible: (p) => p.canView },
  { path: "/billing/invoices", label: "Recibos", icon: Receipt, visible: (p) => p.canView },
  { path: "/billing/payments", label: "Pagos y devoluciones", icon: Banknote, visible: (p) => p.canView },
  { path: "/billing/cash", label: "Caja", icon: Wallet, visible: (p) => p.canView },
  { path: "/billing/reports", label: "Reportes", icon: BarChart3, visible: (p) => p.canViewReports },
  { path: "/billing/settings", label: "Configuración", icon: Settings2, visible: (p) => p.isAdmin },
];

/** Subsecciones de Finanzas visibles para el usuario (vacío si el módulo está apagado). */
export function useBillingSections(): BillingSection[] {
  const permissions = useBillingPermissions();
  const { enabled } = useFinanceModule();
  return useMemo(
    () =>
      enabled
        ? SECTIONS.filter((section) => section.visible(permissions)).map(({ path, label, icon }) => ({
            path,
            label,
            icon,
          }))
        : [],
    [enabled, permissions],
  );
}
