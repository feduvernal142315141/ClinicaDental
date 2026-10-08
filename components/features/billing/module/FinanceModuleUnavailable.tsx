"use client";

import { Lock, WalletCards } from "lucide-react";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";
import { useI18n } from "@/lib/contexts/i18n-context";

/** "Módulo no disponible": la clínica no tiene Finanzas activo. */
export function FinanceModuleUnavailable() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center">
      <EmptyState
        icon={WalletCards}
        variant="card"
        title={t("billing.module.unavailableTitle")}
        description={t("billing.module.unavailableDescription")}
        className="w-full"
      />
    </div>
  );
}

/** El módulo está activo pero el usuario no tiene el permiso que pide la pantalla. */
export function FinanceNoPermission({ description }: { description?: string }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl items-center">
      <EmptyState
        icon={Lock}
        variant="card"
        title={t("billing.module.noPermissionTitle")}
        description={description ?? t("billing.module.noPermissionDescription")}
        className="w-full"
      />
    </div>
  );
}
