import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type {
  AlertDialogVariant,
  AlertDialogAction,
  AlertDialogProps,
} from "./alert-dialog";

// ============================================
// VARIANT CONFIGURATIONS
// ============================================

const variantConfig: Record<
  AlertDialogVariant,
  {
    icon: LucideIcon;
    iconColor: string;
    titleColor?: string;
  }
> = {
  info: {
    icon: Info,
    iconColor: "text-blue-600",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-yellow-600",
  },
  error: {
    icon: AlertCircle,
    iconColor: "text-red-600",
  },
  success: {
    icon: CheckCircle,
    iconColor: "text-green-600",
  },
};

// ============================================
// HOOK
// ============================================

export function useAlertDialog({
  icon,
  hideIcon = false,
  variant = "info",
  actions,
  primaryAction,
  cancelAction,
  onOpenChange,
}: Pick<
  AlertDialogProps,
  | "icon"
  | "hideIcon"
  | "variant"
  | "actions"
  | "primaryAction"
  | "cancelAction"
  | "onOpenChange"
>) {
  // Determinar las acciones finales
  const finalActions = React.useMemo(() => {
    if (actions && actions.length > 0) {
      return actions;
    }

    const defaultActions: AlertDialogAction[] = [];

    if (cancelAction) {
      defaultActions.push({
        variant: "outline",
        autoClose: true,
        ...cancelAction,
      });
    }

    if (primaryAction) {
      defaultActions.push({
        variant: "default",
        autoClose: true,
        ...primaryAction,
      });
    }

    // Si no hay acciones definidas, agregar un botón por defecto
    if (defaultActions.length === 0) {
      defaultActions.push({
        label: "Aceptar",
        onClick: () => onOpenChange?.(false),
        variant: "default",
        autoClose: true,
      });
    }

    return defaultActions;
  }, [actions, primaryAction, cancelAction, onOpenChange]);

  // Determinar el ícono a mostrar
  const getIconComponent = React.useCallback(() => {
    if (hideIcon) return null;

    if (icon) {
      // Si es un componente de Lucide
      if (typeof icon === "function") {
        return {
          type: "lucide" as const,
          Icon: icon as LucideIcon,
          className: cn("h-6 w-6", variantConfig[variant].iconColor),
        };
      }
      // Si es un ReactNode
      return { type: "node" as const, node: icon };
    }

    // Usar ícono por defecto de la variante
    return {
      type: "lucide" as const,
      Icon: variantConfig[variant].icon,
      className: cn("h-6 w-6", variantConfig[variant].iconColor),
    };
  }, [icon, hideIcon, variant]);

  const iconData = React.useMemo(() => getIconComponent(), [getIconComponent]);

  // Handler para acciones con autoClose
  const handleActionClick = React.useCallback(
    (action: AlertDialogAction) => {
      action.onClick();
      if (action.autoClose !== false) {
        onOpenChange?.(false);
      }
    },
    [onOpenChange]
  );

  return {
    finalActions,
    iconData,
    handleActionClick,
    variantConfig,
  };
}
