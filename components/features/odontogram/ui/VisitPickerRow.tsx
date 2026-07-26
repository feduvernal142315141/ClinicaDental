"use client";

import { Check } from "lucide-react";
import { CommandItem } from "@/components/ui";
import { cn } from "@/lib/utils/utils";
import {
  buildVisitSearchValue,
  formatVisitDate,
  formatVisitSubtitle,
  type EligibleVisit,
} from "@/lib/utils/visit-eligibility";

interface VisitPickerRowProps {
  visit: EligibleVisit;
  /** Es la visita que el odontograma está mostrando ahora mismo. */
  isSelected: boolean;
  onSelect: (appointmentId: string) => void;
}

/**
 * Fila de una visita en el selector del historial.
 *
 * Dos líneas: fecha (identidad del registro) y motivo · profesional (contexto
 * para reconocerla). Los datos vienen de la cita ya en memoria — esta fila
 * NUNCA pide nada al backend.
 */
export function VisitPickerRow({
  visit,
  isSelected,
  onSelect,
}: VisitPickerRowProps) {
  const subtitle = formatVisitSubtitle(visit);

  return (
    <CommandItem
      value={buildVisitSearchValue(visit)}
      onSelect={() => onSelect(visit.appointmentId)}
      // cmdk 1.x emite data-disabled="false" en TODOS los ítems y el primitive
      // aplica pointer-events:none por selector de presencia, bloqueando el
      // clic. Mismo workaround que LabelSelector/combobox.
      style={{ pointerEvents: "auto" }}
      aria-current={isSelected ? "true" : undefined}
      className={cn(
        "flex min-h-[52px] items-center justify-between gap-2 rounded-lg px-3 py-2 aria-selected:bg-hover",
        isSelected && "bg-hover",
      )}
    >
      <span className="flex min-w-0 flex-col">
        <span
          className={cn(
            "truncate text-sm font-semibold",
            isSelected ? "text-brand" : "text-ink",
          )}
        >
          {formatVisitDate(visit.parsedDate, { weekday: true })}
        </span>
        {subtitle && (
          <span className="truncate text-xs text-subtle">{subtitle}</span>
        )}
      </span>
      <Check
        className={cn(
          "h-4 w-4 shrink-0 text-brand",
          isSelected ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      />
    </CommandItem>
  );
}
