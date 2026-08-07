"use client";

import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui";
import { cn } from "@/lib/utils/utils";

/**
 * Dentición permanente en notación FDI/ISO 3950, por cuadrantes y en orden
 * anatómico (de la muela del juicio a la línea media). No se importa nada de
 * `lib/odontogram/*`: la numeración FDI es una norma internacional, no un
 * detalle del módulo del odontograma, y este panel vive fuera de su frontera.
 */
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
export function formatSelectedTeeth(selected: ReadonlySet<number>): string {
  return Array.from(selected)
    .sort((a, b) => a - b)
    .join(", ");
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
  const summary = formatSelectedTeeth(selected);

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
          <span className="min-w-0 truncate">
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
          aria-label="Piezas dentales en notación FDI"
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
                      aria-label={`Diente ${fdi}`}
                      disabled={disabled}
                      onClick={() => onToggle(fdi)}
                      // 32×32: por encima del mínimo de 24×24 de WCAG 2.2
                      // (2.5.8) incluso con el dedo sobre el iPad del sillón.
                      className={cn(
                        "h-8 w-8 rounded-lg border text-xs font-medium tabular-nums transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        // `brand-strong` y no `brand`: en oscuro `--brand` se
                        // aclara a blue-500 y el FDI blanco cae a 3.68:1 (AA
                        // pide 4.5:1). Y el número de la pieza es justo el dato
                        // que hay que poder verificar antes de presupuestar.
                        isActive
                          ? "border-brand-strong bg-brand-strong text-white"
                          : "border-hairline bg-surface text-ink hover:border-brand hover:text-brand",
                      )}
                    >
                      {fdi}
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
