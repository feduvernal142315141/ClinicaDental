import { AlarmClock, Flame, Snowflake, Thermometer, UserSearch } from "lucide-react";
import { StatusBadge } from "@/components/ui/atomic/data-display/status-badge";
import {
  LEAD_UNCLASSIFIED_LABEL,
  LEAD_TEMPERATURE_LABELS,
  leadStatus,
  type Lead,
  type LeadTemperature,
} from "@/lib/entity/leads";
import { cn } from "@/lib/utils/utils";

/** Estado del prospecto. Se pinta SIEMPRE desde `outcome` (ver `leadStatus`). */
export function LeadStatusBadge({ lead, className }: { lead: Pick<Lead, "stage" | "outcome">; className?: string }) {
  const status = leadStatus(lead);
  return (
    <StatusBadge tone={status.tone} className={className}>
      {status.label}
    </StatusBadge>
  );
}

const TEMPERATURE_STYLE: Record<LeadTemperature, { icon: typeof Flame; className: string }> = {
  HOT: { icon: Flame, className: "text-rose-600 dark:text-rose-300" },
  WARM: { icon: Thermometer, className: "text-amber-700 dark:text-amber-300" },
  COLD: { icon: Snowflake, className: "text-sky-700 dark:text-sky-300" },
};

/** Temperatura con icono y texto (nunca solo color). */
export function LeadTemperatureTag({
  temperature,
  className,
}: {
  temperature: LeadTemperature | null | undefined;
  className?: string;
}) {
  if (!temperature) {
    return <span className={cn("text-xs text-subtle", className)}>{LEAD_UNCLASSIFIED_LABEL}</span>;
  }
  const { icon: Icon, className: tone } = TEMPERATURE_STYLE[temperature];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", tone, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {LEAD_TEMPERATURE_LABELS[temperature]}
    </span>
  );
}

export function LeadOverdueFlag({ className }: { className?: string }) {
  return (
    <StatusBadge tone="danger" className={cn("gap-1", className)}>
      <AlarmClock className="h-3 w-3" aria-hidden />
      Seguimiento vencido
    </StatusBadge>
  );
}

export function LeadMatchFlag({ className }: { className?: string }) {
  return (
    <StatusBadge tone="warning" className={cn("max-w-full gap-1 whitespace-normal text-left", className)}>
      <UserSearch className="h-3 w-3" aria-hidden />
      Podría ser un paciente existente
    </StatusBadge>
  );
}
