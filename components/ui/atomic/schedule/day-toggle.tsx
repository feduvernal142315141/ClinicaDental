import { Switch } from "@/components/ui/atomic/forms";
import { cn } from "@/lib/utils/utils";

export type DayStatus = "active" | "closed" | "clinic-closed";

export interface DayStatusPillProps {
  status: DayStatus;
}

/**
 * DayStatusPill — pill de estado del día (variante ClinicPro):
 * - "active"        → "Activo" (marca/azul).
 * - "closed"        → "Cerrado" (neutro).
 * - "clinic-closed" → "Cerrado" (ámbar informativo: restricción externa).
 */
export function DayStatusPill({ status }: DayStatusPillProps) {
  const styles: Record<DayStatus, string> = {
    active: "bg-brand/15 text-brand",
    closed: "bg-hover text-subtle",
    "clinic-closed": "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  };
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        styles[status],
      )}
    >
      {status === "active" ? "Activo" : "Cerrado"}
    </span>
  );
}

export interface DayToggleProps {
  /** Nombre del día (p.ej. "Lunes"), usado en el título y el aria-label. */
  label: string;
  /** Estado del día para el pill. */
  status: DayStatus;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * DayToggle — cabecera del tile de día (variante ClinicPro): título
 * "Configuración de {día}" + pill de estado a la izquierda, y el switch
 * empujado al extremo derecho (`ml-auto`). El `<label>` envuelve todo: click
 * en cualquier punto (excepto donde no aplique) activa el Switch (Radix,
 * labelable).
 *
 * Presentacional: no toca react-hook-form; el consumidor conecta
 * `checked`/`onCheckedChange` al campo `schedule.<day>.enabled`.
 */
export function DayToggle({
  label,
  status,
  checked,
  onCheckedChange,
  disabled = false,
  className,
}: DayToggleProps) {
  return (
    <label
      className={cn(
        "flex w-full items-center gap-2.5 select-none",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className,
      )}
    >
      <span className="min-w-0 truncate text-sm font-semibold text-ink">
        Configuración de {label}
      </span>
      <DayStatusPill status={status} />
      <span className="ml-auto shrink-0">
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-label={`${label}: ${checked ? "abierto" : "cerrado"}`}
        />
      </span>
    </label>
  );
}
