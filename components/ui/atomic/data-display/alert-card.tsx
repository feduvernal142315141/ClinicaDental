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
import type { LucideIcon } from "lucide-react";
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Bell,
} from "lucide-react";

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
    /** Tinte tonal MUY sutil del contenedor (8-12% alpha). */
    bg: string;
    /** Borde tonal sutil. */
    border: string;
    /** Chip del icono de estado. */
    chip: string;
    /** Icono de estado. */
    icon: LucideIcon;
    titleColor: string;
    descColor: string;
  }
> = {
  info: {
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    chip: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
    icon: Info,
    titleColor: "text-ink",
    descColor: "text-subtle",
  },
  success: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    icon: CheckCircle2,
    titleColor: "text-ink",
    descColor: "text-subtle",
  },
  warning: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    chip: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    icon: AlertTriangle,
    titleColor: "text-ink",
    descColor: "text-subtle",
  },
  error: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    chip: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    icon: AlertCircle,
    titleColor: "text-ink",
    descColor: "text-subtle",
  },
  default: {
    bg: "bg-hover",
    border: "border-hairline",
    chip: "bg-elevated text-subtle ring-1 ring-hairline",
    icon: Bell,
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
  const StatusIcon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors",
        config.bg,
        config.border,
        onClick && "cursor-pointer hover:opacity-90",
        className
      )}
      onClick={onClick}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
            config.chip
          )}
        >
          <StatusIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className={cn("truncate text-sm font-medium", config.titleColor)}>
            {title}
          </p>
          {description && (
            <p className={cn("truncate text-xs", config.descColor)}>
              {description}
            </p>
          )}
        </div>
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
