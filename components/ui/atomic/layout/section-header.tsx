import { cn } from "@/lib/utils/utils";

export interface SectionHeaderProps {
  title: string;
  description?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  action?: React.ReactNode;
}

/**
 * SectionHeader - Componente atómico para subtítulos de sección dentro de páginas
 *
 * @example
 * ```tsx
 * <SectionHeader
 *   title="Vista General"
 *   description="Snapshot del estado actual de la clínica"
 *   size="md"
 * />
 * ```
 *
 * @example Con acción
 * ```tsx
 * <SectionHeader
 *   title="Estadísticas"
 *   size="sm"
 *   action={<Button variant="outline" size="sm">Ver más</Button>}
 * />
 * ```
 */
export function SectionHeader({
  title,
  description,
  className,
  size = "md",
  action,
}: SectionHeaderProps) {
  const titleSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={cn("flex items-start justify-between", className)}>
      <div className="space-y-1">
        <h2 className={cn("font-bold", titleSizes[size])}>{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
