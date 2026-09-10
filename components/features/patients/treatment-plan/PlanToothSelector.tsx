"use client";

import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui";
import { useToothLabel } from "@/lib/contexts/tooth-notation-context";
import {
  ToothNotationLabel,
  formatToothListPlain,
  type ToothNotation,
} from "@/lib/odontogram/notation";
import { notationDrawsBracket } from "@/lib/utils/clinical-tooth-text";
import { cn } from "@/lib/utils/utils";
import {
  DEFAULT_DENTITION,
  quadrantRowsFor,
  type QuadrantRows,
  type DentitionType,
} from "@/lib/odontogram/domain/odontogram/constants/dentition.constants";

// Rótulos de cuadrante; las filas de dientes salen de quadrantRowsFor.
const QUADRANT_LABEL: Record<keyof QuadrantRows, string> = {
  upperRight: "Superior derecho",
  upperLeft: "Superior izquierdo",
  lowerLeft: "Inferior izquierdo",
  lowerRight: "Inferior derecho",
};

interface PlanToothSelectorProps {
  selected: ReadonlySet<number>;
  onToggle: (fdi: number) => void;
  onClear: () => void;
  disabled?: boolean;
  dentition?: DentitionType;
}

/** "16, 17, 26" — orden numérico, estable e igual al que verá en la tabla. */
export function formatSelectedTeeth(
  selected: ReadonlySet<number>,
  notation: ToothNotation,
): string {
  return formatToothListPlain(
    Array.from(selected).sort((a, b) => a - b),
    notation,
  );
}

/**
 * PlanToothSelector
 *
 * Selección MÚLTIPLE de piezas FDI para la pestaña "Sobre una pieza".
 *
 * Va dentro de un desplegable abierto por defecto y no como bloque fijo: la
 * rejilla ocupa cuatro filas (ocho en dentición mixta) y, en el panel lateral
 * de un móvil, empujaría la
 * lista de servicios fuera de la pantalla. El resumen del disparador ("Piezas:
 * 16, 17") mantiene visible lo elegido aunque esté plegado, que es lo único que
 * hay que poder comprobar sin abrirlo.
 *
 * Cada pieza es un `<button aria-pressed>` y no un `<div onClick>`: es un
 * conmutador real, alcanzable con teclado y anunciado como "Diente 16,
 * pulsado". El estado nunca se comunica solo con color (WCAG 2.2 — 1.4.1): el
 * resumen de arriba enumera las piezas activas en texto.
 */
export function PlanToothSelector({
  selected,
  onToggle,
  onClear,
  disabled = false,
  dentition = DEFAULT_DENTITION,
}: PlanToothSelectorProps) {
  const { notation, describe } = useToothLabel();
  const summary = formatSelectedTeeth(selected, notation);
  const rowSets = quadrantRowsFor(dentition);

  return (
    <Collapsible
      defaultOpen
      className="shrink-0 rounded-bento border border-hairline bg-canvas"
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <CollapsibleTrigger
          disabled={disabled}
          className="group flex min-h-[2rem] min-w-0 flex-1 items-center gap-2 rounded-lg text-left text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronDown
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-subtle transition-transform group-data-[state=closed]:-rotate-90"
          />
          <span className="min-w-0 truncate" title={summary || undefined}>
            {summary ? (
              <>
                <span className="text-subtle">Piezas: </span>
                <span className="font-medium tabular-nums">{summary}</span>
              </>
            ) : (
              <span className="text-subtle">Sin piezas seleccionadas</span>
            )}
          </span>
        </CollapsibleTrigger>

        {selected.size > 0 && !disabled && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-subtle transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            Quitar todas
          </button>
        )}
      </div>

      <CollapsibleContent>
        <div
          role="group"
          aria-label="Piezas dentales por cuadrante"
          className="space-y-2 border-t border-hairline px-3 py-2.5"
        >
          {(Object.keys(QUADRANT_LABEL) as (keyof QuadrantRows)[]).flatMap(
            (quadrantKey) =>
              rowSets.map((rowSet) => {
                const label =
                  QUADRANT_LABEL[quadrantKey] +
                  (dentition === "mixed" && rowSet.primary
                    ? " · temporales"
                    : "");
                return (
                  <div key={`${quadrantKey}-${rowSet.primary}`}>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-subtle">
                      {label}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {rowSet.rows[quadrantKey].map((fdi) => {
                        const isActive = selected.has(fdi);
                        return (
                          <button
                            key={fdi}
                            type="button"
                            aria-pressed={isActive}
                            aria-label={describe([fdi])}
                            disabled={disabled}
                            onClick={() => onToggle(fdi)}
                            // 32×32: por encima del mínimo de 24×24 de WCAG 2.2
                            // (2.5.8) incluso con el dedo sobre el iPad del sillón.
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium tabular-nums transition-colors",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                              "disabled:cursor-not-allowed disabled:opacity-50",
                              isActive
                                ? "border-brand-strong bg-brand-strong text-white"
                                : notationDrawsBracket(notation)
                                  ? "border-transparent bg-surface text-ink hover:bg-hover hover:text-brand"
                                  : "border-hairline bg-surface text-ink hover:border-brand hover:text-brand",
                            )}
                          >
                            <ToothNotationLabel fdi={fdi} notation={notation} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }),
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
