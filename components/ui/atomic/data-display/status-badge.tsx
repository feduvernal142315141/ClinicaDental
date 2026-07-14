import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/utils";

/**
 * StatusBadge — pill de estado Bento, genérico y reutilizable.
 *
 * Homologa los "pills" de estado que antes cada dominio dibujaba a mano con
 * clases inline distintas (Pacientes usaba `green-50/green-700`, Doctores el
 * emerald sutil con `ring`, etc.). La referencia visual es el pill de Doctores:
 * fondo tenue + texto de color + `ring` de 1px, legible en claro y oscuro.
 *
 * Para el caso más común (activo/inactivo) usa el helper {@link ActiveBadge}.
 */
const statusBadgeVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
  {
    variants: {
      tone: {
        success:
          "bg-emerald-500/15 text-emerald-600 ring-emerald-400/25 dark:text-emerald-300",
        neutral: "bg-hover text-subtle ring-hairline",
        warning:
          "bg-amber-500/15 text-amber-600 ring-amber-400/25 dark:text-amber-300",
        danger:
          "bg-rose-500/15 text-rose-600 ring-rose-400/25 dark:text-rose-300",
        info: "bg-brand/15 text-brand ring-brand/30",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface StatusBadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof statusBadgeVariants> {}

export function StatusBadge({ className, tone, ...props }: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      className={cn(statusBadgeVariants({ tone }), className)}
      {...props}
    />
  );
}

export interface ActiveBadgeProps
  extends Omit<StatusBadgeProps, "tone" | "children"> {
  /** Estado del registro. */
  active: boolean;
  /** Etiqueta cuando está activo (por defecto "Activo"). */
  activeLabel?: string;
  /** Etiqueta cuando está inactivo (por defecto "Inactivo"). */
  inactiveLabel?: string;
}

/**
 * Atajo para el estado activo/inactivo (el más frecuente en las tablas de
 * dominio): `success` cuando está activo, `neutral` cuando no.
 */
export function ActiveBadge({
  active,
  activeLabel = "Activo",
  inactiveLabel = "Inactivo",
  ...props
}: ActiveBadgeProps) {
  return (
    <StatusBadge tone={active ? "success" : "neutral"} {...props}>
      {active ? activeLabel : inactiveLabel}
    </StatusBadge>
  );
}

export { statusBadgeVariants };
