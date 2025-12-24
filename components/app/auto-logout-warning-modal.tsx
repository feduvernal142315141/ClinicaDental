"use client";

/**
 * MODAL DE ADVERTENCIA DE AUTO-LOGOUT
 *
 * Este modal se muestra cuando el usuario ha estado inactivo por un tiempo prolongado
 * y está a punto de ser desconectado automáticamente.
 *
 * REFACTORED: Ahora usa el componente atómico AlertDialog para mejor reusabilidad
 */

import { AlertDialog } from "@/components/ui/atomic/feedback";

interface AutoLogoutWarningModalProps {
  isOpen: boolean;
  onContinue: () => void;
  onLogout: () => void;
  warningMessage?: string;
}

/**
 * Modal de advertencia antes del auto-logout
 * Se muestra cuando el usuario ha estado inactivo por un tiempo prolongado
 */
export function AutoLogoutWarningModal({
  isOpen,
  onContinue,
  onLogout,
  warningMessage = "Tu sesión está por expirar debido a inactividad. ¿Deseas continuar en el sistema?",
}: AutoLogoutWarningModalProps) {
  return (
    <AlertDialog
      open={isOpen}
      title="Advertencia de Inactividad"
      description={warningMessage}
      variant="warning"
      icon={<span className="text-2xl">⚠️</span>}
      actions={[
        {
          label: "Cerrar Sesión",
          onClick: onLogout,
          variant: "destructive",
          autoClose: false, // No cerrar automáticamente, el logout lo maneja
        },
        {
          label: "Continuar Trabajando",
          onClick: onContinue,
          variant: "default",
          autoClose: false, // No cerrar automáticamente, onContinue lo maneja
        },
      ]}
    />
  );
}
