"use client";

import {
  useBillingPermissions,
  useFinanceModule,
  type BillingPermissions,
} from "@/lib/hooks/billing";
import { useI18n } from "@/lib/contexts/i18n-context";
import { FinanceModuleUnavailable, FinanceNoPermission } from "./FinanceModuleUnavailable";
import { PageSkeleton } from "../shared/BillingSkeletons";

interface FinanceGateProps {
  children: React.ReactNode;
  /** Permiso extra que pide la pantalla (por defecto: ver Finanzas). */
  allow?: (permissions: BillingPermissions) => boolean;
  /** Texto de "sin permiso" específico de la pantalla. */
  deniedDescription?: string;
}

/**
 * Puerta de toda ruta `/billing/*`:
 * 1. módulo apagado (`modules` sin "FINANCE") → "Módulo no disponible";
 * 2. sin permiso para la pantalla → "No tienes permiso para esta acción";
 * 3. si no, la pantalla.
 */
export function FinanceGate({ children, allow, deniedDescription }: FinanceGateProps) {
  const { enabled, loading } = useFinanceModule();
  const permissions = useBillingPermissions();
  const { t } = useI18n();

  if (loading) return <PageSkeleton label={t("billing.loading.finance")} />;
  if (!enabled) return <FinanceModuleUnavailable />;
  if (!permissions.canView || (allow && !allow(permissions))) {
    return <FinanceNoPermission description={deniedDescription} />;
  }
  return <>{children}</>;
}
