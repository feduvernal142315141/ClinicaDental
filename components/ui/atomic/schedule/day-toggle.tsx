import { Switch } from "@/components/ui/atomic/forms";
import { cn } from "@/lib/utils/utils";

export interface DayStatusPillProps {
  /** `true` → pill "Abierto" (brand); `false` → pill "Cerrado" (neutro). */
  open: boolean;
}

/**
 * DayStatusPill — pill de estado Abierto/Cerrado. "Abierto" usa el color de
 * marca (brand) para leerse de un vistazo junto al acento lateral azul de la
 * tarjeta; "Cerrado" es neutro. Pills sólidos y limpios (sin punto) al estilo
 * 2026.
 */
export function DayStatusPill({ open }: DayStatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        open ? "bg-brand/15 text-brand" : "bg-hover text-subtle",
      )}
    >
      {open ? "Abierto" : "Cerrado"}
    </span>
  );
}

export interface DayToggleProps {
  /** Nombre del día (p.ej. "Lunes"). */
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Override del `aria-label` del switch; por defecto "{label}: abierto|cerrado". */
  ariaLabel?: string;
  className?: string;
}

/**
 * DayToggle — switch Abierto/Cerrado de un día. Layout: switch a la izquierda
 * y, apilado, el nombre del día con el pill "Abierto" debajo (solo cuando el
 * día está abierto), como en el diseño de referencia. El `<label>` envuelve
 * todo: click en cualquier punto activa el Switch (Radix, labelable).
 *
 * Presentacional: no toca react-hook-form; el consumidor conecta
 * `checked`/`onCheckedChange` al campo `schedule.<day>.enabled` que
 * corresponda (clínica o doctor).
 */
export function DayToggle({
  label,
  checked,
  onCheckedChange,
  disabled = false,
  ariaLabel,
  className,
}: DayToggleProps) {
  return (
    <label
      className={cn(
        "flex items-center gap-3 select-none",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className,
      )}
    >
      <span className="shrink-0">
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-label={ariaLabel ?? `${label}: ${checked ? "abierto" : "cerrado"}`}
        />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="whitespace-nowrap text-sm font-semibold text-ink">
          {label}
        </span>
        {checked && <DayStatusPill open />}
      </span>
    </label>
  );
}
