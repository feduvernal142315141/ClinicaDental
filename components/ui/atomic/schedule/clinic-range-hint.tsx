import { Building2 } from "lucide-react";

export interface ClinicRangeHintProps {
  /** Rango legible, p.ej. "08:00–17:00" (ver `formatClinicRange`). */
  range: string;
}

/**
 * ClinicRangeHint — recordatorio discreto del horario de la clínica para el
 * día, usado solo en el editor de doctor. Contexto en vez de fricción: las
 * horas del doctor ya se acotan con `minTime`/`maxTime` en `TimeField`, este
 * hint solo explica el porqué del acotamiento.
 */
export function ClinicRangeHint({ range }: ClinicRangeHintProps) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-subtle tabular-nums">
      <Building2 className="h-3 w-3 shrink-0" />
      Clínica: {range}
    </span>
  );
}
