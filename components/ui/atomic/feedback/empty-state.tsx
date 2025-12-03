import { cn } from "@/lib/utils/utils";
import { Card, CardContent } from "@/components/ui/atomic/data-display/card";
import { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  variant?: "inline" | "card";
}

/**
 * EmptyState - Componente atómico para estados vacíos
 *
 * @example Básico
 * ```tsx
 * <EmptyState
 *   icon={Users}
 *   title="No hay pacientes"
 *   description="Comienza agregando tu primer paciente"
 *   action={<Button>Agregar Paciente</Button>}
 * />
 * ```
 *
 * @example En card
 * ```tsx
 * <EmptyState
 *   icon={Calendar}
 *   title="No hay citas programadas"
 *   variant="card"
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = "inline",
}: EmptyStateProps) {
  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12",
        className
      )}
    >
      {Icon && (
        <div className="rounded-full bg-muted p-3 mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );

  if (variant === "card") {
    return (
      <Card>
        <CardContent className="p-6">{content}</CardContent>
      </Card>
    );
  }

  return content;
}
