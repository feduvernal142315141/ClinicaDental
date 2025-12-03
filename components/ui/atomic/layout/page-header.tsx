import { cn } from "@/lib/utils/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
}

/**
 * PageHeader - Componente atómico para encabezados de página
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Pacientes"
 *   description="Gestiona la información de tus pacientes"
 * />
 * ```
 *
 * @example Con acción
 * ```tsx
 * <PageHeader
 *   title="Campañas"
 *   description="Gestiona tus campañas de marketing"
 *   action={<Button>Nueva Campaña</Button>}
 * />
 * ```
 */
export function PageHeader({
  title,
  description,
  className,
  action,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between", className)}>
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
