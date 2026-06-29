"use client";

/**
 * PROGRESS LIST ITEM ATOMIC COMPONENT
 *
 * Componente atómico para mostrar items con barra de progreso.
 * Útil para mostrar métricas con porcentajes (ocupación, completitud, etc.)
 *
 * Sigue principios de Screaming Architecture: componentes atómicos reutilizables.
 */

import * as React from "react";
import { Progress } from "@/components/ui/atomic/data-display/progress";
import { cn } from "@/lib/utils/utils";

// ============================================
// TYPES
// ============================================

export interface ProgressListItemProps {
  /** Etiqueta principal (ej: nombre de doctor) */
  label: string;

  /** Valor del progreso (0-100) */
  value: number;

  /** Mostrar el valor como porcentaje */
  showPercentage?: boolean;

  /** Texto personalizado en lugar del porcentaje */
  valueText?: string;

  /** Color de la barra de progreso */
  progressColor?: string;

  /** Altura de la barra de progreso */
  progressHeight?: "sm" | "md" | "lg";

  /** Clases CSS adicionales para el contenedor */
  className?: string;

  /** Clases CSS adicionales para la barra de progreso */
  progressClassName?: string;
}

export interface ProgressListProps {
  /** Array de items a mostrar */
  items: Array<{
    label: string;
    value: number;
    valueText?: string;
  }>;

  /** Mostrar porcentajes */
  showPercentage?: boolean;

  /** Color de las barras */
  progressColor?: string;

  /** Altura de las barras */
  progressHeight?: "sm" | "md" | "lg";

  /** Espaciado entre items */
  spacing?: "sm" | "md" | "lg";

  /** Clases CSS adicionales */
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const progressHeightConfig = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
} as const;

const spacingConfig = {
  sm: "space-y-2",
  md: "space-y-4",
  lg: "space-y-6",
} as const;

// ============================================
// PROGRESS LIST ITEM
// ============================================

/**
 * Item individual con barra de progreso
 *
 * @example
 * <ProgressListItem
 *   label="Dr. Juan Pérez"
 *   value={85}
 *   showPercentage
 * />
 */
export function ProgressListItem({
  label,
  value,
  showPercentage = true,
  valueText,
  progressHeight = "md",
  className,
  progressClassName,
}: ProgressListItemProps) {
  const displayValue = valueText || (showPercentage ? `${value}%` : "");

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between text-sm">
        <span className="font-medium text-ink">{label}</span>
        {displayValue && (
          <span className="tabular-nums text-subtle">{displayValue}</span>
        )}
      </div>
      <Progress
        value={value}
        className={cn(progressHeightConfig[progressHeight], progressClassName)}
      />
    </div>
  );
}

// ============================================
// PROGRESS LIST (Helper)
// ============================================

/**
 * Lista de múltiples items con barras de progreso
 *
 * @example
 * <ProgressList
 *   items={[
 *     { label: "Dr. Juan", value: 85 },
 *     { label: "Dr. María", value: 92 }
 *   ]}
 *   showPercentage
 *   progressHeight="md"
 *   spacing="md"
 * />
 */
export function ProgressList({
  items,
  showPercentage = true,
  progressColor,
  progressHeight = "md",
  spacing = "md",
  className,
}: ProgressListProps) {
  return (
    <div className={cn(spacingConfig[spacing], className)}>
      {items.map((item, index) => (
        <ProgressListItem
          key={index}
          label={item.label}
          value={item.value}
          valueText={item.valueText}
          showPercentage={showPercentage}
          progressColor={progressColor}
          progressHeight={progressHeight}
        />
      ))}
    </div>
  );
}
