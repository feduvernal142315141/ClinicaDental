"use client";

import { Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/primitives/shadcn/button";

type ActionVariant = "new" | "back" | "custom";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionButton?: {
    label: string;
    onClick: () => void;
    variant?: ActionVariant;
    icon?: React.ReactNode;
  };
  /** Acciones libres a la derecha (alternativa a actionButton). */
  actions?: React.ReactNode;
}

/**
 * Encabezado de página estándar (reemplaza el SectionTitle de antd).
 * Título `text-ink`, subtítulo `text-subtle`, acción primaria opcional.
 */
export function PageHeader({
  title,
  subtitle,
  actionButton,
  actions,
}: PageHeaderProps) {
  const icon =
    actionButton?.variant === "back" ? (
      <ArrowLeft className="h-4 w-4" />
    ) : actionButton?.variant === "custom" ? (
      actionButton.icon
    ) : (
      <Plus className="h-4 w-4" />
    );

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-subtle">{subtitle}</p>}
      </div>

      {actionButton ? (
        <Button onClick={actionButton.onClick} className="gap-2">
          {icon}
          {actionButton.label}
        </Button>
      ) : (
        actions
      )}
    </div>
  );
}
