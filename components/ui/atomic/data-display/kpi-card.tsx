"use client";

/**
 * KPI CARD ATOMIC COMPONENT
 *
 * Componente atómico unificado para mostrar métricas clave (KPIs).
 * Usa variantes para diferentes visualizaciones: básico, con badges, con tendencia.
 */

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/atomic/data-display/card";
import { Badge } from "@/components/ui/atomic/data-display/badge";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils/utils";

// ============================================
// TYPES
// ============================================

type BadgeConfig = {
  label: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
};

type TrendConfig = {
  value: number;
  label?: string;
  color?: "positive" | "negative";
};

export interface KpiCardProps {
  /** Variante del componente */
  variant?: "default" | "badges" | "trend";

  /** Título de la métrica */
  title: string;

  /** Valor principal a mostrar */
  value: string | number;

  /** Ícono de Lucide React */
  icon: LucideIcon;

  /** Color del ícono (clase de Tailwind) */
  iconColor?: string;

  /** Descripción o detalle adicional */
  description?: string;

  /** Lista de badges (solo para variant="badges") */
  badges?: BadgeConfig[];

  /** Configuración de tendencia (solo para variant="trend") */
  trend?: TrendConfig;

  /** Clases CSS adicionales */
  className?: string;
}

// ============================================
// UNIFIED KPI CARD
// ============================================

/**
 * Tarjeta KPI unificada con variantes
 *
 * @example Básica
 * <KpiCard
 *   title="Citas de Hoy"
 *   value={24}
 *   icon={Calendar}
 *   iconColor="text-blue-600"
 *   description="Programadas para hoy"
 * />
 *
 * @example Con Badges
 * <KpiCard
 *   variant="badges"
 *   title="Citas de Hoy"
 *   value={24}
 *   icon={Calendar}
 *   iconColor="text-blue-600"
 *   badges={[
 *     { label: "✅ 18 Cumplidas", variant: "secondary" },
 *     { label: "❌ 3 Canceladas", variant: "destructive" }
 *   ]}
 * />
 *
 * @example Con Tendencia
 * <KpiCard
 *   variant="trend"
 *   title="Ingresos Estimados"
 *   value="$45,230"
 *   icon={DollarSign}
 *   iconColor="text-orange-600"
 *   trend={{ value: 12.5, label: "vs mes anterior" }}
 * />
 */
export function KpiCard({
  variant = "default",
  title,
  value,
  icon: Icon,
  iconColor = "text-blue-600",
  description,
  badges = [],
  trend,
  className,
}: KpiCardProps) {
  // Calcular propiedades de tendencia
  const trendValue = trend?.value ?? 0;
  const trendLabel = trend?.label ?? "vs periodo anterior";
  const isPositive = trend?.color ? trend.color === "positive" : trendValue > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const trendColorClass = isPositive ? "text-green-600" : "text-red-600";

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}

        {/* Badges variant */}
        {variant === "badges" && badges.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {badges.map((badge, index) => (
              <Badge
                key={index}
                variant={badge.variant || "secondary"}
                className={cn("text-xs", badge.className)}
              >
                {badge.label}
              </Badge>
            ))}
          </div>
        )}

        {/* Trend variant */}
        {variant === "trend" && trend && (
          <div className="flex items-center gap-1 mt-1">
            <TrendIcon className={cn("h-3 w-3", trendColorClass)} />
            <span className={cn("text-xs", trendColorClass)}>
              {Math.abs(trendValue)}% {trendLabel}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// KPI GRID LAYOUT HELPER
// ============================================

/**
 * Grid helper para organizar múltiples KPI cards
 *
 * @example
 * <KpiGrid cols={{ default: 1, md: 2, lg: 4 }}>
 *   <KpiCard {...} />
 *   <KpiCard {...} />
 * </KpiGrid>
 */
export function KpiGrid({
  children,
  cols = { default: 1, md: 2, lg: 4 },
  gap = 6,
  className,
}: {
  children: React.ReactNode;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
}) {
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
    cols.xl === 1 && "xl:grid-cols-1",
    cols.xl === 2 && "xl:grid-cols-2",
    cols.xl === 3 && "xl:grid-cols-3",
    cols.xl === 4 && "xl:grid-cols-4",
    `gap-${gap}`,
    className
  );

  return <div className={gridClasses}>{children}</div>;
}
