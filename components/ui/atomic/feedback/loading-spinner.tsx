import { cn } from "@/lib/utils/utils";
import { Card, CardContent } from "@/components/ui/atomic/data-display/card";
import { Loader2 } from "lucide-react";

export interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  fullPage?: boolean;
  variant?: "inline" | "card";
}

/**
 * LoadingSpinner - Componente atómico para estados de carga
 *
 * @example Inline
 * ```tsx
 * <LoadingSpinner message="Cargando pacientes..." variant="inline" />
 * ```
 *
 * @example En card
 * ```tsx
 * <LoadingSpinner message="Cargando datos..." variant="card" />
 * ```
 *
 * @example Full page
 * ```tsx
 * <LoadingSpinner message="Cargando..." fullPage />
 * ```
 */
export function LoadingSpinner({
  message = "Cargando...",
  size = "md",
  className,
  fullPage = false,
  variant = "inline",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const content = (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {message && (
        <span
          className={cn(
            "text-muted-foreground",
            size === "sm" && "text-sm",
            size === "lg" && "text-lg"
          )}
        >
          {message}
        </span>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {content}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <Card>
        <CardContent className="p-6">{content}</CardContent>
      </Card>
    );
  }

  return content;
}
