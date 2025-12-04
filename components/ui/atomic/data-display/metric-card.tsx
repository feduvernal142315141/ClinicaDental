import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/atomic/data-display/card";
import { Badge } from "@/components/ui/atomic/data-display/badge";
import { Progress } from "@/components/ui/atomic/data-display/progress";
import { cn } from "@/lib/utils/utils";
import { LucideIcon } from "lucide-react";
import { type VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/atomic/data-display/badge";

/**
 * MetricCard - Componente para métricas con Progress bar o Badge
 *
 * Diseñado específicamente para métricas que necesitan mostrar:
 * - Valor principal grande
 * - Progress bar O Badge de estado
 * - Descripción opcional
 * - Ícono en el header
 *
 * Diferente a KpiCard porque tiene header horizontal con ícono a la derecha
 * y más espacio vertical para contenido complejo.
 *
 * @example Con Progress
 * <MetricCard
 *   title="Tasa de Asistencia"
 *   value="92%"
 *   icon={Target}
 *   iconColor="text-green-600"
 *   progressValue={92}
 *   description="Citas cumplidas vs canceladas"
 * />
 *
 * @example Con Badge
 * <MetricCard
 *   title="Tiempo de Espera"
 *   value="12 min"
 *   icon={Clock}
 *   iconColor="text-blue-600"
 *   badge={{
 *     label: "Óptimo",
 *     variant: "secondary"
 *   }}
 *   description="Promedio entre reserva y cita"
 * />
 */

export interface MetricCardProps {
  /** Título de la métrica */
  title: string;

  /** Valor principal (texto o número) */
  value: string | number;

  /** Ícono para mostrar en el header */
  icon: LucideIcon;

  /** Color del ícono (clase Tailwind) */
  iconColor?: string;

  /** Valor para la barra de progreso (0-100) */
  progressValue?: number;

  /** Configuración del badge (mutuamente exclusivo con progressValue) */
  badge?: {
    label: string;
    variant?: VariantProps<typeof badgeVariants>["variant"];
  };

  /** Descripción debajo del valor/progress/badge */
  description?: string;

  /** Clases adicionales para el card */
  className?: string;
}

/**
 * MetricCard Component
 *
 * Card especializado para mostrar métricas con:
 * - Header horizontal compacto (título + ícono)
 * - Valor destacado en texto grande
 * - Progress bar O Badge de estado
 * - Descripción opcional en texto pequeño
 */
export function MetricCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-primary",
  progressValue,
  badge,
  description,
  className,
}: MetricCardProps) {
  // Validación: no puede tener ambos progress y badge
  if (progressValue !== undefined && badge) {
    console.warn(
      "MetricCard: No puedes usar progressValue y badge simultáneamente. Se usará progressValue."
    );
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>

        {/* Progress bar (si está definido) */}
        {progressValue !== undefined && (
          <Progress value={progressValue} className="mt-2" />
        )}

        {/* Badge (si está definido y no hay progress) */}
        {!progressValue && badge && (
          <Badge variant={badge.variant} className="mt-2">
            {badge.label}
          </Badge>
        )}

        {/* Descripción */}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * MetricCardGrid - Helper para grids de MetricCards
 *
 * @example
 * <MetricCardGrid cols={{ default: 1, md: 3 }} gap={6}>
 *   <MetricCard {...metric1Props} />
 *   <MetricCard {...metric2Props} />
 *   <MetricCard {...metric3Props} />
 * </MetricCardGrid>
 */

export interface MetricCardGridProps {
  children: React.ReactNode;
  cols?: {
    default?: 1 | 2 | 3 | 4;
    md?: 1 | 2 | 3 | 4;
    lg?: 1 | 2 | 3 | 4;
  };
  gap?: 4 | 6 | 8;
  className?: string;
}

export function MetricCardGrid({
  children,
  cols = { default: 1, md: 3 },
  gap = 6,
  className,
}: MetricCardGridProps) {
  const colsDefault = cols.default || 1;
  const colsMd = cols.md || 3;
  const colsLg = cols.lg;

  const gridClasses = cn(
    "grid",
    `grid-cols-${colsDefault}`,
    `md:grid-cols-${colsMd}`,
    colsLg && `lg:grid-cols-${colsLg}`,
    `gap-${gap}`,
    className
  );

  return <div className={gridClasses}>{children}</div>;
}
