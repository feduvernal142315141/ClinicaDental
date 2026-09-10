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

const FDI_QUADRANTS: ReadonlyArray<{ label: string; teeth: number[] }> = [
  { label: "Superior derecho", teeth: [18, 17, 16, 15, 14, 13, 12, 11] },
  { label: "Superior izquierdo", teeth: [21, 22, 23, 24, 25, 26, 27, 28] },
  { label: "Inferior izquierdo", teeth: [31, 32, 33, 34, 35, 36, 37, 38] },
  { label: "Inferior derecho", teeth: [48, 47, 46, 45, 44, 43, 42, 41] },
];

interface PlanToothSelectorProps {
  selected: ReadonlySet<number>;
  onToggle: (fdi: number) => void;
  onClear: () => void;
  disabled?: boolean;
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
 * rejilla ocupa cuatro filas y, en el panel lateral de un móvil, empujaría la
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
}: PlanToothSelectorProps) {
  const { notation, describe } = useToothLabel();
  const summary = formatSelectedTeeth(selected, notation);

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
          {FDI_QUADRANTS.map((quadrant) => (
            <div key={quadrant.label}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-subtle">
                {quadrant.label}
              </p>
              <div className="flex flex-wrap gap-1">
                {quadrant.teeth.map((fdi) => {
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
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
