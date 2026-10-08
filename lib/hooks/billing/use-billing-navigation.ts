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
import { useI18n } from "@/lib/contexts/i18n-context";
import type { TranslationKey } from "@/lib/i18n/translations";
import { useBillingPermissions, type BillingPermissions } from "./use-billing-permissions";
import { useFinanceModule } from "./use-finance-module";

export interface BillingSection {
  path: string;
  label: string;
  icon: LucideIcon;
}

const SECTIONS: Array<BillingSection & { visible: (p: BillingPermissions) => boolean }> = [
  { path: "/billing", label: "billing.navigation.summary", icon: LayoutGrid, visible: (p) => p.canView },
  { path: "/billing/charges", label: "billing.navigation.charges", icon: ClipboardList, visible: (p) => p.canView },
  { path: "/billing/estimates", label: "billing.navigation.estimates", icon: FileText, visible: (p) => p.canView },
  { path: "/billing/invoices", label: "billing.navigation.invoices", icon: Receipt, visible: (p) => p.canView },
  { path: "/billing/payments", label: "billing.navigation.payments", icon: Banknote, visible: (p) => p.canView },
  { path: "/billing/cash", label: "billing.navigation.cash", icon: Wallet, visible: (p) => p.canView },
  { path: "/billing/reports", label: "billing.navigation.reports", icon: BarChart3, visible: (p) => p.canViewReports },
  { path: "/billing/settings", label: "billing.navigation.settings", icon: Settings2, visible: (p) => p.isAdmin },
];

/** Subsecciones de Finanzas visibles para el usuario (vacío si el módulo está apagado). */
export function useBillingSections(): BillingSection[] {
  const permissions = useBillingPermissions();
  const { enabled } = useFinanceModule();
  const { t } = useI18n();
  return useMemo(
    () =>
      enabled
        ? SECTIONS.filter((section) => section.visible(permissions)).map(({ path, label, icon }) => ({
            path,
            label: t(label as TranslationKey),
            icon,
          }))
        : [],
    [enabled, permissions, t],
  );
}
