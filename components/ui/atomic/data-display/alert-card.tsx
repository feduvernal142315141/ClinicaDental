"use client";

/**
 * ALERT CARD ATOMIC COMPONENT
 *
 * Componente atómico para mostrar alertas/notificaciones con badge.
 * Útil para mostrar advertencias, errores, información que requiere atención.
 *
 * Sigue principios de Screaming Architecture: componentes atómicos reutilizables.
 */

import * as React from "react";
import { Badge } from "@/components/ui/atomic/data-display/badge";
import { cn } from "@/lib/utils/utils";

// ============================================
// TYPES
// ============================================

export type AlertCardVariant =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "default";

export interface AlertCardProps {
  /** Título principal de la alerta */
  title: string;

  /** Descripción o detalle */
  description?: string;

  /** Valor a mostrar en el badge */
  badgeValue: string | number;

  /** Variante de color de la alerta */
  variant?: AlertCardVariant;

  /** Variante del badge */
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";

  /** Clases CSS adicionales para el badge */
  badgeClassName?: string;

  /** Callback al hacer click */
  onClick?: () => void;

  /** Clases CSS adicionales */
  className?: string;
}

export interface AlertCardGridProps {
  /** Array de alertas a mostrar */
  alerts: Array<Omit<AlertCardProps, "className">>;

  /** Configuración de columnas del grid */
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };

  /** Espaciado entre cards */
  gap?: number;

  /** Clases CSS adicionales */
  className?: string;
}

// ============================================
// VARIANT CONFIGURATIONS
// ============================================

const variantConfig: Record<
  AlertCardVariant,
  {
    bg: string;
    titleColor: string;
    descColor: string;
  }
> = {
  info: {
    bg: "bg-sky-500/15",
    titleColor: "text-sky-800 dark:text-sky-200",
    descColor: "text-sky-600 dark:text-sky-300",
  },
  success: {
    bg: "bg-emerald-500/15",
    titleColor: "text-emerald-800 dark:text-emerald-200",
    descColor: "text-emerald-600 dark:text-emerald-300",
  },
  warning: {
    bg: "bg-amber-500/15",
    titleColor: "text-amber-800 dark:text-amber-200",
    descColor: "text-amber-600 dark:text-amber-300",
  },
  error: {
    bg: "bg-rose-500/15",
    titleColor: "text-rose-800 dark:text-rose-200",
    descColor: "text-rose-600 dark:text-rose-300",
  },
  default: {
    bg: "bg-hover",
    titleColor: "text-ink",
    descColor: "text-subtle",
  },
};

// ============================================
// ALERT CARD
// ============================================

/**
 * Tarjeta de alerta con badge
 *
 * @example
 * <AlertCard
 *   title="Pagos Pendientes"
 *   description="Requieren seguimiento"
 *   badgeValue={5}
 *   variant="error"
 *   badgeVariant="destructive"
 * />
 */
export function AlertCard({
  title,
  description,
  badgeValue,
  variant = "default",
  badgeVariant = "secondary",
  badgeClassName,
  onClick,
  className,
}: AlertCardProps) {
  const config = variantConfig[variant];

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg transition-colors",
        config.bg,
        onClick && "cursor-pointer hover:opacity-90",
        className
      )}
      onClick={onClick}
    >
      <div>
        <p className={cn("text-sm font-medium", config.titleColor)}>{title}</p>
        {description && (
          <p className={cn("text-xs", config.descColor)}>{description}</p>
        )}
      </div>
      <Badge variant={badgeVariant} className={badgeClassName}>
        {badgeValue}
      </Badge>
    </div>
  );
}

// ============================================
// ALERT CARD GRID (Helper)
// ============================================

/**
 * Grid de múltiples AlertCards
 *
 * @example
 * <AlertCardGrid
 *   alerts={[
 *     {
 *       title: "Pagos Pendientes",
 *       description: "Requieren seguimiento",
 *       badgeValue: 5,
 *       variant: "error",
 *       badgeVariant: "destructive"
 *     },
 *     {
 *       title: "Sin Seguimiento",
 *       description: "Tratamientos pausados",
 *       badgeValue: 3,
 *       variant: "warning"
 *     }
 *   ]}
 *   cols={{ default: 1, md: 3 }}
 * />
 */
export function AlertCardGrid({
  alerts,
  cols = { default: 1, md: 3 },
  gap = 4,
  className,
}: AlertCardGridProps) {
  const gridClasses = cn(
    "grid",
    cols.default === 1 && "grid-cols-1",
    cols.default === 2 && "grid-cols-2",
    cols.default === 3 && "grid-cols-3",
    cols.default === 4 && "grid-cols-4",
    cols.sm === 1 && "sm:grid-cols-1",
    cols.sm === 2 && "sm:grid-cols-2",
    cols.sm === 3 && "sm:grid-cols-3",
    cols.sm === 4 && "sm:grid-cols-4",
    cols.md === 1 && "md:grid-cols-1",
    cols.md === 2 && "md:grid-cols-2",
    cols.md === 3 && "md:grid-cols-3",
    cols.md === 4 && "md:grid-cols-4",
    cols.lg === 1 && "lg:grid-cols-1",
    cols.lg === 2 && "lg:grid-cols-2",
    cols.lg === 3 && "lg:grid-cols-3",
    cols.lg === 4 && "lg:grid-cols-4",
    `gap-${gap}`,
    className
  );

  return (
    <div className={gridClasses}>
      {alerts.map((alert, index) => (
        <AlertCard key={index} {...alert} />
      ))}
    </div>
  );
}
