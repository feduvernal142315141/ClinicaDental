"use client";

/**
 * ALERT DIALOG GLOBAL
 *
 * Muestra alerts críticos controlados por el InterceptorContext.
 * Se usa para errores HTTP importantes (401, 403, 500, etc.)
 *
 * REFACTORED: Ahora usa el componente atómico AlertDialog
 */

import { useAlerts } from "@/contexts/interceptor-context";
import { AlertDialog } from "@/components/ui/atomic/feedback";

export function GlobalAlertDialog() {
  const { alertDialog, closeAlert } = useAlerts();

  // Mapear el tipo de interceptor-context al tipo del componente atómico
  const variantMap = {
    error: "error",
    warning: "warning",
    info: "info",
  } as const;

  return (
    <AlertDialog
      open={alertDialog.isOpen}
      onOpenChange={(open) => !open && closeAlert()}
      title={alertDialog.title}
      description={alertDialog.description}
      variant={variantMap[alertDialog.type] || "info"}
      primaryAction={{
        label: "Entendido",
        onClick: closeAlert,
      }}
    />
  );
}
