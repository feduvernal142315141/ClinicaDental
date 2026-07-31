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
 * Tonos: `success` (emerald), `warning` (amber), `danger` (rose), `info`
 * (brand), `progress` (sky, para "En curso"/"En proceso" — `info` está atado
 * al color de marca y no sirve para estados en progreso) y `neutral`.
 *
 * Para el caso más común (activo/inactivo) usa el helper {@link ActiveBadge}.
 *
 * @example
 * import { StatusBadge } from "@/components/ui";
 *
 * <StatusBadge tone="progress">En curso</StatusBadge>
 * <StatusBadge tone="success">Completado</StatusBadge>
 * <StatusBadge tone="neutral" className="text-[11px]">Sin iniciar</StatusBadge>
 */
const statusBadgeVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
  {
    variants: {
      tone: {
        // El tono -700 en claro NO es cosmético (misma razón que en `Alert`,
        // ver `alertVariants`): sobre el tinte al 15% el -600 se queda en
        // ~2,8:1 (ámbar) y no llega al 4,5:1 que exige el texto pequeño. En
        // oscuro manda el -300, que ya iba sobrado.
        success:
          "bg-emerald-500/15 text-emerald-700 ring-emerald-400/25 dark:text-emerald-300",
        neutral: "bg-hover text-subtle ring-hairline",
        warning:
          "bg-amber-500/15 text-amber-700 ring-amber-400/25 dark:text-amber-300",
        danger:
          "bg-rose-500/15 text-rose-700 ring-rose-400/25 dark:text-rose-300",
        info: "bg-brand/15 text-brand ring-brand/30",
        progress:
          "bg-sky-500/15 text-sky-700 ring-sky-400/25 dark:text-sky-300",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

/**
 * Tonos disponibles del pill de estado. Útil para tipar mapas
 * `estado -> tono` en los dominios (ver `RISK_TONE` del odontograma).
 *
 * @example
 * const PLAN_TONE: Record<PlanStatus, StatusBadgeTone> = {
 *   propuesto: "neutral",
 *   aceptado: "info",
 *   en_curso: "progress",
 *   completado: "success",
 * };
 */
export type StatusBadgeTone = NonNullable<
  VariantProps<typeof statusBadgeVariants>["tone"]
>;

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
