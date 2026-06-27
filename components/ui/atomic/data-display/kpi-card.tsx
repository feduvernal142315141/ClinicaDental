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
import { ResponsiveContainer, AreaChart, Area } from "recharts";

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

/** Variantes del chip de icono (par color/15 + ring color/25). */
type KpiAccent = "brand" | "sky" | "emerald" | "violet" | "amber" | "rose";

const CHIP_VARIANTS: Record<KpiAccent, string> = {
  brand: "bg-brand/15 text-brand ring-brand/25",
  sky: "bg-sky-500/15 text-sky-600 ring-sky-400/25 dark:text-sky-300",
  emerald:
    "bg-emerald-500/15 text-emerald-600 ring-emerald-400/25 dark:text-emerald-300",
  violet:
    "bg-violet-500/15 text-violet-600 ring-violet-400/25 dark:text-violet-300",
  amber: "bg-amber-500/15 text-amber-600 ring-amber-400/25 dark:text-amber-300",
  rose: "bg-rose-500/15 text-rose-600 ring-rose-400/25 dark:text-rose-300",
};

export interface KpiCardProps {
  /** Variante del componente */
  variant?: "default" | "badges" | "trend" | "featured";

  /** Título de la métrica */
  title: string;

  /** Valor principal a mostrar */
  value: string | number;

  /** Ícono de Lucide React */
  icon: LucideIcon;

  /** Color del ícono (clase de Tailwind) — usado como fallback. */
  iconColor?: string;

  /** Acento del chip de icono (Bento). */
  accent?: KpiAccent;

  /** Descripción o detalle adicional */
  description?: string;

  /** Lista de badges (solo para variant="badges") */
  badges?: BadgeConfig[];

  /** Configuración de tendencia (solo para variant="trend" | "featured") */
  trend?: TrendConfig;

  /** Mini sparkline – array de { value: number } (máx ~12 puntos) */
  sparkline?: { value: number }[];

  /** Callback para botón "Detalles" (variant="featured") */
  onDetails?: () => void;

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
  iconColor = "text-brand",
  accent = "brand",
  description,
  badges = [],
  trend,
  sparkline,
  onDetails,
  className,
}: KpiCardProps) {
  const trendValue = trend?.value ?? 0;
  const trendLabel = trend?.label ?? "vs periodo anterior";
  const isPositive = trend?.color ? trend.color === "positive" : trendValue > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const trendColorClass = isPositive
    ? "text-emerald-600 dark:text-emerald-300"
    : "text-rose-600 dark:text-rose-300";

  // ── Featured variant (tarjeta con fondo azul) ──────────────────────────────
  if (variant === "featured") {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-bento bg-brand p-5 text-white shadow-sm flex flex-col justify-between min-h-32",
          className,
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
          {title}
        </p>
        <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
          {value}
        </p>
        <div className="mt-3 flex items-center justify-between">
          {trend && (
            <span className="flex items-center gap-1 text-xs text-white/80">
              <TrendIcon className="h-3 w-3" />
              {Math.abs(trendValue)}% {trendLabel}
            </span>
          )}
          {onDetails && (
            <button
              onClick={onDetails}
              className="ml-auto rounded-md bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur hover:bg-white/25 transition-colors"
            >
              Detalles
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "gap-0 py-5 transition-colors hover:border-foreground/15",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-subtle">
          {title}
        </CardTitle>
        <span
          className={cn(
            "grid h-9 w-9 place-items-center rounded-xl ring-1",
            CHIP_VARIANTS[accent],
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight tabular-nums text-ink">
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}

        {/* Mini sparkline */}
        {sparkline && sparkline.length > 1 && (
          <div className="mt-2 h-10 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={sparkline}
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  fill="url(#sparkGrad)"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
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
    className,
  );

  return <div className={gridClasses}>{children}</div>;
}
