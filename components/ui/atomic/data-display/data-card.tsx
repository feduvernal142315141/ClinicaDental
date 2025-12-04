import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/atomic/data-display/card";
import { cn } from "@/lib/utils/utils";
import { LucideIcon } from "lucide-react";

/**
 * DataCard - Generic wrapper component for data visualization
 *
 * A reusable Card component that standardizes the header structure (title, description, optional icon)
 * and accepts any content as children. Perfect for wrapping charts, tables, lists, or any data display.
 *
 * @example
 * // With chart
 * <DataCard title="Sales Overview" description="Monthly revenue trends">
 *   <ResponsiveContainer width="100%" height={300}>
 *     <BarChart data={data}>...</BarChart>
 *   </ResponsiveContainer>
 * </DataCard>
 *
 * @example
 * // With icon and custom content
 * <DataCard
 *   title="User Activity"
 *   description="Last 7 days"
 *   icon={Users}
 *   iconColor="text-blue-600"
 * >
 *   <div className="space-y-4">
 *     {items.map(item => <div key={item.id}>{item.name}</div>)}
 *   </div>
 * </DataCard>
 */

export interface DataCardProps {
  /** Title displayed in the card header */
  title: string;

  /** Optional description shown below the title */
  description?: string;

  /** Optional Lucide icon component displayed next to the title */
  icon?: LucideIcon;

  /** Tailwind color class for the icon (e.g., "text-blue-600") */
  iconColor?: string;

  /** Content to display inside the card (charts, tables, lists, etc.) */
  children: React.ReactNode;

  /** Additional CSS classes for the card wrapper */
  className?: string;

  /** Additional CSS classes for the card content area */
  contentClassName?: string;
}

/**
 * DataCard Component
 *
 * Wraps any content with a standardized Card header structure.
 * Eliminates repetitive Card+CardHeader+CardTitle+CardDescription+CardContent patterns.
 */
export function DataCard({
  title,
  description,
  icon: Icon,
  iconColor = "text-primary",
  children,
  className,
  contentClassName,
}: DataCardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className={cn(Icon && "flex items-center gap-2")}>
          {Icon && <Icon className={cn("h-5 w-5", iconColor)} />}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className={cn(contentClassName)}>{children}</CardContent>
    </Card>
  );
}

/**
 * DataCardGrid - Responsive grid wrapper for multiple DataCards
 *
 * Helper component that creates a responsive grid layout for DataCard components.
 *
 * @example
 * <DataCardGrid cols={{ default: 1, lg: 2 }} gap={6}>
 *   <DataCard title="Chart 1">...</DataCard>
 *   <DataCard title="Chart 2">...</DataCard>
 * </DataCardGrid>
 */

export interface DataCardGridProps {
  /** DataCard components to display in the grid */
  children: React.ReactNode;

  /** Number of columns at different breakpoints */
  cols?: {
    default?: 1 | 2 | 3 | 4;
    md?: 1 | 2 | 3 | 4;
    lg?: 1 | 2 | 3 | 4;
  };

  /** Gap between grid items (in Tailwind spacing units) */
  gap?: 4 | 6 | 8;

  /** Additional CSS classes for the grid wrapper */
  className?: string;
}

export function DataCardGrid({
  children,
  cols = { default: 1, lg: 2 },
  gap = 6,
  className,
}: DataCardGridProps) {
  const colsDefault = cols.default || 1;
  const colsMd = cols.md;
  const colsLg = cols.lg || 2;

  const gridClasses = cn(
    "grid",
    `grid-cols-${colsDefault}`,
    colsMd && `md:grid-cols-${colsMd}`,
    `lg:grid-cols-${colsLg}`,
    `gap-${gap}`,
    className
  );

  return <div className={gridClasses}>{children}</div>;
}
