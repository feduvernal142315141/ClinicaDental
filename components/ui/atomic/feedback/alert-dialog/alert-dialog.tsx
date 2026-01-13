"use client";

/**
 * ATOMIC ALERT DIALOG COMPONENT
 *
 * Componente atómico 100% customizable para AlertDialogs.
 * Sigue los principios de Screaming Architecture: componentes atómicos, reutilizables y composables.
 *
 * Características:
 * - Soporte para múltiples botones con variantes
 * - Variantes de severidad (info, warning, error, success)
 * - Iconos customizables
 * - Modos controlado/no controlado
 * - Tamaños configurables
 * - Footer y header opcionales
 * - Completamente tipado con TypeScript
 */

import * as React from "react";
import {
  AlertDialog as AlertDialogPrimitive,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/primitives/shadcn/alert-dialog";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { useAlertDialog } from "./use-alert-dialog";
import { Button } from "@/components/ui/primitives/shadcn/button";

// ============================================
// TYPES
// ============================================

export type AlertDialogVariant = "info" | "warning" | "error" | "success";
export type AlertDialogSize = "sm" | "md" | "lg";
export type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

export interface AlertDialogAction {
  label: string;
  onClick: () => void;
  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;
  /** Si es true, cierra el dialog automáticamente después de ejecutar onClick */
  autoClose?: boolean;
}

export interface AlertDialogProps {
  /** Título del dialog */
  title: string;

  /** Descripción/contenido del dialog */
  description?: string;

  /** Contenido personalizado (reemplaza description si se proporciona) */
  children?: React.ReactNode;

  /** Variante de severidad que define colores e ícono por defecto */
  variant?: AlertDialogVariant;

  /** Ícono personalizado (sobreescribe el ícono de la variante) */
  icon?: React.ReactNode | LucideIcon;

  /** Si se proporciona, oculta el ícono completamente */
  hideIcon?: boolean;

  /** Tamaño del dialog */
  size?: AlertDialogSize;

  /** Estado abierto/cerrado (modo controlado) */
  open?: boolean;

  /** Callback cuando el estado open cambia */
  onOpenChange?: (open: boolean) => void;

  /** Lista de acciones (botones) del dialog */
  actions?: AlertDialogAction[];

  /**
   * Acción principal (atajo para un solo botón)
   * Si se proporcionan actions, este prop es ignorado
   */
  primaryAction?: AlertDialogAction;

  /**
   * Acción de cancelar (atajo para botón de cancelar)
   * Si se proporcionan actions, este prop es ignorado
   */
  cancelAction?: AlertDialogAction;

  /** Ocultar el footer completamente */
  hideFooter?: boolean;

  /** Ocultar el header completamente */
  hideHeader?: boolean;

  /** Clases CSS adicionales para el contenido */
  className?: string;

  /** Clases CSS adicionales para el header */
  headerClassName?: string;

  /** Clases CSS adicionales para el footer */
  footerClassName?: string;
}

// ============================================
// SIZE CONFIGURATION
// ============================================

const sizeConfig: Record<AlertDialogSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
};

// ============================================
// COMPONENT
// ============================================

/**
 * Componente atómico de AlertDialog 100% customizable
 *
 * @example
 * // Uso básico con variante
 * <AlertDialog
 *   title="Error del Servidor"
 *   description="No pudimos procesar tu solicitud"
 *   variant="error"
 *   primaryAction={{ label: "Entendido", onClick: handleClose }}
 * />
 *
 * @example
 * // Con múltiples botones
 * <AlertDialog
 *   title="Confirmar Eliminación"
 *   description="¿Estás seguro de eliminar este registro?"
 *   variant="warning"
 *   actions={[
 *     { label: "Cancelar", onClick: handleCancel, variant: "outline" },
 *     { label: "Eliminar", onClick: handleDelete, variant: "destructive" }
 *   ]}
 * />
 *
 * @example
 * // Con contenido personalizado
 * <AlertDialog
 *   title="Detalles"
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 * >
 *   <CustomContent />
 * </AlertDialog>
 */
export function AlertDialog({
  title,
  description,
  children,
  variant = "info",
  icon,
  hideIcon = false,
  size = "md",
  open,
  onOpenChange,
  actions,
  primaryAction,
  cancelAction,
  hideFooter = false,
  hideHeader = false,
  className,
  headerClassName,
  footerClassName,
}: AlertDialogProps) {
  // Usar el custom hook para toda la lógica
  const { finalActions, iconData, handleActionClick, variantConfig } =
    useAlertDialog({
      icon,
      hideIcon,
      variant,
      actions,
      primaryAction,
      cancelAction,
      onOpenChange,
    });

  // Renderizar el ícono basado en los datos del hook
  const renderIcon = () => {
    if (!iconData) return null;

    if (iconData.type === "node") {
      return iconData.node;
    }

    const IconComponent = iconData.Icon;
    return <IconComponent className={iconData.className} />;
  };

  return (
    <AlertDialogPrimitive open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn(sizeConfig[size], className)}>
        {!hideHeader && (
          <AlertDialogHeader className={headerClassName}>
            <div className="flex items-center gap-3">
              {renderIcon()}
              <AlertDialogTitle className={variantConfig[variant].titleColor}>
                {title}
              </AlertDialogTitle>
            </div>
            {(description || children) && (
              <AlertDialogDescription asChild={!!children}>
                {children || description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
        )}

        {!hideFooter && finalActions.length > 0 && (
          <AlertDialogFooter className={footerClassName}>
            {(() => {
              const cancelIndex =
                finalActions.length > 1
                  ? finalActions.findIndex((a) => a.variant === "outline")
                  : -1;

              const mapToButtonProps = (variant?: ButtonVariant) => {
                switch (variant) {
                  case "outline":
                  case "secondary":
                    return { variant: "outline" as const };
                  case "ghost":
                  case "link":
                    return { variant: "ghost" as const };
                  case "destructive":
                    return { variant: "default" as const, danger: true };
                  case "default":
                  default:
                    return { variant: "default" as const };
                }
              };

              return finalActions.map((action, index) => {
                const isCancel = cancelIndex !== -1 && index === cancelIndex;
                const Component = isCancel
                  ? AlertDialogCancel
                  : AlertDialogAction;

                const buttonProps = mapToButtonProps(action.variant);

                return (
                  <Component
                    key={`action-${action.label}-${index}`}
                    asChild
                    onClick={() => handleActionClick(action)}
                    disabled={action.disabled}
                  >
                    <Button
                      type="button"
                      className={action.className}
                      {...buttonProps}
                    >
                      {action.label}
                    </Button>
                  </Component>
                );
              });
            })()}
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialogPrimitive>
  );
}

// ============================================
// COMPOSED VARIANTS (Helpers)
// ============================================

/**
 * AlertDialog preconfigurado para confirmaciones destructivas
 */
export function ConfirmDestructiveDialog({
  onConfirm,
  onCancel,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  ...props
}: Omit<AlertDialogProps, "actions" | "variant"> & {
  onConfirm: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  return (
    <AlertDialog
      variant="error"
      {...props}
      actions={[
        {
          label: cancelLabel,
          onClick: onCancel || (() => props.onOpenChange?.(false)),
          variant: "outline",
        },
        {
          label: confirmLabel,
          onClick: onConfirm,
          variant: "destructive",
        },
      ]}
    />
  );
}

/**
 * AlertDialog preconfigurado para información simple
 */
export function InfoDialog({
  onClose,
  closeLabel = "Entendido",
  ...props
}: Omit<AlertDialogProps, "actions" | "variant"> & {
  onClose?: () => void;
  closeLabel?: string;
}) {
  return (
    <AlertDialog
      variant="info"
      {...props}
      primaryAction={{
        label: closeLabel,
        onClick: onClose || (() => props.onOpenChange?.(false)),
      }}
    />
  );
}

/**
 * AlertDialog preconfigurado para advertencias
 */
export function WarningDialog({
  onConfirm,
  onCancel,
  confirmLabel = "Continuar",
  cancelLabel = "Cancelar",
  ...props
}: Omit<AlertDialogProps, "actions" | "variant"> & {
  onConfirm: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  return (
    <AlertDialog
      variant="warning"
      {...props}
      actions={[
        {
          label: cancelLabel,
          onClick: onCancel || (() => props.onOpenChange?.(false)),
          variant: "outline",
        },
        {
          label: confirmLabel,
          onClick: onConfirm,
        },
      ]}
    />
  );
}
